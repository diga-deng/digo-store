import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getStripe, getCheckoutSiteUrl } from "@/lib/stripe";
import { supplierCatalog, isProductListed } from "@/lib/supplierCatalog";
import { buildCheckout, CheckoutInputError, parseCheckoutItems } from "@/lib/checkout";
import type { Product } from "@/lib/types";
import { RESERVATION_TERMS_VERSION } from "@/lib/purchase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let available = false;
  try {
    getStripe(); getCheckoutSiteUrl(); getSupabaseAdminClient();
    available = Boolean(process.env.STRIPE_WEBHOOK_SECRET) && (process.env.STRIPE_MODE ?? "test") === "test";
  } catch {}
  return NextResponse.json({ available, testMode: (process.env.STRIPE_MODE ?? "test") === "test" },
    { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 }); }

  try {
    const items = parseCheckoutItems(body?.items);
    if (items.some(item => supplierCatalog.some(product => product.id === item.id && !isProductListed(product)))) {
      throw new CheckoutInputError("A selected product is no longer available. Your saved choices have been kept.");
    }
    if (items.some(item => item.kind === "reservation") && body.reservationTerms !== RESERVATION_TERMS_VERSION) {
      throw new CheckoutInputError("Please read and accept the reservation terms before continuing.");
    }
    if (typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)) {
      throw new CheckoutInputError("Please refresh the checkout page and try again.");
    }
    const stripe = getStripe();
    const siteUrl = getCheckoutSiteUrl();
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Missing webhook configuration.");
    const supabase = getSupabaseAdminClient();
    // Fail before collecting money if the order table cannot be reached.
    const { error: orderError } = await supabase.from("orders").select("id").limit(0);
    if (orderError) throw new Error("Order storage is unavailable.");

    const products: Product[] = supplierCatalog.filter((product) => items.some((item) => item.id === product.id));
    const databaseIds = [...new Set(items.map((item) => item.id).filter((id) => !products.some((p) => p.id === id)))];
    if (databaseIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
      throw new CheckoutInputError("A selected product is no longer available.");
    }
    if (databaseIds.length) {
      const { data, error } = await supabase.from("products").select("*").in("id", databaseIds).eq("active", true);
      if (error) throw new Error("Product lookup failed.");
      products.push(...((data ?? []) as Product[]).filter(isProductListed));
    }
    const { line_items, metadata, hasRetail } = buildCheckout(items, products);
    // Live payments stay closed until inventory, fulfillment and final terms are ready.
    if ((process.env.STRIPE_MODE ?? "test") === "live") {
      throw new CheckoutInputError("Real payments are not open yet. Stock, shipping and final terms are being confirmed.");
    }
    const idempotencyKey = createHash("sha256").update(JSON.stringify({
      requestId: body.requestId, line_items, metadata, siteUrl, mode: process.env.STRIPE_MODE ?? "test"
    })).digest("hex");
    const session = await stripe.checkout.sessions.create({
      // Omit payment_method_types: use eligible methods enabled in the Stripe Dashboard.
      mode: "payment",
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
      billing_address_collection: "required",
      ...(hasRetail ? { shipping_address_collection: { allowed_countries: ["US" as const] } } : {}),
      line_items, metadata: { ...metadata, ...(metadata.reservation_terms ? { terms_accepted: "true" } : {}) },
      payment_intent_data: { metadata: { digo_checkout: "v3" } }
    }, { idempotencyKey: `digo-${idempotencyKey}` });
    if (!session.url || session.status !== "open") {
      throw new CheckoutInputError("This checkout has expired or completed. Please start a new checkout.");
    }
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CheckoutInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("DIGO checkout unavailable:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Payments are not available yet. Please try again later." }, { status: 503 });
  }
}
