// Profile > Change preferences: every onboarding question on one page.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  ApplianceSection,
  CuisineSection,
  DietSection,
  HouseholdSection,
  LocationSection,
  NameSection,
  prefsFromProfile,
  prefsToProfile,
  StoreSection,
  TasteSection,
  type Prefs,
} from '@/components/PrefSections';
import { Button, H1, H2, Muted, Screen } from '@/components/ui';
import { useSession } from '@/lib/session';
import { C } from '@/lib/theme';

export default function Preferences() {
  const { profile, updateProfile } = useSession();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [prefs, setPrefs] = useState<Prefs | null>(profile ? prefsFromProfile(profile) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(section === 'location');

  if (!prefs) return null;

  const sections = [
    { key: 'name', title: 'Name', Section: NameSection },
    { key: 'household', title: 'Your household', Section: HouseholdSection },
    { key: 'taste', title: 'Taste', Section: TasteSection },
    { key: 'cuisines', title: 'Cuisines', Section: CuisineSection },
    { key: 'diet', title: 'Diet & allergens', Section: DietSection },
    { key: 'appliances', title: 'Appliances', Section: ApplianceSection },
    { key: 'stores', title: 'Where you shop', Section: StoreSection },
    { key: 'location', title: 'Location', Section: LocationSection },
  ];
  // Opened from "Location & stores": show that section first.
  if (first.current) sections.unshift(...sections.splice(sections.length - 1, 1));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile(prefsToProfile(prefs!));
      router.canGoBack() ? router.back() : router.replace('/profile');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <Ionicons name="chevron-back" size={20} color={C.muted} />
        <Muted>Back</Muted>
      </Pressable>
      <H1>Your preferences</H1>
      {sections.map(({ key, title, Section }) => (
        <View key={key} style={{ gap: 10, marginTop: 6 }}>
          <H2 style={{ fontSize: 19 }}>{title}</H2>
          <Section value={prefs} onChange={setPrefs} />
        </View>
      ))}
      {error && <Muted style={{ color: C.bad }}>{error}</Muted>}
      <Button title="Save preferences" icon="checkmark" onPress={save} loading={saving} style={{ marginTop: 12 }} />
    </Screen>
  );
}
