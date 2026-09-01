"use client";

import * as React from "react";
import { useCart } from "./cart-context";

/**
 * Clears the cart, and only once the server says the order is confirmed.
 *
 * The success page passes the order's server-side status, so an unknown or
 * missing order id leaves the cart untouched and the customer can retry.
 */
export function ClearCartOnSuccess({ paid }: { paid: boolean }) {
  const { clear } = useCart();

  React.useEffect(() => {
    if (paid) clear();
  }, [paid, clear]);

  return null;
}

export default ClearCartOnSuccess;
