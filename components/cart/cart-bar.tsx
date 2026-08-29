"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { sar, useCart } from "./cart-context";

/**
 * Floating cart button + bottom sheet.
 *
 * Rendered as a sibling of the book (not inside a page), so react-pageflip
 * never owns these nodes and the page's overflow:hidden cannot clip them.
 * Pointer events are stopped in the capture phase all the same, because the
 * sheet overlays the book.
 */
export function CartBar() {
  const { lines, totalCount, totalPrice, add, remove, clear } = useCart();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if ("nativeEvent" in e) e.nativeEvent.stopImmediatePropagation?.();
  };

  // Only a click guard. A pointerdown guard in the CAPTURE phase would run
  // before any descendant's handler and kill it -- these containers wrap the
  // sheet's own buttons. They also sit OUTSIDE the book subtree, so
  // react-pageflip never sees their events and no stronger guard is needed.
  const guard = { onClickCapture: stop };

  async function submit(e: React.PointerEvent) {
    stop(e);
    if (submitting || lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      // ids + quantities ONLY. Prices stay server-side by design.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ itemId: l.id, quantity: l.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? "تعذّر إنشاء الطلب.");
        return;
      }
      clear();
      // With a provider wired up we would follow data.redirectUrl.
      router.push(
        data.redirectUrl
          ? data.redirectUrl
          : `/order/success?id=${encodeURIComponent(data.orderId)}`,
      );
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setSubmitting(false);
    }
  }

  if (totalCount === 0) return null;

  // Derived, not synced in an effect: an emptied cart unmounts this whole
  // component anyway, so the sheet can never be left open over nothing.

  return (
    <>
      {open ? (
        <div
          className="cart-scrim"
          onPointerDown={(e) => {
            stop(e);
            setOpen(false);
          }}
        />
      ) : null}

      <div
        className={`cart-sheet${open ? " cart-sheet--open" : ""}`}
        dir="rtl"
        {...guard}
      >
        <div className="cart-sheet-head">
          <span>طلبك</span>
          <button
            type="button"
            className="cart-sheet-close"
            aria-label="إغلاق"
            onPointerDownCapture={(e) => {
              stop(e);
              setOpen(false);
            }}
          >
            ✕
          </button>
        </div>

        <div className="cart-sheet-lines">
          {lines.map((line) => (
            <div className="cart-line" key={line.id}>
              <span className="cart-line-name">{line.name}</span>
              <span className="cart-line-price">
                {sar(line.price * line.qty)} ريال
              </span>
              <span className="qty-stepper">
                <button
                  type="button"
                  className="qty-btn qty-btn--minus"
                  aria-label={`إنقاص ${line.name}`}
                  onPointerDownCapture={(e) => {
                    stop(e);
                    remove(line.id);
                  }}
                >
                  −
                </button>
                <span className="qty-value">{line.qty}</span>
                <button
                  type="button"
                  className="qty-btn qty-btn--plus"
                  aria-label={`إضافة ${line.name}`}
                  onPointerDownCapture={(e) => {
                    stop(e);
                    add({ id: line.id, name: line.name, price: line.price });
                  }}
                >
                  +
                </button>
              </span>
            </div>
          ))}
        </div>

        <div className="cart-sheet-total">
          <span>الإجمالي</span>
          <strong>{sar(totalPrice)} ريال</strong>
        </div>

        {error ? <p className="cart-sheet-error">{error}</p> : null}

        <button
          type="button"
          className="cart-cta"
          disabled={submitting}
          onPointerDownCapture={submit}
        >
          {submitting ? "جارٍ الإرسال…" : "متابعة الطلب"}
        </button>
      </div>

      <button
        type="button"
        className="cart-fab"
        dir="rtl"
        aria-label={`عرض الطلب: ${totalCount} صنف`}
        {...guard}
        onPointerDownCapture={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
      >
        <span className="cart-fab-count">{totalCount}</span>
        <span className="cart-fab-label">عرض الطلب</span>
        <span className="cart-fab-total">{sar(totalPrice)} ريال</span>
      </button>
    </>
  );
}

export default CartBar;
