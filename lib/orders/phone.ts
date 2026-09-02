/**
 * Saudi mobile normalisation, shared by the client gate and the server schema
 * so both accept exactly the same inputs.
 *
 * Accepts (with any spaces, dashes, or parentheses):
 *   0551234567        local
 *   +966551234567     international
 *   00966551234567    international with trunk prefix
 *   966551234567      country code, no plus
 *   551234567         national, missing the leading zero
 *
 * Returns the canonical local form 05XXXXXXXX, or null if the number is not a
 * valid Saudi mobile. Normalisation never rescues a genuinely wrong number:
 * the result must still be 05 followed by eight digits.
 */

/** Canonical stored/validated shape. */
export const SAUDI_PHONE_RE = /^05\d{8}$/;

/** Arabic-Indic and Eastern Arabic-Indic digits -> ASCII. */
const DIGIT_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export function normalizeSaudiPhone(raw: string): string | null {
  if (typeof raw !== "string") return null;

  // Latinise digits, then drop every separator. Keep a leading + only long
  // enough to recognise it; it carries no information beyond "international".
  let value = raw
    .replace(/[٠-٩۰-۹]/g, (d) => DIGIT_MAP[d] ?? d)
    .replace(/[\s\-().]/g, "");

  if (value.startsWith("+")) value = value.slice(1);
  if (value.startsWith("00")) value = value.slice(2);

  // Anything that is not digits by now is not a phone number.
  if (!/^\d+$/.test(value)) return null;

  if (value.startsWith("966")) value = value.slice(3);

  // National form without the trunk zero, e.g. 551234567.
  if (value.length === 9 && value.startsWith("5")) value = `0${value}`;

  return SAUDI_PHONE_RE.test(value) ? value : null;
}

/** Convenience predicate for UI gating. */
export const isValidSaudiPhone = (raw: string): boolean =>
  normalizeSaudiPhone(raw) !== null;

/**
 * E.164 digits with no leading `+`: 05XXXXXXXX -> 9665XXXXXXXX.
 *
 * Used for the dashboard's tap-to-call links, which are built as `tel:+966…`
 * so they dial correctly from a device that is roaming or has a non-Saudi SIM.
 * Built on normalizeSaudiPhone so stored numbers and dialled numbers go
 * through exactly one set of rules.
 */
export function toSaudiE164(raw: string): string | null {
  const local = normalizeSaudiPhone(raw);
  return local === null ? null : `966${local.slice(1)}`;
}
