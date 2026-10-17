// Every read/write the app makes. Screens call these instead of touching Supabase directly.
import { FunctionsHttpError } from '@supabase/supabase-js';

import * as demo from './demo';
import { DEMO, supabase } from './supabase';
import type { Feedback, KrogerStore, Leftovers, Profile, Recipe, Suggestion } from './types';

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
  tweak?: string;
  base_recipe_id?: string;
};

/** Returns either a saved draft recipe or a `problem` to show in the "try again" popup. */
export function generateRecipe(req: RecipeRequest) {
  if (DEMO) return demo.generateRecipe(req);
  return invoke<{ recipe?: Recipe; problem?: string }>('recipe', req);
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
export async function startRecipe(recipe: Recipe): Promise<string> {
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
