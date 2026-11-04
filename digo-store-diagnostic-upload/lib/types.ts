export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  active: boolean;
  created_at: string;
  style_code?: string;
  category?: string;
  material?: string;
  weight?: string;
  dimensions?: string;
  supplier_price_cny?: number;
  reserve_price_cents?: number;
  source_catalog?: number;
  catalog_preview_key?: string;
  brand?: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
  kind: "retail" | "reservation";
  reservationPlan?: "refundable" | "committed";
};

