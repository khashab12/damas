import type { Order } from "@/lib/orders/types";
import { toSaudiE164 } from "@/lib/orders/phone";
import type { OrderNotifier } from "@/lib/notify";

/* ---------------------------------------------------------------------------
 * WhatsApp Cloud API notifier (Meta, first-party — no third-party middleman).
 *
 * One POST to graph.facebook.com. No SDK, no extra dependency, no per-message
 * vendor markup. See README "Restaurant WhatsApp notifications" for the exact
 * Meta setup this expects.
 *
 * THE ONE RULE THAT BITES: WhatsApp only allows free-form text to a number
 * that has messaged the business number within the last 24 hours (the
 * "customer service window"). The restaurant will not be messaging us, so
 * outside that window a free-form send is REJECTED (error code 131047). A
 * pre-approved TEMPLATE message has no such limit and is the only reliable
 * path for unprompted notifications — hence WHATSAPP_TEMPLATE_NAME below.
 * Free-form is kept as the no-template default because it is what you want
 * while testing, and it is one env var away from the reliable path.
 * ------------------------------------------------------------------------- */

/** Graph API version. Pinned, not floating: Meta ships breaking changes per version. */
const DEFAULT_API_VERSION = "v23.0";

/** Per-attempt ceiling. Two attempts plus the backoff must fit inside the
 *  route's maxDuration. */
const REQUEST_TIMEOUT_MS = 8_000;

/** Gap before the single retry: long enough to ride out a blip, short enough
 *  to stay inside maxDuration. */
const RETRY_DELAY_MS = 1_000;

/** The restaurant's number. Overridable so staging can point somewhere harmless. */
const DEFAULT_RECIPIENT = "0574672565";

export type WhatsAppConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  /** E.164 digits, no leading "+". */
  to: string;
  /** When set, send an approved template instead of free-form text. */
  templateName: string | null;
  templateLanguage: string;
};

/**
 * Reads config from the environment. Returns null when WhatsApp is not
 * configured, so the app falls back to the console notifier rather than
 * throwing on every order.
 */
export function readWhatsAppConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !accessToken) return null;

  const rawTo = process.env.WHATSAPP_TO?.trim() || DEFAULT_RECIPIENT;
  const to = toSaudiE164(rawTo);
  if (!to) {
    // Loud, once, at config read: a typo in the recipient must not masquerade
    // as a delivery failure on every single order.
    console.error(
      "[whatsapp] WHATSAPP_TO is not a valid Saudi mobile; WhatsApp disabled:",
      rawTo,
    );
    return null;
  }

  return {
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || DEFAULT_API_VERSION,
    phoneNumberId,
    accessToken,
    to,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME?.trim() || null,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "ar",
  };
}

/** A failed send. `retryable` decides whether the single retry is worth it. */
export class WhatsAppSendError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = "WhatsAppSendError";
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * Transient vs permanent. Retrying a 401 (bad token) or a 131047 (outside the
 * 24h window with no template configured) only burns time and logs the same
 * failure twice — those need a human. Timeouts, rate limits and 5xx are worth
 * one more shot.
 */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const riyals = (halalas: number): string => {
  const value = halalas / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

/**
 * Template parameter values may not contain newlines, tabs, or 4+ consecutive
 * spaces — Meta rejects the whole message if they do. So every value is
 * squashed to single spaces, and empty values become "-" because empty
 * parameters are rejected too.
 */
function param(value: string | null | undefined): string {
  const flat = (value ?? "").replace(/\s+/g, " ").trim();
  return flat.length > 0 ? flat : "-";
}

/**
 * The seven positional parameters for the approved template. The body
 * registered at Meta must use {{1}}..{{7}} in this order — see README.
 */
export function templateParameters(order: Order): string[] {
  const items = order.lines
    .map((line) => `${line.name} × ${line.quantity}`)
    .join(" ، ");

  return [
    param(order.id),
    param(order.customerName),
    param(order.customerPhone),
    param(
      order.fulfilment === "delivery"
        ? `توصيل — ${order.address ?? ""}`
        : "استلام من الفرع",
    ),
    param(items),
    param(riyals(order.totalHalalas)),
    param(order.note),
  ];
}

/** Request body: an approved template when configured, else free-form text. */
export function buildMessagePayload(
  config: WhatsAppConfig,
  order: Order,
  message: string,
): Record<string, unknown> {
  if (config.templateName) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: config.to,
      type: "template",
      template: {
        name: config.templateName,
        language: { code: config.templateLanguage },
        components: [
          {
            type: "body",
            parameters: templateParameters(order).map((text) => ({
              type: "text",
              text,
            })),
          },
        ],
      },
    };
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: config.to,
    type: "text",
    // preview_url off: the message is plain Arabic and a link preview would
    // only add latency.
    text: { preview_url: false, body: message },
  };
}

/** One attempt. Always throws WhatsAppSendError, never a raw fetch error. */
async function sendOnce(
  config: WhatsAppConfig,
  order: Order,
  message: string,
): Promise<void> {
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildMessagePayload(config, order, message)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // Network error or timeout: no response at all, always worth one retry.
    const reason = error instanceof Error ? error.message : String(error);
    throw new WhatsAppSendError(`request failed: ${reason}`, null, true);
  }

  if (response.ok) return;

  // Meta returns { error: { message, code, error_subcode, fbtrace_id } }. Read
  // it defensively: an edge or proxy failure may not be JSON at all.
  let detail = "";
  try {
    const body: unknown = await response.json();
    const err = (body as { error?: { message?: string; code?: number } })?.error;
    detail = err ? `${err.message ?? "unknown"} (code ${err.code ?? "?"})` : "";
  } catch {
    detail = (await response.text().catch(() => "")).slice(0, 300);
  }

  throw new WhatsAppSendError(
    `HTTP ${response.status}${detail ? ` — ${detail}` : ""}`,
    response.status,
    isRetryableStatus(response.status),
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createWhatsAppNotifier(config: WhatsAppConfig): OrderNotifier {
  return {
    channel: config.templateName ? "whatsapp:template" : "whatsapp:text",

    async send(order, message) {
      try {
        await sendOnce(config, order, message);
        return;
      } catch (error) {
        const first =
          error instanceof WhatsAppSendError
            ? error
            : new WhatsAppSendError(String(error), null, true);

        if (!first.retryable) throw first;

        console.warn(
          `[whatsapp] send failed for ${order.id}, retrying once:`,
          first.message,
        );
        await delay(RETRY_DELAY_MS);
        // Exactly one retry. A second failure is a real outage; the caller
        // logs it, and the order is already persisted either way.
        await sendOnce(config, order, message);
      }
    },
  };
}
