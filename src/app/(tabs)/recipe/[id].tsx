// One recipe. Buttons depend on where it lives:
//   draft  (just generated): Let's go / Save for later / I'm not feeling this
//   saved  (Cookbook):       Let's go / Tweak recipe / Delete
//   cooked (Cookbook):       Cook it again / Delete, plus the ratings it got
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { Cooking } from '@/components/Cooking';
import { RecipeView } from '@/components/RecipeView';
import { Button, Card, Field, H3, Muted, Pill, Popup, Screen, money } from '@/components/ui';
import {
  deleteRecipe,
  dismissRecipe,
  generateRecipe,
  getFeedback,
  getRecipe,
  saveForLater,
  setItemHave,
  startRecipe,
} from '@/lib/api';
import { C } from '@/lib/theme';
import type { Feedback, Recipe, SafetyNote } from '@/lib/types';

const budgetShown = new Set<string>();
const noteShown = new Set<string>();

const NOTE_ICONS: Record<string, 'shield-checkmark' | 'leaf' | 'flame' | 'medkit' | 'wallet-outline'> = {
  allergy: 'shield-checkmark',
  diet: 'leaf',
  equipment: 'flame',
  food_safety: 'medkit',
  budget: 'wallet-outline',
};

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [budgetPopup, setBudgetPopup] = useState(false);
  const [notePopup, setNotePopup] = useState(false);
  const [refusal, setRefusal] = useState<SafetyNote | null>(null); // a tweak Frankly said no to
  // This screen stays mounted inside the tabs: only show popups while it's the screen in view,
  // and the over-budget popup only the first time you open each recipe.
  const focused = useIsFocused();
  const [tweakOpen, setTweakOpen] = useState(false);
  const [tweak, setTweak] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await getRecipe(id);
    setFeedback(null);
    setRecipe(r);
    // "Heads up" first (what Frankly changed for their allergies/diet/kitchen), then the budget popup.
    if (r?.status === 'draft' && r.data.safety_note && !noteShown.has(r.id)) {
      noteShown.add(r.id);
      setNotePopup(true);
    }
    if (r?.status === 'draft' && r.data.budget_check.status !== 'ok' && !budgetShown.has(r.id)) {
      budgetShown.add(r.id);
      setBudgetPopup(true);
    }
    if (r?.status === 'cooked') setFeedback(await getFeedback(r.id));
  }, [id]);

  // This page stays mounted inside the tabs: clear it when a different recipe opens, reload on every visit.
  useEffect(() => {
    setRecipe(null);
    setBudgetPopup(false);
    setNotePopup(false);
    setTweakOpen(false);
    setError(null);
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      load().catch((e) => setError(String(e)));
    }, [load]),
  );

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (busy === 'tweak') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Cooking title="Tweaking it…" lines={['Reading your change', 'Rewriting the recipe', 'Re-checking live prices', 'Plating it up']} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <Screen>
        {error ? <Muted>{error}</Muted> : <ActivityIndicator color={C.primary} style={{ marginTop: 80 }} />}
      </Screen>
    );
  }

  const check = recipe.data.budget_check;
  const lets = () =>
    run('go', async () => {
      await startRecipe(recipe);
      router.replace('/active');
    });

  // The main action floats at the bottom of the screen, so it's always one tap away while scrolling.
  const primary =
    recipe.status === 'draft' || recipe.status === 'saved' ? (
      <Button title="Let's go" icon="flame" onPress={lets} loading={busy === 'go'} />
    ) : recipe.status === 'cooked' ? (
      <Button title="Cook it again" icon="flame" onPress={lets} loading={busy === 'go'} />
    ) : recipe.status === 'active' ? (
      <Button title="Open in Active Recipe" icon="flame" onPress={() => router.replace('/active')} />
    ) : null;

  return (
    <Screen footer={primary}>
      <Pressable onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <Ionicons name="chevron-back" size={20} color={C.muted} />
        <Muted>Back</Muted>
      </Pressable>

      {recipe.status === 'cooked' && recipe.cooked_at && (
        <Card style={{ backgroundColor: C.goodSoft, borderColor: C.goodSoft }}>
          <H3>Cooked on {new Date(recipe.cooked_at).toLocaleDateString([], { month: 'long', day: 'numeric' })}</H3>
          {feedback && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Pill tone="good" text={`Enjoyed ${feedback.enjoyment}/10`} />
              <Pill tone="good" text={`Fun to cook ${feedback.cooking_enjoyment}/10`} />
              <Pill tone="good" text={`Prices ${feedback.price_accuracy}/10 accurate`} />
              <Pill tone="good" text={`Leftovers: ${feedback.leftovers.replace('_', ' ')}`} />
            </View>
          )}
        </Card>
      )}

      <RecipeView
        key={recipe.id}
        data={recipe.data}
        helperRecipeId={recipe.id}
        onToggleHave={(name, have) => setItemHave(recipe, name, have).then(setRecipe).catch(() => {})}
      />

      {error && <Muted style={{ color: C.bad }}>{error}</Muted>}

      <View style={{ gap: 10, marginTop: 8 }}>
        {recipe.status === 'draft' && (
          <>
            <Button
              title="Save for later"
              kind="secondary"
              icon="bookmark-outline"
              loading={busy === 'save'}
              onPress={() => run('save', async () => { await saveForLater(recipe.id); router.replace('/cookbook'); })}
            />
            <Button
              title="I'm not feeling this"
              kind="ghost"
              loading={busy === 'dismiss'}
              onPress={() => run('dismiss', async () => { await dismissRecipe(recipe.id); goBack(); })}
            />
          </>
        )}
        {recipe.status === 'saved' && (
          <>
            <Button title="Tweak recipe" kind="secondary" icon="color-wand-outline" onPress={() => setTweakOpen(true)} />
            <Button
              title="Delete"
              kind="danger"
              icon="trash-outline"
              loading={busy === 'delete'}
              onPress={() => run('delete', async () => { await deleteRecipe(recipe.id); goBack(); })}
            />
          </>
        )}
        {recipe.status === 'cooked' && (
          <>
            <Button
              title="Delete"
              kind="danger"
              icon="trash-outline"
              loading={busy === 'delete'}
              onPress={() => run('delete', async () => { await deleteRecipe(recipe.id); goBack(); })}
            />
          </>
        )}
      </View>

      {/* The request clashed with their profile: say what Frankly changed */}
      {recipe.data.safety_note && (
        <Popup
          visible={notePopup && focused}
          title={recipe.data.safety_note.title}
          message={recipe.data.safety_note.message}
          icon={NOTE_ICONS[recipe.data.safety_note.kind] ?? 'information-circle'}
          alert={recipe.data.safety_note.kind === 'allergy'}
          onClose={() => setNotePopup(false)}
          actions={[
            { label: `Show me the ${recipe.data.title}`, onPress: () => setNotePopup(false) },
            { label: 'Change my request', kind: 'ghost', onPress: () => { setNotePopup(false); dismissRecipe(recipe.id).finally(goBack); } },
          ]}
        />
      )}

      {/* Budget or other parameter unrealistic */}
      <Popup
        visible={budgetPopup && !notePopup && focused}
        title={check.status === 'swaps' ? 'Just over budget' : 'This is over your budget'}
        message={
          check.status === 'swaps'
            ? `It's ${money(check.total)}, but the cheaper swaps bring it to ${money(check.with_swaps)}, under your ${money(check.budget)}.`
            : `The lowest Frankly found is ${money(check.with_swaps)}, more than your ${money(check.budget)} budget. Try a bigger budget, fewer servings, or a different dish.`
        }
        icon="wallet-outline"
        onClose={() => setBudgetPopup(false)}
        actions={
          check.status === 'swaps'
            ? [{ label: 'Show me the swaps', onPress: () => setBudgetPopup(false) }]
            : [
                { label: 'Change my request', onPress: () => { setBudgetPopup(false); dismissRecipe(recipe.id).finally(goBack); } },
                { label: 'Show it anyway', kind: 'ghost', onPress: () => setBudgetPopup(false) },
              ]
        }
      />

      <Popup
        visible={tweakOpen && focused}
        title="Tweak this recipe"
        message="What should Frankly change?"
        icon="color-wand-outline"
        onClose={() => setTweakOpen(false)}
        actions={[
          {
            label: 'Tweak it',
            onPress: () => {
              setTweakOpen(false);
              run('tweak', async () => {
                const res = await generateRecipe({
                  dish: recipe.dish_query,
                  servings: recipe.servings,
                  budget: recipe.budget ?? recipe.data.budget_check.budget,
                  leftovers: recipe.leftovers,
                  tweak: tweak.trim(),
                  base_recipe_id: recipe.id,
                });
                if (res.problem || !res.recipe) {
                  // e.g. "add peanuts" with a peanut allergy: explain why, keep the current recipe.
                  setRefusal(res.conflict ?? { kind: 'other', title: "Frankly can't make that change", message: res.problem ?? 'Could not tweak it.' });
                  return;
                }
                setTweak('');
                router.replace(`/recipe/${res.recipe.id}`);
              });
            },
          },
          { label: 'Cancel', kind: 'ghost', onPress: () => setTweakOpen(false) },
        ]}>
        <Field value={tweak} onChangeText={setTweak} placeholder="e.g. make it vegetarian, less spicy" style={{ alignSelf: 'stretch' }} />
      </Popup>

      <Popup
        visible={!!refusal && focused}
        title={refusal?.title ?? ''}
        message={refusal?.message}
        icon={NOTE_ICONS[refusal?.kind ?? ''] ?? 'information-circle'}
        alert={refusal?.kind === 'allergy'}
        onClose={() => setRefusal(null)}
        actions={[
          { label: 'Try a different change', onPress: () => { setRefusal(null); setTweakOpen(true); } },
          { label: 'Keep this recipe', kind: 'ghost', onPress: () => setRefusal(null) },
        ]}
      />
    </Screen>
  );
}
