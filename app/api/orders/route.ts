import { after, NextResponse } from "next/server";
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
 * The WhatsApp send runs in `after()`, i.e. after this response is flushed but
 * still inside the same invocation, so the platform must keep the function
 * alive long enough for it: two attempts at up to 8s plus a 1s backoff, on top
 * of the insert. 30s leaves room and is well under the platform ceiling.
 */
export const maxDuration = 30;

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

  // Notify AFTER the response is flushed. Two reasons, both deliberate:
  //
  //  1. It cannot block the customer. The order is already persisted and the
  //     201 goes out immediately; a slow or dead WhatsApp adds zero latency to
  //     the checkout and cannot turn a saved order into a visible failure.
  //  2. It still runs to completion. `after` keeps the serverless invocation
  //     alive (via waitUntil) rather than being cut off mid-flight, which is
  //     what a bare floating promise would risk.
  //
  // The notifier already retries once internally; anything that escapes here
  // is a real outage, so the full message is re-logged as the last-resort copy
  // for whoever has to phone the order through by hand.
  after(async () => {
    try {
      await notifier.send(order, order.notificationMessage);
    } catch (error) {
      console.error(
        `[orders] notification FAILED via ${notifier.channel} for ${order.id}:`,
        error instanceof Error ? error.message : error,
      );
      console.error(
        `[orders] undelivered message for ${order.id}:\n${order.notificationMessage}`,
      );
    }
  });

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
