import { createClient } from "@supabase/supabase-js";
import type { Product } from "./types";
import { supplierCatalog, isProductListed } from "./supplierCatalog";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing public Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing public Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
}

export function getSupabaseAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

export async function getActiveProducts() {
  const listedSupplierProducts = supplierCatalog.filter(isProductListed);
  if (!supabaseUrl || !supabaseAnonKey) {
    return listedSupplierProducts;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return listedSupplierProducts;
  }

  const liveProducts = ((data ?? []) as Product[]).filter(isProductListed);
  const liveSlugs = new Set(liveProducts.map((product) => product.slug));
  return [...liveProducts, ...listedSupplierProducts.filter((product) => !liveSlugs.has(product.slug))];
}

export async function getProductBySlug(slug: string) {
  const supplierProduct = supplierCatalog.find((product) => product.slug === slug);
  if (supplierProduct && !isProductListed(supplierProduct)) return null;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supplierProduct ?? null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!error && data) {
    return isProductListed(data as Product) ? data as Product : null;
  }

  return supplierProduct ?? null;
}
