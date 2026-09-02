import type { OrderNotifier } from "@/lib/notify";

/* ---------------------------------------------------------------------------
 * Telegram Bot API notifier.
 *
 * One POST to api.telegram.org. No SDK, no dependency, no approval process,
 * no per-message cost, and — unlike WhatsApp — no 24-hour messaging window to
 * fall foul of: a bot may message its chat whenever it likes, forever.
 *
 * Setup (bot token + chat id) is in the README under "Restaurant
 * notifications (Telegram)".
 * ------------------------------------------------------------------------- */

/** Per-attempt ceiling. Two attempts plus the backoff must fit inside the
 *  route's maxDuration. */
const REQUEST_TIMEOUT_MS = 8_000;

/** Gap before the single retry: long enough to ride out a blip, short enough
 *  to stay inside maxDuration. */
const RETRY_DELAY_MS = 1_000;

/** Telegram rejects anything longer than this outright, so truncate rather
 *  than lose a 40-line order entirely. */
const MAX_TEXT_LENGTH = 4096;

/** Cap on an honoured `retry_after`: past this we would blow maxDuration, so
 *  the send is abandoned to the failure log instead. */
const MAX_RETRY_AFTER_MS = 5_000;

export type TelegramConfig = {
  botToken: string;
  /** Numeric id (often negative for groups) or an "@channel" handle. Kept as
   *  an opaque string — Telegram accepts both and we should not guess. */
  chatId: string;
};

/**
 * Reads config from the environment. Returns null when Telegram is not
 * configured, so the app falls back to the console notifier rather than
 * throwing on every order.
 */
export function readTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) return null;
  return { botToken, chatId };
}

/** A failed send. `retryable` decides whether the single retry is worth it. */
export class TelegramSendError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;
  /** Honoured wait from Telegram's `parameters.retry_after`, in ms. */
  readonly retryAfterMs: number | null;

  constructor(
    message: string,
    status: number | null,
    retryable: boolean,
    retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = "TelegramSendError";
    this.status = status;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Transient vs permanent. A 401 (bad token) or 400 "chat not found" is a
 * configuration mistake — retrying only burns time and logs the same failure
 * twice. Timeouts, 429 and 5xx are worth one more shot.
 */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** Telegram's own envelope on an error. */
type TelegramError = {
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
};

/**
 * Sent as plain text, deliberately: the Arabic message contains •, ×, — and
 * customer-supplied names and notes. Under parse_mode those become escaping
 * hazards, where one stray character rejects the whole message or mangles the
 * order. Plain text has no such failure mode.
 */
function textFor(message: string): string {
  return message.length > MAX_TEXT_LENGTH
    ? `${message.slice(0, MAX_TEXT_LENGTH - 1)}…`
    : message;
}

/** One attempt. Always throws TelegramSendError, never a raw fetch error. */
async function sendOnce(config: TelegramConfig, message: string): Promise<void> {
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: textFor(message),
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // Network error or timeout: no response at all, always worth one retry.
    const reason = error instanceof Error ? error.message : String(error);
    throw new TelegramSendError(`request failed: ${reason}`, null, true);
  }

  if (response.ok) return;

  // Telegram returns { ok: false, error_code, description, parameters }. Read
  // it defensively: an edge or proxy failure may not be JSON at all.
  let detail = "";
  let retryAfterMs: number | null = null;
  try {
    const body = (await response.json()) as TelegramError;
    detail = body?.description
      ? `${body.description} (code ${body.error_code ?? "?"})`
      : "";
    const retryAfter = body?.parameters?.retry_after;
    if (typeof retryAfter === "number" && retryAfter > 0) {
      retryAfterMs = retryAfter * 1000;
    }
  } catch {
    detail = (await response.text().catch(() => "")).slice(0, 300);
  }

  throw new TelegramSendError(
    `HTTP ${response.status}${detail ? ` — ${detail}` : ""}`,
    response.status,
    isRetryableStatus(response.status),
    retryAfterMs,
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createTelegramNotifier(config: TelegramConfig): OrderNotifier {
  return {
    channel: "telegram",

    async send(order, message) {
      try {
        await sendOnce(config, message);
        return;
      } catch (error) {
        const first =
          error instanceof TelegramSendError
            ? error
            : new TelegramSendError(String(error), null, true);

        if (!first.retryable) throw first;

        // On a 429 Telegram tells us how long to wait. Ignoring it just earns
        // another 429; waiting longer than the route can live is pointless.
        if (first.retryAfterMs !== null && first.retryAfterMs > MAX_RETRY_AFTER_MS) {
          throw new TelegramSendError(
            `${first.message} — retry_after ${first.retryAfterMs}ms exceeds the request budget, not retrying`,
            first.status,
            false,
          );
        }
        const wait = first.retryAfterMs ?? RETRY_DELAY_MS;

        console.warn(
          `[telegram] send failed for ${order.id}, retrying once in ${wait}ms:`,
          first.message,
        );
        await delay(wait);
        // Exactly one retry. A second failure is a real outage; the caller
        // logs it, and the order is already persisted either way.
        await sendOnce(config, message);
      }
    },
  };
}
