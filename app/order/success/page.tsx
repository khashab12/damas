import Link from "next/link";
import { orderStore } from "@/lib/orders/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const order = id ? await orderStore.get(id) : null;
  const riyals = (h: number) =>
    Number.isInteger(h / 100) ? String(h / 100) : (h / 100).toFixed(2);

  return (
    <main className="order-result" dir="rtl">
      <div className="order-result-card">
        <div className="order-result-badge order-result-badge--ok">✓</div>
        <h1 className="order-result-title">تم استلام طلبك</h1>
        <p className="order-result-text">
          شكرًا لك. سيتم تجهيز طلبك في أقرب وقت.
        </p>

        {order ? (
          <div className="order-result-summary">
            <div className="order-result-row">
              <span>رقم الطلب</span>
              <strong>{order.id}</strong>
            </div>
            <div className="order-result-row">
              <span>الإجمالي</span>
              <strong>{riyals(order.totalHalalas)} ريال</strong>
            </div>
            <div className="order-result-row">
              <span>الحالة</span>
              <strong>
                {order.status === "paid" ? "مدفوع" : "قيد الانتظار"}
              </strong>
            </div>
          </div>
        ) : (
          <p className="order-result-text">
            {id ? `لم يتم العثور على الطلب ${id}.` : "لا يوجد رقم طلب."}
          </p>
        )}

        <Link className="order-result-btn" href="/">
          العودة إلى القائمة
        </Link>
      </div>
    </main>
  );
}
