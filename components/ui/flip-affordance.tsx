"use client";

import * as React from "react";

/* ---------------------------------------------------------------------------
 * Flip affordance: edge chevrons + page indicator + a one-time swipe hint.
 *
 * ONE component for the whole book, rendered once as an overlay sibling of the
 * FlipBook rather than once per page. Two reasons that is the right shape:
 *
 *  1. The page children in menu-book.tsx are frozen with an empty-dep useMemo
 *     so React never re-reconciles nodes react-pageflip has physically moved.
 *     Anything that must re-render when the page changes therefore cannot live
 *     inside them.
 *  2. It is drawn over the book, so it stays put while pages turn underneath.
 *
 * Everything here is decorative and carries pointer-events: none, so it can
 * never swallow a tap or a swipe meant for the book.
 * ------------------------------------------------------------------------- */

/** How long the first-load hint stays up before fading on its own. */
const HINT_MS = 3000;

/** Session-scoped, per the brief: no localStorage, so it returns next visit. */
const HINT_SEEN_KEY = "damas.fliphint.v1";

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** 3 -> "٣". The menu is Arabic throughout; Latin numerals would read as a
 *  foreign element next to the ٢٥/١٥ offer art and the page titles. */
function toArabicDigits(value: number): string {
  return String(value)
    .split("")
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join("");
}

type FlipAffordanceProps = {
  /** Zero-based index of the page on screen. */
  current: number;
  /** Total pages, cover included. */
  total: number;
};

export function FlipAffordance({ current, total }: FlipAffordanceProps) {
  // Read once, in a lazy initialiser rather than an effect. Safe to touch
  // sessionStorage during render here specifically because this component is
  // never server-rendered: menu-book.tsx returns a static placeholder until
  // it has hydrated, so the first render of this subtree is already on the
  // client. Doing it in an effect instead would mean a second render pass.
  const [hintDismissed, setHintDismissed] = React.useState(() => {
    try {
      return sessionStorage.getItem(HINT_SEEN_KEY) === "1";
    } catch {
      // Private mode or storage disabled: show the hint, it is harmless.
      return false;
    }
  });

  const dismissHint = React.useCallback(() => {
    setHintDismissed(true);
    try {
      sessionStorage.setItem(HINT_SEEN_KEY, "1");
    } catch {
      // Nothing to persist to; the in-memory flag still hides it for this load.
    }
  }, []);

  // Derived, not stored. Being past the cover already means the customer has
  // worked the book out, so the hint has nothing left to teach -- and deriving
  // it avoids writing state from an effect just to mirror a prop.
  const hintVisible = !hintDismissed && current === 0;

  // Fades on its own after HINT_MS...
  React.useEffect(() => {
    if (!hintVisible) return;
    const timer = setTimeout(dismissHint, HINT_MS);
    return () => clearTimeout(timer);
  }, [hintVisible, dismissHint]);

  // ...or the moment the customer touches the book, whichever comes first.
  // Capture phase on window so it fires however the interaction started, and
  // passive because this only observes.
  React.useEffect(() => {
    if (!hintVisible) return;
    const onFirstTouch = () => dismissHint();
    window.addEventListener("pointerdown", onFirstTouch, {
      capture: true,
      once: true,
      passive: true,
    });
    return () =>
      window.removeEventListener("pointerdown", onFirstTouch, {
        capture: true,
      });
  }, [hintVisible, dismissHint]);

  // A flip is proof enough; record it so the hint does not reappear if they
  // come back to the cover. Storage write only -- no setState, so this cannot
  // trigger the cascading render the hook lint rule guards against.
  React.useEffect(() => {
    if (current === 0) return;
    try {
      sessionStorage.setItem(HINT_SEEN_KEY, "1");
    } catch {
      // Nothing to persist to.
    }
  }, [current]);

  const hasPrev = current > 0;
  const hasNext = current < total - 1;

  return (
    <div className="flip-affordance" aria-hidden>
      {/* RTL: the right edge goes back, the left edge goes forward. */}
      {hasPrev ? (
        <span className="flip-arrow flip-arrow--prev">
          <Chevron direction="right" />
        </span>
      ) : null}

      {hasNext ? (
        <span className="flip-arrow flip-arrow--next">
          <Chevron direction="left" />
        </span>
      ) : null}

      <span className="flip-indicator" dir="rtl">
        {toArabicDigits(current + 1)}
        <span className="flip-indicator-sep"> / </span>
        {toArabicDigits(total)}
      </span>

      {hintVisible ? (
        <span className="flip-hint" dir="rtl">
          <span className="flip-hint-track">
            <span className="flip-hint-dot" />
          </span>
          <span className="flip-hint-text">اسحب للتقليب</span>
        </span>
      ) : null}
    </div>
  );
}

/** Stroked chevron. SVG rather than a glyph so the weight matches the brand
 *  gold hairlines instead of depending on which Arabic font resolves. */
function Chevron({ direction }: { direction: "left" | "right" }) {
  const d = direction === "left" ? "M14 4 L7 11 L14 18" : "M8 4 L15 11 L8 18";
  return (
    <svg viewBox="0 0 22 22" className="flip-chevron" focusable="false">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default FlipAffordance;
