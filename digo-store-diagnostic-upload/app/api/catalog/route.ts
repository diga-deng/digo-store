import { NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = (await getActiveProducts()).map(product => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price_cents: product.price_cents,
    currency: product.currency,
    category: product.category,
    material: product.material
  }));
  return NextResponse.json({ products });
}
