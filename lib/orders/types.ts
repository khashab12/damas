/** Order domain types. Money is always integer halalas (1 SAR = 100 halalas). */

/** Cash on delivery/pickup: an order is confirmed the moment it is placed. */
export type OrderStatus = "confirmed";

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

export interface OrderStore {
  /** Persists a fully-formed order. The caller owns id and timestamps so the
   *  notification can be rendered before the single write. */
  create(order: Order): Promise<Order>;
  get(id: string): Promise<Order | null>;
}
