"use client";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { CART_STORAGE_KEY, ATTEMPT_STORAGE_KEY } from "@/lib/purchase";
import type { WardrobeReceipt } from "@/lib/wardrobe";
export function CompleteCheckout({ fingerprint, receipt }: { fingerprint: string; receipt: WardrobeReceipt | null }) {
  const { clearCart } = useCart();
  const [wardrobeState, setWardrobeState] = useState<"saving" | "saved" | "failed">("saving");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!receipt) return;
    try {
      const key = "digo-wardrobe-orders-v1";
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      const orders: WardrobeReceipt[] = Array.isArray(stored) ? stored : [];
      const next = [...orders.filter(order => order.id !== receipt.id), receipt];
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("digo-wardrobe-orders"));
      setWardrobeState("saved");
    } catch { setWardrobeState("failed"); }
  }, [receipt, retry]);
  useEffect(() => {
    try {
      const attempt = JSON.parse(sessionStorage.getItem(ATTEMPT_STORAGE_KEY) ?? "null");
      const current = JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) ?? "[]");
      const currentFingerprint = JSON.stringify(current.map((item: {product: {id: string}; quantity: number; kind: string; reservationPlan?: string}) =>
        ({id: item.product.id, quantity: item.quantity, kind: item.kind, ...(item.kind === "reservation" ? {reservationPlan: item.reservationPlan} : {})})));
      if (attempt?.fingerprint === fingerprint && currentFingerprint === fingerprint) {
        sessionStorage.removeItem(ATTEMPT_STORAGE_KEY);
        sessionStorage.setItem(CART_STORAGE_KEY, "[]");
        clearCart();
      }
    } catch {}
  }, [fingerprint, clearCart]);
  if (!receipt) return null;
  return <p role="status">{wardrobeState === "saved"
    ? (receipt.test ? "Test purchase added to Wardrobe on this device." : "Your purchased pieces are in Wardrobe on this device.")
    : wardrobeState === "failed" ? <>Your order is confirmed, but could not be saved to this device. <button onClick={() => setRetry(n => n + 1)}>Retry wardrobe save</button></>
    : "Adding your pieces to Wardrobe…"}</p>;
}
