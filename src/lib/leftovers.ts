// Leftovers book helpers: what's left after cooking a recipe, and friendly "use by" labels.
import { describeAmount, leftoverAfter } from '../../supabase/functions/_shared/pricing';
import type { Recipe } from './types';

const DAY = 86_400_000;
const DEFAULT_KEEPS_DAYS = 4;

/** YYYY-MM-DD for `days` from today (local time). */
export function dateIn(days: number): string {
  const d = new Date(Date.now() + days * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Half-used ingredients after cooking `recipe`: the rest of each package bought at the recommended store.
 * Skips staples (the pantry tracks those), things they already had, and sizes that can't be read.
 */
export function leftoversFrom(recipe: Recipe): { name: string; amount_text: string; use_by: string }[] {
  const store = recipe.data.recommended.locationId;
  if (!store) return [];
  return recipe.data.items.flatMap((item) => {
    if (item.is_staple || item.already_have || !item.need) return [];
    const pick = item.prices[store];
    if (!pick) return [];
    const left = leftoverAfter(pick.size, pick.packages, item.need);
    if (!left) return [];
    return [{ name: item.name, amount_text: describeAmount(left), use_by: dateIn(item.keeps_days ?? DEFAULT_KEEPS_DAYS) }];
  });
}

/** Days until `use_by` (negative = past it), or null when there's no date. */
export function daysLeft(useBy: string | null): number | null {
  if (!useBy) return null;
  const [y, m, d] = useBy.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / DAY);
}

/** "Use today", "Use by tomorrow", "Use by Thu", "Past its date". */
export function useByLabel(useBy: string | null): string {
  const n = daysLeft(useBy);
  if (n == null) return 'No date';
  if (n < 0) return 'Past its date';
  if (n === 0) return 'Use today';
  if (n === 1) return 'Use by tomorrow';
  if (n < 7) return `Use by ${new Date(Date.now() + n * DAY).toLocaleDateString(undefined, { weekday: 'short' })}`;
  return `Keeps ${n} days`;
}
