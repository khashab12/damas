import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";
import { formatOrderMessage, notifier } from "@/lib/notify";

export const runtime = "nodejs";

/* ---------------------------------------------------------------------------
 * DEVELOPMENT ONLY — returns 404 in production.
 *
 * Runs exactly the same post-verification path as the real webhook (mark paid,
 * render the Arabic message, dispatch the notification) so the pipeline can be
 * exercised before a payment provider exists. It deliberately does NOT touch
 * lib/payment.ts: it stands in for a *verified* provider callback, nothing more.
 *
 * Delete this route once a real adapter is wired up.
 * ------------------------------------------------------------------------- */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { orderId, outcome = "paid" } = (await request
    .json()
    .catch(() => ({}))) as { orderId?: string; outcome?: "paid" | "failed" };

  if (!orderId) {
    return NextResponse.json(
      { error: "MISSING_ORDER_ID", message: "Body needs { orderId }." },
      { status: 400 },
    );
  }

  const order = await orderStore.get(orderId);
  if (!order) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (outcome === "failed") {
    const failed = await orderStore.markFailed(orderId);
    return NextResponse.json({ simulated: "failed", status: failed?.status });
  }

  const message = formatOrderMessage({ ...order, status: "paid" });
  const paid = await orderStore.markPaid(orderId, message);

  if (!paid) {
    return NextResponse.json({ simulated: "paid", status: "already_paid" });
  }

  await notifier.send(paid, message);
  return NextResponse.json({
    simulated: "paid",
    status: paid.status,
    notificationChannel: notifier.channel,
    message,
  });
}
