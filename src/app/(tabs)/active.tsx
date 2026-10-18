// Active Recipe: the one recipe you're shopping for / cooking right now.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { RecipeView } from '@/components/RecipeView';
import { Button, EmptyState, Muted, Pill, Screen } from '@/components/ui';
import { getActiveRecipe, saveForLater } from '@/lib/api';
import { C } from '@/lib/theme';
import type { Recipe } from '@/lib/types';

export default function Active() {
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getActiveRecipe().then(setRecipe).catch(() => setRecipe(null));
    }, []),
  );

  if (recipe === undefined) {
    return (
      <Screen>
        <ActivityIndicator color={C.primary} style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  if (!recipe) {
    return (
      <Screen>
        <EmptyState
          icon="flame-outline"
          title="Nothing cooking yet"
          message="When you tap “Let's go” on a recipe, it lives here so you can jump back to it while shopping and cooking.">
          <Button title="Find something to cook" onPress={() => router.navigate('/')} style={{ marginTop: 8 }} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pill tone="bad" icon="flame" text="Cooking now" />
      <RecipeView data={recipe.data} helperRecipeId={recipe.id} />
      <View style={{ gap: 10, marginTop: 8 }}>
        <Button title="I've finished" icon="checkmark-circle" onPress={() => router.push(`/finish/${recipe.id}`)} />
        <Button
          title="I'm making something else"
          kind="secondary"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await saveForLater(recipe.id).finally(() => setBusy(false));
            setRecipe(null);
          }}
        />
        <Muted style={{ textAlign: 'center', fontSize: 12 }}>“Making something else” moves this to your Saved recipes.</Muted>
      </View>
    </Screen>
  );
}
