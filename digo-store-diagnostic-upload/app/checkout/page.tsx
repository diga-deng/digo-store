"use client";
import { useState } from "react";
import { ServicePreview } from "@/components/ServicePreview";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, Trash2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { ReservationPreview } from "@/components/ReservationPreview";
import { formatMoney } from "@/lib/money";
import { purchaseKey, purchaseLabel } from "@/lib/purchase";

export default function CheckoutPage() {
  const cart = useCart();
  const [accepted, setAccepted] = useState("");
  const [preview, setPreview] = useState(false);
  const fingerprint = JSON.stringify(cart.items.map(i => [i.product.id,i.kind,i.reservationPlan,i.quantity]));
  const reservations = cart.items.filter(i => i.kind === "reservation");
  const balance = reservations.reduce((n,i) => n+(i.product.price_cents-i.product.reserve_price_cents!)*i.quantity,0);
  const fullTotal = cart.items.reduce((n,i) => n+i.product.price_cents*i.quantity,0);
  const plans = [...new Set(reservations.map(i => i.reservationPlan))];
  const termsAccepted = !reservations.length || accepted === fingerprint;
  return <main className="transaction-shell"><Link className="text-link back-link" href="/shop"><ArrowLeft size={16}/>Keep exploring</Link>
    <span className="small-label">DIGO · YOUR SELECTION</span><h1>A few good pieces.</h1><p className="transaction-intro">Review what you’re paying now, and what comes next.</p>
    {!cart.items.length ? <div className="edit-empty"><h2>Your bag is waiting.</h2><p>Find a look you love, then choose the pieces you need.</p><Link className="editorial-button" href="/">Explore the edit <ArrowRight size={16}/></Link></div> : <div className="checkout-grid">
      <section><div className="checkout-line-items">{cart.items.map(({product,quantity,kind,reservationPlan}) => <article className="checkout-line" key={purchaseKey(product.id,kind,reservationPlan)}><div className="piece-monogram" aria-hidden="true">{product.category?.slice(0,1) || "D"}</div><div className="checkout-line-copy"><Link href={`/products/${product.slug}`}><strong>{product.name}</strong></Link><span>{purchaseLabel(kind,reservationPlan)}</span><small>Qty {quantity} · Stock and delivery to be confirmed</small>{kind === "reservation" && <small>Product balance later: {formatMoney((product.price_cents-product.reserve_price_cents!)*quantity)}</small>}</div><div className="checkout-line-price"><strong>{formatMoney((kind === "reservation" ? product.reserve_price_cents! : product.price_cents)*quantity)}</strong><button className="icon-button" aria-label={`Remove one ${product.name}, ${purchaseLabel(kind,reservationPlan)}`} onClick={() => cart.removeItem(product.id,kind,reservationPlan)}><Trash2 size={15}/></button></div></article>)}</div>
      {reservations.length > 0 && <div className="checkout-explanation"><span className="small-label">WHAT HAPPENS AFTER THE DEPOSIT?</span><h2>Reserved now. Yours when ready.</h2><p>Your reservation joins the queue after payment is confirmed. When stock becomes available, you can review delivery and pay the remaining balance. If stock is already available, you can move straight to that step.</p><p>No automatic balance charge. No dispatch until the balance payment and delivery details are confirmed.</p><Link href="/reservation-terms" className="text-link">Reservation terms <ArrowRight size={14}/></Link></div>}
      <ServicePreview productTotal={fullTotal}/>
      </section>
      <aside className="checkout-summary"><span className="small-label">ORDER SUMMARY · USD</span><div className="summary-amounts"><div><span>Selected product total</span><strong>{formatMoney(fullTotal)}</strong></div>{reservations.length > 0 && <div><span>Product balance later</span><strong>{formatMoney(balance)}</strong></div>}<div className="summary-due"><span>Due today</span><strong>{formatMoney(cart.total)}</strong></div></div>
        <p className="context-note">Shipping, tax and delivery are not yet confirmed.</p>
        {reservations.length > 0 && <label className="terms-consent"><input type="checkbox" checked={accepted === fingerprint} onChange={e => setAccepted(e.target.checked ? fingerprint : "")}/><span>I have read the <Link href="/reservation-terms">preview reservation terms</Link> and understand {plans.length > 1 ? "each selected option’s refund conditions" : plans[0] === "committed" ? "my deposit is non-refundable for a change of mind after payment" : "I can request a deposit refund before paying the balance"}.</span></label>}
        <div className="notice-banner">{cart.testMode === true ? "Test checkout · No real money is charged." : "Real payments are not open yet."}{!cart.available && <span> Stripe checkout is not available yet. You can preview the reservation flow below.</span>}</div>
        {cart.error && <p role="alert" className="checkout-error">{cart.error}</p>}
        <button className="editorial-button add-selection" disabled={cart.busy || !cart.available || !termsAccepted} onClick={() => cart.checkout(termsAccepted)}><LockKeyhole size={16}/>{cart.busy ? "Opening Stripe…" : `Continue to Stripe · ${formatMoney(cart.total)}`}</button>
        <p className="payment-caption">Payment details stay on Stripe. Eligible payment methods appear at checkout.</p>
        {reservations.length > 0 && (cart.testMode || !cart.available) && <button className="preview-flow-button" aria-expanded={preview} onClick={() => setPreview(!preview)}>{preview ? "Hide" : "Preview"} queue & balance flow <ArrowRight size={15}/></button>}
      </aside>
      {preview && reservations.length > 0 && <div className="checkout-preview-area">{plans.map(plan => {
        const group=reservations.filter(i => i.reservationPlan === plan);
        return <ReservationPreview key={`${fingerprint}:${plan}`} deposit={group.reduce((n,i)=>n+i.product.reserve_price_cents!*i.quantity,0)} balance={group.reduce((n,i)=>n+(i.product.price_cents-i.product.reserve_price_cents!)*i.quantity,0)} quantity={group.reduce((n,i)=>n+i.quantity,0)} plan={plan ?? "refundable"}/>;
      })}</div>}
    </div>}
  </main>;
}
