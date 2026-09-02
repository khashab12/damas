import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Generic submission failure.
 *
 * Reached when the order could not be created at all — the request never got
 * to the server, or the server failed on it. It is deliberately NOT
 * payment-specific: orders are cash on delivery/pickup, so there is no payment
 * to have failed and no money to reassure anyone about.
 *
 * Nothing is looked up here: if we had an order id the order would exist, and
 * the customer would be on the success page instead. `reason` only picks the
 * wording; the recovery path is the same either way.
 */
export default async function OrderFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  const text =
    reason === "network"
      ? "تعذّر الاتصال بالخادم ولم يتم إرسال طلبك. تأكد من اتصالك بالإنترنت وحاول مرة أخرى."
      : "حدث خطأ غير متوقع ولم يتم تسجيل طلبك. حاول مرة أخرى بعد قليل.";

  return (
    <main className="order-result" dir="rtl">
      <div className="order-result-card">
        <div className="order-result-badge order-result-badge--fail">!</div>
        <h1 className="order-result-title">تعذّر إرسال الطلب</h1>
        <p className="order-result-text">{text}</p>
        <p className="order-result-text">لم يتم تحصيل أي مبلغ — الدفع عند الاستلام.</p>

        {/* The cart is only cleared on the success page, so it is still in
            sessionStorage: this returns the customer to the book with every
            line intact and they can just press confirm again. */}
        <Link className="order-result-btn" href="/">
          العودة للطلب
        </Link>
        <Link className="order-result-link" href="/">
          العودة إلى القائمة
        </Link>
      </div>
    </main>
  );
}
