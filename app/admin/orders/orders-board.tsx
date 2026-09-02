"use client";

import * as React from "react";
import type { Order, OrderStatus } from "@/lib/orders/types";
import { ORDER_STATUS_LABELS } from "@/lib/orders/types";
import { toSaudiE164 } from "@/lib/orders/phone";

/** Poll cadence. Fast enough that a waiting customer is not a surprise, slow
 *  enough to be nothing on a Neon free tier. */
const POLL_INTERVAL_MS = 15_000;

type Scope = "today" | "all";

const riyals = (halalas: number): string => {
  const value = halalas / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

/**
 * Explicit timeZone and calendar, for two reasons: the server renders the
 * first paint and the browser renders every one after it, so a locale-default
 * difference would be a hydration mismatch; and staff in Riyadh need Riyadh
 * time regardless of where the function ran. Latin digits because order
 * numbers and phone numbers next to them are Latin.
 */
const timeFormat = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormat = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  day: "2-digit",
  month: "2-digit",
});

/**
 * A short two-tone chime, synthesised rather than loaded.
 *
 * No audio file to ship, and nothing to 404 on a bad deploy. The AudioContext
 * is created from the user's click on "تفعيل الصوت" — browsers refuse to let a
 * page make noise before then, which is exactly why enabling is a button and
 * not a default.
 */
function useOrderChime() {
  const contextRef = React.useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = React.useState(false);

  const enable = React.useCallback(async () => {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;

      const context = contextRef.current ?? new Ctor();
      contextRef.current = context;
      // Safari and Chrome both start suspended until a gesture resumes them.
      if (context.state === "suspended") await context.resume();
      setEnabled(true);
    } catch {
      // Audio is a nicety; never let it break the board.
      setEnabled(false);
    }
  }, []);

  const play = React.useCallback(() => {
    const context = contextRef.current;
    if (!context || context.state !== "running") return;

    const now = context.currentTime;
    [0, 0.18].forEach((offset, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.value = index === 0 ? 880 : 1175;
      // Short envelope: an abrupt stop on a raw oscillator clicks audibly.
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      osc.connect(gain).connect(context.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  }, []);

  return { enabled, enable, play };
}

export function OrdersBoard({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = React.useState<Order[]>(initialOrders);
  const [scope, setScope] = React.useState<Scope>("today");
  const [error, setError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const { enabled: soundOn, enable: enableSound, play: chime } = useOrderChime();

  // Ids we have already seen, so the chime fires for genuinely new orders and
  // not for the first load or for a re-render.
  const seenIds = React.useRef<Set<string>>(
    new Set(initialOrders.map((o) => o.id)),
  );
  // Guards against a slow request and the next tick overlapping.
  const inFlight = React.useRef(false);

  const refresh = React.useCallback(
    async (nextScope: Scope, { announce = true } = {}) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch(`/api/admin/orders?scope=${nextScope}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          // Session expired or password changed: a reload lands on the login
          // form, which is the honest thing to show.
          window.location.reload();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: { orders: Order[] } = await res.json();
        const fresh = data.orders.filter((o) => !seenIds.current.has(o.id));
        data.orders.forEach((o) => seenIds.current.add(o.id));

        setOrders(data.orders);
        setError(null);
        if (announce && fresh.length > 0) chime();
      } catch {
        // Keep showing the last good list; a dropped poll is not a reason to
        // blank the screen in front of a queue of customers.
        setError("تعذّر التحديث — سيعاد المحاولة تلقائيًا.");
      } finally {
        inFlight.current = false;
      }
    },
    [chime],
  );

  React.useEffect(() => {
    const id = setInterval(() => void refresh(scope), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh, scope]);

  // A tablet that was asleep or backgrounded should catch up the moment it is
  // looked at, rather than up to 15s later.
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(scope);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh, scope]);

  function switchScope(next: Scope) {
    setScope(next);
    // Widening to "all" pulls in every historical order; those are not new
    // arrivals, so this refresh must not set off the chime.
    void refresh(next, { announce: false });
  }

  async function mark(id: string, status: OrderStatus) {
    setPendingId(id);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { order: Order } = await res.json();
      // Take the server's row rather than assuming: it is the persisted truth,
      // including updatedAt.
      setOrders((current) =>
        current.map((o) => (o.id === data.order.id ? data.order : o)),
      );
      setError(null);
    } catch {
      setError("تعذّر حفظ الحالة. حاول مرة أخرى.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className="admin-board" dir="rtl">
      <header className="admin-bar">
        <h1 className="admin-title">الطلبات</h1>

        <div className="admin-controls">
          <div className="admin-toggle" role="group" aria-label="النطاق">
            <button
              type="button"
              className={`admin-toggle-btn${scope === "today" ? " is-active" : ""}`}
              aria-pressed={scope === "today"}
              onClick={() => switchScope("today")}
            >
              اليوم
            </button>
            <button
              type="button"
              className={`admin-toggle-btn${scope === "all" ? " is-active" : ""}`}
              aria-pressed={scope === "all"}
              onClick={() => switchScope("all")}
            >
              الكل
            </button>
          </div>

          {soundOn ? (
            <span className="admin-sound admin-sound--on">🔔 التنبيه مفعّل</span>
          ) : (
            <button
              type="button"
              className="admin-sound admin-sound--off"
              onClick={() => void enableSound()}
            >
              🔕 تفعيل صوت التنبيه
            </button>
          )}
        </div>
      </header>

      {!soundOn ? (
        <p className="admin-hint">
          المتصفح يمنع الصوت حتى تضغط الزر — فعّل التنبيه مرة واحدة بعد فتح
          الصفحة.
        </p>
      ) : null}

      {error ? <p className="admin-error">{error}</p> : null}

      {orders.length === 0 ? (
        <p className="admin-empty">
          {scope === "today" ? "لا توجد طلبات اليوم." : "لا توجد طلبات."}
        </p>
      ) : (
        <ul className="admin-list">
          {orders.map((order) => {
            const tel = toSaudiE164(order.customerPhone);
            const busy = pendingId === order.id;

            return (
              <li
                key={order.id}
                className={`admin-card admin-card--${order.status}`}
              >
                <div className="admin-card-head">
                  <span className="admin-card-id">{order.id}</span>
                  <span className="admin-card-time">
                    {scope === "all"
                      ? `${dateFormat.format(new Date(order.createdAt))} · ${timeFormat.format(new Date(order.createdAt))}`
                      : timeFormat.format(new Date(order.createdAt))}
                  </span>
                  <span className={`admin-status admin-status--${order.status}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>

                <div className="admin-card-who">
                  <strong>{order.customerName}</strong>
                  {/* tel: in E.164 so it dials from any device, roaming or not. */}
                  <a
                    className="admin-tel"
                    href={`tel:${tel ? `+${tel}` : order.customerPhone}`}
                  >
                    📞 {order.customerPhone}
                  </a>
                </div>

                <div className="admin-card-meta">
                  <span className="admin-chip">
                    {order.fulfilment === "delivery" ? "توصيل" : "استلام"}
                  </span>
                  {order.address ? (
                    <span className="admin-address">{order.address}</span>
                  ) : null}
                </div>

                <ul className="admin-items">
                  {order.lines.map((line) => (
                    <li className="admin-item" key={line.itemId}>
                      <span className="admin-item-qty">{line.quantity}×</span>
                      <span className="admin-item-name">{line.name}</span>
                      <span className="admin-item-price">
                        {riyals(line.lineTotalHalalas)}
                      </span>
                    </li>
                  ))}
                </ul>

                {order.note ? (
                  <p className="admin-note">📝 {order.note}</p>
                ) : null}

                <div className="admin-card-foot">
                  <span className="admin-total">
                    {riyals(order.totalHalalas)} ريال
                  </span>

                  <div className="admin-actions">
                    <button
                      type="button"
                      className={`admin-act${order.status === "prepared" ? " is-active" : ""}`}
                      disabled={busy}
                      onClick={() => void mark(order.id, "prepared")}
                    >
                      متحضر
                    </button>
                    <button
                      type="button"
                      className={`admin-act admin-act--done${order.status === "delivered" ? " is-active" : ""}`}
                      disabled={busy}
                      onClick={() => void mark(order.id, "delivered")}
                    >
                      تم التسليم
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default OrdersBoard;
