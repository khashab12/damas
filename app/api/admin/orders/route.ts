import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin/auth";
import { orderStore } from "@/lib/orders/store";
import { startOfRiyadhDay } from "@/lib/orders/day";
import { isOrderStatus } from "@/lib/orders/types";

export const runtime = "nodejs";
/** Order data must never be cached or prerendered — it changes by the minute
 *  and it is behind a login. */
export const dynamic = "force-dynamic";

/** Refuses without a valid session cookie. Identical shape for "no cookie" and
 *  "bad cookie": there is nothing useful to tell an unauthenticated caller. */
function unauthorized() {
  return NextResponse.json(
    { error: "UNAUTHORIZED", message: "Not signed in." },
    { status: 401, headers: { "X-Robots-Tag": "noindex, nofollow" } },
  );
}

/**
 * GET /api/admin/orders?scope=today|all
 *
 * The dashboard's polling feed. Auth is re-checked on every request: the
 * cookie is the only thing that grants access, and it is validated
 * server-side each time rather than trusted from a prior render.
 */
export async function GET(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const scope = new URL(request.url).searchParams.get("scope");
  const since = scope === "all" ? null : startOfRiyadhDay();

  const orders = await orderStore.list({ since });

  return NextResponse.json(
    { scope: scope === "all" ? "all" : "today", orders },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * PATCH /api/admin/orders  { id, status }
 *
 * Marks an order متحضر / تم التسليم. The status is validated against the
 * allowed set here as well as by the CHECK constraint in the schema — the
 * client is not the authority on what a status may be.
 */
export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Body must be valid JSON." },
      { status: 400 },
    );
  }

  const { id, status } = (body ?? {}) as { id?: unknown; status?: unknown };

  if (typeof id !== "string" || id.length === 0) {
    return NextResponse.json(
      { error: "INVALID_ID", message: "id is required." },
      { status: 400 },
    );
  }
  if (!isOrderStatus(status)) {
    return NextResponse.json(
      { error: "INVALID_STATUS", message: "Unknown status." },
      { status: 400 },
    );
  }

  const updated = await orderStore.setStatus(id, status);
  if (!updated) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `No order with id ${id}.` },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { order: updated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
