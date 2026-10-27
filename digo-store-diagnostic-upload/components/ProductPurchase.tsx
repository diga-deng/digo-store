"use client";
import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import type { PurchaseKind, ReservationPlan } from "@/lib/purchase";
import { formatMoney } from "@/lib/money";
import { PurchaseOptions } from "./PurchaseOptions";
import { useCart } from "./CartProvider";

export function ProductPurchase({ product }: { product: Product }) {
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("digo-world-v1") || "{}");
      const world = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
      const id = `store:${product.id}`;
      const history = Array.isArray(world.viewedProducts) ? world.viewedProducts : [];
      world.viewedProducts = [{ id, kind: "catalog", at: Date.now(), scene: null, product: {
        id: product.id, name: product.name, slug: product.slug, material: product.material,
        category: product.category, price_cents: product.price_cents, currency: product.currency,
        image_url: product.image_url
      } }, ...history.filter((entry: { id?: string }) => entry?.id !== id)].slice(0, 50);
      localStorage.setItem("digo-world-v1", JSON.stringify(world));
    } catch { /* Browsing and purchasing continue when device storage is unavailable. */ }
  }, [product]);
  const canReserve = Number.isSafeInteger(product.reserve_price_cents) && product.reserve_price_cents! > 0 && product.reserve_price_cents! < product.price_cents;
  const [kind, setKind] = useState<PurchaseKind>(canReserve ? "reservation" : "retail");
  const [plan, setPlan] = useState<ReservationPlan>("refundable");
  const cart = useCart();
  return <>
    <PurchaseOptions kind={kind} plan={plan} onKind={setKind} onPlan={setPlan} total={product.price_cents} deposit={product.reserve_price_cents ?? 0} currency={product.currency} canReserve={canReserve}/>
    <button className="editorial-button add-selection" onClick={() => cart.addItem(product,kind,kind === "reservation" ? plan : undefined)}><ShoppingBag size={17}/>{kind === "reservation" ? "Reserve this piece" : "Add to bag"} · {formatMoney(kind === "reservation" ? product.reserve_price_cents! : product.price_cents, product.currency)}</button>
    <p className="context-note">{cart.testMode ? "Test checkout only — no real money is charged." : "Payments are being set up. Build your bag while we prepare."}</p>
  </>;
}
