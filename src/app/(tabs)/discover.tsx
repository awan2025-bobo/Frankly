// "Don't know what to make today?" Ideas from the What-should-I-make agent, shown as a stack of
// cookbooks (shared BookShelf). The cuisine dropdown stays visible in the header.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { BookShelf, shelfStyles, type ShelfItem } from '@/components/BookShelf';
import { ChoppingLoader } from '@/components/Loaders';
import { Body, Button, Card, H1, Muted, Pill, Sheet } from '@/components/ui';
import { suggestDishes } from '@/lib/api';
import { CUISINES } from '@/lib/options';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';
import type { Suggestion } from '@/lib/types';

// Per app launch: the dropdown starts at the user's first favorite cuisine each time they open the app.
let launchCuisine: string | null = null;
const cache = new Map<string, Suggestion[]>();

const TAGS: Record<Suggestion['tag'], string> = {
  rotation: 'Back in rotation',
  favorite_style: 'Your style',
  uses_staples: 'Uses your staples',
  new: 'Something new',
};

export default function Discover() {
  const { profile } = useSession();
  const [cuisine, setCuisine] = useState<string>(() => launchCuisine ?? profile?.cuisines[0] ?? 'Any');
  const [picker, setPicker] = useState(false);
  const [dishes, setDishes] = useState<Suggestion[] | null>(cache.get(cuisine) ?? null);
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
  const byKey = new Map((dishes ?? []).map((d) => [d.name, d]));

  const items: ShelfItem[] | null =
    dishes?.map((d) => ({
      key: d.name,
      title: d.name,
      blurb: d.description,
      tags: [{ text: TAGS[d.tag] }, { icon: 'time-outline', text: `${d.total_minutes} min` }],
      extra: d.why,
    })) ?? null;

  return (
    <>
      <BookShelf
        title="Not sure what to make?"
        subtitle="Ideas from your tastes, your ratings, and what you haven't cooked in a while."
        resetKey={cuisine}
        loader={<ChoppingLoader text="Chopping up some ideas…" />}
        items={error ? [] : items}
        error={
          error ? (
            <Card style={{ marginHorizontal: 20 }}>
              <Muted style={{ color: C.bad }}>{error}</Muted>
              <Button title="Try again" kind="secondary" onPress={() => load(cuisine, true)} />
            </Card>
          ) : undefined
        }
        control={
          <Pressable onPress={() => setPicker(true)} style={st.dropdown}>
            <Ionicons name="globe-outline" size={18} color={C.muted} />
            <Text style={st.dropdownText}>{cuisine === 'Any' ? 'Any cuisine' : cuisine}</Text>
            <Ionicons name="chevron-down" size={18} color={C.ink} />
          </Pressable>
        }
        footer={<Button title="Show me different ideas" kind="ghost" icon="refresh" onPress={() => load(cuisine, true)} style={{ marginTop: 18 }} />}
        renderPage={(item, close) => {
          const d = byKey.get(item.key)!;
          return (
            <>
              <H1 style={{ fontSize: 26, lineHeight: 31, paddingRight: 28 }}>{d.name}</H1>
              <Body>{d.description}</Body>
              <View style={shelfStyles.why}>
                <Ionicons name="sparkles" size={18} color={C.accent} />
                <Body style={{ flex: 1, fontSize: 14 }}>{d.why}</Body>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Pill icon="time-outline" text={`${d.total_minutes} min`} />
                <Pill icon="bar-chart-outline" text={`Difficulty ${d.difficulty}/10`} />
                <Pill text={TAGS[d.tag]} />
              </View>
              <View style={{ flex: 1 }} />
              <Button
                title="Cook this: show me the recipe"
                icon="flame"
                onPress={() => close(() => router.navigate({ pathname: '/', params: { dish: d.name, t: String(Date.now()) } }))}
              />
            </>
          );
        }}
      />

      <Sheet visible={picker} onClose={() => setPicker(false)} title="Cuisine">
        <View style={{ gap: 6 }}>
          {options.map((o) => (
            <Pressable
              key={o}
              onPress={() => {
                setPicker(false);
                setCuisine(o);
              }}
              style={[st.option, o === cuisine && { backgroundColor: C.primary }]}>
              <Text style={[st.optionText, o === cuisine && { color: C.onPrimary }]}>{o === 'Any' ? 'Any cuisine' : o}</Text>
              {mine.includes(o) && <Ionicons name="heart" size={14} color={o === cuisine ? C.onPrimary : C.accent} />}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const st = StyleSheet.create({
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.cardAlt,
    borderRadius: R.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownText: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: R.md, backgroundColor: C.cardAlt },
  optionText: { fontFamily: F.medium, fontSize: 15, color: C.ink },
});
