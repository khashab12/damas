import type { Order } from "@/lib/orders/types";

/* ---------------------------------------------------------------------------
 * Restaurant notification.
 *
 * The channel sits behind `OrderNotifier` so WhatsApp / email / SMS can be
 * swapped in without touching the webhook. Today it logs; the rendered message
 * is also stored on the order and returned by GET /api/orders/:id so the output
 * is inspectable without a provider.
 * ------------------------------------------------------------------------- */

export interface OrderNotifier {
  readonly channel: string;
  send(order: Order, message: string): Promise<void>;
}

const riyals = (halalas: number): string => {
  const value = halalas / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

/** Formatted Arabic order message for the restaurant. */
export function formatOrderMessage(order: Order): string {
  const lines = order.lines.map(
    (line) =>
      `• ${line.name} × ${line.quantity} — ${riyals(line.lineTotalHalalas)} ريال`,
  );

  const created = new Date(order.createdAt).toLocaleString("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return [
    "🔔 طلب جديد — مطعم دمس",
    "",
    `رقم الطلب: ${order.id}`,
    `التاريخ: ${created}`,
    `الاسم: ${order.customerName}`,
    `الجوال: ${order.customerPhone}`,
    `الاستلام: ${order.fulfilment === "delivery" ? "توصيل" : "استلام من الفرع"}`,
    order.address ? `العنوان: ${order.address}` : null,
    "",
    "الأصناف:",
    ...lines,
    "",
    `الإجمالي: ${riyals(order.totalHalalas)} ريال`,
    order.note ? `ملاحظات: ${order.note}` : null,
    "",
    "حالة الدفع: مدفوع ✅",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/** Default channel: writes to the server log. */
export const consoleNotifier: OrderNotifier = {
  channel: "console",
  async send(order, message) {
    console.log(
      `\n──────── ORDER NOTIFICATION (${this.channel}) ────────\n${message}\n────────────────────────────────────────────\n`,
    );
    void order;
  },
};

/*
 * To swap the channel later, implement OrderNotifier and export it as
 * `notifier`. A WhatsApp adapter would POST `message` to the Cloud API's
 * /{phone-number-id}/messages endpoint; an email adapter would hand it to
 * Resend/SES. Nothing else in the pipeline changes.
 */
export const notifier: OrderNotifier = consoleNotifier;
