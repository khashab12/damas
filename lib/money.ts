/* ---------------------------------------------------------------------------
 * Money formatting, in one place.
 *
 * This logic was copy-pasted in four files with TWO different input units,
 * which is exactly the trap worth removing: `sar()` in the cart took riyals,
 * while `riyals()` in the notifier, the dashboard and the success page took
 * halalas. Same rounding rule, different meaning, identical-looking call.
 * The unit is now in the name of each function.
 *
 * Money is stored as integer halalas everywhere (1 SAR = 100 halalas); only
 * display crosses back into fractions.
 * ------------------------------------------------------------------------- */

/** Formats an amount ALREADY in riyals: 2.5 -> "2.5", 4 -> "4" (never "4.00"). */
export function formatSar(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** Formats an amount in HALALAS as riyals: 250 -> "2.5", 400 -> "4". */
export function formatHalalas(halalas: number): string {
  return formatSar(halalas / 100);
}
