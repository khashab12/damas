import type { Order } from "@/lib/orders/types";

/* ---------------------------------------------------------------------------
 * PAYMENT INTEGRATION POINT — the only file a provider adapter touches.
 *
 * Both functions throw NOT_CONFIGURED. Everything around them (validation,
 * server-side pricing, persistence, webhook handling, notification, the
 * success/failure pages) is complete and works end to end; wiring a real
 * provider is confined to the two bodies below.
 *
 * No provider's API is guessed at here on purpose. Moyasar, Tap, HyperPay,
 * PayTabs, Checkout.com and Stripe all differ in field names, signature
 * algorithm and redirect semantics, and inventing one would produce code that
 * looks finished but cannot work.
 *
 * ---------------------------------------------------------------------------
 * WHAT AN ADAPTER MUST IMPLEMENT
 *
 * createPayment(order):
 *   1. POST to the provider's "create payment/checkout session" endpoint with:
 *        - amount      -> order.totalHalalas (minor units; confirm the
 *                         provider expects halalas and not SAR)
 *        - currency    -> "SAR"
 *        - reference   -> order.id  (so the webhook can be matched back)
 *        - callback/return URL -> `${APP_BASE_URL}/order/success?id=${order.id}`
 *        - cancel URL          -> `${APP_BASE_URL}/order/failed?id=${order.id}`
 *   2. Authenticate with the SECRET key, server-side only. It must never be
 *      NEXT_PUBLIC_*, or it ships to the browser.
 *   3. Return the hosted-payment-page URL the customer is redirected to.
 *   4. Persist the provider's own id via orderStore.setPaymentReference()
 *      if you need to reconcile later.
 *
 * verifyPayment(payload):
 *   1. TODO(signature): verify the webhook signature BEFORE trusting anything
 *      in the body. Typically an HMAC-SHA256 of the raw request body keyed
 *      with PAYMENT_WEBHOOK_SECRET, compared against a header
 *      (e.g. X-Signature) using a timing-safe comparison.
 *      The route passes the RAW body string for exactly this reason — do not
 *      re-serialise the parsed JSON, the bytes must match what was signed.
 *      Until this is implemented, anyone who can reach the webhook URL can
 *      mark any order paid. Do not go live without it.
 *   2. Read the provider's status field and decide paid / not paid.
 *   3. Return the order id you put in `reference` at creation time.
 *
 * The route already handles: unknown order id, replayed webhooks (marking paid
 * is idempotent at the SQL level), and notification dispatch.
 * ------------------------------------------------------------------------- */

export class PaymentNotConfiguredError extends Error {
  constructor() {
    super("NOT_CONFIGURED");
    this.name = "NOT_CONFIGURED";
  }
}

export type CreatePaymentResult = { redirectUrl: string };
export type VerifyPaymentResult = { ok: boolean; orderId: string };

/** Raw webhook delivery. `rawBody` is the unparsed bytes, needed for signatures. */
export type WebhookPayload = {
  rawBody: string;
  headers: Record<string, string>;
};

export async function createPayment(
  order: Order,
): Promise<CreatePaymentResult> {
  void order;
  throw new PaymentNotConfiguredError();
}

export async function verifyPayment(
  payload: WebhookPayload,
): Promise<VerifyPaymentResult> {
  void payload;
  throw new PaymentNotConfiguredError();
}

/** True once the provider env vars are present. Lets routes degrade cleanly. */
export function isPaymentConfigured(): boolean {
  return Boolean(
    process.env.PAYMENT_API_KEY && process.env.PAYMENT_WEBHOOK_SECRET,
  );
}
