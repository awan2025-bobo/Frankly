// The pages of one book (Saved or Cooked), shown as the same stack of cookbooks as "Not sure?".
// Opening a book shows a summary with "Open full recipe" and "Let's go" / "Cook it again".
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { BookShelf, shelfStyles, type ShelfItem } from '@/components/BookShelf';
import { Body, Button, EmptyState, H1, Muted, Pill, money } from '@/components/ui';
import { listRecipes, startRecipe } from '@/lib/api';
import { C } from '@/lib/theme';
import type { Recipe } from '@/lib/types';

const daysAgo = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

export default function Book() {
  const { book } = useLocalSearchParams<{ book: 'saved' | 'cooked' }>();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const cooked = book === 'cooked';

  useFocusEffect(
    useCallback(() => {
      setRecipes(null);
      listRecipes(cooked ? 'cooked' : 'saved').then(setRecipes);
    }, [cooked]),
  );

  const byId = new Map((recipes ?? []).map((r) => [r.id, r]));
  const items: ShelfItem[] | null =
    recipes?.map((r) => ({
      key: r.id,
      title: r.title,
      blurb: r.data.description,
      tags: [
        ...(cooked && r.cooked_at ? [{ icon: 'calendar-outline' as const, text: `Cooked ${daysAgo(r.cooked_at)}` }] : []),
        { icon: 'pricetag-outline' as const, text: money(r.est_total) },
        { icon: 'people-outline' as const, text: `Serves ${r.servings}` },
      ],
      extra: r.data.how_personalized || `${r.data.cuisine} · ${r.data.total_minutes} min · keeps ${r.data.fridge_days} days`,
    })) ?? null;

  return (
    <BookShelf
      title={cooked ? 'Cooked Recipes' : 'Saved Recipes'}
      subtitle={cooked ? 'Everything you’ve made, with the date you made it.' : 'Recipes you saved for later.'}
      coverSub={cooked ? 'Cooked with Frankly' : 'Saved in your Cookbook'}
      resetKey={book}
      loadingText="Opening your cookbook…"
      top={
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.navigate('/cookbook'))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' }}>
          <Ionicons name="chevron-back" size={20} color={C.muted} />
          <Muted>Cookbook</Muted>
        </Pressable>
      }
      items={items}
      empty={
        <View style={{ marginTop: -60 }}>
          <EmptyState
            icon={cooked ? 'checkmark-done' : 'bookmark-outline'}
            title={cooked ? 'Nothing cooked yet' : 'No saved recipes'}
            message={
              cooked
                ? 'Tap “I’ve finished” on your active recipe and it lands here with the date.'
                : 'Tap “Save for later” on any recipe to keep it here.'
            }
          />
        </View>
      }
      renderPage={(item, close) => {
        const r = byId.get(item.key)!;
        return (
          <>
            <H1 style={{ fontSize: 26, lineHeight: 31, paddingRight: 28 }}>{r.title}</H1>
            <Body>{r.data.description}</Body>
            {r.data.how_personalized ? (
              <View style={shelfStyles.why}>
                <Ionicons name="sparkles" size={18} color={C.accent} />
                <Body style={{ flex: 1, fontSize: 14 }} numberOfLines={4}>
                  {r.data.how_personalized}
                </Body>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Pill icon="pricetag-outline" text={money(r.est_total)} />
              <Pill icon="people-outline" text={`Serves ${r.servings}`} />
              <Pill icon="time-outline" text={`${r.data.total_minutes} min`} />
              {cooked && r.cooked_at && <Pill tone="good" icon="calendar-outline" text={`Cooked ${daysAgo(r.cooked_at)}`} />}
            </View>
            <View style={{ flex: 1 }} />
            <Button title="Open full recipe" kind="secondary" icon="book-outline" onPress={() => close(() => router.push(`/recipe/${r.id}`))} />
            <Button
              title={cooked ? 'Cook it again' : "Let's go"}
              icon="flame"
              onPress={() =>
                close(async () => {
                  await startRecipe(r);
                  router.navigate('/active');
                })
              }
            />
          </>
        );
      }}
    />
  );
}
