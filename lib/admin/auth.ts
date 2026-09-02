import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/* ---------------------------------------------------------------------------
 * Admin gate: one shared password for the whole restaurant, checked on the
 * server.
 *
 * Not a user system — deliberately. The staff share a tablet; per-user logins
 * would be ceremony nobody performs.
 *
 * The cookie never carries the password. It carries an HMAC derived from it,
 * so a stolen cookie does not reveal the secret, and changing ADMIN_PASSWORD
 * invalidates every existing session for free. Every check happens in a Server
 * Component or Route Handler: the client is never trusted to report whether it
 * is logged in, and the order data is never sent to an unauthenticated client
 * for it to hide.
 * ------------------------------------------------------------------------- */

export const ADMIN_COOKIE = "damas_admin";

/** 30 days. The tablet in the shop should not be logging in every morning. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Domain separator, so this HMAC can never be confused with another use of
 *  the same secret. Bump the suffix to force every session to re-authenticate. */
const SESSION_LABEL = "damas-admin-session-v1";

function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  return value && value.length > 0 ? value : null;
}

/** True when the deployment has a password configured at all. */
export function isAdminConfigured(): boolean {
  return adminPassword() !== null;
}

function sessionToken(password: string): string {
  return createHmac("sha256", password).update(SESSION_LABEL).digest("hex");
}

/**
 * Constant-time string compare. A length mismatch is reported as a plain
 * mismatch rather than throwing, and short-circuits — length is not a secret
 * worth protecting here, the contents are.
 */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Checks a submitted password.
 *
 * Fails closed: with no ADMIN_PASSWORD set, nothing is accepted. An
 * unconfigured deployment is locked, never wide open.
 */
export function verifyPassword(candidate: string): boolean {
  const password = adminPassword();
  if (!password) return false;
  return safeEqual(candidate, password);
}

/** Reads the session cookie and validates it against the current password. */
export async function isAuthenticated(): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;

  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;

  return safeEqual(cookie, sessionToken(password));
}

/** Issues the session cookie. Only ever called after verifyPassword passes. */
export async function grantSession(): Promise<void> {
  const password = adminPassword();
  if (!password) return;

  (await cookies()).set(ADMIN_COOKIE, sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    // Plain HTTP on localhost during development would drop a secure cookie.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
