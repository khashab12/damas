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
    // INTENT: sslmode=verify-full. `rejectUnauthorized: false` encrypts the
    // connection but does not verify the server certificate; it is a stopgap,
    // not the target state. The target is full verification - put
    // `?sslmode=verify-full` in DATABASE_URL and drop this ssl override.
    //
    // Why this is written down: pg v9 / pg-connection-string v3 change
    // `sslmode=require` (and `prefer`/`verify-ca`) from their current alias for
    // verify-full to libpq semantics - encrypt, do not verify. .env.example
    // still suggests `sslmode=require`, so on that upgrade the URL silently
    // stops meaning verify-full. Behaviour here does not change on the upgrade,
    // because this explicit ssl object takes precedence over the URL - which is
    // exactly why the intent has to live in the code and not only in the
    // connection string.
    const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
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
`;

export const INSERT_SQL = `
  INSERT INTO orders (id, status, lines, total_halalas, customer_name,
    customer_phone, fulfilment, address, note, notification_message,
    created_at, updated_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
`;

export const SELECT_SQL = `SELECT * FROM orders WHERE id = $1`;

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

/** Row -> domain. Exported so the schema test can reuse it verbatim. */
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

/** Positional parameters for INSERT_SQL. Shared with the schema test. */
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
};

export const orderStore: OrderStore = postgresOrderStore;
