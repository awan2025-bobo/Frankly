// "Don't know what to make today?" A cookbook page of ideas from the What-should-I-make agent.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, H1, H2, Muted, Pill, Screen, Sheet } from '@/components/ui';
import { suggestDishes } from '@/lib/api';
import { CUISINES } from '@/lib/options';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';
import type { Suggestion } from '@/lib/types';

// Per app launch: the dropdown starts at the user's first favorite cuisine each time they open the app.
let launchCuisine: string | null = null;
const cache = new Map<string, Suggestion[]>();

const TAGS: Record<Suggestion['tag'], { label: string; tone: 'good' | 'warn' | 'neutral' | 'bad' }> = {
  rotation: { label: 'Back in rotation', tone: 'warn' },
  favorite_style: { label: 'Your style', tone: 'bad' },
  uses_staples: { label: 'Uses your staples', tone: 'good' },
  new: { label: 'Something new', tone: 'neutral' },
};

export default function Discover() {
  const { profile } = useSession();
  const [cuisine, setCuisine] = useState<string>(() => launchCuisine ?? profile?.cuisines[0] ?? 'Any');
  const [picker, setPicker] = useState(false);
  const [dishes, setDishes] = useState<Suggestion[] | null>(cache.get(cuisine) ?? null);
  const [open, setOpen] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (c: string, force = false) => {
    setError(null);
    if (!force && cache.has(c)) {
      setDishes(cache.get(c)!);
      return;
    }
    setDishes(null);
    try {
      const res = await suggestDishes(c);
      cache.set(c, res.dishes);
      setDishes(res.dishes);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    launchCuisine = cuisine;
    load(cuisine);
  }, [cuisine, load]);

  const mine = profile?.cuisines ?? [];
  const options = ['Any', ...mine, ...CUISINES.filter((c) => !mine.includes(c))];

  return (
    <Screen>
      <H1>Not sure what to make?</H1>
      <Muted>Ideas picked from your tastes, your ratings, and what you haven't cooked in a while.</Muted>

      <Pressable onPress={() => setPicker(true)} style={st.dropdown}>
        <Ionicons name="globe-outline" size={18} color={C.muted} />
        <Text style={st.dropdownText}>{cuisine === 'Any' ? 'Any cuisine' : cuisine}</Text>
        <Ionicons name="chevron-down" size={18} color={C.ink} />
      </Pressable>

      {error && (
        <Card>
          <Muted style={{ color: C.tomato }}>{error}</Muted>
          <Button title="Try again" kind="secondary" onPress={() => load(cuisine, true)} />
        </Card>
      )}
      {!dishes && !error && (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 40 }}>
          <ActivityIndicator color={C.tomato} />
          <Muted>Flipping through your cookbook…</Muted>
        </View>
      )}

      <View style={{ gap: 12 }}>
        {dishes?.map((d) => (
          <Card key={d.name} onPress={() => setOpen(d)} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <H2 style={{ flex: 1, fontSize: 20 }}>{d.name}</H2>
              <Ionicons name="chevron-forward" size={18} color={C.faint} />
            </View>
            <Muted numberOfLines={2}>{d.description}</Muted>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Pill tone={TAGS[d.tag].tone} text={TAGS[d.tag].label} />
              <Pill icon="time-outline" text={`${d.total_minutes} min`} />
            </View>
          </Card>
        ))}
      </View>
      {dishes && <Button title="Show me different ideas" kind="ghost" icon="refresh" onPress={() => load(cuisine, true)} />}

      <Sheet visible={picker} onClose={() => setPicker(false)} title="Cuisine">
        <View style={{ gap: 6 }}>
          {options.map((o) => (
            <Pressable
              key={o}
              onPress={() => {
                setPicker(false);
                setCuisine(o);
              }}
              style={[st.option, o === cuisine && { backgroundColor: C.ink }]}>
              <Text style={[st.optionText, o === cuisine && { color: C.white }]}>{o === 'Any' ? 'Any cuisine' : o}</Text>
              {mine.includes(o) && <Ionicons name="heart" size={14} color={o === cuisine ? C.white : C.tomato} />}
            </Pressable>
          ))}
        </View>
      </Sheet>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
        {open && (
          <View style={{ gap: 12 }}>
            <Body>{open.description}</Body>
            <Card style={{ backgroundColor: C.cardAlt, flexDirection: 'row', gap: 8 }}>
              <Ionicons name="sparkles" size={18} color={C.tomato} />
              <Body style={{ flex: 1, fontSize: 14 }}>{open.why}</Body>
            </Card>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pill icon="time-outline" text={`${open.total_minutes} min`} />
              <Pill icon="bar-chart-outline" text={`Difficulty ${open.difficulty}/10`} />
            </View>
            <Button
              title="Cook this: show me the recipe"
              icon="flame"
              onPress={() => {
                const dish = open.name;
                setOpen(null);
                router.navigate({ pathname: '/', params: { dish, t: String(Date.now()) } });
              }}
            />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const st = StyleSheet.create({
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: R.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: R.md, backgroundColor: C.card },
  optionText: { fontFamily: F.medium, fontSize: 15, color: C.ink },
});
