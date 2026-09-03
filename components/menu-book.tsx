"use client";

import * as React from "react";
import Image from "next/image";
import HTMLFlipBook from "react-pageflip";
import { FlipAffordance } from "@/components/ui/flip-affordance";
import { LocationMap } from "@/components/ui/location-map";
import { MenuCard } from "@/components/ui/menu-card";
import { PageFooter } from "@/components/ui/page-footer";
import {
  boxItems,
  dishItems,
  platterItems,
  mainItems,
  mealItems,
  sandwichItemsA,
  sandwichItemsB,
  MAINS_NOTE,
  MEALS_NOTE,
  SANDWICH_TAGLINE,
} from "@/data/menu";

type FlipBookApi = {
  pageFlip: () => {
    turnToPage: (page: number) => void;
    getCurrentPageIndex: () => number;
    destroy?: () => void;
  };
};

// react-pageflip ships loose types that don't declare `children` or the ref API,
// so we narrow it to a component that accepts the props we pass.
const FlipBook = HTMLFlipBook as unknown as React.ComponentType<
  Record<string, unknown> & {
    children?: React.ReactNode;
    ref?: React.Ref<FlipBookApi>;
  }
>;

// Third inner page: offers. Images are 1080x1080 (1:1); the rendered size is
// constrained in CSS so both fit the page at 375px.
const OFFER_SIZE = 1080;
const offerImages = [
  { src: "/offers/offer-25.jpg", alt: "عرض ٢٥" },
  { src: "/offers/offer-15.jpg", alt: "عرض ١٥" },
];

// Aspect ratio for the stretched page, not fixed pixels.
const PAGE_WIDTH = 370;
const PAGE_HEIGHT = 500;

// Single-page mode is enforced by geometry: react-pageflip only picks landscape
// when its container is wide enough for two pages (~MIN_WIDTH * 2). Capping the
// container below that threshold guarantees portrait — one page — at every size.
// Lowered so a short landscape viewport can shrink the book below the old
// 260px floor. MAX_WIDTH stays under MIN_WIDTH * 2 so two-page mode remains
// unreachable.
const MIN_WIDTH = 200;
const MAX_WIDTH = 390; // < MIN_WIDTH * 2 (400)
const MIN_HEIGHT = 270;
const MAX_HEIGHT = 527;

/**
 * False while server-rendering and during hydration, true afterwards.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect(() => setMounted(true))`:
 * that pattern sets state synchronously inside an effect, which schedules a
 * second render pass React has no way to batch away — the cascading-render case
 * the react-hooks lint rule exists to catch. Here React reads the server
 * snapshot (false) while rendering on the server and the client snapshot (true)
 * once hydrated, with no state write and no extra pass.
 *
 * The store never changes, so `subscribe` has nothing to notify; it just has to
 * return an unsubscribe function. Both callbacks are module-level constants so
 * their identity is stable across renders.
 */
const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot,
  );
}

function MenuBook() {
  // react-pageflip touches `document` during init, so only render on the client.
  const mounted = useHydrated();
  const bookRef = React.useRef<FlipBookApi | null>(null);

  // Drives the chevrons and the page indicator. Updating this re-renders
  // MenuBook, which is safe: `pages` below is memoised with an empty dep list,
  // so React sees identical element references and skips reconciling the nodes
  // react-pageflip has relocated. Only the overlay actually re-renders.
  const [currentPage, setCurrentPage] = React.useState(0);

  // Stable identity on purpose. An inline arrow would hand react-pageflip a
  // brand-new prop on every indicator update, and this library re-runs setup
  // work when its props change -- exactly the churn the frozen `pages` memo
  // below exists to avoid.
  const handleFlip = React.useCallback(
    (e: { data: number }) => setCurrentPage(e.data),
    [],
  );

  // React's dev double-mount (StrictMode) mounts, unmounts, then remounts this
  // subtree. react-pageflip moves its pages into its own .stf__block on init but
  // does not tear that DOM down on unmount, so the second init leaves an orphan
  // page behind -- the book then holds 9 pages for 8 children and lands on a
  // stale index, which renders blank. Destroying the instance on unmount makes
  // the remount start from a clean container.
  React.useEffect(() => {
    const book = bookRef.current;
    return () => {
      try {
        book?.pageFlip?.()?.destroy?.();
      } catch {
        // Instance may already be torn down; nothing to clean up.
      }
    };
  }, [mounted]);

  // The book can settle one page in rather than on the cover: at the moment the
  // instance first exists it is not yet initialised (getCurrentPageIndex() is
  // undefined, so turnToPage is a no-op) and the stray flip lands just after.
  React.useEffect(() => {
    if (!mounted) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Correct exactly once, after the churn has stopped. Calling turnToPage on
    // every frame instead fights the animation and overshoots to the last page.
    const correctOnce = () => {
      const flip = bookRef.current?.pageFlip?.();
      if (flip?.getCurrentPageIndex?.() !== 0) flip?.turnToPage(0);
    };

    // Each page image that finishes loading makes react-pageflip re-run its
    // layout, and the book drifts forward every time. Wait for the window load
    // event so every image is settled before snapping to the cover.
    //
    // `load` alone is not late enough. The Arabic webfonts resolve after it,
    // and re-flowing the menu rows in the new fill-the-page layout is itself a
    // relayout that drifts the book -- so the correction used to fire while a
    // further drift was still queued behind it, leaving the customer on page 2
    // with no input. Waiting for BOTH signals puts the correction after the
    // last relayout rather than in the middle of them.
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(correctOnce, 150);
    };

    const loaded =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            window.addEventListener("load", () => resolve(), { once: true });
          });

    // document.fonts is absent on nothing we support, but a rejected
    // fonts.ready (a font that fails to load) must not strand the book.
    const fonts = document.fonts?.ready ?? Promise.resolve();

    void Promise.all([loaded, fonts.catch(() => undefined)]).then(schedule);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [mounted]);

  // react-pageflip physically MOVES these nodes out of React's container and into
  // its own .stf__block. React still believes it owns them, so any re-render
  // (Fast Refresh in dev, or any state change) makes React re-insert a node the
  // library already relocated -- producing a duplicate page and a blank render.
  //
  // Freezing the element identities with an empty dep list makes React bail out
  // of reconciling this subtree entirely, so it never touches the moved DOM.
  // Every child also carries an explicit key so reconciliation can match them.
  const pages = React.useMemo(
    () => [
      <div
        key="cover"
        className="page page-cover page-cover-top"
        data-density="hard"
      >
        <video
          className="cover-video"
          src="/cover.mp4"
          autoPlay
          muted
          loop
          // Without playsInline iOS Safari takes the video fullscreen instead
          // of playing it in place.
          playsInline
          // react-pageflip sets display:none on inactive pages, and a browser
          // will not begin a lazy/metadata-only load inside a display:none box
          // -- the same trap that left the offer images blank. Force a full
          // preload so the cover is ready before it is ever shown.
          preload="auto"
          controls={false}
          disablePictureInPicture
          aria-label="غلاف مطعم دمس"
          // Only the click is swallowed. Blocking pointerdown/touchstart as
          // well (as the map does) also blocks react-pageflip's drag, and
          // because this video is full-bleed that left the cover impossible to
          // turn by either tap or swipe.
          onClickCapture={(e) => e.stopPropagation()}
        />
      </div>,

      <div key="menu-boxes" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuCard title="علب الطعام" items={boxItems} />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-dishes" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuCard title="الأطباق والوجبات" items={dishItems} />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-platters" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuCard title="أطباق وعلب" items={platterItems} />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-mains" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuCard
            title="الأطباق الرئيسية"
            items={mainItems}
            note={MAINS_NOTE}
          />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-meals" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuCard
            title="الوجبات والطواجن"
            items={mealItems}
            note={MEALS_NOTE}
          />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-sandwiches-a" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuCard
            title="الساندوتشات ١"
            items={sandwichItemsA}
            className="menu-card--dense"
          />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-sandwiches-b" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuCard
            title="الساندوتشات ٢"
            items={sandwichItemsB}
            note={SANDWICH_TAGLINE}
            className="menu-card--dense"
          />
        </div>
        <PageFooter />
      </div>,

      // Reuses the menu card chrome (.menu-card / .menu-card-head) rather than
      // its own heading style, so the gold bar, radius and shadow match the
      // menu pages exactly.
      <div key="offers" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <div className="menu-card">
            <div className="menu-card-head">العروض</div>
            <div className="menu-card-body offers-body">
              {offerImages.map((offer) => (
                <Image
                  key={offer.src}
                  src={offer.src}
                  alt={offer.alt}
                  width={OFFER_SIZE}
                  height={OFFER_SIZE}
                  className="offer-img"
                  // MUST stay eager. react-pageflip sets display:none on every
                  // page that is not currently rendered, and a lazy image inside
                  // a display:none box never intersects, so it never starts
                  // loading. The page would then flip in with no images until the
                  // fetch completed -- blank whenever the files are not cached.
                  loading="eager"
                />
              ))}
            </div>
          </div>
        </div>
        <PageFooter />
      </div>,

      <div key="location" className="page with-footer" dir="rtl">
        <div className="page-content map-page">
          <h2 className="map-title">موقعنا</h2>

          <div className="map-holder">
            <LocationMap
              location="العزيزية، شارع الشباب — الرياض"
              coordinates="بجوار الثوب الأبيض، عمارات الموسى"
              statusLabel="مفتوح"
              hintLabel="اضغط للتكبير"
            />
          </div>

          <a
            className="map-btn"
            href="https://maps.app.goo.gl/nmrjZVDran8zZcJ3A"
            target="_blank"
            rel="noopener noreferrer"
            // Same reason as the map: keep the tap off react-pageflip so
            // following the link never also turns the page. Capture phase, so
            // this runs before the library's own handlers. The anchor's default
            // navigation is untouched -- nothing calls preventDefault here.
            onPointerDownCapture={(e) => e.stopPropagation()}
            onMouseDownCapture={(e) => e.stopPropagation()}
            onTouchStartCapture={(e) => e.stopPropagation()}
            onClickCapture={(e) => e.stopPropagation()}
          >
            افتح على الخرائط
          </a>
        </div>
        <PageFooter />
      </div>,
    ],
    [],
  );

  /**
   * The book element itself is frozen, for the same reason `pages` is.
   *
   * Tracking the page for the indicator means MenuBook re-renders on every
   * flip. Re-rendering <FlipBook> makes react-pageflip re-run its update pass,
   * which can land on a different page, which fires onFlip, which sets state
   * again -- a feedback loop that had the book oscillating between the cover
   * and page 2 on its own, with nobody touching it.
   *
   * Memoising the element gives React the identical reference each time, so it
   * skips this subtree entirely and only the overlay re-renders. `handleFlip`
   * is a stable useCallback and `pages` an empty-dep memo, so this never
   * actually recomputes -- the deps are listed for correctness, not churn.
   */
  const book = React.useMemo(
    () => (
      <FlipBook
        width={PAGE_WIDTH}
        height={PAGE_HEIGHT}
        size="stretch"
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        minHeight={MIN_HEIGHT}
        maxHeight={MAX_HEIGHT}
        // Curl/depth shading during the flip. This is the animation's own
        // shading, not the static gutter -- the gutter is hidden in CSS.
        drawShadow={true}
        maxShadowOpacity={0.5}
        flippingTime={900}
        showCover={true}
        usePortrait={true}
        autoSize={true}
        startPage={0}
        // Touch/swipe support on mobile; let vertical scrolling through.
        mobileScrollSupport={true}
        useMouseEvents={true}
        swipeDistance={30}
        clickEventForward={true}
        // Fires after each turn, including swipes and the library's own
        // programmatic turns, so the indicator can never drift from the page
        // actually on screen.
        onFlip={handleFlip}
        ref={bookRef}
      >
        {pages}
      </FlipBook>
    ),
    [pages, handleFlip],
  );

  // Until react-pageflip can initialise (it touches `document`, so not on the
  // server) render a static cover at the same size instead of nothing.
  // Returning null here meant the server sent NO markup for the book at all, so
  // the page was genuinely blank until JS hydrated and the library booted --
  // brief locally, but stretching on a slow load, which reads as the book
  // "sometimes rendering blank". The placeholder matches the mounted layout, so
  // there is no hydration mismatch and no jump when the real book swaps in.
  if (!mounted) {
    return (
      <div className="book-shell mx-auto flex w-full items-center justify-center">
        <div
          className="page book-placeholder w-full"
          style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
        >
          {/* Same video as the real cover, so it is in the server HTML and
              starts downloading before hydration rather than after. */}
          <video
            className="cover-video"
            src="/cover.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            controls={false}
            aria-hidden
          />
        </div>
      </div>
    );
  }

  return (
    <div className="book-shell mx-auto flex w-full items-center justify-center">
      {book}

      {/* Overlay, not a per-page child: see components/ui/flip-affordance.tsx
          for why it cannot live inside the frozen page subtree. */}
      <FlipAffordance current={currentPage} total={pages.length} />
    </div>
  );
}

export default MenuBook;
