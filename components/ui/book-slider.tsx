"use client";

import * as React from "react";
import Image from "next/image";
import HTMLFlipBook from "react-pageflip";
import { LocationMap } from "@/components/ui/expand-map";
import { MenuPage, type MenuItem } from "@/components/ui/menu-page";
import { PageFooter } from "@/components/ui/page-footer";

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

// Menu pages. Prices are in SAR, calories per serving.
const boxItems: MenuItem[] = [
  { name: "علبة فول كلاسك صغير", price: "2.5", calories: "220" },
  { name: "علبة فول كلاسك وسط", price: "4", calories: "250" },
  { name: "علبة فول كلاسك كبير", price: "6", calories: "280" },
  { name: "علبة عجين فلافل صغير", price: "3", calories: "210" },
  { name: "علبة عجين فلافل كبير", price: "6", calories: "250" },
  { name: "علبة بطاطس مهروسة صغير", price: "2.5", calories: "120" },
  { name: "علبة بطاطس مهروسة وسط", price: "4", calories: "180" },
  { name: "علبة بطاطس مهروسة كبير", price: "6", calories: "200" },
  { name: "علبة سلطة جبنة صغير", price: "3", calories: "180" },
  { name: "علبة سلطة جبنة وسط", price: "4", calories: "200" },
  { name: "علبة سلطة جبنة كبير", price: "6", calories: "220" },
];

const dishItems: MenuItem[] = [
  { name: "فلافل 2 حبة", price: "1", calories: "120" },
  { name: "حبة بيض مسلوق", price: "1.5", calories: "50" },
  { name: "طبق بيض اومليت وسط", price: "4", calories: "100" },
  { name: "طبق بيض اومليت كبير", price: "6", calories: "200" },
  { name: "بطاطس شبتي / أو صوابع صغير", price: "3", calories: "250" },
  { name: "بطاطس شبتي / أو صوابع كبير", price: "6", calories: "300" },
  { name: "بطاطس شبتي بالجبن", price: "3", calories: "250" },
];

const platterItems: MenuItem[] = [
  { name: "علبة بابا غنوج صغير", price: "2.5", calories: "120" },
  { name: "علبة بابا غنوج وسط", price: "4", calories: "160" },
  { name: "علبة بابا غنوج كبير", price: "6", calories: "200" },
  { name: "علبة مسقعة صغير", price: "2.5", calories: "130" },
  { name: "علبة مسقعة وسط", price: "4", calories: "170" },
  { name: "علبة مسقعة كبير", price: "6", calories: "250" },
  { name: "علبة باذنجان حار صغير", price: "2.5", calories: "120" },
  { name: "علبة باذنجان حار وسط", price: "4", calories: "180" },
  { name: "علبة باذنجان حار كبير", price: "6", calories: "260" },
];

const mainItems: MenuItem[] = [
  { name: "طبق مشكل مقالي كبير", price: "15", calories: "300" },
  { name: "طبق مشكل صغير", price: "10", calories: "250" },
  { name: "طبق ايدام صغير", price: "3", calories: "180" },
  { name: "طبق ايدام وسط", price: "5", calories: "200" },
  { name: "طبق ايدام كبير", price: "7", calories: "220" },
];

// Long item names here; rows are allowed to wrap to two or three lines.
const mealItems: MenuItem[] = [
  {
    name: "نص دجاج مقلي مع نفر رز وخضار وسلطة وشورية",
    price: "26",
    calories: "1060",
  },
  {
    name: "ربع دجاج مقلي مع نفر رز وخضار وسلطة وشورية",
    price: "15",
    calories: "710",
  },
  {
    name: "ربع دجاج فرن مع بطاطس ونفر رز وسلطة وشورية",
    price: "26",
    calories: "1100",
  },
  {
    name: "نص دجاج فرن مع بطاطس ونفر رز وسلطة وشورية",
    price: "15",
    calories: "820",
  },
  {
    name: "طاجن بطاطس باللحم مع نفر رز وسلطة وشورية",
    price: "25",
    calories: "780",
  },
];

// Sandwiches. `subtitle` carries the ingredients line; the last four items on
// page two deliberately have none.
const sandwichItemsA: MenuItem[] = [
  {
    name: "ساندوتش فول كلاسك",
    subtitle: "(فول + سلطة)",
    price: "2",
    calories: "250",
  },
  {
    name: "ساندوتش فول بالبيض",
    subtitle: "(فول + بيض + سلطة)",
    price: "3",
    calories: "335",
  },
  {
    name: "ساندوتش فلافل كلاسك",
    subtitle: "(فلافل + سلطة)",
    price: "2",
    calories: "280",
  },
  {
    name: "ساندوتش مشكل فلافل",
    subtitle: "(فلافل + سلطة + بطاطس + باذنجان)",
    price: "3",
    calories: "400",
  },
  {
    name: "ساندوتش مشكل فلافل بالبيض",
    subtitle: "(فلافل + سلطة)",
    price: "4",
    calories: "470",
  },
  {
    name: "ساندوتش مشكل صبة",
    subtitle: "(فلافل + جبنة مصفقة + بطاطس مهروسة + صوابع)",
    price: "5",
    calories: "660",
  },
  {
    name: "ساندوتش مشكل (ديناميت)",
    subtitle: "(فلافل + جبنة مصفقة + بطاطس مهروسة + صوابع + بيض)",
    price: "6",
    calories: "740",
  },
  {
    name: "ساندوتش بطاطس صوابع",
    subtitle: "(بطاطس صوابع + سلطة)",
    price: "3",
    calories: "280",
  },
  {
    name: "ساندوتش بطاطس شيبسي",
    subtitle: "(بطاطس شيبسي + سلطة)",
    price: "3",
    calories: "250",
  },
];

const sandwichItemsB: MenuItem[] = [
  {
    name: "ساندوتش بيض مسلوق",
    subtitle: "(بيض مسلوق + سلطة)",
    price: "5",
    calories: "330",
  },
  {
    name: "ساندوتش بيض اوملیت",
    subtitle: "(بيض اومليت + سلطة)",
    price: "4",
    calories: "230",
  },
  {
    name: "ساندوتش جبنة بالسلطة",
    subtitle: "(جبنة + سلطة)",
    price: "3",
    calories: "220",
  },
  {
    name: "ساندوتش بابا غنوج",
    subtitle: "(بابا غنوج + سلطة)",
    price: "2",
    calories: "250",
  },
  {
    name: "ساندوتش زهرة",
    subtitle: "(زهرة + سلطة)",
    price: "2",
    calories: "250",
  },
  {
    name: "ساندوتش عجة",
    subtitle: "(عجة بالبيض + سلطة)",
    price: "5",
    calories: "350",
  },
  { name: "ساندوتش جبنة بالسلطة بالبيض", price: "4", calories: "300" },
  { name: "ساندوتش بطاطس صوابع بالبيض", price: "5", calories: "350" },
  { name: "ساندوتش بطاطس شيبسي بالبيض", price: "5", calories: "350" },
  { name: "ساندوتش بتنجان مقلي مع سلطة وطحينة", price: "2", calories: "230" },
  { name: "ساندوتش بطاطس بانية مع سلطة وطحينة", price: "3", calories: "300" },
];

// Notes shown under the rows of their respective menu pages.
const MAINS_NOTE = "يوجد كل يوم ثلاثة أصناف إضافية متنوعة حسب أسبقية الحجز";
const MEALS_NOTE = "(بامية أو خضار مشكل أو بازلا حسب الطلب)";
const SANDWICH_TAGLINE = "فول وفلافل ولاد البلد على اصوله";

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

function Component() {
  // react-pageflip touches `document` during init, so only render on the client.
  const [mounted, setMounted] = React.useState(false);
  const bookRef = React.useRef<FlipBookApi | null>(null);

  React.useEffect(() => setMounted(true), []);

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
    const schedule = () => {
      timer = setTimeout(correctOnce, 150);
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      window.removeEventListener("load", schedule);
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
          <MenuPage title="علب الطعام" items={boxItems} />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-dishes" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuPage title="الأطباق والوجبات" items={dishItems} />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-platters" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuPage title="أطباق وعلب" items={platterItems} />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-mains" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuPage
            title="الأطباق الرئيسية"
            items={mainItems}
            note={MAINS_NOTE}
          />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-meals" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuPage
            title="الوجبات والطواجن"
            items={mealItems}
            note={MEALS_NOTE}
          />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-sandwiches-a" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuPage
            title="الساندوتشات ١"
            items={sandwichItemsA}
            className="menu-card--dense"
          />
        </div>
        <PageFooter />
      </div>,

      <div key="menu-sandwiches-b" className="page with-footer" dir="rtl">
        <div className="page-content menu-sheet">
          <MenuPage
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
        ref={bookRef}
      >
        {pages}
      </FlipBook>
    </div>
  );
}

export default Component;
