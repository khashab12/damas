/**
 * "Today" means today in Riyadh, not today wherever the server happens to run.
 *
 * A Vercel function runs in UTC, so between 21:00 and 24:00 Riyadh time a naive
 * server-local "today" would already have rolled over and the dashboard would
 * blank out the evening's orders — the busiest part of a restaurant's day.
 *
 * Saudi Arabia has no daylight saving and has been fixed at UTC+03:00 since
 * 1990, so the offset is a constant rather than something to look up.
 */
export const RIYADH_UTC_OFFSET = "+03:00";

/** ISO instant for 00:00 Riyadh time on the day `now` falls in. */
export function startOfRiyadhDay(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the prefix we need.
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return new Date(`${day}T00:00:00${RIYADH_UTC_OFFSET}`).toISOString();
}
