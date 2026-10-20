export type Leftovers = 'none' | 'some' | 'lots';

export type KrogerStore = {
  locationId: string;
  name: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
  distanceMi: number | null;
};

export type Profile = {
  id: string;
  name: string;
  cooks_for: 'self' | 'others';
  household_size: number;
  spice: number;
  seasoning: number;
  difficulty: number;
  cuisines: string[];
  diets: string[];
  allergens: string[];
  appliances: string[];
  stores: string[];
  meals_per_week: number | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  kroger_stores: KrogerStore[];
};

export type Pick = {
  productId: string;
  description: string;
  brand: string;
  size: string;
  price: number;
  regularPrice: number;
  aisle: string | null;
  packages: number;
  cost: number;
  onSale: boolean;
};

export type Item = {
  name: string;
  amount_text: string;
  is_staple: boolean;
  already_have: boolean;
  prices: Record<string, Pick | null>;
  swap: { name: string; amount_text: string; reason: string; pick: Pick; savings: number } | null;
  // Not sold at the recommended Kroger store: a typical price, always shown as an estimate.
  estimate?: { cost: number; where: string } | null;
  // How much the recipe uses (from the shopping spec) and how long the rest keeps, for the Leftovers book.
  // Missing on recipes made before the Leftovers book existed.
  need?: { quantity: number; unit: 'g' | 'ml' | 'count'; grams_estimate: number; each_estimate: number };
  keeps_days?: number;
};

export type StoreTotal = {
  locationId: string;
  name: string;
  distanceMi: number | null;
  total: number;
  found: number;
  missing: string[];
};

/** A clash between the request and the profile (or safety / budget / not food), explained in plain words. */
export type SafetyNote = {
  kind: 'allergy' | 'diet' | 'equipment' | 'food_safety' | 'budget' | 'not_food' | 'other';
  title: string;
  message: string;
  alternative?: string; // when nothing could be made: a dish they CAN make instead
};

export type RecipeData = {
  title: string;
  description: string;
  cuisine: string;
  servings: number;
  fridge_days: number;
  total_minutes: number;
  difficulty: number;
  how_personalized: string;
  steps: string[];
  items: Item[];
  stores: KrogerStore[];
  totals: StoreTotal[];
  recommended: { locationId: string | null; reason: string };
  budget_check: { budget: number; total: number; with_swaps: number; status: 'ok' | 'swaps' | 'over' };
  leftovers: Leftovers;
  priced_at: string;
  demo?: boolean; // sample prices from demo mode, not Kroger
  safety_note?: SafetyNote | null; // set when the request clashed with their allergies/diet/appliances/safety
  estimated_total?: number; // part of the price that's estimated (items Kroger doesn't carry)
  used_leftovers?: string[]; // Leftovers book items this recipe was built to use up (cleared when it's cooked)
  plan_id?: string; // one of the dinners in a weekly meal plan
};

// 'planned' = a dinner in a weekly meal plan (Meal Plan book), not started yet.
export type RecipeStatus = 'draft' | 'active' | 'saved' | 'cooked' | 'dismissed' | 'planned';

export type Recipe = {
  id: string;
  status: RecipeStatus;
  dish_query: string;
  title: string;
  cuisine: string | null;
  servings: number;
  budget: number | null;
  leftovers: Leftovers;
  est_total: number | null;
  data: RecipeData;
  created_at: string;
  started_at: string | null;
  cooked_at: string | null;
};

export type Feedback = {
  recipe_id: string;
  enjoyment: number;
  cooking_enjoyment: number;
  price_accuracy: number;
  leftovers: 'less' | 'as_expected' | 'more';
};

export type Suggestion = {
  name: string;
  description: string;
  why: string;
  total_minutes: number;
  difficulty: number;
  tag: 'new' | 'rotation' | 'uses_staples' | 'favorite_style';
};

/** Leftovers book: a half-used ingredient (added automatically after cooking, or typed in). */
export type Leftover = {
  id: string;
  name: string;
  amount_text: string;
  use_by: string | null; // YYYY-MM-DD
  recipe_id: string | null;
  created_at: string;
};

/** One line of a meal plan's combined grocery list: bought once, used across several dinners. */
export type PlanItem = Item & { used_in: string[] }; // titles of the dinners that use it

/** Meal Plan book: 3-7 dinners that share ingredients, with one grocery list for the week. */
export type MealPlan = {
  id: string;
  created_at: string;
  meals: number;
  servings: number;
  budget: number;
  recipe_ids: string[];
  data: {
    title: string;
    shared_note: string; // how the dinners share ingredients
    grocery: PlanItem[];
    stores: KrogerStore[];
    totals: StoreTotal[];
    recommended: { locationId: string | null; reason: string };
    budget_check: { budget: number; total: number; status: 'ok' | 'over' };
    estimated_total: number;
    separate_total: number; // what the same dinners would cost bought one recipe at a time
    demo?: boolean;
  };
};
