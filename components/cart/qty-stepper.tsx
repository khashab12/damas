"use client";

import * as React from "react";
import { useCart } from "./cart-context";

/**
 * Compact per-row stepper. Renders a lone "+" until qty > 0, then − [qty] +,
 * so rows stay clean.
 *
 * Every pointer entry point is stopped in the CAPTURE phase: react-pageflip
 * registers its own capture listener on an ancestor, so bubble-phase handlers
 * would fire too late and the page would turn under the tap.
 */
export function QtyStepper({
  id,
  name,
  price,
}: {
  id: string;
  name: string;
  price: number;
}) {
  const { qtyOf, add, remove } = useCart();
  const qty = qtyOf(id);

  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if ("nativeEvent" in e) e.nativeEvent.stopImmediatePropagation?.();
  };

  const handle = (action: () => void) => (e: React.PointerEvent) => {
    stop(e);
    action();
  };

  return (
    // No pointer guard on this wrapper: capture runs outside-in, so a guard
    // here (which calls stopImmediatePropagation) would kill the event before
    // the buttons' own capture handlers could run. Each button stops it itself.
    <span className="qty-stepper" onClickCapture={stop}>
      {qty > 0 ? (
        <>
          <button
            type="button"
            className="qty-btn qty-btn--minus"
            aria-label={`إنقاص ${name}`}
            onPointerDownCapture={handle(() => remove(id))}
          >
            −
          </button>
          <span className="qty-value" aria-live="polite">
            {qty}
          </span>
        </>
      ) : null}
      <button
        type="button"
        className="qty-btn qty-btn--plus"
        aria-label={`إضافة ${name}`}
        onPointerDownCapture={handle(() => add({ id, name, price }))}
      >
        +
      </button>
    </span>
  );
}

export default QtyStepper;
