"use client";

import * as React from "react";

export type CartLine = {
  id: string;
  name: string;
  /** Display price in SAR. For the customer's benefit ONLY. */
  price: number;
  qty: number;
};

type CartContextValue = {
  lines: CartLine[];
  totalCount: number;
  /** Display total in SAR. Never sent to the server. */
  totalPrice: number;
  qtyOf: (id: string) => number;
  add: (item: { id: string; name: string; price: number }) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

const STORAGE_KEY = "damas.cart.v1";

/** sessionStorage may throw (private mode, disabled storage); never let it break the cart. */
function readStoredCart(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as CartLine).id === "string" &&
        typeof (l as CartLine).name === "string" &&
        typeof (l as CartLine).price === "number" &&
        Number.isInteger((l as CartLine).qty) &&
        (l as CartLine).qty > 0,
    );
  } catch {
    return [];
  }
}

/**
 * Cart persisted in sessionStorage, so it survives a reload or an accidental
 * navigation away and back.
 *
 * sessionStorage, not localStorage: it is scoped to the tab and clears when
 * the tab closes, so a stale cart never greets a different customer on a
 * shared device.
 *
 * It is cleared ONLY once the server confirms the order (see
 * components/cart/clear-cart-on-success.tsx), so a failed submission leaves
 * the customer with a full cart to retry from.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);

  // Restored after mount, not in a lazy initialiser: the server renders an
  // empty cart, so reading storage during the first client render would
  // produce a hydration mismatch.
  React.useEffect(() => {
    const stored = readStoredCart();
    // Restoring after mount necessarily means setting state in an effect;
    // reading storage during render would desync server and client HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored.length > 0) setLines(stored);
  }, []);

  React.useEffect(() => {
    try {
      // Drop the key entirely when empty rather than persisting "[]", so an
      // emptied cart leaves no trace behind.
      if (lines.length === 0) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or unavailable: the in-memory cart still works.
    }
  }, [lines]);

  const add: CartContextValue["add"] = React.useCallback((item) => {
    setLines((prev) => {
      const found = prev.find((l) => l.id === item.id);
      if (found) {
        return prev.map((l) =>
          l.id === item.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const remove: CartContextValue["remove"] = React.useCallback((id) => {
    setLines((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  const clear = React.useCallback(() => {
    setLines([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = React.useMemo<CartContextValue>(() => {
    const totalCount = lines.reduce((n, l) => n + l.qty, 0);
    // Display only. The server re-prices from data/menu.ts on POST /api/orders.
    const totalPrice = lines.reduce((n, l) => n + l.price * l.qty, 0);
    return {
      lines,
      totalCount,
      totalPrice,
      qtyOf: (id) => lines.find((l) => l.id === id)?.qty ?? 0,
      add,
      remove,
      clear,
    };
  }, [lines, add, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/** Formats a SAR amount without trailing .00 */
export const sar = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);
