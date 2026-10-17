// Home: "What would you like to cook today?" -> servings -> budget + leftovers -> preview -> recipe.
// The kitchen stage (src/components/Veggies.tsx) animates along: veggies fly into a pot on submit,
// the pot stays docked through the questions, sizzles while the recipe generates, then pops.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { VeggieStage, type StageMode } from '@/components/Veggies';
import { Body, Button, Card, Field, H1, H2, Label, Muted, Pill, Popup, Screen, Segmented, Stepper } from '@/components/ui';
import { generateRecipe } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F } from '@/lib/theme';
import type { Leftovers } from '@/lib/types';

type Step = 'ask' | 'servings' | 'budget' | 'preview' | 'cooking';

const AGENT_LINES = [
  'Reading your tastes and kitchen…',
  'Checking what you already have…',
  'Writing your recipe…',
  'Comparing prices at nearby stores…',
  'Looking for cheaper swaps…',
  'Plating it up…',
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 11 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const { profile } = useSession();
  const params = useLocalSearchParams<{ dish?: string; t?: string }>();
  const [step, setStep] = useState<Step>('ask');
  const [dish, setDish] = useState('');
  const [servings, setServings] = useState(profile?.household_size ?? 1);
  const [budget, setBudget] = useState('');
  const [leftovers, setLeftovers] = useState<Leftovers>('some');
  const [problem, setProblem] = useState<string | null>(null);
  const [finishedId, setFinishedId] = useState<string | null>(null);
  const [line, setLine] = useState(0);
  const askOpacity = useRef(new Animated.Value(1)).current;

  // Fade the question out, then move on (the stage flies the veggies into the pot).
  function submitDish() {
    if (!dish.trim()) return;
    Animated.timing(askOpacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => setStep('servings'));
  }

  useEffect(() => {
    if (step === 'ask') Animated.timing(askOpacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [step, askOpacity]);

  // Rotate the agent's status line while cooking.
  useEffect(() => {
    if (step !== 'cooking') return;
    setLine(0);
    const t = setInterval(() => setLine((n) => Math.min(n + 1, AGENT_LINES.length - 1)), 2600);
    return () => clearInterval(t);
  }, [step]);

  const stage: StageMode = finishedId ? 'done' : step === 'ask' ? 'idle' : step === 'cooking' ? 'cooking' : 'docked';

  function showRecipe() {
    if (!finishedId) return;
    router.push(`/recipe/${finishedId}`);
    setFinishedId(null);
    setStep('ask');
    setDish('');
    setBudget('');
  }

  // Coming from "Not sure?" with a dish picked: jump straight to the questions.
  useEffect(() => {
    if (params.dish) {
      setDish(params.dish);
      setServings(profile?.household_size ?? 1);
      setStep('servings');
    }
  }, [params.dish, params.t, profile?.household_size]);

  const budgetNum = Number(budget);
  const quick = [8, 12, 15, 20, 30].map((b) => Math.round(b * Math.max(1, servings / 2)));

  async function cook() {
    setStep('cooking');
    try {
      const res = await generateRecipe({ dish: dish.trim(), servings, budget: budgetNum, leftovers });
      if (res.problem || !res.recipe) {
        setProblem(res.problem ?? 'Frankly could not make that work.');
        setStep('budget');
        return;
      }
      setFinishedId(res.recipe.id); // the pot pops, then showRecipe() runs
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
      setStep('preview');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Screen style={{ flexGrow: 1, paddingBottom: step === 'ask' ? 120 : 200 }}>
      {step === 'ask' && (
        <Animated.View style={{ flex: 1, opacity: askOpacity }}>
          <Logo size={40} />
          <View style={st.askWrap}>
            <Muted style={{ textAlign: 'center' }}>
              {greeting()}
              {profile?.name ? `, ${profile.name}` : ''}
            </Muted>
            <Text style={st.ask}>What would you like to cook today?</Text>
            <View style={st.lineRow}>
              <TextInput
                value={dish}
                onChangeText={setDish}
                placeholderTextColor={C.faint}
                style={st.askInput}
                returnKeyType="go"
                onSubmitEditing={submitDish}
              />
              {/* Only appears once they've typed, for keyboards without a Go key. */}
              {dish.trim() ? (
                <Pressable onPress={submitDish} hitSlop={12} style={st.go} accessibilityLabel="Next">
                  <Ionicons name="arrow-forward" size={18} color={C.onPrimary} />
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={() => router.navigate('/discover')} style={{ alignSelf: 'center', padding: 8 }}>
              <Muted style={{ textDecorationLine: 'underline' }}>Not sure what to cook?</Muted>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {step !== 'ask' && step !== 'cooking' && (
        <Pressable onPress={() => setStep(step === 'servings' ? 'ask' : step === 'budget' ? 'servings' : 'budget')} style={st.back}>
          <Ionicons name="chevron-back" size={20} color={C.muted} />
          <Muted>Back</Muted>
        </Pressable>
      )}

      {step === 'servings' && (
        <View style={{ gap: 16 }}>
          <Pill text={dish} icon="restaurant-outline" />
          <H1>How many servings?</H1>
          <Stepper value={servings} onChange={setServings} max={20} />
          <Button title="Next" onPress={() => setStep('budget')} />
        </View>
      )}

      {step === 'budget' && (
        <View style={{ gap: 16 }}>
          <Pill text={`${dish} · ${servings} servings`} icon="restaurant-outline" />
          <H1>What's your target budget for this meal?</H1>
          <Field value={budget} onChangeText={(t) => setBudget(t.replace(/[^0-9.]/g, ''))} prefix="$" placeholder="15" keyboardType="decimal-pad" />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {quick.map((q) => (
              <Pressable key={q} onPress={() => setBudget(String(q))} style={[st.quick, budgetNum === q && st.quickOn]}>
                <Text style={[st.quickText, budgetNum === q && { color: C.onPrimary }]}>${q}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ gap: 8, marginTop: 8 }}>
            <Label>How many leftovers do you want?</Label>
            <Segmented
              options={[
                { value: 'none', label: 'None' },
                { value: 'some', label: 'Some' },
                { value: 'lots', label: 'Lots' },
              ]}
              value={leftovers}
              onChange={setLeftovers}
            />
            <Muted style={{ fontSize: 13 }}>
              {leftovers === 'lots' ? 'Frankly will favor bigger, better-value packs.' : leftovers === 'none' ? 'Exact amounts, smallest packs.' : 'About one extra portion.'}
            </Muted>
          </View>
          <Button title="Next" onPress={() => setStep('preview')} disabled={!(budgetNum >= 1)} />
        </View>
      )}

      {step === 'preview' && profile && (
        <View style={{ gap: 16 }}>
          <H1>Your recipe will be built with these preferences</H1>
          <Card style={{ gap: 12 }}>
            <Row label="Dish" value={`${dish}, ${servings} servings, $${budgetNum.toFixed(2)}`} />
            <Row label="Leftovers" value={leftovers} />
            <Row label="Spice · Seasoning · Difficulty" value={`${profile.spice} · ${profile.seasoning} · ${profile.difficulty} (out of 10)`} />
            {profile.diets.length > 0 && <Row label="Diet" value={profile.diets.join(', ')} />}
            {profile.allergens.length > 0 && <Row label="Allergens" value={profile.allergens.join(', ')} warn />}
            <Row label="Appliances" value={profile.appliances.join(', ') || 'Not set'} />
            <Row
              label="Stores"
              value={profile.kroger_stores.length ? profile.kroger_stores.map((s) => s.name).join(', ') : 'Not set: add your zip in Profile'}
              warn={!profile.kroger_stores.length}
            />
          </Card>
          <H2>Looks right?</H2>
          <Button title="Yes, cook it up" icon="flame" onPress={cook} />
          <Button title="Change preferences" kind="secondary" onPress={() => router.push('/preferences')} />
        </View>
      )}

      <Popup
        visible={!!problem}
        title="Let's try that again"
        message={problem ?? ''}
        onClose={() => setProblem(null)}
        actions={[{ label: 'Change my request', onPress: () => setProblem(null) }]}
      />
    </Screen>
    <VeggieStage mode={stage} caption={step === 'cooking' ? AGENT_LINES[line] : undefined} onDone={showRecipe} />
    </View>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <Muted style={{ fontSize: 12 }}>{label}</Muted>
      <Body style={[{ fontFamily: F.medium }, warn && { color: C.bad }]}>{value}</Body>
    </View>
  );
}

const st = StyleSheet.create({
  askWrap: { flex: 1, justifyContent: 'center', gap: 18, minHeight: 460 },
  lineRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, borderBottomWidth: 2, borderBottomColor: C.primary },
  go: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  ask: { fontFamily: F.display, fontSize: 34, lineHeight: 40, color: C.ink, textAlign: 'center' },
  askInput: {
    fontFamily: F.displayItalic,
    fontSize: 24,
    color: C.ink,
    textAlign: 'center',
    flex: 1,
    paddingVertical: 10,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  quick: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: C.cardAlt, backgroundColor: C.cardAlt },
  quickOn: { backgroundColor: C.primary, borderColor: C.primary },
  quickText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
});
