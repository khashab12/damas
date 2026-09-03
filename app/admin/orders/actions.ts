"use server";

import { redirect } from "next/navigation";
import { grantSession, verifyPassword } from "@/lib/admin/auth";

/** Blunts online guessing. Not a substitute for a strong password, but it
 *  turns an unattended script from thousands of tries a second into a few. */
const FAILED_ATTEMPT_DELAY_MS = 700;

/**
 * Sign in with the shared password.
 *
 * A Server Action, so the password is submitted in a POST body and compared on
 * the server — it never reaches client JavaScript, and there is no token for a
 * client to forge. Failure redirects back with a flag rather than echoing the
 * attempt back into the page.
 */
export async function signIn(formData: FormData): Promise<void> {
  const password = formData.get("password");

  if (typeof password === "string" && verifyPassword(password)) {
    await grantSession();
    redirect("/admin/orders");
  }

  await new Promise((resolve) => setTimeout(resolve, FAILED_ATTEMPT_DELAY_MS));
  redirect("/admin/orders?e=1");
}
