// Meal Plan book: 3-7 dinners for the week that share ingredients, one grocery list, and how much sharing saves.
// Each dinner is a normal recipe ('planned'), so tapping it opens the usual recipe page with "Let's go".
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Cooking } from '@/components/Cooking';
import { Pressable } from '@/components/Pressable';
import { Body, Button, Card, Chip, Field, H1, H2, H3, Label, Muted, Pill, Popup, Screen, Stepper, money } from '@/components/ui';
import { generateMealPlan, getLatestPlan, getRecipes } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C } from '@/lib/theme';
import type { MealPlan, Recipe } from '@/lib/types';

const PLANNING_LINES = [
  'Reading your tastes and kitchen…',
  'Picking dinners that share ingredients…',
  'Writing each recipe…',
  'Pricing one grocery list at nearby stores…',
  'Adding up what sharing saves…',
];

export default function PlanBook() {
  const { profile } = useSession();
  const [plan, setPlan] = useState<MealPlan | null | undefined>(undefined); // undefined = loading
  const [meals, setMeals] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(false); // "Plan a new week" over an existing plan
  const [count, setCount] = useState(5);
  const [servings, setServings] = useState(profile?.household_size ?? 1);
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(() => {
    getLatestPlan()
      .then(async (p) => {
        setPlan(p);
        setMeals(p ? await getRecipes(p.recipe_ids) : []);
        setError(null);
      })
      .catch((e) => {
        setPlan(null);
        setError(e instanceof Error ? e.message : String(e));
      });
  }, []);
  useFocusEffect(load);

  const budgetNum = Number(budget);
  const quick = [40, 60, 80, 100].map((b) => Math.round(b * Math.max(1, servings / 2) * (count / 5)));

  async function make() {
    setBusy(true);
    try {
      const res = await generateMealPlan({ meals: count, budget: budgetNum, servings });
      if (res.problem || !res.plan) setProblem(res.problem ?? 'Frankly could not plan that week.');
      else {
        setForm(false);
        load();
      }
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Cooking title="Planning your week…" lines={PLANNING_LINES} />
      </View>
    );
  }

  const back = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.navigate('/cookbook'))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' }}>
      <Ionicons name="chevron-back" size={20} color={C.muted} />
      <Muted>Cookbook</Muted>
    </Pressable>
  );

  const showForm = plan === null || form;
  return (
    <Screen>
      {back}
      {error && (
        <Card style={{ backgroundColor: C.badSoft }}>
          <Body style={{ color: C.bad }}>{error}</Body>
        </Card>
      )}

      {showForm ? (
        <>
          <H1>Plan your week</H1>
          <Muted>Frankly picks dinners that share ingredients, so one grocery trip covers them all and less goes to waste.</Muted>
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Label>Dinners this week</Label>
              <Stepper value={count} onChange={setCount} min={3} max={7} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Label>Servings each</Label>
              <Stepper value={servings} onChange={setServings} min={1} max={12} />
            </View>
            <Label>Grocery budget for the week</Label>
            <Field value={budget} onChangeText={(t) => setBudget(t.replace(/[^0-9.]/g, ''))} placeholder="e.g. 60" keyboardType="decimal-pad" prefix="$" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {quick.map((q) => (
                <Chip key={q} label={`$${q}`} selected={budgetNum === q} onPress={() => setBudget(String(q))} />
              ))}
            </View>
          </Card>
          <Button title="Plan my week" icon="calendar" onPress={make} disabled={!(budgetNum >= 5)} />
          {form && <Button title="Keep my current plan" kind="ghost" onPress={() => setForm(false)} />}
        </>
      ) : plan ? (
        <PlanView plan={plan} meals={meals} onNew={() => setForm(true)} />
      ) : null}

      <Popup
        visible={!!problem}
        title="Let's try that again"
        message={problem ?? ''}
        onClose={() => setProblem(null)}
        actions={[{ label: 'OK', onPress: () => setProblem(null) }]}
      />
    </Screen>
  );
}

function PlanView({ plan, meals, onNew }: { plan: MealPlan; meals: Recipe[]; onNew: () => void }) {
  const d = plan.data;
  const best = d.recommended.locationId;
  const store = d.totals.find((t) => t.locationId === best);
  const saved = Math.max(0, d.separate_total - d.budget_check.total);
  const over = d.budget_check.status === 'over';
  return (
    <>
      <H1>{d.title}</H1>
      <Muted>{d.shared_note}</Muted>

      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Muted style={{ fontSize: 13 }}>Groceries for the week</Muted>
            <H2>{money(d.budget_check.total)}</H2>
          </View>
          <Pill tone={over ? 'bad' : 'good'} icon={over ? 'alert-circle' : 'checkmark-circle'} text={`${over ? 'Over' : 'Under'} your ${money(plan.budget)}`} />
        </View>
        {saved >= 0.5 && (
          <Body style={{ fontSize: 14 }}>
            Shopping once saves about <Body style={{ fontFamily: 'Inter_700Bold', fontSize: 14 }}>{money(saved)}</Body> versus buying each dinner
            separately ({money(d.separate_total)}).
          </Body>
        )}
        {store && <Muted style={{ fontSize: 13 }}>{d.recommended.reason}</Muted>}
        {d.estimated_total > 0 && <Muted style={{ fontSize: 12 }}>Includes {money(d.estimated_total)} of estimates for items Kroger doesn't carry.</Muted>}
        {d.demo && <Muted style={{ fontSize: 12 }}>Demo mode: sample prices at demo stores.</Muted>}
      </Card>

      <H3>
        {plan.meals} dinners · serves {plan.servings}
      </H3>
      <View style={{ gap: 8 }}>
        {meals.map((r, i) => (
          <Pressable key={r.id} onPress={() => router.push(`/recipe/${r.id}`)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Body style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: C.primary }}>{i + 1}</Body>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <H3>{r.title}</H3>
                <Muted style={{ fontSize: 13 }}>
                  {r.data.cuisine} · {r.data.total_minutes} min
                </Muted>
              </View>
              {r.status === 'cooked' ? (
                <Pill tone="good" icon="checkmark-done" text="Cooked" />
              ) : r.status === 'active' ? (
                <Pill tone="warn" icon="flame" text="Cooking" />
              ) : null}
              <Ionicons name="chevron-forward" size={16} color={C.faint} />
            </Card>
          </Pressable>
        ))}
      </View>

      <H3 style={{ marginTop: 6 }}>Grocery list{store ? ` · ${store.name}` : ''}</H3>
      <Card style={{ gap: 12 }}>
        {d.grocery.map((g) => {
          const pick = best ? g.prices[best] : null;
          return (
            <View key={g.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontFamily: 'Inter_500Medium' }}>{g.name}</Body>
                <Muted style={{ fontSize: 12 }} numberOfLines={2}>
                  {g.used_in.length > 1 ? `In ${g.used_in.length} dinners · ` : ''}
                  {pick ? `${pick.packages > 1 ? `${pick.packages} × ` : ''}${pick.size}` : g.amount_text}
                </Muted>
              </View>
              {g.already_have ? (
                <Pill tone="good" icon="home-outline" text="You have it" />
              ) : pick ? (
                <Body style={{ fontFamily: 'Inter_500Medium' }}>{money(pick.cost)}</Body>
              ) : g.estimate ? (
                <Muted>≈ {money(g.estimate.cost)} est.</Muted>
              ) : (
                <Muted>Not found</Muted>
              )}
            </View>
          );
        })}
      </Card>

      <Button title="Plan a new week" kind="secondary" icon="refresh" onPress={onNew} />
      <Muted style={{ fontSize: 12, textAlign: 'center' }}>A new plan replaces this one. Dinners you've already started or cooked stay in your Cookbook.</Muted>
    </>
  );
}
