"use client";

/**
 * Shared contact strip pinned to the bottom of every page except the cover.
 *
 * Rendered once here and reused, so every page stays identical. It is
 * absolutely positioned inside `.page`; the height it occupies is reserved via
 * the `--page-footer-h` custom property (set by `.page.with-footer`), which
 * `.page-content` adds to its bottom padding so content never sits underneath.
 */
export function PageFooter() {
  return (
    <div className="page-footer" dir="rtl">
      <span className="page-footer-item">للطلبات ٠٥٧٤٦٧٢٥٦٥</span>
      <span className="page-footer-sep" aria-hidden>
        |
      </span>
      <span className="page-footer-item">للشكاوى ٠٥٧٥٦٧٨٥٦٨</span>
    </div>
  );
}

export default PageFooter;
