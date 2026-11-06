import { storefrontProduct } from "@/lib/storefront";
import { Discovery } from "@/components/Discovery";
import { getActiveProducts } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export default async function HomePage() { return <><aside aria-label="DIGO design preview" style={{padding:"12px 4vw",background:"#ecefe2",fontSize:13,display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}><span>DESIGN WORLDS / 001 · 6 brand directions + an open proposal</span><a href="/design-lab/index.html" style={{textDecoration:"underline"}}>Explore 21 concepts & 7 scenes — not yet for sale ↗</a></aside><Discovery products={(await getActiveProducts()).map(storefrontProduct)} /></>; }
