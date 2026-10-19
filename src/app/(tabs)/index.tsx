// Home: "What would you like to cook today?" -> servings -> budget + leftovers -> preview -> recipe.
// The kitchen stage (src/components/Veggies.tsx) animates along: veggies fly into a pot on submit,
// the pot stays docked through the questions, sizzles while the recipe generates, then pops.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { Logo } from '@/components/Logo';
import { InlinePot, VeggieStage, type StageMode } from '@/components/Veggies';
import { Body, Button, Card, Field, H1, H2, Label, Muted, Pill, Popup, Screen, Segmented, Stepper } from '@/components/ui';
import { generateRecipe, getRecipe } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F } from '@/lib/theme';
import type { Leftovers, SafetyNote } from '@/lib/types';

type Step = 'ask' | 'servings' | 'budget' | 'preview' | 'cooking';

const NOTICE_ICONS: Record<string, 'shield-checkmark' | 'leaf' | 'flame' | 'medkit' | 'wallet-outline' | 'help-circle'> = {
  allergy: 'shield-checkmark',
  diet: 'leaf',
  equipment: 'flame',
  food_safety: 'medkit',
  budget: 'wallet-outline',
  not_food: 'help-circle',
};

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
  const [style, setStyle] = useState('Classic'); // Classic | one of their cuisines | Surprise me
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<SafetyNote | null>(null);
  const [finishedId, setFinishedId] = useState<string | null>(null);
  // The last recipe Frankly made that you haven't acted on yet (Let's go / Save / Not feeling it).
  // A new recipe isn't saved anywhere until then, so Home keeps a way back to it.
  const [lastDraft, setLastDraft] = useState<{ id: string; title: string } | null>(null);
  const [line, setLine] = useState(0);
  const askOpacity = useRef(new Animated.Value(1)).current;

  // Fade the question out, then move on (the stage flies the veggies into the pot).
  function submitDish() {
    if (!dish.trim()) return;
    setStyle('Classic'); // every new dish starts as typed
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

  // On the long preview slide the pot leaves the overlay and sits at the end of the content instead.
  const stage: StageMode = finishedId ? 'done' : step === 'ask' ? 'idle' : step === 'cooking' ? 'cooking' : step === 'preview' ? 'away' : 'docked';

  // Whenever Home comes back into view, drop the link if that recipe was saved, started or dismissed.
  useFocusEffect(
    useCallback(() => {
      if (!lastDraft) return;
      getRecipe(lastDraft.id)
        .then((r) => {
          if (!r || r.status !== 'draft') setLastDraft(null);
        })
        .catch(() => {});
    }, [lastDraft]),
  );

  function showRecipe() {
    if (!finishedId) return;
    router.push(`/recipe/${finishedId}`);
    getRecipe(finishedId).then((r) => r && setLastDraft({ id: r.id, title: r.title }));
    setFinishedId(null);
    setStep('ask');
    setDish('');
    setBudget('');
  }

  // Coming from "Not sure?" with a dish picked: jump straight to the questions.
  useEffect(() => {
    if (params.dish) {
      setDish(params.dish);
      setStyle('Classic');
      setServings(profile?.household_size ?? 1);
      setStep('servings');
    }
  }, [params.dish, params.t, profile?.household_size]);

  const budgetNum = Number(budget);
  const quick = [8, 12, 15, 20, 30].map((b) => Math.round(b * Math.max(1, servings / 2)));

  async function cook(what: string = dish) {
    setStep('cooking');
    try {
      const res = await generateRecipe({
        dish: what.trim(),
        servings,
        budget: budgetNum,
        leftovers,
        style: style === 'Classic' ? 'classic' : style === 'Surprise me' ? 'surprise' : style,
      });
      if (res.problem || !res.recipe) {
        // Clashes with their allergies/diet/kitchen, unsafe, not food, or an impossible budget: explain, offer a dish they can make.
        if (res.conflict) setNotice(res.conflict);
        else setProblem(res.problem ?? 'Frankly could not make that work.');
        setStep(res.conflict?.kind === 'budget' ? 'budget' : 'preview');
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
    <Screen style={{ flexGrow: 1, paddingBottom: step === 'ask' || step === 'preview' ? 120 : 200 }}>
      {step === 'ask' && (
        <Animated.View style={{ flex: 1, opacity: askOpacity }}>
          <Logo size={40} />
          {lastDraft && (
            <Pressable onPress={() => router.push(`/recipe/${lastDraft.id}`)} style={st.draftLink}>
              <Ionicons name="arrow-undo" size={14} color={C.primary} />
              <Text style={st.draftText} numberOfLines={1}>
                Back to your {lastDraft.title}
              </Text>
            </Pressable>
          )}
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
            <Row label="Diet" value={profile.diets.join(', ') || 'None'} />
            {/* Always shown, so it's obvious before cooking which allergies Frankly will avoid */}
            <Row label="Allergens" value={profile.allergens.join(', ') || 'None set'} warn={profile.allergens.length > 0} />
            <Row label="Appliances" value={profile.appliances.join(', ') || 'None (no-cook recipes only)'} />
            <Row
              label="Stores"
              value={profile.kroger_stores.length ? profile.kroger_stores.map((s) => s.name).join(', ') : 'Not set: add your zip in Profile'}
              warn={!profile.kroger_stores.length}
            />
          </Card>
          {/* Style: the dish as usually made (default), one of your cuisines, or a creative take. */}
          <View style={{ gap: 8 }}>
            <Label>What style?</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['Classic', ...profile.cuisines.slice(0, 5), 'Surprise me'].map((s) => (
                <Pressable key={s} onPress={() => setStyle(s)} style={[st.quick, style === s && st.quickOn]}>
                  <Text style={[st.quickText, style === s && { color: C.onPrimary }]}>{s === 'Classic' || s === 'Surprise me' ? s : `${s}-style`}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Muted style={{ fontSize: 13 }}>
              {style === 'Classic'
                ? `${dish} the way it’s usually made.`
                : style === 'Surprise me'
                  ? 'A creative take, inspired by the cuisines you like.'
                  : `${dish} with ${style} flavors.`}
            </Muted>
          </View>
          <H2>Looks right?</H2>
          <Button title="Yes, cook it up" icon="flame" onPress={() => cook()} />
          <Button title="Change preferences" kind="secondary" onPress={() => router.push('/preferences')} />
          <InlinePot />
        </View>
      )}

      <Popup
        visible={!!problem}
        title="Let's try that again"
        message={problem ?? ''}
        onClose={() => setProblem(null)}
        actions={[{ label: 'Change my request', onPress: () => setProblem(null) }]}
      />

      {/* Nothing safe could be made: say why, and offer something they CAN make */}
      <Popup
        visible={!!notice}
        title={notice?.title ?? ''}
        message={notice?.message}
        icon={NOTICE_ICONS[notice?.kind ?? ''] ?? 'information-circle'}
        onClose={() => setNotice(null)}
        actions={[
          ...(notice?.alternative
            ? [{
                label: `Make ${notice.alternative}`,
                onPress: () => {
                  const alt = notice.alternative!;
                  setNotice(null);
                  setDish(alt);
                  cook(alt);
                },
              }]
            : []),
          ...(notice && ['allergy', 'diet', 'equipment'].includes(notice.kind)
            ? [{ label: 'Update my preferences', kind: 'secondary' as const, onPress: () => { setNotice(null); router.push('/preferences'); } }]
            : []),
          { label: 'Change my request', kind: 'ghost' as const, onPress: () => { setNotice(null); setStep('ask'); } },
        ]}
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
  draftLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 8, backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '90%' },
  draftText: { fontFamily: F.medium, fontSize: 13, color: C.primary },
  quick: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: C.cardAlt, backgroundColor: C.cardAlt },
  quickOn: { backgroundColor: C.primary, borderColor: C.primary },
  quickText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
});
