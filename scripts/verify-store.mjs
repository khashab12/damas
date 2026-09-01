/**
 * Verifies the Postgres schema and queries in lib/orders/store.ts against a
 * REAL Postgres engine (PGlite — Postgres compiled to WASM) with on-disk
 * persistence, so the restart check is genuine.
 *
 *   node scripts/verify-store.mjs
 *
 * This exercises the same SQL the app runs. It does not exercise the network
 * path to Neon/Supabase — that needs a real DATABASE_URL.
 */
import { PGlite } from "@electric-sql/pglite";
import { rm, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, "..", ".data", "pglite-verify");

// The store is TypeScript; pull the SQL constants straight out of the source so
// this test can never drift from what the app actually executes.
const source = await readFile(join(here, "..", "lib", "orders", "store.ts"), "utf8");
const grab = (name) => {
  const m = source.match(new RegExp("export const " + name + " = `([\\s\\S]*?)`", "m"));
  if (!m) throw new Error("could not extract " + name + " from store.ts");
  return m[1];
};
const SCHEMA_SQL = grab("SCHEMA_SQL");
const INSERT_SQL = grab("INSERT_SQL");
const SELECT_SQL = grab("SELECT_SQL");

const order = {
  id: "DMS-VERIFY01",
  status: "confirmed",
  lines: [
    { itemId: "box-01", name: "علبة فول كلاسك صغير", quantity: 2, unitPriceHalalas: 250, lineTotalHalalas: 500 },
    { itemId: "main-01", name: "طبق مشكل مقالي كبير", quantity: 1, unitPriceHalalas: 1500, lineTotalHalalas: 1500 },
  ],
  totalHalalas: 2000,
  customerName: "خالد العتيبي",
  customerPhone: "0551234567",
  fulfilment: "delivery",
  address: "حي العزيزية، شارع الشباب",
  note: "الطابق الثاني",
  notificationMessage: "🔔 طلب جديد — مطعم دمس\nالإجمالي: 20 ريال",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const params = (o) => [
  o.id, o.status, JSON.stringify(o.lines), o.totalHalalas, o.customerName,
  o.customerPhone, o.fulfilment, o.address, o.note, o.notificationMessage,
  o.createdAt, o.updatedAt,
];

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};

await rm(DATA_DIR, { recursive: true, force: true });

// ---- session 1: create schema, insert, read back --------------------------
let db = new PGlite(DATA_DIR);
await db.exec(SCHEMA_SQL);
check("schema applies", true);

await db.query(INSERT_SQL, params(order));
const first = await db.query(SELECT_SQL, [order.id]);
const row = first.rows[0];
check("order reads back", !!row);
check("total preserved (integer halalas)", row.total_halalas === 2000, `got ${row.total_halalas}`);
check("arabic name round-trips", row.customer_name === order.customerName, row.customer_name);
check("address round-trips", row.address === order.address);
check("status is confirmed", row.status === "confirmed", row.status);
check("jsonb lines parsed back to array", Array.isArray(row.lines) && row.lines.length === 2);
check("line unit price intact", row.lines?.[1]?.unitPriceHalalas === 1500);
check("notification message stored", row.notification_message.includes("طلب جديد"));

// ---- constraints ----------------------------------------------------------
let rejected = false;
try {
  await db.query(INSERT_SQL, params({ ...order, id: "DMS-BADFULFIL", fulfilment: "teleport" }));
} catch { rejected = true; }
check("invalid fulfilment rejected by CHECK", rejected);

rejected = false;
try {
  await db.query(INSERT_SQL, params({ ...order, id: "DMS-NEGATIVE", totalHalalas: -1 }));
} catch { rejected = true; }
check("negative total rejected by CHECK", rejected);

rejected = false;
try {
  await db.query(INSERT_SQL, params(order)); // same id again
} catch { rejected = true; }
check("duplicate id rejected by PRIMARY KEY", rejected);

// ---- session 2: close and reopen == process restart -----------------------
await db.close();
db = new PGlite(DATA_DIR);
const after = await db.query(SELECT_SQL, [order.id]);
check("survives a restart", after.rows.length === 1);
check("total still correct after restart", after.rows[0]?.total_halalas === 2000);
check("arabic still intact after restart", after.rows[0]?.customer_name === order.customerName);

// schema re-application must be idempotent
await db.exec(SCHEMA_SQL);
const again = await db.query(SELECT_SQL, [order.id]);
check("re-running schema is idempotent (row kept)", again.rows.length === 1);

await db.close();
await rm(DATA_DIR, { recursive: true, force: true });

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
