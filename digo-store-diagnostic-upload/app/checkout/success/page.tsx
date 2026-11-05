import Link from "next/link";
import { CompleteCheckout } from "@/components/CompleteCheckout";
import { getStripe } from "@/lib/stripe";
import { recordPaidOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { reservationSummary } from "@/lib/checkout";
import { purchaseLabel } from "@/lib/purchase";
import { wardrobeReceipt, type WardrobeReceipt } from "@/lib/wardrobe";
import { getActiveProducts } from "@/lib/supabase";
import { supplierCatalog } from "@/lib/supplierCatalog";

export const dynamic = "force-dynamic";
export default async function CheckoutSuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const id = searchParams.session_id;
  let fingerprint = "";
  let paid = false;
  let saved = false;
  let total: number | null = null;
  let isTest = false;
  let receipt: WardrobeReceipt | null = null;
  let reservations: ReturnType<typeof reservationSummary> = [];
  if (id && /^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(id)) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(id);
      if (["v2", "v3"].includes(session.metadata?.digo_checkout ?? "") && session.livemode === ((process.env.STRIPE_MODE ?? "test") === "live")) {
        paid = session.payment_status === "paid";
        reservations = reservationSummary(session.metadata);
        isTest = !session.livemode;
        total = session.amount_total;
        if (paid) {
          const metadata = session.metadata ?? {};
          fingerprint = JSON.stringify(Object.keys(metadata).filter((key) => /^item_\d+$/.test(key))
            .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5))).map((key) => {
              const item = JSON.parse(metadata[key]);
              return { id: item.id, quantity: item.quantity, kind: item.kind, ...(item.kind === "reservation" ? {reservationPlan: item.reservationPlan} : {}) };
            }));
          saved = await recordPaidOrder(session);
          if (saved) {
            const products = await getActiveProducts().catch(() => []);
            // Historical receipts still resolve withdrawn pieces without relisting them.
            receipt = wardrobeReceipt(session, [...products, ...supplierCatalog]);
          }
        }
      }
    } catch { /* The webhook retries order storage independently. */ }
  }
  return <main className="shell"><section className="panel" style={{ marginTop: 40 }}>
    {paid && saved && fingerprint && <CompleteCheckout fingerprint={fingerprint} receipt={receipt} />}
    <h1>{paid ? (isTest ? "Test payment completed" : "Payment received") : "Payment not confirmed"}</h1>
    <p className="muted">{paid ? (saved ? "Your payment and order have been recorded." : "Your payment was received. Your order confirmation is still processing. Please refresh this page shortly; do not pay again.") : "We could not confirm a completed payment. If you just paid, refresh this page before starting another checkout."}</p>
    {paid && total !== null && <p>Total: {formatMoney(total)}</p>}
    {paid && isTest && <p>This was a test. No real money was charged.</p>}
    {paid && saved && reservations.length > 0 && <div className="checkout-explanation"><span className="small-label">{isTest ? "TEST RESERVATION" : "RESERVATION"}</span><h2>{isTest ? "Your test reservation is in the queue." : "You’re in the queue."}</h2>
      {reservations.map((reservation,index) => <p key={index}>{reservation.plan ? purchaseLabel("reservation",reservation.plan) : "Reservation deposit"} · {reservation.quantity} piece(s) · Product balance: {formatMoney(reservation.balance)}</p>)}
      <p>Stock and delivery are awaiting confirmation. No queue position or dispatch date is promised. Your balance will not be charged automatically.</p><button className="editorial-button" disabled>Balance payment opens after stock confirmation</button>
      {isTest && <p>This test does not allocate real inventory or create a procurement order.</p>}</div>}
    <Link className="button primary" href="/#/wardrobe?tab=purchased">Open wardrobe</Link>{" "}
    <Link className="button" href="/">Continue shopping</Link>
  </section></main>;
}
