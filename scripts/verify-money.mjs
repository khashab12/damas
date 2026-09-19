/**
 * Checks lib/money.ts, in particular that the two functions take DIFFERENT
 * units -- riyals vs halalas. That distinction is the whole reason the four
 * copy-pasted formatters were easy to merge wrongly.
 *
 *   node scripts/verify-money.mjs
 *
 * Plain node, same shape as verify-store.mjs: no test runner, no dependency.
 * lib/money.ts imports nothing, so Node's built-in type stripping runs it as-is.
 */
import { formatSar, formatHalalas } from "../lib/money.ts";

/* Expectations are pinned to the behaviour that already shipped, because this
   is a de-duplication and must not change a single rendered price. Note the
   fractional case: a non-integer goes through toFixed(2), so 2.5 renders as
   "2.50" and NOT "2.5". That is the pre-existing rule, verified against the
   four originals before they were merged. */
const cases = [
  // formatSar takes RIYALS
  [formatSar(2.5), "2.50", "formatSar(2.5) -- fractional keeps two decimals"],
  [formatSar(4), "4", "formatSar(4) -- whole number, no trailing .00"],
  [formatSar(11.25), "11.25", "formatSar(11.25)"],
  // formatHalalas takes HALALAS
  [formatHalalas(250), "2.50", "formatHalalas(250) -- 250 halalas is 2.50 SAR"],
  [formatHalalas(400), "4", "formatHalalas(400) -- whole riyals stay whole"],
  [formatHalalas(1125), "11.25", "formatHalalas(1125)"],
  [formatHalalas(0), "0", "formatHalalas(0)"],
  // The units must NOT be interchangeable -- this is the regression guard.
  [formatSar(250) !== formatHalalas(250), true, "the two units differ"],
  [formatSar(250), "250", "formatSar(250) treats its input as riyals"],
];

let failures = 0;
for (const [actual, expected, label] of cases) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}` + (ok ? "" : `  got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`));
}

console.log(failures ? `\n${failures} failure(s)` : "\nall money checks passed");
process.exit(failures ? 1 : 0);
