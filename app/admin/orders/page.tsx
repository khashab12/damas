import { isAdminConfigured, isAuthenticated } from "@/lib/admin/auth";
import { orderStore } from "@/lib/orders/store";
import { startOfRiyadhDay } from "@/lib/orders/day";
import { signIn } from "./actions";
import { OrdersBoard } from "./orders-board";

export const runtime = "nodejs";
/** Never prerendered, never cached: it is per-session and changes constantly. */
export const dynamic = "force-dynamic";

/**
 * Orders dashboard.
 *
 * The gate is here, in a Server Component, and the orders are only READ once
 * it has passed. An unauthenticated visitor is not served the data with the UI
 * hidden — the data never leaves the server at all, so there is nothing to
 * reveal by editing the DOM or replaying the request.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  if (!(await isAuthenticated())) {
    return (
      <main className="admin-login" dir="rtl">
        <form className="admin-login-card" action={signIn}>
          <h1 className="admin-login-title">طلبات مطعم دمس</h1>

          {isAdminConfigured() ? (
            <>
              <p className="admin-login-text">أدخل كلمة المرور للدخول.</p>
              <input
                className="admin-login-input"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="كلمة المرور"
                aria-label="كلمة المرور"
                autoFocus
                required
              />
              {e ? (
                <p className="admin-login-error">كلمة المرور غير صحيحة.</p>
              ) : null}
              <button className="admin-login-btn" type="submit">
                دخول
              </button>
            </>
          ) : (
            /* Fails closed. Without ADMIN_PASSWORD there is no password that
               works, so say so rather than leaving staff guessing. */
            <p className="admin-login-error">
              لم يتم ضبط كلمة المرور على الخادم (ADMIN_PASSWORD).
            </p>
          )}
        </form>
      </main>
    );
  }

  // First paint is server-rendered so the tablet shows orders immediately,
  // without waiting for the first poll.
  const orders = await orderStore.list({ since: startOfRiyadhDay() });

  return <OrdersBoard initialOrders={orders} />;
}
