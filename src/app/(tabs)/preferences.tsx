// Profile > Change preferences: every onboarding question on one page.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { Button, H1, H2, Muted, Popup, Screen } from '@/components/ui';
import { setLeaveGuard } from '@/lib/leaveGuard';
import { useSession } from '@/lib/session';
import { C } from '@/lib/theme';

export default function Preferences() {
  const { profile, updateProfile } = useSession();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [prefs, setPrefs] = useState<Prefs | null>(profile ? prefsFromProfile(profile) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Save your changes?" when leaving with unsaved edits (Back or any tab): holds where they were going.
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const first = useRef(section === 'location');
  const original = useRef(profile ? JSON.stringify(prefsToProfile(prefsFromProfile(profile))) : '');
  const focused = useIsFocused();
  const dirty = !!prefs && JSON.stringify(prefsToProfile(prefs)) !== original.current;

  // While this screen is in view with unsaved edits, the tab bar asks first instead of leaving.
  useEffect(() => {
    if (!focused || !dirty) return;
    setLeaveGuard((go) => {
      setLeaving(() => go);
      return true;
    });
    return () => setLeaveGuard(null);
  }, [focused, dirty]);

  if (!prefs) return null;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const back = () => (dirty ? setLeaving(() => goBack) : goBack());

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

  async function save(then: () => void = goBack) {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateProfile(prefsToProfile(prefs!));
      original.current = JSON.stringify(prefsToProfile(prefsFromProfile(saved)));
      setLeaveGuard(null);
      then();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={back} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
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
      <Button title="Save preferences" icon="checkmark" onPress={() => save()} loading={saving} style={{ marginTop: 12 }} />

      <Popup
        visible={!!leaving && focused}
        title="Save your changes?"
        message="You changed your preferences. Frankly only uses them once they're saved."
        icon="save-outline"
        onClose={() => setLeaving(null)}
        actions={[
          {
            label: 'Save preferences',
            onPress: () => {
              const go = leaving ?? goBack;
              setLeaving(null);
              save(go);
            },
          },
          {
            label: 'Discard changes',
            kind: 'ghost',
            onPress: () => {
              const go = leaving ?? goBack;
              setLeaving(null);
              setLeaveGuard(null);
              if (profile) setPrefs(prefsFromProfile(profile)); // next visit starts from what's saved
              go();
            },
          },
        ]}
      />
    </Screen>
  );
}
