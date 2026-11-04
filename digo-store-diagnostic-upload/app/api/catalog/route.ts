import { NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/supabase";
import { storefrontProduct } from "@/lib/storefront";
export const dynamic = "force-dynamic";
export async function GET() {
  const products = (await getActiveProducts()).map(storefrontProduct);
  return NextResponse.json({ products, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
