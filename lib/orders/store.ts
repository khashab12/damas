import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Order, OrderLine, OrderStatus, OrderStore } from "./types";

/* ---------------------------------------------------------------------------
 * STORAGE CHOICE: SQLite via Node's built-in `node:sqlite` (Node 22+).
 *
 * Why this one:
 *  - Survives a restart (a real file on disk), which a Map does not.
 *  - Zero dependencies and zero native build step -- it ships with Node, so
 *    there is no better-sqlite3 compile toolchain to install.
 *  - Real transactions and a UNIQUE constraint, so two concurrent webhook
 *    deliveries for the same order cannot both mark it paid and double-notify.
 *
 * The tradeoff, stated plainly:
 *  - It is a single file on a local disk, so it only works on ONE persistent
 *    node. It will NOT survive on Vercel/Netlify/Cloud Run or any serverless
 *    or autoscaling host: those have ephemeral, per-instance filesystems, so
 *    orders would silently vanish between deploys or split across instances.
 *  - If you deploy anywhere serverless, or ever run more than one instance,
 *    swap this for Postgres (Supabase/Neon are the least effort). That is why
 *    everything is behind the `OrderStore` interface -- only this file changes.
 *
 * Set ORDERS_DB_PATH to control the location; default is ./.data/orders.db,
 * which should be a mounted volume in production.
 * ------------------------------------------------------------------------- */

const DB_PATH = process.env.ORDERS_DB_PATH ?? ".data/orders.db";

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const handle = new DatabaseSync(DB_PATH);
  handle.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS orders (
      id                   TEXT PRIMARY KEY,
      status               TEXT NOT NULL,
      lines_json           TEXT NOT NULL,
      total_halalas        INTEGER NOT NULL,
      customer_name        TEXT NOT NULL DEFAULT '',
      customer_phone       TEXT NOT NULL DEFAULT '',
      fulfilment           TEXT NOT NULL DEFAULT 'pickup',
      address              TEXT,
      note                 TEXT,
      notification_message TEXT,
      payment_reference    TEXT,
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    );
  `);
  // Additive migration: databases created before customer details existed are
  // upgraded in place rather than dropped, so previous orders survive.
  const existing = new Set(
    (
      handle.prepare(`PRAGMA table_info(orders)`).all() as { name: string }[]
    ).map((c) => c.name),
  );
  if (!existing.has("fulfilment")) {
    handle.exec(
      `ALTER TABLE orders ADD COLUMN fulfilment TEXT NOT NULL DEFAULT 'pickup'`,
    );
  }
  if (!existing.has("address")) {
    handle.exec(`ALTER TABLE orders ADD COLUMN address TEXT`);
  }

  db = handle;
  return handle;
}

type Row = {
  id: string;
  status: string;
  lines_json: string;
  total_halalas: number;
  customer_name: string;
  customer_phone: string;
  fulfilment: string;
  address: string | null;
  note: string | null;
  notification_message: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
};

const toOrder = (row: Row): Order => ({
  id: row.id,
  status: row.status as OrderStatus,
  lines: JSON.parse(row.lines_json) as OrderLine[],
  totalHalalas: row.total_halalas,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  fulfilment: row.fulfilment as Order["fulfilment"],
  address: row.address,
  note: row.note,
  notificationMessage: row.notification_message,
  paymentReference: row.payment_reference,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const sqliteOrderStore: OrderStore = {
  async create(input) {
    const now = new Date().toISOString();
    const order: Order = {
      ...input,
      status: input.status ?? "pending",
      createdAt: now,
      updatedAt: now,
    };
    getDb()
      .prepare(
        `INSERT INTO orders (id, status, lines_json, total_halalas, customer_name,
           customer_phone, fulfilment, address, note, notification_message,
           payment_reference, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
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
        order.paymentReference,
        order.createdAt,
        order.updatedAt,
      );
    return order;
  },

  async get(id) {
    const row = getDb().prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as
      Row | undefined;
    return row ? toOrder(row) : null;
  },

  async markPaid(id, notificationMessage) {
    // Guarded on status: a webhook redelivery cannot flip an already-paid
    // order again, so the restaurant is never notified twice.
    const result = getDb()
      .prepare(
        `UPDATE orders
            SET status = 'paid', notification_message = ?, updated_at = ?
          WHERE id = ? AND status <> 'paid'`,
      )
      .run(notificationMessage, new Date().toISOString(), id);
    if (result.changes === 0) return null;
    return this.get(id);
  },

  async markFailed(id) {
    getDb()
      .prepare(
        `UPDATE orders SET status = 'failed', updated_at = ?
          WHERE id = ? AND status = 'pending'`,
      )
      .run(new Date().toISOString(), id);
    return this.get(id);
  },

  async setPaymentReference(id, reference) {
    getDb()
      .prepare(
        `UPDATE orders SET payment_reference = ?, updated_at = ? WHERE id = ?`,
      )
      .run(reference, new Date().toISOString(), id);
    return this.get(id);
  },
};

export const orderStore: OrderStore = sqliteOrderStore;
