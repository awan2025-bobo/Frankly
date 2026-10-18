// Onboarding: under a minute, every question after the name can be skipped.
import { router } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { SizzlingPan } from '@/components/Loaders';
import {
  ApplianceSection,
  CuisineSection,
  DietSection,
  EMPTY_PREFS,
  HouseholdSection,
  LocationSection,
  NameSection,
  prefsToProfile,
  StoreSection,
  TasteSection,
  type Prefs,
} from '@/components/PrefSections';
import { Button, H1, Muted, Screen } from '@/components/ui';
import { useSession } from '@/lib/session';
import { C } from '@/lib/theme';

const STEPS: { title: string; subtitle: string; Section: ComponentType<{ value: Prefs; onChange: (p: Prefs) => void }> }[] = [
  { title: "Hi, I'm Frankly.", subtitle: "I plan meals around your budget and your kitchen. What should I call you?", Section: NameSection },
  { title: "Let's learn about your life", subtitle: 'So portions and plans fit your week.', Section: HouseholdSection },
  { title: 'How do you like it?', subtitle: 'You can always change these later.', Section: TasteSection },
  { title: 'Favorite cuisines', subtitle: 'Check all that you like.', Section: CuisineSection },
  { title: 'Anything to avoid?', subtitle: 'Frankly will never put an allergen in your recipes.', Section: DietSection },
  { title: 'What appliances do you have?', subtitle: 'Recipes will only use what you own.', Section: ApplianceSection },
  { title: 'Where do you usually shop?', subtitle: 'Check all that apply.', Section: StoreSection },
  { title: 'Where are you?', subtitle: 'To find the stores near you with the best prices.', Section: LocationSection },
];

export default function Onboarding() {
  const { updateProfile } = useSession();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Prefs>(EMPTY_PREFS);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(p: Prefs) {
    setBuilding(true);
    setError(null);
    try {
      // Let the "Building your Frankly…" moment breathe, even on fast networks.
      await Promise.all([updateProfile(prefsToProfile(p)), new Promise((r) => setTimeout(r, 2200))]);
      router.replace('/');
    } catch (e) {
      setBuilding(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (building) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <SizzlingPan size={200} />
        <H1 style={{ textAlign: 'center', paddingHorizontal: 28 }}>{'Building your\nFrankly…'}</H1>
      </View>
    );
  }

  const { title, subtitle, Section } = STEPS[step];
  const last = step === STEPS.length - 1;
  const next = () => (last ? finish(prefs) : setStep(step + 1));

  return (
    <Screen>
      <View style={st.progress}>
        {STEPS.map((_, i) => (
          <View key={i} style={[st.dot, i <= step && { backgroundColor: C.primary }]} />
        ))}
      </View>
      <View style={{ gap: 6, marginTop: 8 }}>
        <H1>{title}</H1>
        <Muted>{subtitle}</Muted>
      </View>
      <Section value={prefs} onChange={setPrefs} />
      {error && <Muted style={{ color: C.bad }}>{error}</Muted>}
      <View style={{ gap: 8, marginTop: 8 }}>
        <Button
          title={last ? 'Build my Frankly' : 'Continue'}
          onPress={next}
          disabled={step === 0 && !prefs.name.trim()}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {step > 0 ? <Button title="Back" kind="ghost" onPress={() => setStep(step - 1)} /> : <View />}
          {step > 0 && <Button title={last ? 'Skip for now' : 'Skip'} kind="ghost" onPress={next} />}
        </View>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.line },
});
