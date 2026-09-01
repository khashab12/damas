import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";
import {
  createOrderSchema,
  generateOrderId,
  priceOrder,
  UnknownItemsError,
} from "@/lib/orders/pricing";
import { formatOrderMessage, notifier } from "@/lib/notify";
import type { Order } from "@/lib/orders/types";

export const runtime = "nodejs";

/**
 * POST /api/orders
 *
 * Cash on delivery/pickup: there is no payment step, so an order is confirmed
 * the moment it is placed and the restaurant is notified immediately.
 *
 * Body: { items: [{ itemId, quantity }], customerName, customerPhone,
 *         fulfilment, address?, note? }
 * Prices are never read from the request; the total is recomputed server-side.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message: "Payload failed validation.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  let priced;
  try {
    priced = priceOrder(parsed.data);
  } catch (error) {
    if (error instanceof UnknownItemsError) {
      return NextResponse.json(
        {
          error: "UNKNOWN_ITEMS",
          message: "One or more item ids are not on the menu.",
          unknownIds: error.unknownIds,
        },
        { status: 400 },
      );
    }
    throw error;
  }

  // id and timestamps are minted here so the Arabic message can be rendered
  // before the write — one insert, not an insert plus an update.
  const now = new Date().toISOString();
  const draft: Order = {
    id: generateOrderId(),
    status: "confirmed",
    lines: priced.lines,
    totalHalalas: priced.totalHalalas,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    fulfilment: parsed.data.fulfilment,
    address: parsed.data.address ?? null,
    note: parsed.data.note ?? null,
    notificationMessage: "",
    createdAt: now,
    updatedAt: now,
  };

  const order: Order = {
    ...draft,
    notificationMessage: formatOrderMessage(draft),
  };

  await orderStore.create(order);

  // A notification failure must not lose a confirmed order: it is already
  // persisted, so this is logged rather than surfaced to the customer.
  try {
    await notifier.send(order, order.notificationMessage);
  } catch (error) {
    console.error("[orders] notification failed", order.id, error);
  }

  return NextResponse.json(
    {
      orderId: order.id,
      status: order.status,
      totalHalalas: order.totalHalalas,
      totalSar: order.totalHalalas / 100,
      lines: order.lines,
    },
    { status: 201 },
  );
}
