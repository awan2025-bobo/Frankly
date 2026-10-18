// Every read/write the app makes. Screens call these instead of touching Supabase directly.
import { FunctionsHttpError } from '@supabase/supabase-js';

import * as demo from './demo';
import { DEMO, supabase } from './supabase';
import type { Feedback, KrogerStore, Leftovers, Profile, Recipe, SafetyNote, Suggestion } from './types';

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new Error(payload?.error ?? `Frankly's kitchen had a problem (${name}).`);
    }
    throw new Error(error.message);
  }
  return data as T;
}

// ---------- Agents (Edge Functions) ----------

export type RecipeRequest = {
  dish: string;
  servings: number;
  budget: number;
  leftovers: Leftovers;
  style?: string; // 'classic' (default) | a cuisine like 'Korean' | 'surprise'
  tweak?: string;
  base_recipe_id?: string;
};

/**
 * Returns a saved draft recipe, or a `problem` to show in the "try again" popup.
 * `conflict` explains a clash with their profile: with a recipe it's the safe version Frankly made instead,
 * without one it's why nothing could be made (and maybe an `alternative` dish to try).
 */
export type RecipeResult = { recipe?: Recipe; problem?: string; conflict?: SafetyNote | null };
export function generateRecipe(req: RecipeRequest): Promise<RecipeResult> {
  if (DEMO) return demo.generateRecipe(req);
  return invoke<RecipeResult>('recipe', req);
}

export type HelpTurn = { q: string; a: string; on_topic: boolean };

/** The Frankly helper: a question about one step of the active recipe. */
export function askStep(recipeId: string, stepIndex: number, question: string, history: HelpTurn[]) {
  if (DEMO) return demo.askStep(stepIndex, question);
  return invoke<{ on_topic: boolean; answer: string; limited?: boolean }>('step-help', {
    recipe_id: recipeId,
    step_index: stepIndex,
    question,
    history: history.filter((h) => h.on_topic).slice(-3).map(({ q, a }) => ({ q, a })),
  });
}

export function suggestDishes(cuisine: string) {
  if (DEMO) return demo.suggestDishes(cuisine);
  return invoke<{ dishes: Suggestion[] }>('suggest', { cuisine });
}

export function findStores(near: { zip?: string; lat?: number; lng?: number }) {
  if (DEMO) return demo.findStores(near);
  return invoke<{ stores: KrogerStore[]; origin: { lat: number; lng: number } | null; message?: string }>(
    'kroger-stores',
    near,
  );
}

// ---------- Profile ----------

export async function getProfile(): Promise<Profile | null> {
  if (DEMO) return demo.getProfile();
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function saveProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
  if (DEMO) return demo.saveProfile(patch);
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...patch, id: userId, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// ---------- Recipes ----------

export async function getRecipe(id: string): Promise<Recipe | null> {
  if (DEMO) return demo.getRecipe(id);
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Recipe | null;
}

export async function getActiveRecipe(): Promise<Recipe | null> {
  if (DEMO) return demo.getActiveRecipe();
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Recipe | null;
}

export async function listRecipes(status: 'saved' | 'cooked'): Promise<Recipe[]> {
  if (DEMO) return demo.listRecipes(status);
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('status', status)
    .order(status === 'cooked' ? 'cooked_at' : 'created_at', { ascending: false });
  if (error) throw error;
  return data as Recipe[];
}

export async function countRecipes(): Promise<{ saved: number; cooked: number }> {
  if (DEMO) return demo.countRecipes();
  const [saved, cooked] = await Promise.all(
    (['saved', 'cooked'] as const).map((status) =>
      supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('status', status),
    ),
  );
  return { saved: saved.count ?? 0, cooked: cooked.count ?? 0 };
}

async function setStatus(id: string, status: Recipe['status'], extra: Partial<Recipe> = {}) {
  const { error } = await supabase.from('recipes').update({ status, ...extra }).eq('id', id);
  if (error) throw error;
}

/**
 * "Let's go": only one recipe can be active. The current one (if any) moves to Saved.
 * Cooking a recipe from Cooked again makes a fresh copy so its history stays intact.
 * Returns the id of the now-active recipe.
 */
export async function startRecipe(given: Recipe): Promise<string> {
  const recipe = await settled(given); // include every tick made on the recipe page
  if (DEMO) return demo.startRecipe(recipe);
  const { error } = await supabase
    .from('recipes')
    .update({ status: 'saved' })
    .eq('status', 'active')
    .neq('id', recipe.id);
  if (error) throw error;
  if (recipe.status === 'cooked') {
    const { data, error: e2 } = await supabase
      .from('recipes')
      .insert({
        status: 'active',
        started_at: new Date().toISOString(),
        dish_query: recipe.dish_query,
        title: recipe.title,
        cuisine: recipe.cuisine,
        servings: recipe.servings,
        budget: recipe.budget,
        leftovers: recipe.leftovers,
        est_total: recipe.est_total,
        data: recipe.data,
      })
      .select('id')
      .single();
    if (e2) throw e2;
    return data.id;
  }
  await setStatus(recipe.id, 'active', { started_at: new Date().toISOString() });
  return recipe.id;
}

/**
 * "I already have this" on one ingredient: saved on the recipe, and long-lasting staples are also
 * remembered in the (internal) pantry so future recipes skip them.
 */
// Ticks are saved one at a time per recipe, each on top of the last. Without this, ticking two items
// quickly saved two copies of the old recipe and the second overwrote the first (so Active, which
// reads the saved recipe, showed fewer checkmarks than the recipe page).
const haveSaves = new Map<string, Promise<Recipe>>();

export function setItemHave(recipe: Recipe, itemName: string, have: boolean): Promise<Recipe> {
  const prev = haveSaves.get(recipe.id);
  const next = (prev ? prev.catch(() => recipe) : Promise.resolve(recipe)).then((latest) =>
    // Keep the caller's copy (status etc.) but the ticks from the save before this one.
    saveItemHave({ ...recipe, data: { ...recipe.data, items: latest.data.items } }, itemName, have),
  );
  haveSaves.set(recipe.id, next);
  return next;
}

/** Waits for any "I already have this" saves still in flight, then returns the latest copy of the recipe. */
async function settled(recipe: Recipe): Promise<Recipe> {
  const pending = haveSaves.get(recipe.id);
  return pending ? pending.catch(() => recipe) : recipe;
}

async function saveItemHave(recipe: Recipe, itemName: string, have: boolean): Promise<Recipe> {
  if (DEMO) return demo.setItemHave(recipe, itemName, have);
  const items = recipe.data.items.map((i) => (i.name === itemName ? { ...i, already_have: have } : i));
  const data = { ...recipe.data, items };
  const { error } = await supabase.from('recipes').update({ data }).eq('id', recipe.id);
  if (error) throw error;
  const item = items.find((i) => i.name === itemName);
  if (have && item?.is_staple) {
    await supabase.from('pantry_items').upsert(
      { name: item.name.toLowerCase(), is_staple: true, recipe_id: recipe.id },
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    );
  }
  return { ...recipe, data };
}

export const saveForLater = (id: string) => (DEMO ? demo.saveForLater(id) : setStatus(id, 'saved'));
export const dismissRecipe = (id: string) => (DEMO ? demo.dismissRecipe(id) : setStatus(id, 'dismissed'));

export async function deleteRecipe(id: string) {
  if (DEMO) return demo.deleteRecipe(id);
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}

/**
 * "I've finished": store the feedback, file it under Cooked with today's date,
 * and remember the staples that were bought (internal pantry, no screen yet).
 */
export async function finishRecipe(recipe: Recipe, feedback: Omit<Feedback, 'recipe_id'>) {
  if (DEMO) return demo.finishRecipe(recipe, feedback);
  const { error: fe } = await supabase.from('feedback').insert({ ...feedback, recipe_id: recipe.id });
  if (fe) throw fe;
  await setStatus(recipe.id, 'cooked', { cooked_at: new Date().toISOString() });
  const staples = recipe.data.items
    .filter((i) => i.is_staple && !i.already_have)
    .map((i) => ({ name: i.name.toLowerCase(), is_staple: true, recipe_id: recipe.id }));
  if (staples.length) {
    const { error } = await supabase.from('pantry_items').upsert(staples, {
      onConflict: 'user_id,name',
      ignoreDuplicates: true,
    });
    if (error) throw error;
  }
}

export async function getFeedback(recipeId: string): Promise<Feedback | null> {
  if (DEMO) return demo.getFeedback(recipeId);
  const { data } = await supabase.from('feedback').select('*').eq('recipe_id', recipeId).maybeSingle();
  return data as Feedback | null;
}

/** Numbers for the "Frankly remembers" card on Profile. */
export async function getMemoryStats() {
  if (DEMO) return demo.getMemoryStats();
  const [cooked, fb, pantry] = await Promise.all([
    supabase.from('recipes').select('title,cooked_at').eq('status', 'cooked').order('cooked_at', { ascending: false }),
    supabase.from('feedback').select('enjoyment,price_accuracy'),
    supabase.from('pantry_items').select('name'),
  ]);
  const ratings = fb.data ?? [];
  const avg = (k: 'enjoyment' | 'price_accuracy') =>
    ratings.length ? ratings.reduce((s, r) => s + r[k], 0) / ratings.length : null;
  return {
    cooked: cooked.data?.length ?? 0,
    lastCooked: cooked.data?.[0] ?? null,
    avgEnjoyment: avg('enjoyment'),
    avgPriceAccuracy: avg('price_accuracy'),
    staples: (pantry.data ?? []).map((p) => p.name as string),
  };
}
