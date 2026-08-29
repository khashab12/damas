import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OrderFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <main className="order-result" dir="rtl">
      <div className="order-result-card">
        <div className="order-result-badge order-result-badge--fail">!</div>
        <h1 className="order-result-title">لم تتم عملية الدفع</h1>
        <p className="order-result-text">
          لم يكتمل الدفع ولم يتم تحصيل أي مبلغ. يمكنك المحاولة مرة أخرى.
        </p>

        {id ? (
          <div className="order-result-summary">
            <div className="order-result-row">
              <span>رقم الطلب</span>
              <strong>{id}</strong>
            </div>
          </div>
        ) : null}

        <Link className="order-result-btn" href="/">
          العودة إلى القائمة
        </Link>
      </div>
    </main>
  );
}
