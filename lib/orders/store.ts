import { Pool } from "pg";
import type { Order, OrderLine, OrderStore } from "./types";

/* ---------------------------------------------------------------------------
 * STORAGE: Postgres (Neon recommended; Supabase works unchanged).
 *
 * Replaces the previous SQLite file store, which cannot work on Vercel: the
 * filesystem there is ephemeral and per-instance, so orders written by one
 * invocation would vanish on the next deploy or land on another instance.
 *
 * Why Neon over Supabase for THIS app:
 *  - Postgres-only and built for serverless: it scales to zero, and its pooler
 *    is designed for the many-short-lived-connections pattern that Vercel
 *    functions produce.
 *  - Supabase bundles auth, storage, realtime and a REST layer. None of that is
 *    used here — this is one orders table — so it is surface area without
 *    benefit.
 *  - Both speak plain Postgres over this same driver, so switching is only a
 *    connection-string change. Nothing in this file is Neon-specific.
 *
 * ALWAYS use the POOLED connection string. Serverless invocations open many
 * short-lived connections and would exhaust a direct (unpooled) endpoint.
 * ------------------------------------------------------------------------- */

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

/**
 * Removes `sslmode` (and `uselibpqcompat`, which only exists to reinterpret
 * it) from a connection string, so TLS policy is decided by the `ssl` object
 * in getPool rather than by the URL.
 *
 * Deliberately narrow: `sslcert` / `sslkey` / `sslrootcert` are left alone.
 * Those name a specific certificate or CA the operator chose on purpose, and
 * pg-connection-string turns them into an `ssl` object that still verifies by
 * default — dropping them silently would be the dangerous move, not keeping
 * them.
 *
 * A connection string that is not a URL (libpq's `host=... port=...` keyword
 * form) is returned untouched: there is nothing to parse, and pg handles it.
 */
export function withoutSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (!url.searchParams.has("sslmode") && !url.searchParams.has("uselibpqcompat")) {
      return connectionString;
    }
    url.searchParams.delete("sslmode");
    url.searchParams.delete("uselibpqcompat");
    return url.toString();
  } catch {
    return connectionString;
  }
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // Fail loudly rather than falling back to anything ephemeral: a
      // misconfigured deploy must not quietly drop orders.
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env.local and add your " +
          "pooled Postgres connection string (schema: lib/orders/schema.sql).",
      );
    }
    // Managed Postgres (Neon/Supabase) requires TLS; a local instance has none,
    // so TLS is enabled for everything except localhost.
    //
    // TLS POLICY LIVES HERE, NOT IN THE URL. `sslmode` is stripped from the
    // connection string first, because pg resolves the two in an order that is
    // the opposite of what it looks like:
    //
    //     config = Object.assign({}, config, parse(config.connectionString))
    //         -- pg/lib/connection-parameters.js
    //
    // The URL wins. With `?sslmode=require` present, pg-connection-string sets
    // `ssl = {}` and an explicit `ssl` passed to the Pool is DISCARDED — which
    // is also the source of the pg v9 deprecation warning that `sslmode=require`
    // will stop meaning verify-full. Removing the parameter leaves the object
    // below as the only authority, so the setting and the behaviour agree.
    //
    // `rejectUnauthorized: true` is the real current behaviour, not a change:
    // the discarded override read `false`, but `ssl = {}` means Node's TLS
    // defaults, i.e. full verification. Writing it explicitly keeps that when
    // pg v9 lands, instead of silently dropping to encrypt-without-verify.
    // Neon and Supabase both present publicly-trusted certificates, so nothing
    // extra is needed to verify them.
    const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
    pool = new Pool({
      connectionString: withoutSslMode(connectionString),
      ssl: isLocal ? false : { rejectUnauthorized: true },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/** Idempotent schema creation, run once per process. Mirrors schema.sql. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((error) => {
        // Let the next request retry instead of caching a failed init.
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

/** Kept in sync with lib/orders/schema.sql. */
export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS orders (
    id                   TEXT PRIMARY KEY,
    status               TEXT        NOT NULL DEFAULT 'confirmed',
    lines                JSONB       NOT NULL,
    total_halalas        INTEGER     NOT NULL CHECK (total_halalas >= 0),
    customer_name        TEXT        NOT NULL,
    customer_phone       TEXT        NOT NULL,
    fulfilment           TEXT        NOT NULL CHECK (fulfilment IN ('delivery','pickup')),
    address              TEXT,
    note                 TEXT,
    notification_message TEXT        NOT NULL DEFAULT '',
    created_at           TIMESTAMPTZ NOT NULL,
    updated_at           TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
  CREATE INDEX IF NOT EXISTS orders_customer_phone_idx ON orders (customer_phone);

  -- MIGRATION: order lifecycle status, added for the /admin/orders dashboard.
  --
  -- Additive only. A table created by an older deploy already has this column
  -- (it was in the original CREATE TABLE), so ADD COLUMN IF NOT EXISTS is a
  -- no-op there; it exists for any database that predates it. Existing rows
  -- keep their data and default to 'confirmed'. Nothing is ever dropped.
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

  -- The CHECK is added separately: Postgres has no ADD CONSTRAINT IF NOT
  -- EXISTS, and this whole block re-runs on every cold start.
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check'
    ) THEN
      ALTER TABLE orders ADD CONSTRAINT orders_status_check
        CHECK (status IN ('confirmed', 'prepared', 'delivered'));
    END IF;
  END $$;
`;

export const INSERT_SQL = `
  INSERT INTO orders (id, status, lines, total_halalas, customer_name,
    customer_phone, fulfilment, address, note, notification_message,
    created_at, updated_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
`;

export const SELECT_SQL = `SELECT * FROM orders WHERE id = $1`;

/** Dashboard feed. Newest first; `$1` is an optional lower bound on created_at
 *  (the "today" filter), passed as null for "all". */
export const LIST_SQL = `
  SELECT * FROM orders
  WHERE ($1::timestamptz IS NULL OR created_at >= $1)
  ORDER BY created_at DESC
  LIMIT $2
`;

/** Status change from the dashboard. Returns the row so the caller never has
 *  to re-read to find out whether the id existed. */
export const UPDATE_STATUS_SQL = `
  UPDATE orders SET status = $2, updated_at = $3 WHERE id = $1 RETURNING *
`;

export type OrderRow = {
  id: string;
  status: string;
  lines: OrderLine[];
  total_halalas: number;
  customer_name: string;
  customer_phone: string;
  fulfilment: string;
  address: string | null;
  note: string | null;
  notification_message: string;
  created_at: Date | string;
  updated_at: Date | string;
};

/** Row -> domain. */
export function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    status: row.status as Order["status"],
    // jsonb comes back already parsed.
    lines: row.lines,
    totalHalalas: row.total_halalas,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    fulfilment: row.fulfilment as Order["fulfilment"],
    address: row.address,
    note: row.note,
    notificationMessage: row.notification_message,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Positional parameters for INSERT_SQL. */
export function orderToParams(order: Order): unknown[] {
  return [
    order.id,
    order.status,
    JSON.stringify(order.lines),
    order.totalHalalas,
    order.customerName,
    order.customerPhone,
    order.fulfilment,
    order.address,
    order.note,
    order.notificationMessage,
    order.createdAt,
    order.updatedAt,
  ];
}

export const postgresOrderStore: OrderStore = {
  async create(order) {
    await ensureSchema();
    await getPool().query(INSERT_SQL, orderToParams(order));
    return order;
  },

  async get(id) {
    await ensureSchema();
    const result = await getPool().query<OrderRow>(SELECT_SQL, [id]);
    return result.rows[0] ? rowToOrder(result.rows[0]) : null;
  },

  async list({ since = null, limit = 200 } = {}) {
    await ensureSchema();
    const result = await getPool().query<OrderRow>(LIST_SQL, [since, limit]);
    return result.rows.map(rowToOrder);
  },

  async setStatus(id, status) {
    await ensureSchema();
    const now = new Date().toISOString();
    const result = await getPool().query<OrderRow>(UPDATE_STATUS_SQL, [
      id,
      status,
      now,
    ]);
    return result.rows[0] ? rowToOrder(result.rows[0]) : null;
  },
};

export const orderStore: OrderStore = postgresOrderStore;
