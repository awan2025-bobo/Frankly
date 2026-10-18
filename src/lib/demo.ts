// DEMO MODE: used automatically when the app has no Supabase keys (.env missing).
// Everything runs on the phone: sample recipes, clearly labeled SAMPLE prices at demo stores,
// and data saved on the device (AsyncStorage) so "refresh and history persists" still works.
// Once .env has real keys, none of this runs.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { recommend, round2, type StoreTotal } from '../../supabase/functions/_shared/pricing';
import type { Feedback, Item, KrogerStore, Leftovers, Pick, Profile, Recipe, RecipeData, Suggestion } from './types';

const KEY = 'frankly-demo-v1';

type DB = { profile: Profile | null; recipes: Recipe[]; feedback: Feedback[]; pantry: string[] };
let db: DB | null = null;

async function load(): Promise<DB> {
  if (db) return db;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    db = raw ? JSON.parse(raw) : null;
  } catch {
    db = null;
  }
  db ??= { profile: null, recipes: [], feedback: [], pantry: [] };
  return db;
}

async function save() {
  if (db) await AsyncStorage.setItem(KEY, JSON.stringify(db));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function resetDemoData() {
  db = { profile: null, recipes: [], feedback: [], pantry: [] };
  await AsyncStorage.removeItem(KEY);
}

// ---------- Stores ----------

const DEMO_STORES: KrogerStore[] = [
  { locationId: 'demo-qfc', name: 'QFC (demo)', chain: 'QFC', address: 'Sample store, prices are examples', lat: 0, lng: 0, distanceMi: 0.8 },
  { locationId: 'demo-fred', name: 'Fred Meyer (demo)', chain: 'FRED', address: 'Sample store, prices are examples', lat: 0, lng: 0, distanceMi: 2.6 },
  { locationId: 'demo-kroger', name: 'Kroger Marketplace (demo)', chain: 'KROGER', address: 'Sample store, prices are examples', lat: 0, lng: 0, distanceMi: 5.1 },
];
const STORE_MULT: Record<string, number> = { 'demo-qfc': 1.12, 'demo-fred': 0.94, 'demo-kroger': 1.0 };

export async function findStores(_near: { zip?: string; lat?: number; lng?: number }) {
  await wait(900);
  return { stores: DEMO_STORES, origin: null, message: undefined as string | undefined };
}

// ---------- Sample ingredient catalog ----------

type Ing = {
  name: string;
  per: (servings: number) => string; // human amount
  product: string;
  size: string;
  price: number;
  servesPerPack: number; // staples: 0 = one pack lasts many meals
  aisle: string;
  staple?: boolean;
  swap?: { name: string; product: string; size: string; price: number; reason: string };
};

const I = {
  chickenThighs: { name: 'Bone-in chicken thighs', per: (s) => `${(s * 0.5).toFixed(1)} lb`, product: 'Kroger Bone-In Chicken Thighs', size: '2.5 lb', price: 7.49, servesPerPack: 5, aisle: 'Meat', swap: { name: 'Chicken drumsticks', product: 'Kroger Chicken Drumsticks', size: '2.5 lb', price: 5.29, reason: 'Same juicy dark meat, usually cheaper per pound.' } },
  chickenBreast: { name: 'Chicken breast', per: (s) => `${(s * 0.4).toFixed(1)} lb`, product: 'Kroger Boneless Skinless Chicken Breasts', size: '1.5 lb', price: 8.99, servesPerPack: 3, aisle: 'Meat', swap: { name: 'Chicken thighs', product: 'Kroger Boneless Chicken Thighs', size: '1.5 lb', price: 6.49, reason: 'More forgiving to cook and cheaper per pound.' } },
  groundBeef: { name: 'Ground beef (80/20)', per: (s) => `${(s * 0.3).toFixed(1)} lb`, product: 'Kroger 80% Lean Ground Beef', size: '1 lb', price: 5.99, servesPerPack: 3, aisle: 'Meat', swap: { name: 'Ground turkey', product: 'Kroger Ground Turkey 93/7', size: '1 lb', price: 4.49, reason: 'Leaner and cheaper; season it well and nobody notices.' } },
  tofu: { name: 'Firm tofu', per: (s) => `${Math.ceil(s / 2)} block${s > 2 ? 's' : ''}`, product: 'Simple Truth Organic Firm Tofu', size: '14 oz', price: 2.49, servesPerPack: 2, aisle: 'Aisle 4' },
  chickpeas: { name: 'Chickpeas', per: (s) => `${Math.ceil(s / 2)} can${s > 2 ? 's' : ''}`, product: 'Kroger Garbanzo Beans', size: '15.5 oz', price: 0.99, servesPerPack: 2, aisle: 'Aisle 8' },
  garlic: { name: 'Garlic', per: () => '6 cloves', product: 'Fresh Garlic Bulb', size: '1 each', price: 0.69, servesPerPack: 6, aisle: 'Produce' },
  onion: { name: 'Yellow onion', per: (s) => `${Math.max(1, Math.round(s / 3))}`, product: 'Yellow Onion', size: '1 each', price: 0.99, servesPerPack: 3, aisle: 'Produce' },
  greenOnion: { name: 'Green onions', per: () => '1 bunch', product: 'Green Onions', size: '1 bunch', price: 0.99, servesPerPack: 8, aisle: 'Produce' },
  bellPepper: { name: 'Bell pepper', per: (s) => `${Math.max(1, Math.round(s / 2))}`, product: 'Red Bell Pepper', size: '1 each', price: 1.25, servesPerPack: 2, aisle: 'Produce' },
  cilantro: { name: 'Cilantro', per: () => '1 bunch', product: 'Fresh Cilantro', size: '1 bunch', price: 0.89, servesPerPack: 8, aisle: 'Produce' },
  lime: { name: 'Limes', per: () => '2', product: 'Limes', size: '1 each', price: 0.5, servesPerPack: 2, aisle: 'Produce' },
  ginger: { name: 'Fresh ginger', per: () => '1 inch', product: 'Fresh Ginger Root', size: '4 oz', price: 1.1, servesPerPack: 8, aisle: 'Produce' },
  tortillas: { name: 'Corn tortillas', per: (s) => `${s * 3}`, product: 'Mission Corn Tortillas', size: '30 ct', price: 3.29, servesPerPack: 10, aisle: 'Aisle 6' },
  cheese: { name: 'Shredded cheese', per: () => '1 cup', product: 'Kroger Mexican Style Shredded Cheese', size: '8 oz', price: 2.99, servesPerPack: 6, aisle: 'Dairy' },
  salsa: { name: 'Salsa', per: () => '1/2 cup', product: 'Kroger Medium Salsa', size: '16 oz', price: 2.79, servesPerPack: 8, aisle: 'Aisle 6' },
  spaghetti: { name: 'Spaghetti', per: (s) => `${s * 3} oz`, product: 'Barilla Spaghetti', size: '16 oz', price: 1.99, servesPerPack: 5, aisle: 'Aisle 5', swap: { name: 'Store-brand spaghetti', product: 'Kroger Spaghetti', size: '16 oz', price: 1.19, reason: 'Same durum wheat pasta, about 40% less.' } },
  tomatoes: { name: 'Crushed tomatoes', per: (s) => `${Math.ceil(s / 4)} can`, product: 'Hunt’s Crushed Tomatoes', size: '28 oz', price: 2.49, servesPerPack: 4, aisle: 'Aisle 5', swap: { name: 'Store-brand crushed tomatoes', product: 'Kroger Crushed Tomatoes', size: '28 oz', price: 1.69, reason: 'Store brand tastes the same once simmered.' } },
  parmesan: { name: 'Parmesan', per: () => '1/2 cup grated', product: 'BelGioioso Parmesan Wedge', size: '5 oz', price: 5.49, servesPerPack: 6, aisle: 'Deli', swap: { name: 'Grated parmesan (shaker)', product: 'Kroger Grated Parmesan', size: '8 oz', price: 3.49, reason: 'Fine for a weeknight sauce and lasts for months.' } },
  basil: { name: 'Fresh basil', per: () => 'a handful', product: 'Fresh Basil', size: '0.75 oz', price: 2.29, servesPerPack: 6, aisle: 'Produce' },
  coconutMilk: { name: 'Coconut milk', per: (s) => `${Math.ceil(s / 3)} can`, product: 'Thai Kitchen Coconut Milk', size: '13.66 fl oz', price: 2.79, servesPerPack: 3, aisle: 'Aisle 10', swap: { name: 'Store-brand coconut milk', product: 'Kroger Coconut Milk', size: '13.5 fl oz', price: 1.79, reason: 'Just as creamy for curry.' } },
  curryPaste: { name: 'Curry paste', per: () => '3 tbsp', product: 'Thai Kitchen Red Curry Paste', size: '4 oz', price: 3.49, servesPerPack: 6, aisle: 'Aisle 10' },
  eggs: { name: 'Eggs', per: (s) => `${Math.max(2, s)}`, product: 'Kroger Grade A Large Eggs', size: '12 ct', price: 2.99, servesPerPack: 8, aisle: 'Dairy' },
  peas: { name: 'Frozen peas & carrots', per: () => '1 1/2 cups', product: 'Kroger Peas & Carrots', size: '12 oz', price: 1.25, servesPerPack: 4, aisle: 'Frozen' },
  // Staples: one pack lasts many meals, and Frankly remembers them.
  rice: { name: 'Jasmine rice', per: (s) => `${(s * 0.5).toFixed(1)} cups`, product: 'Kroger Jasmine Rice', size: '2 lb', price: 3.49, servesPerPack: 0, aisle: 'Aisle 7', staple: true },
  soy: { name: 'Soy sauce', per: () => '1/3 cup', product: 'Kikkoman Soy Sauce', size: '15 fl oz', price: 3.29, servesPerPack: 0, aisle: 'Aisle 10', staple: true },
  vinegar: { name: 'White vinegar', per: () => '1/2 cup', product: 'Kroger Distilled White Vinegar', size: '32 fl oz', price: 1.79, servesPerPack: 0, aisle: 'Aisle 9', staple: true },
  bay: { name: 'Bay leaves', per: () => '3 leaves', product: 'Kroger Bay Leaves', size: '0.25 oz', price: 3.99, servesPerPack: 0, aisle: 'Aisle 9', staple: true },
  pepper: { name: 'Black pepper', per: () => '1 tsp', product: 'Kroger Ground Black Pepper', size: '3 oz', price: 2.99, servesPerPack: 0, aisle: 'Aisle 9', staple: true },
  salt: { name: 'Salt', per: () => 'to taste', product: 'Morton Kosher Salt', size: '3 lb', price: 3.49, servesPerPack: 0, aisle: 'Aisle 9', staple: true },
  oliveOil: { name: 'Olive oil', per: () => '3 tbsp', product: 'Kroger Extra Virgin Olive Oil', size: '16.9 fl oz', price: 6.99, servesPerPack: 0, aisle: 'Aisle 9', staple: true },
  vegOil: { name: 'Vegetable oil', per: () => '2 tbsp', product: 'Kroger Vegetable Oil', size: '48 fl oz', price: 3.99, servesPerPack: 0, aisle: 'Aisle 9', staple: true },
  sesameOil: { name: 'Sesame oil', per: () => '1 tsp', product: 'Kadoya Sesame Oil', size: '5.5 fl oz', price: 4.29, servesPerPack: 0, aisle: 'Aisle 10', staple: true },
  cumin: { name: 'Ground cumin', per: () => '1 tsp', product: 'Kroger Ground Cumin', size: '2 oz', price: 2.49, servesPerPack: 0, aisle: 'Aisle 9', staple: true },
  chiliPowder: { name: 'Chili powder', per: () => '1 tbsp', product: 'Kroger Chili Powder', size: '2.5 oz', price: 2.49, servesPerPack: 0, aisle: 'Aisle 9', staple: true },
  chiliFlakes: { name: 'Red pepper flakes', per: () => 'a pinch', product: 'Kroger Crushed Red Pepper', size: '1.5 oz', price: 2.29, servesPerPack: 0, aisle: 'Aisle 9', staple: true },
} satisfies Record<string, Ing>;

type Template = {
  match: RegExp;
  title: (dish: string) => string;
  cuisine: string;
  description: string;
  minutes: number;
  difficulty: number;
  fridge: number;
  protein: Ing | null; // swapped for tofu/chickpeas for vegetarian/vegan users
  rest: Ing[];
  steps: string[];
};

const TEMPLATES: Template[] = [
  {
    match: /adobo|chicken/i, title: () => 'Weeknight Chicken Adobo', cuisine: 'Filipino', minutes: 45, difficulty: 3, fridge: 4,
    description: 'Tangy, garlicky braised chicken with a glossy soy-vinegar glaze over rice.',
    protein: I.chickenThighs, rest: [I.garlic, I.vinegar, I.soy, I.bay, I.pepper, I.rice, I.greenOnion],
    steps: ['Pat the chicken dry and season with pepper.', 'Brown the chicken skin-side down in a pot over medium-high heat, about 6 minutes.', 'Add smashed garlic and bay leaves; cook 1 minute.', 'Pour in the vinegar, soy sauce and 1/2 cup water. Bring to a simmer.', 'Cover and cook 25 minutes, turning once.', 'Meanwhile, cook the rice.', 'Uncover and reduce the sauce until glossy, about 5 minutes.', 'Serve over rice, topped with sliced green onions.'],
  },
  {
    match: /taco|burrito|mexican/i, title: () => 'Street-Style Tacos', cuisine: 'Mexican', minutes: 30, difficulty: 2, fridge: 3,
    description: 'Spiced, crispy-edged filling in warm corn tortillas with lime and cilantro.',
    protein: I.groundBeef, rest: [I.tortillas, I.onion, I.cilantro, I.lime, I.cheese, I.salsa, I.cumin, I.chiliPowder, I.vegOil, I.salt],
    steps: ['Dice the onion and chop the cilantro.', 'Heat oil in a skillet over medium-high heat.', 'Cook the protein with half the onion, breaking it up, until browned, about 8 minutes.', 'Stir in cumin, chili powder, salt and a splash of water; simmer 3 minutes.', 'Warm the tortillas in a dry pan, 30 seconds per side.', 'Fill the tortillas and top with onion, cilantro, cheese and salsa.', 'Squeeze lime over everything and serve.'],
  },
  {
    match: /pasta|spaghetti|marinara|italian/i, title: () => 'Garlicky Tomato Spaghetti', cuisine: 'Italian', minutes: 30, difficulty: 2, fridge: 4,
    description: 'A fast, bright tomato sauce with garlic, basil and plenty of parmesan.',
    protein: null, rest: [I.spaghetti, I.tomatoes, I.garlic, I.onion, I.oliveOil, I.parmesan, I.basil, I.chiliFlakes, I.salt],
    steps: ['Bring a big pot of salted water to a boil.', 'Warm olive oil in a pan; cook diced onion 5 minutes until soft.', 'Add sliced garlic and chili flakes; cook 1 minute.', 'Add the crushed tomatoes and a pinch of salt; simmer 15 minutes.', 'Cook the spaghetti 1 minute less than the package says. Save a cup of pasta water.', 'Toss the pasta in the sauce with a splash of pasta water.', 'Finish with torn basil and parmesan.'],
  },
  {
    match: /curry|thai|indian/i, title: () => 'Coconut Curry', cuisine: 'Thai', minutes: 35, difficulty: 3, fridge: 4,
    description: 'Creamy red curry with tender protein and vegetables, made for spooning over rice.',
    protein: I.chickenBreast, rest: [I.coconutMilk, I.curryPaste, I.onion, I.bellPepper, I.garlic, I.ginger, I.lime, I.rice, I.vegOil],
    steps: ['Start the rice.', 'Slice the protein, onion and bell pepper.', 'Heat oil; fry the curry paste with garlic and ginger for 1 minute.', 'Add the protein and cook until no longer pink.', 'Pour in the coconut milk; add the onion and pepper.', 'Simmer 10 minutes until slightly thickened.', 'Finish with lime juice and serve over rice.'],
  },
  {
    match: /fried rice|rice/i, title: () => 'Clean-Out-the-Fridge Fried Rice', cuisine: 'Chinese', minutes: 20, difficulty: 2, fridge: 3,
    description: 'Crispy, savory fried rice with egg and vegetables, ready in 20 minutes.',
    protein: null, rest: [I.rice, I.eggs, I.peas, I.greenOnion, I.garlic, I.soy, I.sesameOil, I.vegOil],
    steps: ['Use cold, day-old rice if you have it, or cook it and spread it out to cool.', 'Scramble the eggs in a hot oiled pan; set aside.', 'Add more oil and the garlic; cook 30 seconds.', 'Add the peas and carrots; cook 2 minutes.', 'Add the rice and press it flat; let it crisp 2 minutes before stirring.', 'Stir in soy sauce, sesame oil and the eggs.', 'Top with green onions.'],
  },
];

function genericTemplate(dish: string): Template {
  const title = dish.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    match: /.*/, title: () => title, cuisine: 'Home-style', minutes: 40, difficulty: 3, fridge: 3,
    description: `A budget-friendly take on ${dish}, built around what's cheap this week.`,
    protein: I.chickenBreast, rest: [I.onion, I.garlic, I.bellPepper, I.oliveOil, I.salt, I.pepper, I.rice],
    steps: ['Prep: dice the onion and pepper, mince the garlic.', 'Season the protein with salt and pepper.', 'Sear it in olive oil until golden; set aside.', 'Cook the onion and pepper in the same pan, 6 minutes.', 'Add garlic, then return the protein with a splash of water.', 'Simmer until cooked through, about 10 minutes.', 'Serve with rice.'],
  };
}

// Same item, a little different at each store (deterministic so prices don't jump around).
function priceAt(base: number, storeId: string, key: string) {
  let h = 0;
  for (const c of key + storeId) h = (h * 31 + c.charCodeAt(0)) % 997;
  const noise = 1 + ((h % 13) - 6) / 100;
  return Math.max(0.39, Math.round(base * STORE_MULT[storeId] * noise * 10) / 10 - 0.01);
}

function pickFor(product: string, size: string, base: number, packages: number, aisle: string, storeId: string): Pick {
  const price = round2(priceAt(base, storeId, product));
  const onSale = storeId === 'demo-fred' && product.length % 3 === 0;
  const finalPrice = onSale ? round2(price * 0.8) : price;
  return { productId: product, description: product, brand: '', size, price: finalPrice, regularPrice: price, aisle, packages, cost: round2(finalPrice * packages), onSale };
}

// ---------- Recipe Agent (demo) ----------

export async function generateRecipe(req: {
  dish: string;
  servings: number;
  budget: number;
  leftovers: Leftovers;
  tweak?: string;
  base_recipe_id?: string;
}): Promise<{ recipe?: Recipe; problem?: string }> {
  const d = await load();
  await wait(4200); // let the "Cooking it up…" steps play
  const dish = req.dish.trim();
  if (dish.replace(/[^a-z]/gi, '').length < 3) return { problem: "That doesn't look like a dish yet. Try something like “chicken adobo”." };
  const p = d.profile;
  const meatFree = !!p?.diets.some((x) => /vegan|vegetarian/i.test(x));
  const t = TEMPLATES.find((x) => x.match.test(dish)) ?? genericTemplate(dish);
  // Learn from the last 'I've finished': more leftovers than expected -> buy ~15% less, fewer -> ~15% more.
  const lastFb = d.feedback.at(-1);
  const learned = lastFb?.leftovers === 'more' ? 0.85 : lastFb?.leftovers === 'less' ? 1.15 : 1;
  const eff = req.servings * learned * (req.leftovers === 'lots' ? 1.5 : req.leftovers === 'some' ? 1.2 : 1);
  const protein: Ing | null = t.protein && meatFree ? (p!.diets.some((x) => /vegan/i.test(x)) ? I.chickpeas : I.tofu) : t.protein;
  const ings: Ing[] = [...(protein ? [protein] : []), ...t.rest].filter((x) => !(meatFree && x === I.cheese && p!.diets.some((y) => /vegan/i.test(y))));

  const items: Item[] = ings.map((ing) => {
    const have = !!ing.staple && d.pantry.includes(ing.name.toLowerCase());
    const packages = ing.servesPerPack ? Math.max(1, Math.ceil(eff / ing.servesPerPack)) : 1;
    const prices: Record<string, Pick | null> = {};
    if (!have) for (const s of DEMO_STORES) prices[s.locationId] = pickFor(ing.product, ing.size, ing.price, packages, ing.aisle, s.locationId);
    return {
      name: ing.name,
      amount_text: ing.per(req.servings),
      is_staple: !!ing.staple,
      already_have: have,
      prices,
      swap: null,
    };
  });

  const toBuy = items.filter((i) => !i.already_have);
  const totals: StoreTotal[] = DEMO_STORES.map((s) => ({
    locationId: s.locationId,
    name: s.name,
    distanceMi: s.distanceMi,
    total: round2(toBuy.reduce((sum, i) => sum + (i.prices[s.locationId]?.cost ?? 0), 0)),
    found: toBuy.length,
    missing: [],
  }));
  const { best, reason } = recommend(totals, toBuy.length);
  const bestId = best!.locationId;

  // Cheaper swaps, priced at the recommended store.
  ings.forEach((ing, idx) => {
    const item = items[idx];
    if (!ing.swap || item.already_have) return;
    const orig = item.prices[bestId]!;
    const alt = pickFor(ing.swap.product, ing.swap.size, ing.swap.price, orig.packages, ing.aisle, bestId);
    if (alt.cost < orig.cost) item.swap = { name: ing.swap.name, amount_text: item.amount_text, reason: ing.swap.reason, pick: alt, savings: round2(orig.cost - alt.cost) };
  });

  const total = best!.total;
  const withSwaps = round2(total - items.reduce((s, i) => s + (i.swap?.savings ?? 0), 0));
  const haveNames = items.filter((i) => i.already_have).map((i) => i.name.toLowerCase());
  const why = [
    p ? `Kept the heat near your ${p.spice}/10 and the technique around difficulty ${p.difficulty}/10.` : '',
    meatFree && t.protein ? `Swapped in ${protein!.name.toLowerCase()} to fit your diet.` : '',
    haveNames.length ? `You already have ${haveNames.join(', ')}, so ${haveNames.length === 1 ? "it isn't" : "they aren't"} on the bill.` : '',
    req.leftovers === 'lots' ? 'Scaled up for leftovers and picked value-size packs.' : '',
    learned < 1 ? 'Bought about 15% less since you had more leftovers than expected last time.' : '',
    learned > 1 ? 'Bought about 15% more since you ran short on leftovers last time.' : '',
    req.tweak ? `Applied your tweak: “${req.tweak}”.` : '',
  ].filter(Boolean).join(' ');

  const data: RecipeData & { demo: true } = {
    demo: true,
    title: t.title(dish),
    description: t.description,
    cuisine: t.cuisine,
    servings: req.servings,
    fridge_days: t.fridge,
    total_minutes: t.minutes,
    difficulty: t.difficulty,
    how_personalized: why || 'Built around your preferences.',
    steps: t.steps,
    items,
    stores: DEMO_STORES,
    totals,
    recommended: { locationId: bestId, reason },
    budget_check: { budget: req.budget, total, with_swaps: withSwaps, status: total <= req.budget ? 'ok' : withSwaps <= req.budget ? 'swaps' : 'over' },
    leftovers: req.leftovers,
    priced_at: new Date().toISOString(),
  };
  const recipe: Recipe = {
    id: uid(),
    status: 'draft',
    dish_query: dish,
    title: data.title,
    cuisine: data.cuisine,
    servings: req.servings,
    budget: req.budget,
    leftovers: req.leftovers,
    est_total: total,
    data,
    created_at: new Date().toISOString(),
    started_at: null,
    cooked_at: null,
  };
  d.recipes.push(recipe);
  await save();
  return { recipe };
}

// ---------- Frankly helper (demo) ----------

const OFF_TOPIC = "I can only help with this recipe 🍳 Try asking about this step, an ingredient, timing, or a swap.";

/** Demo-mode helper: simple keyword answers so the UI can be tried without the backend. */
export async function askStep(_stepIndex: number, question: string): Promise<{ on_topic: boolean; answer: string }> {
  await wait(900);
  const q = question.toLowerCase();
  if (/python|code|vote|election|capital|ignore (all|previous)|stock|weather/.test(q)) return { on_topic: false, answer: OFF_TOPIC };
  if (/done|cooked|ready|pink|temp/.test(q))
    return { on_topic: true, answer: 'Go by temperature, not color: chicken is safe at 165°F (74°C) in the thickest part, away from the bone. No thermometer? Juices should run clear and the meat should pull easily from the bone.' };
  if (/substitut|instead|swap|don.?t have|replace/.test(q))
    return { on_topic: true, answer: 'Usually yes: swap like for like (another vinegar for vinegar, another dried herb for bay leaves) and use the same amount. Taste near the end and adjust salt or acid.' };
  if (/ahead|tomorrow|leftover|store|reheat|fridge/.test(q))
    return { on_topic: true, answer: "Cool it and refrigerate within 2 hours; it keeps 3-4 days. Reheat on the stovetop until it's steaming hot (165°F / 74°C)." };
  return { on_topic: true, answer: '(Demo mode) Connect the backend for real answers. Tip: keep the heat steady and taste as you go; most steps are forgiving.' };
}

// ---------- What-should-I-make agent (demo) ----------

const IDEAS: Record<string, [string, string][]> = {
  Filipino: [['Chicken Adobo', 'Soy-vinegar braise that tastes better the next day.'], ['Pancit Canton', 'Stir-fried egg noodles with vegetables and a savory sauce.'], ['Sinigang', 'A sour tamarind soup with vegetables.'], ['Tortang Talong', 'Smoky eggplant omelette, crispy at the edges.'], ['Arroz Caldo', 'Gingery chicken rice porridge, cozy and cheap.'], ['Lumpia', 'Crispy rolls filled with seasoned pork and veg.']],
  Mexican: [['Street Tacos', 'Spiced filling, warm tortillas, lime and cilantro.'], ['Chicken Tinga Tostadas', 'Smoky shredded chicken on crispy tostadas.'], ['Black Bean Enchiladas', 'Saucy, cheesy and meatless.'], ['Chilaquiles', 'Tortilla chips simmered in salsa, topped with an egg.'], ['Pozole Rojo', 'Hearty hominy stew with chile broth.'], ['Burrito Bowls', 'Rice, beans, salsa and whatever is in the fridge.']],
  Italian: [['Tomato Spaghetti', 'Garlicky sauce in 30 minutes.'], ['Pasta e Ceci', 'Pasta and chickpeas in a rosemary broth.'], ['Chicken Piccata', 'Lemony, buttery pan sauce.'], ['Minestrone', 'Vegetable soup that stretches for days.'], ['Baked Ziti', 'A cheesy crowd-pleaser.'], ['Aglio e Olio', 'Garlic, oil and chili; five ingredients.']],
  Korean: [['Kimchi Fried Rice', 'Tangy and crispy, topped with a fried egg.'], ['Bibimbap', 'Rice bowl with veggies and gochujang.'], ['Dakgalbi', 'Spicy stir-fried chicken and cabbage.'], ['Japchae', 'Glass noodles with vegetables.'], ['Sundubu Jjigae', 'Silky tofu stew with a kick.'], ['Bulgogi', 'Sweet-savory grilled beef.']],
  Thai: [['Red Coconut Curry', 'Creamy curry over rice.'], ['Pad Kra Pao', 'Holy basil stir-fry with a fried egg.'], ['Tom Kha', 'Coconut soup with lemongrass.'], ['Pad See Ew', 'Wide noodles with soy and broccoli.'], ['Larb', 'Herby, limey minced chicken salad.'], ['Thai Fried Rice', 'Fast and savory.']],
};
const GENERIC: [string, string][] = [['Sheet-Pan Chicken & Veg', 'One pan, minimal dishes.'], ['Fried Rice', 'The best way to use leftover rice.'], ['Chili', 'A big pot that feeds you all week.'], ['Veggie Stir-Fry', 'Fast, flexible and cheap.'], ['Egg Shakshuka', 'Eggs poached in spiced tomatoes.'], ['Chicken Noodle Soup', 'Cozy and budget-friendly.']];

export async function suggestDishes(cuisine: string): Promise<{ dishes: Suggestion[] }> {
  const d = await load();
  await wait(1600);
  const cooked = d.recipes.filter((r) => r.status === 'cooked' && r.cooked_at);
  const daysAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  const rotation: Suggestion[] = cooked.slice(0, 2).map((r) => {
    const fb = d.feedback.find((f) => f.recipe_id === r.id);
    return {
      name: r.title,
      description: r.data.description,
      why: `You made this ${daysAgo(r.cooked_at!) === 0 ? 'today' : `${daysAgo(r.cooked_at!)} days ago`}${fb ? ` and rated it ${fb.enjoyment}/10` : ''}. Back in rotation.`,
      total_minutes: r.data.total_minutes,
      difficulty: r.data.difficulty,
      tag: 'rotation',
    };
  });
  const tags: Suggestion['tag'][] = ['favorite_style', 'uses_staples', 'new', 'favorite_style', 'new', 'uses_staples'];
  const why: Record<Suggestion['tag'], string> = {
    favorite_style: 'Close to what you rate highly.',
    uses_staples: d.pantry.length ? `Uses staples you already have (${d.pantry.slice(0, 2).join(', ')}).` : 'Mostly pantry staples, so it stays cheap.',
    new: "Something you haven't tried with Frankly yet.",
    rotation: '',
  };
  const list = (IDEAS[cuisine] ?? GENERIC).map(([name, description], i) => ({
    name,
    description,
    why: why[tags[i % tags.length]],
    total_minutes: 20 + ((i * 7) % 30),
    difficulty: 2 + (i % 4),
    tag: tags[i % tags.length],
  }));
  return { dishes: [...rotation, ...list.filter((x) => !rotation.some((r) => r.name.toLowerCase().includes(x.name.toLowerCase())))] };
}

// ---------- Data (same shapes as the Supabase version) ----------

export async function getProfile() {
  return (await load()).profile;
}

export async function saveProfile(patch: Partial<Profile>): Promise<Profile> {
  const d = await load();
  d.profile = { ...(d.profile ?? ({} as Profile)), ...patch, id: 'demo-user' } as Profile;
  await save();
  return d.profile;
}

export async function getRecipe(id: string) {
  return (await load()).recipes.find((r) => r.id === id) ?? null;
}

export async function getActiveRecipe() {
  return (await load()).recipes.find((r) => r.status === 'active') ?? null;
}

export async function listRecipes(status: 'saved' | 'cooked') {
  const key = status === 'cooked' ? 'cooked_at' : 'created_at';
  return (await load()).recipes
    .filter((r) => r.status === status)
    .sort((a, b) => String(b[key]).localeCompare(String(a[key])));
}

export async function countRecipes() {
  const r = (await load()).recipes;
  return { saved: r.filter((x) => x.status === 'saved').length, cooked: r.filter((x) => x.status === 'cooked').length };
}

async function setStatus(id: string, status: Recipe['status'], extra: Partial<Recipe> = {}) {
  const d = await load();
  const r = d.recipes.find((x) => x.id === id);
  if (r) Object.assign(r, { status, ...extra });
  await save();
}

export async function startRecipe(recipe: Recipe): Promise<string> {
  const d = await load();
  for (const r of d.recipes) if (r.status === 'active' && r.id !== recipe.id) r.status = 'saved';
  if (recipe.status === 'cooked') {
    const copy: Recipe = { ...recipe, id: uid(), status: 'active', started_at: new Date().toISOString(), cooked_at: null, created_at: new Date().toISOString() };
    d.recipes.push(copy);
    await save();
    return copy.id;
  }
  await setStatus(recipe.id, 'active', { started_at: new Date().toISOString() });
  return recipe.id;
}

export const saveForLater = (id: string) => setStatus(id, 'saved');
export const dismissRecipe = (id: string) => setStatus(id, 'dismissed');

export async function deleteRecipe(id: string) {
  const d = await load();
  d.recipes = d.recipes.filter((r) => r.id !== id);
  await save();
}

export async function finishRecipe(recipe: Recipe, feedback: Omit<Feedback, 'recipe_id'>) {
  const d = await load();
  d.feedback.push({ ...feedback, recipe_id: recipe.id });
  for (const i of recipe.data.items) {
    const n = i.name.toLowerCase();
    if (i.is_staple && !i.already_have && !d.pantry.includes(n)) d.pantry.push(n);
  }
  await setStatus(recipe.id, 'cooked', { cooked_at: new Date().toISOString() });
}

export async function getFeedback(recipeId: string) {
  return (await load()).feedback.find((f) => f.recipe_id === recipeId) ?? null;
}

export async function getMemoryStats() {
  const d = await load();
  const cooked = d.recipes.filter((r) => r.status === 'cooked').sort((a, b) => String(b.cooked_at).localeCompare(String(a.cooked_at)));
  const avg = (k: 'enjoyment' | 'price_accuracy') => (d.feedback.length ? d.feedback.reduce((s, f) => s + f[k], 0) / d.feedback.length : null);
  return {
    cooked: cooked.length,
    lastCooked: cooked[0] ? { title: cooked[0].title, cooked_at: cooked[0].cooked_at! } : null,
    avgEnjoyment: avg('enjoyment'),
    avgPriceAccuracy: avg('price_accuracy'),
    staples: d.pantry,
  };
}
