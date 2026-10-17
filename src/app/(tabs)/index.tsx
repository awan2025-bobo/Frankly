// Home: "What would you like to cook today?" -> servings -> budget + leftovers -> preview -> recipe.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Cooking } from '@/components/Cooking';
import { Body, Button, Card, Field, H1, H2, Label, Muted, Pill, Popup, Screen, Segmented, Stepper } from '@/components/ui';
import { generateRecipe } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F } from '@/lib/theme';
import type { Leftovers } from '@/lib/types';

type Step = 'ask' | 'servings' | 'budget' | 'preview' | 'cooking';

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
      router.push(`/recipe/${res.recipe.id}`);
      setStep('ask');
      setDish('');
      setBudget('');
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
      setStep('preview');
    }
  }

  if (step === 'cooking') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Cooking
          title="Cooking it up…"
          lines={[
            'Reading your tastes and kitchen',
            'Checking what you already have',
            'Writing your recipe',
            'Comparing live prices at nearby stores',
            'Looking for cheaper swaps',
            'Plating it up',
          ]}
        />
      </View>
    );
  }

  return (
    <Screen style={{ flexGrow: 1 }}>
      {step === 'ask' && (
        <View style={st.askWrap}>
          <Muted style={{ textAlign: 'center' }}>
            {greeting()}
            {profile?.name ? `, ${profile.name}` : ''}
          </Muted>
          <Text style={st.ask}>What would you like to cook today?</Text>
          <TextInput
            value={dish}
            onChangeText={setDish}
            placeholder="e.g. chicken adobo"
            placeholderTextColor={C.faint}
            style={st.askInput}
            returnKeyType="go"
            onSubmitEditing={() => dish.trim() && setStep('servings')}
          />
          <Button title="Let's cook" icon="arrow-forward" onPress={() => setStep('servings')} disabled={!dish.trim()} />
          <Pressable onPress={() => router.navigate('/discover')} style={{ alignSelf: 'center', padding: 8 }}>
            <Muted style={{ textDecorationLine: 'underline' }}>Not sure? Get ideas</Muted>
          </Pressable>
        </View>
      )}

      {step !== 'ask' && (
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
                <Text style={[st.quickText, budgetNum === q && { color: C.white }]}>${q}</Text>
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
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <Muted style={{ fontSize: 12 }}>{label}</Muted>
      <Body style={[{ fontFamily: F.medium }, warn && { color: C.tomato }]}>{value}</Body>
    </View>
  );
}

const st = StyleSheet.create({
  askWrap: { flex: 1, justifyContent: 'center', gap: 18, minHeight: 480 },
  ask: { fontFamily: F.display, fontSize: 34, lineHeight: 40, color: C.ink, textAlign: 'center' },
  askInput: {
    fontFamily: F.displayItalic,
    fontSize: 24,
    color: C.ink,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: C.ink,
    paddingVertical: 10,
    marginHorizontal: 12,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  quick: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card },
  quickOn: { backgroundColor: C.ink, borderColor: C.ink },
  quickText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
});
