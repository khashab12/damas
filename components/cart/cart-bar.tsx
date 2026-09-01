"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { sar, useCart } from "./cart-context";
import { isValidSaudiPhone } from "@/lib/orders/phone";

/**
 * Floating cart button + bottom sheet.
 *
 * Rendered as a sibling of the book (not inside a page), so react-pageflip
 * never owns these nodes and the page's overflow:hidden cannot clip them.
 * Pointer events are stopped in the capture phase all the same, because the
 * sheet overlays the book.
 */
export function CartBar() {
  const { lines, totalCount, totalPrice, add, remove } = useCart();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"cart" | "details">("cart");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [fulfilment, setFulfilment] = React.useState<"delivery" | "pickup">(
    "delivery",
  );
  const [address, setAddress] = React.useState("");
  const [note, setNote] = React.useState("");
  const router = useRouter();

  // Mirrors the server schema in lib/orders/pricing.ts. The server re-validates
  // regardless; this only gates the button.
  const nameOk = name.trim().length >= 2;
  // Same normalisation as the server, so the gate accepts what the API accepts.
  const phoneOk = isValidSaudiPhone(phone);
  const addressOk = fulfilment === "pickup" || address.trim().length > 0;
  const detailsValid = nameOk && phoneOk && addressOk;

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
    if (submitting || lines.length === 0 || !detailsValid) return;
    setSubmitting(true);
    setError(null);
    try {
      // ids + quantities ONLY. Prices stay server-side by design.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Still ids + quantities ONLY. No prices leave the client.
          items: lines.map((l) => ({ itemId: l.id, quantity: l.qty })),
          customerName: name.trim(),
          customerPhone: phone.trim(),
          fulfilment,
          ...(fulfilment === "delivery" ? { address: address.trim() } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? "تعذّر إنشاء الطلب.");
        return;
      }
      // The cart is deliberately NOT cleared here: payment has not succeeded
      // yet. It is cleared on the success page once the order is confirmed
      // paid, so a failed payment returns the customer to a full cart.
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
          <span>
            {step === "cart" ? "طلبك" : "تأكيد الطلب"}
            {step === "details" ? (
              <button
                type="button"
                className="cart-back"
                onPointerDownCapture={(e) => {
                  stop(e);
                  setStep("cart");
                }}
              >
                رجوع
              </button>
            ) : null}
          </span>
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
          {step === "details"
            ? lines.map((line) => (
                <div className="cart-line cart-line--compact" key={line.id}>
                  <span className="cart-line-name">{line.name}</span>
                  <span className="cart-line-qty">× {line.qty}</span>
                  <span className="cart-line-price">
                    {sar(line.price * line.qty)} ريال
                  </span>
                </div>
              ))
            : lines.map((line) => (
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
                        add({
                          id: line.id,
                          name: line.name,
                          price: line.price,
                        });
                      }}
                    >
                      +
                    </button>
                  </span>
                </div>
              ))}
        </div>

        {step === "details" ? (
          <div className="cart-form">
            <div className="cart-sheet-total cart-subtotal">
              <span>المجموع الفرعي</span>
              <span>{sar(totalPrice)} ريال</span>
            </div>

            <div
              className="cart-toggle"
              role="group"
              aria-label="طريقة الاستلام"
            >
              <button
                type="button"
                className={`cart-toggle-btn${fulfilment === "delivery" ? " is-active" : ""}`}
                aria-pressed={fulfilment === "delivery"}
                onPointerDownCapture={(e) => {
                  stop(e);
                  setFulfilment("delivery");
                }}
              >
                توصيل
              </button>
              <button
                type="button"
                className={`cart-toggle-btn${fulfilment === "pickup" ? " is-active" : ""}`}
                aria-pressed={fulfilment === "pickup"}
                onPointerDownCapture={(e) => {
                  stop(e);
                  setFulfilment("pickup");
                }}
              >
                استلام من الفرع
              </button>
            </div>

            <label className="cart-field">
              <span>الاسم</span>
              <input
                className="cart-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onPointerDownCapture={stop}
                autoComplete="name"
                placeholder="الاسم الكامل"
              />
            </label>

            <label className="cart-field">
              <span>رقم الجوال</span>
              <input
                className="cart-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onPointerDownCapture={stop}
                inputMode="numeric"
                autoComplete="tel"
                placeholder="05XXXXXXXX أو ‎+966"
                aria-invalid={phone.length > 0 && !phoneOk}
              />
              {phone.length > 0 && !phoneOk ? (
                <em className="cart-hint">صيغة الرقم غير صحيحة (05XXXXXXXX)</em>
              ) : null}
            </label>

            {fulfilment === "delivery" ? (
              <label className="cart-field">
                <span>العنوان</span>
                <textarea
                  className="cart-input cart-textarea"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onPointerDownCapture={stop}
                  rows={2}
                  placeholder="الحي، الشارع، رقم المبنى"
                />
              </label>
            ) : null}

            <label className="cart-field">
              <span>ملاحظات</span>
              <textarea
                className="cart-input cart-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onPointerDownCapture={stop}
                rows={2}
                placeholder="اختياري"
              />
            </label>
          </div>
        ) : null}

        <div className="cart-sheet-total">
          <span>الإجمالي</span>
          <strong>{sar(totalPrice)} ريال</strong>
        </div>

        {error ? <p className="cart-sheet-error">{error}</p> : null}

        {step === "cart" ? (
          <button
            type="button"
            className="cart-cta"
            onPointerDownCapture={(e) => {
              stop(e);
              setStep("details");
            }}
          >
            متابعة الطلب
          </button>
        ) : (
          <button
            type="button"
            className="cart-cta"
            disabled={submitting || !detailsValid}
            onPointerDownCapture={submit}
          >
            {submitting ? "جارٍ الإرسال…" : "تأكيد الطلب"}
          </button>
        )}
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
