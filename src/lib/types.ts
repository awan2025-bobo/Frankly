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
};

export type StoreTotal = {
  locationId: string;
  name: string;
  distanceMi: number | null;
  total: number;
  found: number;
  missing: string[];
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
};

export type RecipeStatus = 'draft' | 'active' | 'saved' | 'cooked' | 'dismissed';

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
