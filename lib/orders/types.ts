/** Order domain types. Money is always integer halalas (1 SAR = 100 halalas). */

export type OrderStatus = "pending" | "paid" | "failed";

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
  /** Rendered Arabic message sent to the restaurant. Null until paid. */
  notificationMessage: string | null;
  /** Provider's reference, once a payment has been created. */
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface OrderStore {
  create(
    order: Omit<Order, "createdAt" | "updatedAt" | "status"> & {
      status?: OrderStatus;
    },
  ): Promise<Order>;
  get(id: string): Promise<Order | null>;
  markPaid(id: string, notificationMessage: string): Promise<Order | null>;
  markFailed(id: string): Promise<Order | null>;
  setPaymentReference(id: string, reference: string): Promise<Order | null>;
}
