/**
 * DEV ONLY: serves PGlite (real Postgres, WASM) over TCP so `pg` can connect,
 * letting the app run end-to-end without a cloud database.
 * Not used in production — Vercel uses DATABASE_URL from Neon/Supabase.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", ".data", "pglite-dev");
const db = await PGlite.create(dir);
const server = new PGLiteSocketServer({ db, port: 5433, host: "127.0.0.1" });
await server.start();
console.log("PGlite listening on 127.0.0.1:5433, data:", dir);
process.on("SIGINT", async () => { await server.stop(); await db.close(); process.exit(0); });
