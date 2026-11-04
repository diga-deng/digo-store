import Image from "next/image";
import { JourneyActions } from "@/components/JourneyActions";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/ProductPurchase";
import { formatMoney } from "@/lib/money";
import { getProductBySlug } from "@/lib/supabase";
import { storefrontProduct } from "@/lib/storefront";

export const dynamic = "force-dynamic";
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  return <main className="look-detail-shell">
    <Link className="text-link back-link" href="/shop"><ArrowLeft size={16}/>All pieces</Link>
    <div className="look-detail-grid product-detail-grid">
      <section><div className="piece-detail-photo">{product.image_url ? <Image src={product.image_url} alt={product.name} width={1200} height={1200} priority/> : <div className="catalog-type-visual"><span>DIGO · {product.category ?? "Accessory"}</span><strong>{product.material ?? product.name}</strong><small>Style {product.style_code ?? "—"} · Product photo coming soon</small></div>}</div>
        <div className="styling-note"><span className="small-label">THE DETAILS</span><dl className="piece-specs">{[["Material",product.material],["Size",product.dimensions],["Weight",product.weight],["Style",product.style_code]].map(([key,value]) => value ? <div key={key}><dt>{key}</dt><dd>{value}</dd></div> : null)}</dl></div>
      </section>
      <section className="look-builder"><span className="small-label">{product.brand || 'BRAND NOT YET SUPPLIED'}</span><h1>{product.name}</h1><p className="piece-price">{formatMoney(product.price_cents,product.currency)} <span>Full product price · {product.currency.toUpperCase()}</span></p>
        <p className="builder-intro">{product.material}{product.dimensions ? ` · ${product.dimensions}` : ""}</p>
        <div className="delivery-panel"><CalendarDays size={19}/><div><strong>Stock and delivery to be confirmed</strong><p>Choose how you would like to buy. A reservation is a place in the queue, not a promise of immediate dispatch.</p></div></div>
        <JourneyActions product={storefrontProduct(product)}/>
        <ProductPurchase product={storefrontProduct(product)}/>
      </section>
    </div>
  </main>;
}
