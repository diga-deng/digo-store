"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowLeft } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductGrid } from "./ProductGrid";
export function ShopBrowser({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All pieces");
  const categories = ["All pieces", ...Array.from(new Set(products.map(p => p.category || "Other")))];
  const results = products.filter(p => (category === "All pieces" || (p.category || "Other") === category) && `${p.name} ${p.material} ${p.style_code}`.toLowerCase().includes(query.toLowerCase()));
  if (!products.length) return <main className="shop-shell"><div className="edit-empty"><h1>New pieces, soon.</h1><Link className="editorial-button" href="/">Explore moments</Link></div></main>;
  return <main className="shop-shell"><Link className="text-link" href="/#looks"><ArrowLeft size={15}/>Back to looks</Link><p className="small-label">THE PIECES THAT MAKE IT YOURS</p><h1>Find your finishing touch.</h1><p className="context-note">Browse the current accessory collection. Delivery dates, colours and availability are still being confirmed.</p>
    <div className="shop-controls"><label><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} aria-label="Search products" placeholder="Search wool, scarves, a style…"/></label><select aria-label="Product category" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select><span aria-live="polite">{results.length} pieces</span></div>
    {results.length ? <ProductGrid products={results}/> : <div className="edit-empty"><h2>No pieces found.</h2><p>Try another material or category.</p><button className="editorial-button" onClick={() => {setQuery("");setCategory("All pieces");}}>Clear filters</button></div>}
  </main>;
}
