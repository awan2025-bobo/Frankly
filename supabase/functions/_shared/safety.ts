// Code-level safety net for allergies, diets and equipment.
//
// Claude is told the rules, but ONE peanut in a "nut-free" recipe is one too many, so every
// recipe and suggestion is also checked here with plain word lists. Shared by the Edge Functions
// (Deno) and the tests (scripts/test-safety.ts, run with tsx), so: no imports, no Deno APIs.
//
// Each rule is: words that mean "contains it", minus "safe phrases" removed first
// (coconut milk is not milk, eggplant is not egg, nutmeg is not a nut).

type Rule = { hit: RegExp; safe?: RegExp; free?: RegExp };

const MEAT = /\b(chicken|beef|pork|bacon|ham|hams|sausages?|turkey|lamb|veal|steaks?|prosciutto|pancetta|salami|pepperoni|chorizo|duck|goat|venison|gelatin|lard|meatballs?|meat|brisket|ribs|hot ?dogs?|spam|oxtail|liver|bone broth|mutton|bison|rabbit|carnitas|bulgogi|jerky)\b/;
const MEAT_SAFE = /\b(vegan|vegetarian|plant[- ]based|meatless|impossible|beyond|veggie|mushroom|soy|tofu|seitan|jackfruit|meat[- ]free)\s+[a-z ]{0,20}?(chicken|beef|pork|bacon|ham|sausages?|turkey|meatballs?|meat|steaks?|jerky|chorizo|pepperoni|bulgogi|broth)\b|\b(cauliflower|mushroom|eggplant|portobello|tofu|cabbage) steaks?\b|\bhot dog buns?\b|\bcoconut meat\b|\bwalnut meat\b|\bvegetable broth\b|\bchicken[- ]free\b/;
const FISH = /\b(fish|salmon|tuna|cod|tilapia|anchov(y|ies)|sardines?|mackerel|trout|halibut|bonito|katsuobushi|dashi|worcestershire|snapper|catfish|haddock|pollock|swordfish|mahi|caviar|roe|imitation crab|surimi)\b/;
const FISH_SAFE = /\b(vegan|vegetarian|plant[- ]based|kombu|mushroom|fish[- ]free)\s+(fish sauce|fish|worcestershire|dashi|tuna)\b|\bkombu dashi\b|\bshiitake dashi\b/;
const SHELLFISH = /\b(shrimp|prawns?|crab|lobster|crawfish|crayfish|scallops?|clams?|mussels?|oysters?|squid|calamari|octopus|krill|shellfish|oyster sauce)\b/;
const SHELLFISH_SAFE = /\boyster mushrooms?\b|\b(vegan|vegetarian|mushroom|plant[- ]based)\s+oyster sauce\b|\bshrimp[- ]free\b/;
const MILK = /\b(milk|butter|cheese|cheeses|cream|creamer|yogurt|yoghurt|ghee|whey|casein|parmesan|parmigiano|mozzarella|cheddar|ricotta|feta|paneer|buttermilk|half[- ]and[- ]half|custard|queso|brie|gouda|mascarpone|burrata|cotija|gruyere|provolone|pecorino|kefir|ice cream|creme fraiche|crème fraîche)\b/;
const MILK_SAFE = /\b(coconut|almond|oat|soy|rice|cashew|vegan|plant[- ]based|dairy[- ]free|non[- ]dairy|peanut|sunflower(?: seed)?|seed|nut|apple|cocoa|shea|cookie|pumpkin|pea|hemp|macadamia)\s+(milk|butter|cream|creamer|cheese|yogurt|yoghurt|ice cream|parmesan|mozzarella|cheddar|feta|queso|cream cheese)\b|\bcream of tartar\b|\bbutternut\b|\bbutter (beans?|lettuce)\b|\bbutterhead\b|\bcream soda\b|\bmilk thistle\b|\bdairy[- ]free\b|\bnutritional yeast\b/;
const EGG = /\b(eggs?|egg (whites?|yolks?)|yolks?|mayonnaise|mayo|meringue|aioli|egg noodles)\b/;
const EGG_SAFE = /\b(vegan|egg[- ]free|eggless|plant[- ]based|flax|chia)\s+(mayo|mayonnaise|aioli|eggs?|egg substitute)\b|\begg[- ]free\b|\beggless\b|\bflax eggs?\b|\bchia eggs?\b|\beggplants?\b/;
const WHEAT = /\b(wheat|flour|breads?|breadcrumbs?|panko|pasta|spaghetti|noodles?|tortillas?|couscous|bulgur|seitan|semolina|farro|spelt|barley|rye|soy sauce|crackers?|pita|bagels?|croutons?|baguette|brioche|buns?|rolls?|wonton|dumpling wrappers?|udon|ramen|orzo|lasagna|penne|macaroni|fettuccine|linguine|rigatoni|gnocchi|pie crust|puff pastry|phyllo|filo|biscuits?|malt|beer|toast|english muffins?|naan|roti|sourdough|ciabatta|focaccia|graham|pretzels?|tempura|pancake mix|bisquick|cake mix)\b/;
const WHEAT_SAFE = /\b(gluten[- ]free|rice|corn|almond|coconut|chickpea|cassava|tapioca|potato|oat|sorghum|glass|cellophane|bean thread|sweet potato|zucchini|kelp|shirataki|lettuce|buckwheat|soba|tamari|quinoa|lentil|bean|millet|teff|arrowroot|cauliflower)\s+(flour|noodles?|tortillas?|breads?|pasta|wrappers?|paper|crackers?|buns?|rolls?|spaghetti|penne|crust|sauce|starch|pizza crust|bun)\b|\bgluten[- ]free\b|\bcorn tortillas?\b|\btamari\b/;
const PEANUT = /\b(peanuts?|peanut butter|groundnuts?|satay|monkey nuts?|nuts?|mixed nuts|nut butter|trail mix)\b/;
const PEANUT_SAFE = /\b(nut[- ]free|peanut[- ]free)\b|\b(pine|brazil|macadamia|tiger|water ?chest)\s*nuts?\b/;
const TREE_NUT = /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|brazil nuts?|pine nuts?|chestnuts?|praline|marzipan|nutella|frangipane|gianduja|nuts?|mixed nuts|nut butter|nut milk|almond (milk|flour|butter|extract)|amaretto|pesto|baklava|trail mix)\b/;
const TREE_NUT_SAFE = /\b(nut[- ]free|tree[- ]nut[- ]free) (pesto)\b|\bnut[- ]free\b|\bwater chestnuts?\b/;
const SOY = /\b(soy|soya|soybeans?|tofu|tempeh|edamame|miso|tamari|natto|soy sauce|teriyaki|hoisin|ponzu|tvp|textured vegetable protein)\b/;
const SOY_SAFE = /\bsoy[- ]free\b|\bcoconut aminos\b/;
const SESAME = /\b(sesame|tahini|furikake|benne|gomasio|halva|halvah|za'?atar|hummus|gomashio)\b/;
const SESAME_SAFE = /\bsesame[- ]free\b/;
const HONEY = /\bhoney\b/;
const PORK = /\b(pork|bacon|ham|hams|prosciutto|pancetta|lard|chorizo|pepperoni|salami|gelatin|carnitas|spam|hot ?dogs?|sausages?)\b/;
const PORK_SAFE = /\b(turkey|beef|chicken|halal|kosher|vegan|vegetarian|plant[- ]based|lamb)\s+(bacon|ham|sausages?|pepperoni|salami|hot ?dogs?|chorizo|gelatin)\b|\bhot dog buns?\b/;
const ALCOHOL = /\b(wine|beer|rum|vodka|sake|mirin|bourbon|whiskey|whisky|brandy|sherry|tequila|gin|liqueur|cognac|shaoxing|marsala|vermouth|amaretto|kahlua|ale|lager|stout|cider)\b/;
const ALCOHOL_SAFE = /\b(red wine|white wine|rice wine|apple cider|cider|sherry|wine|malt)\s+vinegar\b|\bnon[- ]alcoholic\b|\balcohol[- ]free\b|\bginger\b|\bginger ale\b|\bbeer[- ]free\b|\bmirin[- ]style seasoning \(alcohol[- ]free\)/;
const KETO_CARBS = /\b(rice|pasta|spaghetti|noodles?|breads?|sugar|potato(es)?|flour|tortillas?|oats|oatmeal|corn|beans|lentils|chickpeas|honey|maple syrup|quinoa|couscous|bagels?|buns?|crackers?|banana|bananas)\b/;
const KETO_SAFE = /\b(cauliflower|konjac|shirataki|zucchini|palmini|almond|coconut|sugar[- ]free|low[- ]carb|keto)\s+(rice|noodles?|pasta|spaghetti|flour|tortillas?|breads?|buns?|crackers?|sugar)\b|\bgreen beans\b|\bsugar[- ]free\b|\bblack soybeans\b/;

// A whole name labeled free-from passes that rule: "Dairy-Free Grilled Cheese", "Nut-Free Pesto", "Vegan Scrambled Eggs".
const NUT_FREE = /\b(nut|peanut|tree[- ]nut)[- ]free\b/;
const DAIRY_FREE = /\b(dairy|milk)[- ]free\b|\bnon[- ]dairy\b|\bvegan\b|\bplant[- ]based\b/;
const EGG_FREE = /\begg[- ]free\b|\beggless\b|\bvegan\b|\bplant[- ]based\b/;
const GLUTEN_FREE = /\b(gluten|wheat)[- ]free\b|\bspaghetti squash\b/;
const VEGAN_LABEL = /\bvegan\b|\bplant[- ]based\b|\bmeatless\b|\bmeat[- ]free\b/;

const ALLERGEN_RULES: Record<string, Rule[]> = {
  peanuts: [{ hit: PEANUT, safe: PEANUT_SAFE, free: NUT_FREE }],
  "tree nuts": [{ hit: TREE_NUT, safe: TREE_NUT_SAFE, free: NUT_FREE }],
  milk: [{ hit: MILK, safe: MILK_SAFE, free: DAIRY_FREE }],
  eggs: [{ hit: EGG, safe: EGG_SAFE, free: EGG_FREE }],
  wheat: [{ hit: WHEAT, safe: WHEAT_SAFE, free: GLUTEN_FREE }],
  soy: [{ hit: SOY, safe: SOY_SAFE, free: /\bsoy[- ]free\b/ }],
  fish: [{ hit: FISH, safe: FISH_SAFE }, { hit: /\bfish sauce\b/, safe: FISH_SAFE }],
  shellfish: [{ hit: SHELLFISH, safe: SHELLFISH_SAFE }],
  sesame: [{ hit: SESAME, safe: SESAME_SAFE }],
};

const DIET_RULES: Record<string, Rule[]> = {
  vegan: [
    { hit: MEAT, safe: MEAT_SAFE }, { hit: FISH, safe: FISH_SAFE }, { hit: /\bfish sauce\b/, safe: FISH_SAFE },
    { hit: SHELLFISH, safe: SHELLFISH_SAFE }, { hit: MILK, safe: MILK_SAFE }, { hit: EGG, safe: EGG_SAFE },
    { hit: HONEY },
  ].map((r) => ({ ...r, free: VEGAN_LABEL })),
  vegetarian: [
    { hit: MEAT, safe: MEAT_SAFE }, { hit: FISH, safe: FISH_SAFE }, { hit: /\bfish sauce\b/, safe: FISH_SAFE },
    { hit: SHELLFISH, safe: SHELLFISH_SAFE },
  ].map((r) => ({ ...r, free: VEGAN_LABEL })),
  pescatarian: [{ hit: MEAT, safe: MEAT_SAFE, free: VEGAN_LABEL }],
  "gluten-free": [{ hit: WHEAT, safe: WHEAT_SAFE, free: GLUTEN_FREE }],
  "dairy-free": [{ hit: MILK, safe: MILK_SAFE, free: DAIRY_FREE }],
  halal: [{ hit: PORK, safe: PORK_SAFE, free: VEGAN_LABEL }, { hit: ALCOHOL, safe: ALCOHOL_SAFE, free: /\b(non[- ]alcoholic|alcohol[- ]free)\b/ }],
  kosher: [{ hit: PORK, safe: PORK_SAFE, free: VEGAN_LABEL }, { hit: SHELLFISH, safe: SHELLFISH_SAFE, free: VEGAN_LABEL }],
  keto: [{ hit: KETO_CARBS, safe: KETO_SAFE, free: /\b(keto|low[- ]carb|sugar[- ]free|cauliflower|spaghetti squash|zucchini|shirataki|konjac)\b/ }],
};

const norm = (s: string) => ` ${s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ")} `;

// "No cilantro", "skip cheese", "no sugar added": a mention that's being left out isn't an ingredient.
// (Only "no " + a word, so "No-Cook Peanut Noodles" is still checked.)
const NEGATED = /\b(no|without|skip|omit|minus|hold the|free of)\s+(added\s+)?[a-z]+(\s+(or|and|&)\s+[a-z]+)?/g;

/** The matched word if `text` breaks the rule, else null. */
function breaks(text: string, rules: Rule[]): string | null {
  const base = norm(text).replace(NEGATED, " ");
  for (const r of rules) {
    if (r.free?.test(base)) continue; // "Dairy-free grilled cheese", "Non-alcoholic red wine"
    const t = r.safe ? base.replace(new RegExp(r.safe.source, "g"), " ") : base;
    const m = t.match(r.hit);
    if (m) return m[0].trim();
  }
  return null;
}

export type Violation = { kind: "allergy" | "diet"; rule: string; text: string; word: string };

/**
 * Checks each text (ingredient names, a dish name...) against the user's allergens and diets.
 * Unknown allergens typed under "Other" (e.g. "strawberries", "cilantro") are matched by their words.
 */
export function findViolations(texts: string[], allergens: string[], diets: string[]): Violation[] {
  const out: Violation[] = [];
  for (const text of texts) {
    if (!text?.trim()) continue;
    for (const a of allergens) {
      const key = a.trim().toLowerCase();
      if (!key) continue;
      const rules = ALLERGEN_RULES[key] ?? customRule(key);
      const word = breaks(text, rules);
      if (word) out.push({ kind: "allergy", rule: a, text, word });
    }
    for (const d of diets) {
      const rules = DIET_RULES[d.trim().toLowerCase()];
      if (!rules) continue; // Low-carb / High-protein: guidance, not a hard rule
      const word = breaks(text, rules);
      if (word) out.push({ kind: "diet", rule: d, text, word });
    }
  }
  return out;
}

/** Kosher also means no meat and dairy in the same dish. */
export function kosherMix(texts: string[], diets: string[]): Violation | null {
  if (!diets.some((d) => d.toLowerCase() === "kosher")) return null;
  const meat = texts.find((t) => breaks(t, [{ hit: MEAT, safe: MEAT_SAFE }]));
  const dairy = texts.find((t) => breaks(t, [{ hit: MILK, safe: MILK_SAFE }]));
  return meat && dairy ? { kind: "diet", rule: "Kosher", text: `${meat} + ${dairy}`, word: "meat with dairy" } : null;
}

function customRule(allergen: string): Rule[] {
  // "nuts" / "all nuts" typed by hand -> both nut rules; otherwise match the words themselves.
  if (/\bnuts?\b/.test(allergen)) return [{ hit: PEANUT, safe: PEANUT_SAFE }, { hit: TREE_NUT, safe: TREE_NUT_SAFE }];
  if (/\bdairy\b|\blactose\b/.test(allergen)) return ALLERGEN_RULES.milk;
  if (/\bgluten\b/.test(allergen)) return ALLERGEN_RULES.wheat;
  if (/\begg/.test(allergen)) return ALLERGEN_RULES.eggs;
  if (/\bseafood\b/.test(allergen)) return [...ALLERGEN_RULES.fish, ...ALLERGEN_RULES.shellfish];
  const words = allergen.split(/[^a-z]+/).filter((w) => w.length >= 3).map((w) => w.replace(/(ies|es|s)$/, ""));
  if (!words.length) return [];
  return [{ hit: new RegExp(`\\b(${words.map(escape).join("|")})`) }];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- Equipment ----------

const OVEN_WORDS = /\b(oven|bake|baked|baking sheet|baking dish|roast in|roasting|broil|broiler|preheat)\b/;
const STOVE_WORDS = /\b(skillet|saucepan|frying pan|stovetop|stove|burner|wok|saut[eé]|stir[- ]fry|pan[- ]fry|pan[- ]sear|sear|simmer|boil|boiling|over (low|medium|medium-high|high) heat|deep[- ]fry|(?<!air[- ])fry)\b/;
const NEEDS: { name: string; words: RegExp; ok: string[] }[] = [
  { name: "an oven", words: OVEN_WORDS, ok: ["Oven", "Toaster oven", "Air fryer"] },
  { name: "a stovetop", words: STOVE_WORDS, ok: ["Stovetop", "Instant Pot"] },
  { name: "a grill", words: /\b(grill|grilled|grilling)\b/, ok: ["Grill", "Stovetop", "Oven"] },
  { name: "a blender", words: /\b(blender|blend|blitz|puree)\b/, ok: ["Blender", "Food processor"] },
  { name: "a food processor", words: /\bfood processor\b/, ok: ["Food processor", "Blender"] },
  { name: "a slow cooker", words: /\b(slow cooker|crock[- ]?pot)\b/, ok: ["Slow cooker", "Instant Pot"] },
  { name: "an Instant Pot", words: /\b(instant pot|pressure cook(er)?)\b/, ok: ["Instant Pot"] },
  { name: "an air fryer", words: /\bair[- ]?fr(y|yer|ied)\b/, ok: ["Air fryer"] },
  { name: "a rice cooker", words: /\brice cooker\b/, ok: ["Rice cooker", "Instant Pot"] },
  { name: "a microwave", words: /\b(microwave|microwaved)\b/, ok: ["Microwave"] },
  { name: "a stand mixer", words: /\bstand mixer\b/, ok: ["Stand mixer"] },
];

/** Which appliances the steps need that the user doesn't own (e.g. ["an oven"]). */
export function missingEquipment(steps: string[], appliances: string[]): string[] {
  const own = new Set(appliances);
  const text = norm(steps.join(" ")).replace(/\b(baking soda|baking powder|bring to room temperature)\b/g, " ");
  // A step that says "or" usually offers an alternative ("bake or air-fry"); still flag only if no option is owned.
  return NEEDS.filter((n) => n.words.test(text) && !n.ok.some((a) => own.has(a))).map((n) => n.name);
}

/** Short human list: "peanuts (peanut butter)". */
export function describeViolations(v: Violation[]): string {
  const seen = new Set<string>();
  return v
    .filter((x) => {
      const k = `${x.rule}|${x.word}`;
      return seen.has(k) ? false : (seen.add(k), true);
    })
    .map((x) => `"${x.word}" in "${x.text}" breaks ${x.kind === "allergy" ? "the allergy" : "the diet"}: ${x.rule}`)
    .join("; ");
}
