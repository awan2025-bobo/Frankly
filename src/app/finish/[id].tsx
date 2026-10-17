// "I've finished" sequence: rate it, then Frankly files it under Cooked and remembers everything.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Cooking } from '@/components/Cooking';
import { Button, Card, H1, Label, Muted, Screen, Segmented, SliderRow } from '@/components/ui';
import { finishRecipe, getRecipe } from '@/lib/api';
import { C } from '@/lib/theme';
import type { Feedback, Recipe } from '@/lib/types';

export default function Finish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [enjoyment, setEnjoyment] = useState(8);
  const [cooking, setCooking] = useState(7);
  const [prices, setPrices] = useState(8);
  const [leftovers, setLeftovers] = useState<Feedback['leftovers']>('as_expected');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecipe(id).then(setRecipe);
  }, [id]);

  async function submit() {
    if (!recipe) return;
    setSaving(true);
    try {
      await Promise.all([
        finishRecipe(recipe, { enjoyment, cooking_enjoyment: cooking, price_accuracy: prices, leftovers }),
        new Promise((r) => setTimeout(r, 1800)),
      ]);
      router.replace('/cookbook/cooked');
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (saving) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Cooking
          title="Nice work, chef!"
          lines={['Saving your ratings', 'Remembering your staples', 'Filing it in Cooked Recipes', 'Getting smarter for next time']}
        />
      </View>
    );
  }

  return (
    <Screen>
      <H1>How did it go?</H1>
      {recipe && <Muted>{recipe.title}</Muted>}
      <Card style={{ gap: 22 }}>
        <SliderRow label="How much did you enjoy it?" value={enjoyment} onChange={setEnjoyment} left="Not for me" right="Loved it" />
        <SliderRow label="How much did you enjoy cooking it?" value={cooking} onChange={setCooking} left="A chore" right="So fun" />
        <SliderRow label="Were the prices accurate?" value={prices} onChange={setPrices} left="Way off" right="Spot on" />
        <View style={{ gap: 8 }}>
          <Label>Leftovers compared to what you expected?</Label>
          <Segmented
            options={[
              { value: 'less', label: 'Less' },
              { value: 'as_expected', label: 'As expected' },
              { value: 'more', label: 'More' },
            ]}
            value={leftovers}
            onChange={setLeftovers}
          />
        </View>
      </Card>
      <Muted style={{ fontSize: 13 }}>Frankly uses this to adjust portions, prices and suggestions next time.</Muted>
      {error && <Muted style={{ color: C.bad }}>{error}</Muted>}
      <Button title="Save to my Cookbook" icon="book" onPress={submit} disabled={!recipe} />
      <Button title="Not yet" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
