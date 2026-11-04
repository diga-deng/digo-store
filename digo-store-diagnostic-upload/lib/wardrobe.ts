import type Stripe from "stripe";
import type { Product } from "./types";

export type WardrobeReceipt = {
  id: string;
  paidAt: number;
  test: boolean;
  items: {
    id: string;
    quantity: number;
    kind: "retail" | "reservation";
    product: Pick<Product, "id" | "name" | "slug" | "price_cents" | "currency" | "image_url"> & {
      brand?: string; category?: string; material?: string;
    };
  }[];
};

// Called only after the server has verified payment and stored the order.
// The browser receives product identities, never customer or payment details.
export function wardrobeReceipt(session: Stripe.Checkout.Session, products: Product[]): WardrobeReceipt | null {
  if (session.payment_status !== "paid" || !["v2", "v3"].includes(session.metadata?.digo_checkout ?? "")) return null;
  const items: WardrobeReceipt["items"] = [];
  for (const [key, value] of Object.entries(session.metadata ?? {})) {
    if (!/^item_\d+$/.test(key)) continue;
    try {
      const line = JSON.parse(value);
      if (typeof line.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(line.id) ||
          !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99 ||
          !["retail", "reservation"].includes(line.kind)) continue;
      const p = products.find(p => p.id === line.id);
      const amount = line.retail_unit_amount ?? line.unit_amount ?? p?.price_cents ?? 0;
      items.push({ id: line.id, quantity: line.quantity, kind: line.kind, product: {
        id: line.id, name: p?.name || "Purchased piece", slug: p?.slug || "",
        price_cents: Number.isSafeInteger(amount) && amount >= 0 ? amount : 0,
        currency: session.currency || "usd", image_url: p?.image_url || null,
        ...(p?.brand ? { brand: p.brand } : {}), ...(p?.category ? { category: p.category } : {}),
        ...(p?.material ? { material: p.material } : {})
      } });
    } catch { /* Malformed historical lines never invent wardrobe items. */ }
  }
  return items.length ? { id: session.id, paidAt: session.created * 1000, test: !session.livemode, items } : null;
}
