import type { Product } from "./types";

const RESERVE_PRICE_CENTS = 450;
const rawCatalog = `1|27|Classic Wool Scarf|Scarf|100% Wool|170 g|30 x 180 cm + fringe|50|45|wool-scarves
1|55|Lightweight Wool Scarf|Scarf|100% Wool|120 g|30 x 164 cm + fringe|28|35|wool-scarves
1|56|Fine Wool Scarf|Scarf|100% Wool|133 g|31 x 170 cm + fringe|39|39|wool-scarves
1|57|Oversized Wool Scarf|Scarf|100% Wool|235 g|41 x 210 cm + fringe|75|55|wool-scarves
1|L15|Wool Scarf|Scarf|100% Wool|130 g|30 x 170 cm + fringe|39|39|wool-scarves
1|W30|Wool Triangle Scarf|Triangle Scarf|100% Wool|63 g|92 x 28 cm|34|39|wool-scarves
1|W45|Slim Wool Triangle Scarf|Triangle Scarf|100% Wool|75 g|16 x 85 cm|35|39|wool-scarves
1|W46|Long Wool Triangle Scarf|Triangle Scarf|100% Wool|133 g|20 x 160 cm|52|45|wool-scarves
1|11|Lambswool Wrap|Wrap|100% Lambswool|320 g|70 x 180 cm + fringe|85|69|wool-scarves
1|14|Wool Wrap|Wrap|100% Wool|320 g|70 x 180 cm + fringe|60|59|wool-scarves
1|17|Light Wool Wrap|Wrap|100% Wool|110 g|80 x 200 cm|57|59|wool-scarves
1|20|Wool Wrap|Wrap|100% Wool|260 g|60 x 170 cm + fringe|60|59|wool-scarves
1|25|Fine Wool Wrap|Wrap|100% Wool|105 g|70 x 200 cm|50|59|wool-scarves
1|29|Lambswool Wrap|Wrap|100% Lambswool|260 g|60 x 200 cm|70|69|wool-scarves
1|35|Wool Scarf|Scarf|100% Wool|135 g|45 x 195 cm|55|45|wool-scarves
1|36|Wool Scarf|Scarf|100% Wool|130 g|20 x 160 cm|40|39|wool-scarves
1|38|Oversized Wool Scarf|Scarf|100% Wool|140 g|70 x 220 cm|55|45|wool-scarves
1|43|Wool Triangle Scarf|Triangle Scarf|100% Wool|100 g|60 x 160 cm|35|39|wool-scarves
1|46|Wool Scarf|Scarf|100% Wool|165 g|30 x 180 cm|39|39|wool-scarves
1|49|Wool Scarf|Scarf|100% Wool|140 g|40 x 195 cm|48|45|wool-scarves
1|50|Lambswool Scarf|Scarf|100% Lambswool|150 g|40 x 200 cm|50|45|wool-scarves
1|51|Light Wool Scarf|Scarf|100% Wool|90 g|25 x 150 cm|28|35|wool-scarves
1|58|Wool Scarf|Scarf|100% Wool|150 g|35 x 170 cm + fringe|48|45|wool-scarves
1|59|Wool Scarf|Scarf|100% Wool|185 g|40 x 180 cm + fringe|50|45|wool-scarves
1|60|Lambswool Scarf|Scarf|100% Lambswool|200 g|50 x 200 cm|55|45|wool-scarves
1|61|Wool Scarf|Scarf|100% Wool|130 g|31 x 180 cm|39|39|wool-scarves
1|65|Wool Scarf|Scarf|100% Wool|160 g|31 x 180 cm|45|45|wool-scarves
1|66|Slim Wool Scarf|Scarf|100% Wool|110 g|21 x 165 cm|40|39|wool-scarves
1|68|Wool Wrap|Wrap|100% Wool|165 g|70 x 180 cm + fringe|50|59|wool-scarves
1|03|Wool Scarf|Scarf|100% Wool|185 g|45 x 205 cm|48|45|wool-scarves
1|WH015|Wool-Nylon Scarf|Scarf|85% Wool / 15% Nylon|300 g|30 x 210 cm + fringe|70|55|wool-scarves
1|24|Heavy Wool Scarf|Scarf|100% Wool|450 g|50 x 200 cm|96|55|wool-scarves
1|31|Wool Scarf|Scarf|100% Wool|208 g|38 x 205 cm|50|45|wool-scarves
1|3|Lambswool Neckwarmer|Neckwarmer|100% Lambswool|95 g|31 x 55 cm|27|35|wool-scarves
1|5|Lambswool Neckwarmer|Neckwarmer|100% Lambswool|80 g|28 x 50 cm|27|35|wool-scarves
1|6|Lambswool Neckwarmer|Neckwarmer|100% Lambswool|68 g|18 x 78 cm|27|35|wool-scarves
2|M01|Classic Wool Beanie|Beanie|100% Wool|76 g|24 x 22 cm|30|29|wool-hats
2|M02|Wool Beanie|Beanie|100% Wool|76 g|21 x 24 cm|28|29|wool-hats
2|M03|Long Wool Beanie|Beanie|100% Wool|76 g|22.5 x 29 cm|30|29|wool-hats
2|M04|Slouch Wool Beanie|Beanie|100% Wool|76 g|22 x 31 cm|30|29|wool-hats
2|M05|Cat-Ear Wool Beanie|Beanie|100% Wool|76 g|22 x 21 cm|28|29|wool-hats
2|M06|Ribbed Wool Beanie|Beanie|100% Wool|76 g|23 x 22 cm|30|29|wool-hats
2|M07|Wool Beanie|Beanie|100% Wool|76 g|25 x 22 cm|30|29|wool-hats
2|M08|Cuffed Wool Beanie|Beanie|100% Wool|76 g|24 x 25 cm|28|29|wool-hats
2|M31|Wool-Nylon Draped Hat|Beanie|87% Wool / 13% Nylon|95 g|35 x 23.5 cm|35|32|wool-hats
2|M40|Draped Wool Hat|Beanie|100% Wool|80 g|36 x 22.5 cm|28|29|wool-hats
2|M41|Chunky Rib Wool Beanie|Beanie|100% Wool|115 g|25 x 26 cm|30|29|wool-hats
2|M42|Wool Hat|Beanie|100% Wool|100 g|26 x 22 cm|28|29|wool-hats
2|M43|Long Wool Beanie|Beanie|100% Wool|80 g|23 x 28 cm|25|29|wool-hats
2|M45|Wool Beanie|Beanie|100% Wool|80 g|26 x 22 cm|25|29|wool-hats
2|M50|Cuffed Wool Beanie|Beanie|100% Wool|80 g|24 x 22 cm|30|29|wool-hats
2|M52|Two-Tone Draped Wool Hat|Beanie|100% Wool|90 g|33 x 21 cm|34|29|wool-hats
2|M59|Pom Wool Beanie|Beanie|100% Wool|95 g|24 x 23 cm|34|29|wool-hats
2|M60|Open-Knit Wool Beanie|Beanie|100% Wool|70 g|22.5 x 22 cm|25|29|wool-hats
2|M61|Convertible Wool Neckwarmer Hat|Neckwarmer|100% Wool|60 g|27 x 26 cm|28|35|wool-hats
2|M62|Textured Wool Beanie|Beanie|100% Wool|112 g|29 x 22 cm|40|32|wool-hats
2|M67|Slouch Wool Beanie|Beanie|100% Wool|60 g|25 x 29 cm|28|29|wool-hats
2|M69|Wool Balaclava|Balaclava|100% Wool|100 g|24 x 48 cm|43|39|wool-hats
2|M70|Patterned Wool Beanie|Beanie|100% Wool|90 g|26 x 22 cm|32|29|wool-hats
2|M71|Wool Hood Scarf|Beanie|100% Wool|185 g|58 cm head circumference|56|39|wool-hats
2|M81|Wool Beanie|Beanie|100% Wool|120 g|23 x 25.5 cm|35|32|wool-hats
2|M82|Wool Beret|Beret|100% Wool|95 g|28 x 28 cm|35|32|wool-hats
2|M83|Long Wool Beanie|Beanie|100% Wool|95 g|26 x 31 cm|35|32|wool-hats
2|MN12|Wool-Nylon Beanie|Beanie|80% Wool / 20% Nylon|105 g|26 x 22 cm|27|29|wool-hats
3|60-71|Women Touchscreen Wool Gloves|Gloves|90.5% Wool / 8.8% Polyester / 0.7% Spandex|55 g|8 x 22 cm|14|24|wool-gloves
3|ST01|Men Touchscreen Wool Gloves|Gloves|95.3% Wool / 4.1% Polyester / 0.6% Spandex|70 g|9 x 23 cm|16|24|wool-gloves
3|50-1|Fingerless Wool Arm Warmers|Arm Warmers|91.7% Wool / 7.6% Nylon / 0.7% Spandex|80 g|8 x 50 cm|24|26|wool-gloves
3|50-2|Fingered Wool Arm Warmers|Arm Warmers|91.7% Wool / 7.6% Nylon / 0.7% Spandex|77 g|8 x 50 cm|24|26|wool-gloves
3|KW20|Fine Wool Tights|Tights|88.1% Wool / 9.5% Nylon / 2.4% Spandex|136 g|One size|79|45|wool-socks
3|WZ41|Men Mid-Calf Wool Socks|Socks|100% Wool + elastic|52 g|17 x 21 cm|16|24|wool-socks
3|WJF1|Men Lightweight Wool Socks|Socks|73.9% Wool / 24% Polyester / 2.1% Spandex|22 g|8 x 19 cm|7|22|wool-socks
3|23|Men Wool Blend Socks|Socks|26% Wool / 32.6% Nylon / 41.4% Viscose|40 g|15 x 20 cm|10|22|wool-socks
3|41|Men Thick Wool Socks|Socks|59.4% Wool / 40% Nylon / 0.6% Spandex|45 g|17 x 19 cm|8|22|wool-socks
3|91|Men Ribbed Wool Socks|Socks|91.3% Wool / 7.9% Nylon / 0.8% Spandex|65 g|19 x 19 cm|16|24|wool-socks
3|WZ42|Women Mid-Calf Wool Socks|Socks|100% Wool + elastic|45 g|17 x 19 cm|14|24|wool-socks
3|WJF2|Women Lightweight Wool Socks|Socks|73.9% Wool / 24% Polyester / 2.1% Spandex|22 g|7 x 15 cm|7|22|wool-socks
3|42|Women Wool Blend Socks|Socks|59.4% Wool / 40% Nylon / 0.6% Spandex|35 g|14 x 16 cm|8|22|wool-socks
3|52|Women Thick Wool Socks|Socks|59.4% Wool / 40% Nylon / 0.6% Spandex|45 g|14 x 17 cm|8|22|wool-socks
3|72|Women Wool Terry Socks|Socks|100% Wool + elastic|80 g|19 x 17 cm|20|24|wool-socks
3|82|Women Tall Wool Socks|Socks|100% Wool + elastic|155 g|62 x 19 cm|38|32|wool-socks
3|92|Women Ribbed Wool Socks|Socks|91.3% Wool / 7.9% Nylon / 0.8% Spandex|53 g|19 x 17 cm|13|22|wool-socks
3|WZ31|Men Wool Socks|Socks|100% Wool + elastic|34 g|14 x 19 cm|16|24|wool-socks
3|WZ32|Women Wool Socks|Socks|100% Wool + elastic|31 g|13 x 17 cm|16|24|wool-socks
4|48|Cashmere-Wool Scarf|Scarf|7% Cashmere / 93% Wool|115 g|25 x 160 cm|52|59|cashmere-scarves
4|70|200-Count Cashmere Wrap|Wrap|100% Cashmere|90 g|90 x 200 cm|246|129|cashmere-wraps
4|76|Pure Cashmere Triangle Scarf|Triangle Scarf|100% Cashmere|90 g|73 x 170 cm|150|85|cashmere-wraps
4|87|Wool-Cashmere Scarf|Scarf|Wool warp / Cashmere weft|120 g|30 x 180 cm|95|85|cashmere-scarves
4|90|Pure Cashmere Wrap|Wrap|100% Cashmere|130 g|70 x 200 cm|190|129|cashmere-wraps
4|93|Printed Cashmere Wrap|Wrap|100% Cashmere|70 g|100 x 200 cm|220|129|cashmere-wraps
4|94|Solid Cashmere Wrap|Wrap|100% Cashmere|90 g|90 x 200 cm|150|119|cashmere-wraps
4|95|Pure Cashmere Scarf|Scarf|100% Goat Cashmere|120 g|30 x 180 cm|130|85|cashmere-scarves
4|98|Premium Cashmere Scarf|Scarf|100% Cashmere|150 g|33 x 190 cm|215|119|cashmere-scarves
4|99|Premium Cashmere Scarf|Scarf|100% Goat Cashmere|125 g|30 x 164 cm + fringe|170|119|cashmere-scarves
4|WR20|Cashmere Scarf|Scarf|100% Cashmere|88 g|60 x 170 cm|150|85|cashmere-scarves
4|WR21|Printed Cashmere Triangle Scarf|Triangle Scarf|100% Cashmere|49 g|70 x 170 cm|95|85|cashmere-wraps
4|RW51|Cashmere-Wool Triangle Scarf|Triangle Scarf|7% Cashmere / 93% Wool|115 g|42 x 135 cm|65|59|cashmere-wraps
4|WR30|Cashmere Neckwarmer|Neckwarmer|100% Cashmere|34 g|26 x 38 cm|62|59|cashmere-hats
4|K23608|Cashmere-Wool Hat|Beanie|35% Cashmere / 65% Wool|45 g|26 x 24.5 cm|46|49|cashmere-hats
4|K23609|Cashmere-Wool Beanie|Beanie|35% Cashmere / 65% Wool|75 g|25 x 22 cm|64|59|cashmere-hats
4|K23610|Cashmere-Wool Beanie|Beanie|35% Cashmere / 65% Wool|75 g|27 x 22 cm|64|59|cashmere-hats
4|K23614|Cashmere-Wool Hat|Beanie|35% Cashmere / 65% Wool|45 g|30 x 24 cm|46|49|cashmere-hats
4|MR01|Pure Cashmere Hat|Beanie|100% Cashmere|45 g|28 x 22 cm|76|59|cashmere-hats
4|MR02|Pure Cashmere Hat|Beanie|100% Cashmere|33 g|25 x 27 cm|60|59|cashmere-hats
4|MR03|Pure Cashmere Beanie|Beanie|100% Cashmere|76 g|26 x 23 cm|115|59|cashmere-hats
4|MR04|Pure Cashmere Beanie|Beanie|100% Cashmere|72 g|27.5 x 22.5 cm|110|59|cashmere-hats
4|MR05|Pure Cashmere Draped Hat|Beanie|100% Cashmere|60 g|33 x 22 cm|96|59|cashmere-hats
4|MR06|Pure Cashmere Beanie|Beanie|100% Cashmere|65 g|24 x 22 cm|100|59|cashmere-hats
4|MR07|Pure Cashmere Beanie|Beanie|100% Cashmere|100 g|26 x 22 cm|147|69|cashmere-hats
4|MR08|Pure Cashmere Beret|Beret|100% Cashmere|62 g|28 x 28 cm|96|59|cashmere-hats
4|MR21|Pure Cashmere Beanie|Beanie|100% Cashmere|82 g|28 x 22 cm|126|69|cashmere-hats
4|MR41|Pure Cashmere Hat|Beanie|100% Cashmere|55 g|26 x 27 cm|88|59|cashmere-hats
4|MR50|Convertible Cashmere Neckwarmer Hat|Neckwarmer|100% Cashmere|50 g|27 x 26 cm|82|59|cashmere-hats
4|RM07|Cashmere-Wool Double-Layer Beanie|Beanie|7% Cashmere / 93% Wool|70 g|26 x 21 cm|39|49|cashmere-hats
4|RM08|Cashmere-Wool Rib Beanie|Beanie|7% Cashmere / 93% Wool|75 g|25 x 21 cm|36|49|cashmere-hats
4|RM1143|Cashmere-Wool Hat|Beanie|25% Cashmere / 75% Wool|63 g|26 x 22 cm|49|49|cashmere-hats
4|RM1243|Cashmere-Wool Hat|Beanie|25% Cashmere / 75% Wool|79 g|26 x 22 cm|55|49|cashmere-hats
4|RM1343|Cashmere-Wool Hat|Beanie|25% Cashmere / 75% Wool|67 g|26 x 22 cm|53|49|cashmere-hats
4|RM1443|Cashmere-Wool Hat|Beanie|25% Cashmere / 75% Wool|79 g|26 x 25 cm|57|49|cashmere-hats
4|RM1543|Cashmere-Wool Hat|Beanie|25% Cashmere / 75% Wool|42 g|27 x 23 cm|40|49|cashmere-hats
4|RM1643|Cashmere-Wool Scarf|Scarf|25% Cashmere / 75% Wool|78 g|19 x 76 cm|52|59|cashmere-scarves
4|S13|Women Pure Cashmere Gloves|Gloves|100% Cashmere|31 g|9 x 22 cm|65|49|cashmere-gloves
4|S14|Women Long Cashmere Gloves|Gloves|100% Cashmere|48 g|9 x 24 cm|85|49|cashmere-gloves
4|S15|Women Cable Cashmere Gloves|Gloves|100% Cashmere|38 g|9 x 32 cm|75|49|cashmere-gloves
4|ST03|Cashmere-Wool Gloves|Gloves|7% Cashmere / 93% Wool|50 g|9.5 x 24 cm|40|49|cashmere-gloves
4|YRW01|Men Pure Cashmere Socks|Socks|100% Cashmere|50 g|19 x 21 cm|60|49|cashmere-gloves
4|YRW02|Women Pure Cashmere Socks|Socks|100% Cashmere|50 g|17 x 19 cm|60|49|cashmere-gloves
5|NYW6|Yak-Wool Scarf|Scarf|34% Yak / 66% Wool|46 g|14 x 80 cm|34|55|yak-scarves
5|N30|Pure Yak Wrap|Wrap|100% Yak|320 g|70 x 200 cm incl. fringe|220|129|yak-scarves
5|N5|Pure Yak Scarf|Scarf|100% Yak|125 g|30 x 165 cm + fringe|90|75|yak-scarves
5|NYM11|Yak-Wool Hat|Beanie|34% Yak / 66% Wool|44 g|27 x 24 cm|36|45|yak-hats
5|NYM12|Yak-Wool Beanie|Beanie|34% Yak / 66% Wool|69 g|28 x 23 cm|42|45|yak-hats
5|NYM13|Yak-Wool Beanie|Beanie|34% Yak / 66% Wool|85 g|26 x 22 cm|42|45|yak-hats
5|NYM14|Yak-Wool Hat|Beanie|34% Yak / 66% Wool|61 g|27 x 23 cm|40|45|yak-hats
5|NYM15|Yak-Wool Beanie|Beanie|34% Yak / 66% Wool|46 g|25 x 23 cm|36|45|yak-hats
5|NYM16|Yak-Wool Beanie|Beanie|34% Yak / 66% Wool|71 g|27 x 23 cm|40|45|yak-hats
5|NYM17|Yak-Wool Balaclava|Balaclava|34% Yak / 66% Wool|122 g|21 x 45 cm|73|55|yak-hats
5|NYM18|Yak-Wool Balaclava|Balaclava|34% Yak / 66% Wool|122 g|24 x 43 cm|70|55|yak-hats
5|NST01|Yak-Wool Gloves|Gloves|34% Yak / 66% Wool|36 g|8.5 x 22 cm|37|39|yak-hats
5|NST02|Women Yak-Wool Gloves|Gloves|34% Yak / 66% Wool|38 g|8.5 x 27 cm|37|39|yak-hats
5|YTM15|Double-Layer Alpaca Hat|Beanie|100% Alpaca|68 g|26 x 22 cm|60|55|alpaca-hats
5|YTM16|Ribbed Alpaca Beanie|Beanie|100% Alpaca|70 g|25 x 21 cm|60|55|alpaca-hats`;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const supplierCatalog: Product[] = rawCatalog.trim().split("\n").map((row) => {
  const [source, code, name, category, material, weight, dimensions, supplierCost, retail, previewKey] = row.split("|");
  return {
    id: `supplier-${source}-${code}`,
    name,
    slug: slugify(`${name}-${code}`),
    description: `${material}. ${weight}. ${dimensions}. Style ${code}.`,
    price_cents: Number(retail) * 100,
    currency: "usd",
    image_url: null,
    // Withdrawn from sale; retain source records for existing orders and saved pieces.
    active: false,
    created_at: "2026-08-27T00:00:00.000Z",
    style_code: code,
    category,
    material,
    weight,
    dimensions,
    supplier_price_cny: Number(supplierCost),
    reserve_price_cents: RESERVE_PRICE_CENTS,
    source_catalog: Number(source),
    catalog_preview_key: previewKey
  };
});

export function isProductListed(product: Product): boolean {
  return product.active && !supplierCatalog.some((source) =>
    !source.active && (source.id === product.id || source.slug === product.slug));
}
