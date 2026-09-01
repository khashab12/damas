import { z } from "zod";
import { menuCatalogue } from "@/data/menu";
import type { OrderLine } from "./types";

/* ---------------------------------------------------------------------------
 * The client sends item ids and quantities ONLY. Prices are never accepted
 * from the request — they are looked up here from the server catalogue and the
 * total recomputed. A client-supplied total is tamperable and must not exist
 * in the payload at all, so the schema below is `.strict()`: a request that
 * even includes a `price` or `total` field is rejected rather than ignored.
 * ------------------------------------------------------------------------- */

export const orderLineInputSchema = z
  .object({
    itemId: z.string().min(1),
    quantity: z
      .number()
      .int("quantity must be a whole number")
      .positive("quantity must be greater than zero")
      .max(99, "quantity may not exceed 99"),
  })
  .strict();

/** Saudi mobile: 05 followed by 8 digits. */
export const SAUDI_PHONE_RE = /^05\d{8}$/;

export const createOrderSchema = z
  .object({
    items: z
      .array(orderLineInputSchema)
      .min(1, "an order needs at least one item")
      .max(50, "too many distinct items"),
    customerName: z.string().trim().min(2, "name is required").max(80),
    customerPhone: z
      .string()
      .trim()
      .regex(SAUDI_PHONE_RE, "phone must match 05XXXXXXXX"),
    fulfilment: z.enum(["delivery", "pickup"]),
    address: z.string().trim().max(300).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  // Address is only meaningful for delivery, and mandatory there.
  .superRefine((value, ctx) => {
    if (value.fulfilment === "delivery" && !value.address) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "address is required for delivery",
      });
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export class UnknownItemsError extends Error {
  constructor(public readonly unknownIds: string[]) {
    super(`unknown item ids: ${unknownIds.join(", ")}`);
    this.name = "UnknownItemsError";
  }
}

export type PricedOrder = { lines: OrderLine[]; totalHalalas: number };

/**
 * Prices an order from the server catalogue. Throws UnknownItemsError if any
 * id is not on the menu. Duplicate ids in the payload are merged.
 */
export function priceOrder(input: CreateOrderInput): PricedOrder {
  const merged = new Map<string, number>();
  for (const { itemId, quantity } of input.items) {
    merged.set(itemId, (merged.get(itemId) ?? 0) + quantity);
  }

  const unknown = [...merged.keys()].filter((id) => !menuCatalogue.has(id));
  if (unknown.length > 0) throw new UnknownItemsError(unknown);

  const lines: OrderLine[] = [...merged.entries()].map(([itemId, quantity]) => {
    const entry = menuCatalogue.get(itemId)!;
    return {
      itemId,
      name: entry.name,
      quantity,
      unitPriceHalalas: entry.priceHalalas,
      lineTotalHalalas: entry.priceHalalas * quantity,
    };
  });

  return {
    lines,
    totalHalalas: lines.reduce((sum, l) => sum + l.lineTotalHalalas, 0),
  };
}

/** Short, unguessable, human-readable order id. */
export function generateOrderId(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const suffix = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return `DMS-${suffix}`;
}
