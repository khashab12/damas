import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";
import {
  createOrderSchema,
  generateOrderId,
  priceOrder,
  UnknownItemsError,
} from "@/lib/orders/pricing";
import {
  createPayment,
  isPaymentConfigured,
  PaymentNotConfiguredError,
} from "@/lib/payment";

// node:sqlite and the payment adapter are Node-only.
export const runtime = "nodejs";

/**
 * POST /api/orders
 *
 * Body: { items: [{ itemId, quantity }], customerName?, customerPhone?, note? }
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

  const order = await orderStore.create({
    id: generateOrderId(),
    status: "pending",
    lines: priced.lines,
    totalHalalas: priced.totalHalalas,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    fulfilment: parsed.data.fulfilment,
    address: parsed.data.address ?? null,
    note: parsed.data.note ?? null,
    notificationMessage: null,
    paymentReference: null,
  });

  // Payment is the single integration point. The order is already persisted as
  // pending, so a missing provider degrades cleanly instead of losing the order.
  let redirectUrl: string | null = null;
  let paymentError: string | null = null;

  if (isPaymentConfigured()) {
    try {
      ({ redirectUrl } = await createPayment(order));
    } catch (error) {
      paymentError =
        error instanceof PaymentNotConfiguredError
          ? "NOT_CONFIGURED"
          : "FAILED";
    }
  } else {
    paymentError = "NOT_CONFIGURED";
  }

  return NextResponse.json(
    {
      orderId: order.id,
      status: order.status,
      totalHalalas: order.totalHalalas,
      totalSar: order.totalHalalas / 100,
      lines: order.lines,
      redirectUrl,
      paymentError,
    },
    { status: 201 },
  );
}
