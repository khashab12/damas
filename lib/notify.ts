import type { Order } from "@/lib/orders/types";
import { createTelegramNotifier, readTelegramConfig } from "@/lib/telegram";

/* ---------------------------------------------------------------------------
 * Restaurant notification.
 *
 * The channel sits behind `OrderNotifier` so Telegram / email / SMS can be
 * swapped without touching the route. The rendered message is also stored on
 * the order and returned by GET /api/orders/:id, so what was sent stays
 * inspectable even when the provider is down.
 *
 * The default channel is Telegram when it is configured (lib/telegram.ts), and
 * the server log when it is not. Either way the order also lands on the
 * dashboard at /admin/orders, which is the durable record — the notification
 * is the alert, not the system of record.
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
 * Telegram when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are both set, the
 * console otherwise. The fallback is deliberate: a missing credential degrades
 * to "the order is logged and still visible on /admin/orders", never to a
 * failed order.
 *
 * To add another channel (email, SMS), implement OrderNotifier and return it
 * from here. Nothing else in the pipeline changes.
 */
function selectNotifier(): OrderNotifier {
  const config = readTelegramConfig();
  if (!config) {
    console.warn(
      "[notify] Telegram is not configured (TELEGRAM_BOT_TOKEN / " +
        "TELEGRAM_CHAT_ID); order notifications go to the server log only.",
    );
    return consoleNotifier;
  }
  return createTelegramNotifier(config);
}

export const notifier: OrderNotifier = selectNotifier();
