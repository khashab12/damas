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

/**
 * Session-only cart. Deliberately no localStorage/sessionStorage: the cart
 * lives in memory for this page visit and is gone on reload.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);

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

  const clear = React.useCallback(() => setLines([]), []);

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
