// The pages of one book: Saved or Cooked recipes.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Card, EmptyState, H1, H3, Muted, Pill, Screen, money } from '@/components/ui';
import { listRecipes } from '@/lib/api';
import { C, F } from '@/lib/theme';
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
      listRecipes(cooked ? 'cooked' : 'saved').then(setRecipes);
    }, [cooked]),
  );

  return (
    <Screen>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/cookbook'))}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <Ionicons name="chevron-back" size={20} color={C.muted} />
        <Muted>Cookbook</Muted>
      </Pressable>
      <H1>{cooked ? 'Cooked Recipes' : 'Saved Recipes'}</H1>
      {recipes === null && <ActivityIndicator color={C.tomato} />}
      {recipes?.length === 0 && (
        <EmptyState
          icon={cooked ? 'checkmark-done' : 'bookmark-outline'}
          title={cooked ? 'Nothing cooked yet' : 'No saved recipes'}
          message={
            cooked
              ? 'Tap “I’ve finished” on your active recipe and it lands here with the date.'
              : 'Tap “Save for later” on any recipe to keep it here.'
          }
        />
      )}
      <View style={{ gap: 12 }}>
        {recipes?.map((r) => (
          <Card key={r.id} onPress={() => router.push(`/recipe/${r.id}`)} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <H3 style={{ flex: 1 }}>{r.title}</H3>
              <Muted style={{ fontFamily: F.bold, color: C.ink }}>{money(r.est_total)}</Muted>
            </View>
            <Muted numberOfLines={2} style={{ fontSize: 13 }}>
              {r.data.description}
            </Muted>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {r.cuisine && <Pill text={r.cuisine} />}
              <Pill text={`Serves ${r.servings}`} />
              {cooked && r.cooked_at && <Pill tone="good" icon="calendar-outline" text={`Cooked ${daysAgo(r.cooked_at)}`} />}
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
