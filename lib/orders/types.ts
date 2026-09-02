/** Order domain types. Money is always integer halalas (1 SAR = 100 halalas). */

/**
 * Order lifecycle, driven from the /admin/orders dashboard.
 *
 * Cash on delivery/pickup, so there is no payment state: an order is
 * `confirmed` the moment it is placed, and the restaurant moves it forward
 * from there. Forward-only in practice, but not enforced — staff mis-tap, and
 * being unable to undo is worse than an out-of-order transition.
 */
export const ORDER_STATUSES = ["confirmed", "prepared", "delivered"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Arabic labels for the dashboard. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: "جديد",
  prepared: "متحضر",
  delivered: "تم التسليم",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

/** How the customer receives the order. */
export type Fulfilment = "delivery" | "pickup";

export type OrderLine = {
  itemId: string;
  /** Snapshot of the name at order time, so later menu edits don't rewrite history. */
  name: string;
  quantity: number;
  /** Unit price at order time, from the server catalogue. */
  unitPriceHalalas: number;
  lineTotalHalalas: number;
};

export type Order = {
  id: string;
  status: OrderStatus;
  lines: OrderLine[];
  totalHalalas: number;
  customerName: string;
  customerPhone: string;
  fulfilment: Fulfilment;
  /** Required for delivery, null for pickup. */
  address: string | null;
  note: string | null;
  /** Rendered Arabic message sent to the restaurant on creation. */
  notificationMessage: string;
  createdAt: string;
  updatedAt: string;
};

/** Options for the dashboard feed. */
export type OrderListOptions = {
  /** ISO lower bound on createdAt. null = no bound ("all"). */
  since?: string | null;
  limit?: number;
};

export interface OrderStore {
  /** Persists a fully-formed order. The caller owns id and timestamps so the
   *  notification can be rendered before the single write. */
  create(order: Order): Promise<Order>;
  get(id: string): Promise<Order | null>;
  /** Newest first. Backs /admin/orders. */
  list(options?: OrderListOptions): Promise<Order[]>;
  /** Returns the updated order, or null when the id does not exist. */
  setStatus(id: string, status: OrderStatus): Promise<Order | null>;
}
