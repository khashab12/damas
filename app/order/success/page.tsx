import Link from "next/link";
import { orderStore } from "@/lib/orders/store";
import { ClearCartOnSuccess } from "@/components/cart/clear-cart-on-success";

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
      {/* A confirmed order is the only thing that empties the cart. */}
      <ClearCartOnSuccess paid={order?.status === "confirmed"} />
      <div className="order-result-card">
        <div className="order-result-badge order-result-badge--ok">✓</div>
        <h1 className="order-result-title">تم تأكيد طلبك</h1>
        <p className="order-result-text">
          شكرًا لك. تم إرسال طلبك إلى المطعم وسيتم تجهيزه في أقرب وقت. الدفع عند
          الاستلام.
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
              <span>الدفع</span>
              <strong>عند الاستلام</strong>
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
