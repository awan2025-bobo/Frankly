// The preference questions, shared by onboarding (one per page) and Profile > Preferences (all on one page).
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { View } from 'react-native';

import { findStores } from '@/lib/api';
import { ALLERGENS, APPLIANCES, CUISINES, DIETS, KROGER_FAMILY, STORES } from '@/lib/options';
import { C } from '@/lib/theme';
import type { Profile } from '@/lib/types';
import { Body, Button, Card, ChipGrid, Field, Label, Muted, Pill, Segmented, SliderRow, Stepper } from './ui';

export type Prefs = Omit<Profile, 'id'> & { allergenOther: string; storeOther: string };

export const EMPTY_PREFS: Prefs = {
  name: '',
  cooks_for: 'self',
  household_size: 1,
  spice: 5,
  seasoning: 5,
  difficulty: 5,
  cuisines: [],
  diets: [],
  allergens: [],
  appliances: ['Stovetop'],
  stores: [],
  meals_per_week: null,
  zip: null,
  lat: null,
  lng: null,
  kroger_stores: [],
  allergenOther: '',
  storeOther: '',
};

export function prefsFromProfile(p: Profile): Prefs {
  const knownAllergens = p.allergens.filter((a) => ALLERGENS.includes(a));
  const otherAllergens = p.allergens.filter((a) => !ALLERGENS.includes(a));
  const knownStores = p.stores.filter((x) => STORES.includes(x) || x === "I don't know");
  const otherStores = p.stores.filter((x) => !STORES.includes(x) && x !== "I don't know");
  const { id: _id, ...rest } = p;
  return {
    ...rest,
    allergens: otherAllergens.length ? [...knownAllergens, 'Other'] : knownAllergens,
    allergenOther: otherAllergens.join(', '),
    stores: otherStores.length ? [...knownStores, 'Other'] : knownStores,
    storeOther: otherStores.join(', '),
  };
}

/** Turns the form back into a profile row ("Other" text becomes real entries). */
export function prefsToProfile(p: Prefs): Partial<Profile> {
  const split = (t: string) => t.split(',').map((x) => x.trim()).filter(Boolean);
  const { allergenOther, storeOther, ...rest } = p;
  return {
    ...rest,
    household_size: p.cooks_for === 'self' ? 1 : p.household_size,
    allergens: [...p.allergens.filter((a) => a !== 'Other'), ...(p.allergens.includes('Other') ? split(allergenOther) : [])],
    stores: [...p.stores.filter((x) => x !== 'Other'), ...(p.stores.includes('Other') ? split(storeOther) : [])],
  };
}

type Props = { value: Prefs; onChange: (next: Prefs) => void };

export function NameSection({ value, onChange }: Props) {
  return <Field value={value.name} onChangeText={(name) => onChange({ ...value, name })} placeholder="Your first name" />;
}

export function HouseholdSection({ value, onChange }: Props) {
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Label>Do you usually cook for yourself or someone else?</Label>
        <Segmented
          options={[
            { value: 'self', label: 'Just me' },
            { value: 'others', label: 'Someone else too' },
          ]}
          value={value.cooks_for}
          onChange={(cooks_for) =>
            onChange({ ...value, cooks_for, household_size: cooks_for === 'others' ? Math.max(2, value.household_size) : 1 })
          }
        />
      </View>
      {value.cooks_for === 'others' && (
        <View style={{ gap: 8 }}>
          <Label>How many people do you typically cook for?</Label>
          <Stepper value={value.household_size} onChange={(household_size) => onChange({ ...value, household_size })} min={2} />
        </View>
      )}
      <View style={{ gap: 8 }}>
        <Label>How many times a week do you want to cook? (optional)</Label>
        <Stepper
          value={value.meals_per_week ?? 3}
          onChange={(meals_per_week) => onChange({ ...value, meals_per_week })}
          min={1}
          max={21}
        />
      </View>
    </View>
  );
}

export function TasteSection({ value, onChange }: Props) {
  return (
    <View style={{ gap: 22 }}>
      <SliderRow label="Spiciness" value={value.spice} onChange={(spice) => onChange({ ...value, spice })} left="No heat" right="Bring the fire" />
      <SliderRow label="Seasoning" value={value.seasoning} onChange={(seasoning) => onChange({ ...value, seasoning })} left="Light" right="Bold" />
      <SliderRow
        label="Difficulty / complexity"
        value={value.difficulty}
        onChange={(difficulty) => onChange({ ...value, difficulty })}
        left="Quick & easy"
        right="Chef mode"
      />
    </View>
  );
}

export function CuisineSection({ value, onChange }: Props) {
  return <ChipGrid options={CUISINES} selected={value.cuisines} onChange={(cuisines) => onChange({ ...value, cuisines })} />;
}

export function DietSection({ value, onChange }: Props) {
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Label>Dietary restrictions or preferences</Label>
        <ChipGrid options={DIETS} selected={value.diets} onChange={(diets) => onChange({ ...value, diets })} />
      </View>
      <View style={{ gap: 8 }}>
        <Label>Allergens</Label>
        <ChipGrid options={[...ALLERGENS, 'Other']} selected={value.allergens} onChange={(allergens) => onChange({ ...value, allergens })} />
        {value.allergens.includes('Other') && (
          <Field
            value={value.allergenOther}
            onChangeText={(allergenOther) => onChange({ ...value, allergenOther })}
            placeholder="Type them, separated by commas"
          />
        )}
      </View>
    </View>
  );
}

export function ApplianceSection({ value, onChange }: Props) {
  return <ChipGrid options={APPLIANCES} selected={value.appliances} onChange={(appliances) => onChange({ ...value, appliances })} />;
}

export function StoreSection({ value, onChange }: Props) {
  return (
    <View style={{ gap: 10 }}>
      <ChipGrid
        options={[...STORES, 'Other', "I don't know"]}
        selected={value.stores}
        onChange={(stores) => onChange({ ...value, stores })}
      />
      {value.stores.includes('Other') && (
        <Field value={value.storeOther} onChangeText={(storeOther) => onChange({ ...value, storeOther })} placeholder="Which stores?" />
      )}
      <Card style={{ backgroundColor: C.cardAlt, padding: 14, flexDirection: 'row', gap: 10 }}>
        <Ionicons name="pricetags-outline" size={18} color={C.muted} />
        <Muted style={{ flex: 1, fontSize: 13 }}>
          Frankly compares live prices at Kroger-family stores near you ({KROGER_FAMILY.join(', ')}).
        </Muted>
      </Card>
    </View>
  );
}

export function LocationSection({ value, onChange }: Props) {
  const [zip, setZip] = useState(value.zip ?? '');
  const [busy, setBusy] = useState<'zip' | 'gps' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function lookup(near: { zip?: string; lat?: number; lng?: number }, kind: 'zip' | 'gps') {
    setBusy(kind);
    setMessage(null);
    try {
      const res = await findStores(near);
      if (!res.stores.length) setMessage(res.message ?? 'No Kroger-family stores found nearby.');
      onChange({
        ...value,
        zip: near.zip ?? value.zip,
        lat: res.origin?.lat ?? near.lat ?? null,
        lng: res.origin?.lng ?? near.lng ?? null,
        kroger_stores: res.stores,
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function useGps() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      setMessage('Location permission denied. Type your zip code instead.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await lookup({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 'gps');
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field value={zip} onChangeText={setZip} placeholder="Zip code" keyboardType="number-pad" style={{ flex: 1 }} />
        <Button title="Find" onPress={() => lookup({ zip: zip.trim() }, 'zip')} disabled={zip.trim().length < 5} loading={busy === 'zip'} />
      </View>
      <Button title="Use my location" kind="secondary" icon="navigate" onPress={useGps} loading={busy === 'gps'} />
      {message && <Muted style={{ color: C.tomato }}>{message}</Muted>}
      {value.kroger_stores.length > 0 && (
        <View style={{ gap: 8 }}>
          <Label>Frankly will compare prices at:</Label>
          {value.kroger_stores.map((s) => (
            <Card key={s.locationId} style={{ padding: 14, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Body style={{ fontFamily: 'Inter_500Medium' }}>{s.name}</Body>
                {s.distanceMi != null && <Pill text={`${s.distanceMi.toFixed(1)} mi`} />}
              </View>
              <Muted style={{ fontSize: 13 }}>{s.address}</Muted>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}
