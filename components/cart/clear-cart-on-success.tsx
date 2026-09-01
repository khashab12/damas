"use client";

import * as React from "react";
import { useCart } from "./cart-context";

/**
 * Clears the cart, and only on a CONFIRMED successful payment.
 *
 * The success page renders this with the order's server-side status. A merely
 * "pending" order does not clear anything — the customer may still end up on
 * the failure path, and must get their cart back if they do.
 */
export function ClearCartOnSuccess({ paid }: { paid: boolean }) {
  const { clear } = useCart();

  React.useEffect(() => {
    if (paid) clear();
  }, [paid, clear]);

  return null;
}

export default ClearCartOnSuccess;
