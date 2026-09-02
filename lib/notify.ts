import type { Order } from "@/lib/orders/types";
import { createWhatsAppNotifier, readWhatsAppConfig } from "@/lib/whatsapp";

/* ---------------------------------------------------------------------------
 * Restaurant notification.
 *
 * The channel sits behind `OrderNotifier` so WhatsApp / email / SMS can be
 * swapped without touching the route. The rendered message is also stored on
 * the order and returned by GET /api/orders/:id, so what was sent stays
 * inspectable even when the provider is down.
 *
 * The default channel is WhatsApp when it is configured (lib/whatsapp.ts), and
 * the server log when it is not.
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
    "الدفع: عند الاستلام 💵",
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

/**
 * Active channel, chosen once per process from the environment.
 *
 * WhatsApp when WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are both
 * set, the console otherwise. The fallback is deliberate: a missing credential
 * degrades to "the order is logged and still readable via GET /api/orders/:id",
 * never to a failed order.
 *
 * To add another channel (email, SMS), implement OrderNotifier and return it
 * from here. Nothing else in the pipeline changes.
 */
function selectNotifier(): OrderNotifier {
  const config = readWhatsAppConfig();
  if (!config) {
    console.warn(
      "[notify] WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / " +
        "WHATSAPP_ACCESS_TOKEN); order notifications go to the server log only.",
    );
    return consoleNotifier;
  }
  return createWhatsAppNotifier(config);
}

export const notifier: OrderNotifier = selectNotifier();
