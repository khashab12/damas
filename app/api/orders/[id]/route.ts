import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";

export const runtime = "nodejs";

/**
 * GET /api/orders/:id
 *
 * Returns the order including `notificationMessage` — the formatted Arabic
 * message sent to the restaurant — so the output is inspectable while no
 * notification channel is wired up.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const order = await orderStore.get(id);

  if (!order) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `No order with id ${id}.` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ...order,
    totalSar: order.totalHalalas / 100,
  });
}
