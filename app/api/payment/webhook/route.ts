import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";
import { formatOrderMessage, notifier } from "@/lib/notify";
import { PaymentNotConfiguredError, verifyPayment } from "@/lib/payment";

export const runtime = "nodejs";

/**
 * POST /api/payment/webhook
 *
 * Called by the payment provider. Signature verification lives inside
 * verifyPayment() in lib/payment.ts (marked TODO there) — the RAW body is
 * passed through unparsed because signatures are computed over exact bytes.
 */
export async function POST(request: Request) {
  // Read as text, never request.json(): re-serialising would change the bytes
  // and break signature verification.
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let result;
  try {
    result = await verifyPayment({ rawBody, headers });
  } catch (error) {
    if (error instanceof PaymentNotConfiguredError) {
      // 501: the delivery was well-formed, we simply cannot verify it yet.
      return NextResponse.json(
        {
          error: "NOT_CONFIGURED",
          message:
            "No payment adapter is wired up. Implement verifyPayment() in lib/payment.ts.",
        },
        { status: 501 },
      );
    }
    return NextResponse.json({ error: "VERIFICATION_FAILED" }, { status: 400 });
  }

  const order = await orderStore.get(result.orderId);
  if (!order) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!result.ok) {
    await orderStore.markFailed(order.id);
    return NextResponse.json({ received: true, status: "failed" });
  }

  // markPaid is guarded on status, so a redelivered webhook returns null here
  // and the restaurant is not notified twice.
  const message = formatOrderMessage({ ...order, status: "paid" });
  const paid = await orderStore.markPaid(order.id, message);

  if (!paid) {
    return NextResponse.json({ received: true, status: "already_paid" });
  }

  await notifier.send(paid, message);

  return NextResponse.json({ received: true, status: "paid" });
}
