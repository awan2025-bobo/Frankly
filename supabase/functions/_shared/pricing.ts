// Price math for Frankly (package counts, store totals, best store). Pure TypeScript (no Deno or network APIs) so it can be
// unit-tested with Node: `npx tsx scripts/test-pricing.ts`.
//
// Rule: Claude never invents prices. Claude says WHAT is needed
// (amounts + search words); this file decides WHICH Kroger product and HOW MANY
// packages, using real sizes and prices.

export type Unit = "g" | "ml" | "count";

export type Size = { qty: number; unit: Unit };

export type Requirement = {
  quantity: number;
  unit: Unit;
  grams_estimate: number; // weight of the needed amount, for unit mismatches
  each_estimate: number; // whole items needed if sold individually (2 onions)
};

export type Candidate = {
  productId: string;
  description: string;
  brand: string;
  size: string; // raw Kroger size text, e.g. "16 oz"
  price: number; // promo price if on sale, else regular
  regularPrice: number;
  aisle: string | null;
};

export type Pick = Candidate & {
  packages: number;
  cost: number;
  onSale: boolean;
};

const WEIGHT: Record<string, number> = { oz: 28.3495, lb: 453.592, lbs: 453.592, g: 1, kg: 1000 };
const VOLUME: Record<string, number> = {
  "fl oz": 29.5735, floz: 29.5735, pt: 473.176, qt: 946.353, gal: 3785.41,
  ml: 1, l: 1000, lt: 1000, liter: 1000, litre: 1000,
};
const COUNT: Record<string, number> = { ct: 1, count: 1, each: 1, ea: 1, pk: 1, pack: 1, dozen: 12, dz: 12 };

function toNumber(raw: string): number {
  if (raw.includes("/")) {
    const [a, b] = raw.split("/").map(Number);
    return b ? a / b : NaN;
  }
  return Number(raw);
}

/** Parses Kroger size strings like "16 oz", "1/2 gal", "12 ct", "6 ct / 12 fl oz". */
export function parseSize(text: string): Size | null {
  if (!text) return null;
  const s = text.toLowerCase().replace(/fl\.?\s*oz/g, "floz").replace(/,/g, " ");
  const re = /(\d+(?:\.\d+)?(?:\/\d+)?)\s*(floz|oz|lbs?|kg|g|ml|l|lt|liter|litre|pt|qt|gal|ct|count|each|ea|pk|pack|dozen|dz)\b/g;
  const parts: { n: number; u: string }[] = [];
  for (const m of s.matchAll(re)) {
    const n = toNumber(m[1]);
    if (Number.isFinite(n) && n > 0) parts.push({ n, u: m[2] });
  }
  if (parts.length === 0) {
    if (/\b(each|ea)\b/.test(s)) return { qty: 1, unit: "count" };
    return null;
  }
  const measure = parts.find((p) => p.u in WEIGHT || p.u in VOLUME || p.u === "floz");
  const count = parts.find((p) => p.u in COUNT);
  if (measure) {
    // "6 ct / 12 fl oz" = six 12 oz cans
    const mult = count && count !== measure ? count.n * COUNT[count.u] : 1;
    if (measure.u in WEIGHT) return { qty: measure.n * WEIGHT[measure.u] * mult, unit: "g" };
    return { qty: measure.n * VOLUME[measure.u === "floz" ? "fl oz" : measure.u] * mult, unit: "ml" };
  }
  return { qty: count!.n * COUNT[count!.u], unit: "count" };
}

/** The requirement expressed in a package's unit. */
function needIn(unit: Unit, req: Requirement): number {
  if (unit === req.unit) return req.quantity;
  if (unit === "g") return req.grams_estimate;
  if (unit === "ml") return req.unit === "g" ? req.quantity : req.grams_estimate; // ~1 g per ml
  return req.each_estimate; // sold by count
}

/** How many packages of `size` cover the requirement. */
export function packagesNeeded(sizeText: string, req: Requirement): number {
  const size = parseSize(sizeText);
  if (!size) return 1;
  const need = needIn(size.unit, req);
  if (!Number.isFinite(need) || need <= 0) return 1;
  // 5% slack so 470 ml of a "16 fl oz" bottle doesn't round up to two bottles.
  const n = Math.ceil(need / (size.qty * 1.05));
  return Math.min(Math.max(n, 1), 12);
}

/**
 * What's left of the packages bought after using `req` (Leftovers book), in the package's unit.
 * Null when the size can't be read or nothing meaningful is left (under 20% of what was bought).
 */
export function leftoverAfter(sizeText: string, packages: number, req: Requirement): Size | null {
  const size = parseSize(sizeText);
  if (!size) return null;
  const need = needIn(size.unit, req);
  if (!Number.isFinite(need) || need < 0) return null;
  const bought = size.qty * packages;
  const left = bought - need;
  const enough = size.unit === "count" ? left >= 1 : left >= 30; // at least 1 item, or ~1 oz / 2 tbsp
  return left >= bought * 0.2 && enough ? { qty: size.unit === "count" ? Math.floor(left) : left, unit: size.unit } : null;
}

/** "about 8 oz", "about 1.5 lb", "about 1 cup", "6". */
export function describeAmount(s: Size): string {
  if (s.unit === "count") return String(Math.round(s.qty));
  const nice = (n: number) => String(Math.round(n * 2) / 2).replace(/\.0$/, "");
  if (s.unit === "g") return s.qty >= 454 ? `about ${nice(s.qty / 453.592)} lb` : `about ${Math.max(1, Math.round(s.qty / 28.3495))} oz`;
  return s.qty >= 120 ? `about ${nice(s.qty / 236.588)} cup${s.qty >= 354 ? "s" : ""}` : `about ${Math.max(1, Math.round(s.qty / 29.5735))} fl oz`;
}

// Ready-made products that often share a keyword with a raw ingredient ("Gochujang Beef Cup Noodles" vs gochujang).
const PREPARED = [
  "noodle", "ramen", "cup", "soup", "chips", "snack", "cracker", "candy", "cookie", "cereal", "meal kit", "bowl",
  "dinner", "entree", "pizza", "sandwich", "burrito", "drink", "beverage", "soda", "juice", "tea", "jerky", "popcorn",
  "sauce", "marinade", "dressing", "glaze", "teriyaki", "seasoning mix", "dip",
];

/**
 * Keeps only products whose name fits the ingredient, so "garlic" never picks garlic salt.
 * `ingredient` (name + search words) lets us reject ready-made products unless that's what the recipe wants.
 */
export function relevant(c: Candidate, mustInclude: string, exclude: string[], ingredient = ""): boolean {
  const d = `${c.description} ${c.brand}`.toLowerCase();
  const words = mustInclude.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length && !words.every((w) => d.includes(w.replace(/s$/, "")))) return false;
  if (exclude.some((x) => x && d.includes(x.toLowerCase()))) return false;
  const want = ingredient.toLowerCase();
  return !PREPARED.some((p) => new RegExp(`\\b${p}`).test(d) && !want.includes(p));
}

/**
 * Picks the product to buy. With few leftovers wanted we minimize what you pay
 * today; with "lots" we prefer the best unit price (bigger packs).
 */
export function choose(
  candidates: Candidate[],
  req: Requirement,
  leftovers: "none" | "some" | "lots",
): Pick | null {
  const picks: (Pick & { unitPrice: number })[] = candidates
    .filter((c) => c.price > 0)
    .map((c) => {
      const packages = packagesNeeded(c.size, req);
      const size = parseSize(c.size);
      return {
        ...c,
        packages,
        cost: round2(c.price * packages),
        onSale: c.price < c.regularPrice,
        unitPrice: size ? c.price / size.qty : c.price,
      };
    });
  if (picks.length === 0) return null;
  picks.sort((a, b) =>
    leftovers === "lots" ? a.unitPrice - b.unitPrice || a.cost - b.cost : a.cost - b.cost,
  );
  const { unitPrice: _u, ...best } = picks[0];
  return best;
}

export type StoreTotal = {
  locationId: string;
  name: string;
  distanceMi: number | null;
  total: number;
  found: number;
  missing: string[];
};

/** Recommends the cheapest store among those that carry the most items, and says why. */
export function recommend(stores: StoreTotal[], itemCount: number): { best: StoreTotal | null; reason: string } {
  if (stores.length === 0) return { best: null, reason: "No nearby Kroger-family stores found." };
  const maxFound = Math.max(...stores.map((s) => s.found));
  if (maxFound === 0) return { best: null, reason: "None of the nearby stores carry these items." };
  // Only compare stores that carry the most items, so a store isn't "cheaper" just by missing things.
  const eligible = stores.filter((s) => s.found === maxFound);
  eligible.sort((a, b) => a.total - b.total || (a.distanceMi ?? 99) - (b.distanceMi ?? 99));
  const best = eligible[0];
  const dist = best.distanceMi != null ? ` (${best.distanceMi.toFixed(1)} mi)` : "";
  let reason = `${best.name}${dist} has ${best.found} of ${itemCount} items for $${best.total.toFixed(2)}`;
  const next = eligible[1];
  if (!next && stores.length > 1) reason += ". Other nearby stores carry fewer of the items.";
  else if (next) {
    const diff = next.total - best.total;
    const nextDist = next.distanceMi != null ? `, ${next.distanceMi.toFixed(1)} mi` : "";
    reason += diff > 0.005
      ? `, $${diff.toFixed(2)} less than ${next.name}${nextDist}.`
      : `. ${next.name}${nextDist} costs about the same.`;
  } else reason += ".";
  if (best.missing.length) reason += ` Not found there: ${best.missing.join(", ")}.`;
  return { best, reason };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Great-circle distance in miles. */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
