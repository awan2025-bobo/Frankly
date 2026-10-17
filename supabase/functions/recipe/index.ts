// POST { dish, servings, budget, leftovers, tweak?, base_recipe_id? }
//
// The Recipe Agent:
//   1. loads everything Frankly remembers about the user (profile, history, feedback, staples)
//   2. asks Claude for a recipe that fits it, with a shopping spec for each ingredient
//   3. prices every ingredient live at the 3 nearest Kroger-family stores
//   4. picks the best store, prices cheaper swaps, checks the budget
//   5. saves the result as a draft recipe and returns it

import { claudeJSON, describeMemory, json, loadMemory, serve } from "../_shared/common.ts";
import { searchProducts } from "../_shared/kroger.ts";
import { choose, type Pick, recommend, relevant, type Requirement, round2, type StoreTotal } from "../_shared/pricing.ts";

const shopSpec = {
  quantity: { type: "number", description: "Amount needed, in `unit`" },
  unit: { type: "string", enum: ["g", "ml", "count"] },
  grams_estimate: { type: "number", description: "Approximate weight in grams of the amount needed" },
  each_estimate: { type: "number", description: "Whole retail items needed if sold individually (2 onions = 2). Use 1 for things sold by package." },
  search_term: { type: "string", description: "Short, generic grocery search, 1-4 words, no brand (e.g. 'boneless chicken thighs')" },
  must_include: { type: "string", description: "One word that must appear in the product name (e.g. 'thigh')" },
  exclude: { type: "array", items: { type: "string" }, description: "Words that mean the wrong product (e.g. for fresh garlic: powder, salt, bread)" },
};
const shopKeys = Object.keys(shopSpec);

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["feasible", "problem", "title", "description", "cuisine", "servings", "fridge_days", "total_minutes",
    "difficulty", "how_personalized", "ingredients", "steps"],
  properties: {
    feasible: { type: "boolean" },
    problem: { type: "string", description: "If not feasible, a short friendly reason and what to change. Empty otherwise." },
    title: { type: "string" },
    description: { type: "string", description: "One appetizing sentence" },
    cuisine: { type: "string" },
    servings: { type: "integer" },
    fridge_days: { type: "integer", description: "How many days leftovers keep in the fridge" },
    total_minutes: { type: "integer" },
    difficulty: { type: "integer", description: "1-10" },
    how_personalized: { type: "string", description: "1-2 sentences: how their preferences and history shaped this recipe" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "amount_text", "is_staple", "already_have", ...shopKeys, "swap"],
        properties: {
          name: { type: "string" },
          amount_text: { type: "string", description: "Human amount, e.g. '2 cups' or '1 lb'" },
          is_staple: { type: "boolean", description: "Long-lasting pantry item: salt, oils, dried spices, sauces, flour, sugar, vinegar" },
          already_have: { type: "boolean", description: "True only if it matches a staple they already have at home" },
          ...shopSpec,
          swap: {
            type: "object",
            additionalProperties: false,
            required: ["has_swap", "name", "amount_text", "reason", ...shopKeys],
            properties: {
              has_swap: { type: "boolean", description: "True for at most 3 of the priciest ingredients that have a good cheaper alternative" },
              name: { type: "string" },
              amount_text: { type: "string" },
              reason: { type: "string", description: "Why it works, e.g. 'thighs are juicier and usually cheaper'" },
              ...shopSpec,
            },
          },
        },
      },
    },
    steps: { type: "array", items: { type: "string" } },
  },
};

type Shop = Requirement & { search_term: string; must_include: string; exclude: string[] };
type Ingredient = Shop & {
  name: string;
  amount_text: string;
  is_staple: boolean;
  already_have: boolean;
  swap: Shop & { has_swap: boolean; name: string; amount_text: string; reason: string };
};
type Draft = {
  feasible: boolean;
  problem: string;
  title: string;
  description: string;
  cuisine: string;
  servings: number;
  fridge_days: number;
  total_minutes: number;
  difficulty: number;
  how_personalized: string;
  ingredients: Ingredient[];
  steps: string[];
};

type Store = { locationId: string; name: string; chain: string; address: string; distanceMi: number | null };

const SYSTEM = `You are Frankly's Recipe Agent, a practical home-cooking assistant for budget-conscious people.
You write one recipe that fits the user's real life, plus a precise shopping spec for each ingredient.
Frankly's code looks up live Kroger prices from your shopping specs, so never state or guess prices.

Rules:
- Allergies are absolute: never include an allergen or anything containing it. Respect every diet listed.
- Only use appliances they own. If the dish truly needs one they lack, adapt it; if impossible, set feasible=false.
- Set feasible=false (with a friendly "problem") for requests that are not a dish, unsafe, or unrealistic (e.g. a feast for 2 people on $3).
- Scale spice and seasoning to their sliders; keep technique near their preferred difficulty.
- Scale quantities to the servings. Leftover preference: "none" = exact amounts, "some" = about one extra portion, "lots" = cook extra for later.
- Learn from history: if recent leftovers were "more than expected", trim portions about 15%; if "less", add about 15%.
  Lean toward what they rated highly; avoid repeating dishes cooked in the last 7 days and things like dishes they rejected.
- Mark long-lasting pantry items as is_staple. Set already_have=true only when it matches one of their staples at home.
- Shopping specs: generic search terms as you would type on a grocery site; one must_include word; exclude words that
  would match the wrong product. Solids in g, liquids in ml, whole items (eggs, onions, lemons) in count.
- Swaps: give has_swap=true for up to 3 of the most expensive ingredients with a genuinely good cheaper alternative.
  Everything else gets has_swap=false with empty strings and zeros.
- Steps: clear, numbered-style instructions, one action each, 6-12 steps.`;

/** Runs async jobs with at most `limit` in flight (keeps Kroger happy). */
async function pool<T>(jobs: (() => Promise<T>)[], limit = 8): Promise<T[]> {
  const out: T[] = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    while (next < jobs.length) {
      const i = next++;
      out[i] = await jobs[i]();
    }
  }));
  return out;
}

async function priceAt(spec: Shop, store: Store, leftovers: "none" | "some" | "lots"): Promise<Pick | null> {
  try {
    const found = await searchProducts(spec.search_term, store.locationId);
    const fits = found.filter((c) => relevant(c, spec.must_include, spec.exclude));
    return choose(fits, spec, leftovers);
  } catch (e) {
    console.error("price lookup failed", spec.search_term, store.name, e);
    return null;
  }
}

serve(async (req, db) => {
  const body = await req.json();
  const dish = String(body.dish ?? "").trim().slice(0, 120);
  const servings = Math.round(Number(body.servings));
  const budget = Number(body.budget);
  const leftovers = (["none", "some", "lots"].includes(body.leftovers) ? body.leftovers : "some") as "none" | "some" | "lots";
  if (!dish) return json({ error: "Tell Frankly what you want to cook." }, 400);
  if (!(servings >= 1 && servings <= 20)) return json({ problem: "Servings should be between 1 and 20." });
  if (!(budget >= 1 && budget <= 500)) return json({ problem: "Budget should be between $1 and $500." });

  const memory = await loadMemory(db);
  const stores: Store[] = memory.profile.kroger_stores ?? [];
  if (stores.length === 0) return json({ problem: "Add your zip code in Profile so Frankly can find stores near you." });

  let tweakText = "";
  if (body.tweak && body.base_recipe_id) {
    const { data: base } = await db.from("recipes").select("data").eq("id", body.base_recipe_id).single();
    if (base) {
      const b = base.data;
      tweakText = `\n\nThis is a TWEAK of an earlier recipe. Keep what works, change what they ask.
Earlier version: ${b.title}. Ingredients: ${b.items.map((i: { name: string; amount_text: string }) => `${i.amount_text} ${i.name}`).join("; ")}.
Their change request: "${String(body.tweak).slice(0, 300)}"`;
    }
  }

  // Step 2: Claude writes the recipe + shopping specs.
  const draft = await claudeJSON<Draft>({
    system: SYSTEM,
    effort: "medium",
    prompt: `What Frankly remembers about this user:\n${describeMemory(memory)}\n\n` +
      `Request: "${dish}" for ${servings} servings, target budget $${budget.toFixed(2)}, leftovers: ${leftovers}.` +
      tweakText,
    schema: SCHEMA,
  });
  if (!draft.feasible) return json({ problem: draft.problem || "Frankly couldn't make that work. Try changing the dish or budget." });

  // Step 3: live prices for everything they need to buy, at every store.
  const toBuy = draft.ingredients.filter((i) => !i.already_have);
  const jobs: (() => Promise<void>)[] = [];
  const prices = new Map<Ingredient, Record<string, Pick | null>>();
  const swapPrices = new Map<Ingredient, Record<string, Pick | null>>();
  for (const ing of toBuy) {
    prices.set(ing, {});
    if (ing.swap.has_swap) swapPrices.set(ing, {});
    for (const s of stores) {
      jobs.push(async () => { prices.get(ing)![s.locationId] = await priceAt(ing, s, leftovers); });
      if (ing.swap.has_swap) {
        jobs.push(async () => { swapPrices.get(ing)![s.locationId] = await priceAt(ing.swap, s, leftovers); });
      }
    }
  }
  await pool(jobs);

  // Step 4: totals per store, recommendation, swaps, budget check.
  const totals: StoreTotal[] = stores.map((s) => {
    let total = 0, found = 0;
    const missing: string[] = [];
    for (const ing of toBuy) {
      const p = prices.get(ing)![s.locationId];
      if (p) { total += p.cost; found++; } else missing.push(ing.name);
    }
    return { locationId: s.locationId, name: s.name, distanceMi: s.distanceMi, total: round2(total), found, missing };
  });
  const { best, reason } = recommend(totals, toBuy.length);
  const bestId = best?.locationId ?? null;

  const items = draft.ingredients.map((ing) => {
    const p = prices.get(ing) ?? {};
    let swap = null;
    if (ing.swap.has_swap && bestId) {
      const orig = p[bestId];
      const alt = swapPrices.get(ing)?.[bestId];
      if (orig && alt && alt.cost < orig.cost) {
        swap = { name: ing.swap.name, amount_text: ing.swap.amount_text, reason: ing.swap.reason, pick: alt, savings: round2(orig.cost - alt.cost) };
      }
    }
    return {
      name: ing.name,
      amount_text: ing.amount_text,
      is_staple: ing.is_staple,
      already_have: ing.already_have,
      prices: p,
      swap,
    };
  });

  const total = best?.total ?? 0;
  const swapSavings = round2(items.reduce((sum, i) => sum + (i.swap?.savings ?? 0), 0));
  const withSwaps = round2(total - swapSavings);
  const budget_check = {
    budget,
    total,
    with_swaps: withSwaps,
    status: total <= budget ? "ok" : withSwaps <= budget ? "swaps" : "over",
  };

  const data = {
    title: draft.title,
    description: draft.description,
    cuisine: draft.cuisine,
    servings: draft.servings,
    fridge_days: draft.fridge_days,
    total_minutes: draft.total_minutes,
    difficulty: draft.difficulty,
    how_personalized: draft.how_personalized,
    steps: draft.steps,
    items,
    stores,
    totals,
    recommended: { locationId: bestId, reason },
    budget_check,
    leftovers,
    priced_at: new Date().toISOString(),
  };

  // Step 5: save as a draft. The app moves it to active/saved/dismissed.
  const { data: row, error } = await db.from("recipes").insert({
    status: "draft",
    dish_query: dish,
    title: draft.title,
    cuisine: draft.cuisine,
    servings: draft.servings,
    budget,
    leftovers,
    est_total: total,
    data,
  }).select().single();
  if (error) throw error;
  return json({ recipe: row });
});
