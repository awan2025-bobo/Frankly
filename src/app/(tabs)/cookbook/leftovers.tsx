// Leftovers book: half-used ingredients from recent cooks (added when you tap "I've finished") plus anything you type in.
// "Remix my leftovers" sends them to Home, which makes a recipe built around them (they're not charged again).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { Body, Button, Card, EmptyState, Field, H1, H3, Label, Muted, Pill, Popup, Screen, Segmented } from '@/components/ui';
import { addLeftover, listLeftovers, removeLeftovers, updateLeftover } from '@/lib/api';
import { dateIn, daysLeft, useByLabel } from '@/lib/leftovers';
import { C } from '@/lib/theme';
import type { Leftover } from '@/lib/types';

const KEEPS = [
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '5', label: '5 days' },
  { value: '7', label: 'A week' },
];

export default function LeftoversBook() {
  const [items, setItems] = useState<Leftover[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [keeps, setKeeps] = useState('3');
  const [editing, setEditing] = useState<Leftover | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editKeeps, setEditKeeps] = useState<string | null>(null);

  const reload = useCallback(() => {
    listLeftovers()
      .then((l) => {
        setItems(l);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  useFocusEffect(reload);

  async function add() {
    if (!name.trim()) return;
    try {
      await addLeftover({ name: name.trim(), amount_text: amount.trim(), use_by: dateIn(Number(keeps)) });
      setName('');
      setAmount('');
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function edit(l: Leftover) {
    setEditing(l);
    setEditAmount(l.amount_text);
    setEditKeeps(null); // keep the current date unless they pick a new one
  }

  async function saveEdit() {
    if (!editing) return;
    await updateLeftover(editing.id, { amount_text: editAmount.trim(), ...(editKeeps ? { use_by: dateIn(Number(editKeeps)) } : {}) });
    setEditing(null);
    reload();
  }

  async function usedUp(ids: string[]) {
    setEditing(null);
    await removeLeftovers(ids);
    reload();
  }

  // Remix: Home asks servings/budget as usual, then the recipe agent builds the dish around these.
  function remix() {
    if (!items?.length) return;
    const use = items.slice(0, 8).map(({ id, name: n, amount_text }) => ({ id, name: n, amount_text }));
    router.navigate({
      pathname: '/',
      params: { dish: `Leftover remix: ${use.map((l) => l.name).join(', ')}`.slice(0, 120), remix: JSON.stringify(use), t: String(Date.now()) },
    });
  }

  return (
    <Screen>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.navigate('/cookbook'))}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' }}>
        <Ionicons name="chevron-back" size={20} color={C.muted} />
        <Muted>Cookbook</Muted>
      </Pressable>
      <H1>Leftovers</H1>
      <Muted>Half-used ingredients from what you've cooked. Use the soonest ones first.</Muted>

      {error && (
        <Card style={{ backgroundColor: C.badSoft }}>
          <Body style={{ color: C.bad }}>{error}</Body>
        </Card>
      )}

      {!!items?.length && (
        <Button title="Remix my leftovers" icon="color-wand-outline" onPress={remix} />
      )}

      {items && !items.length && !error && (
        <EmptyState
          icon="file-tray-outline"
          title="Nothing left over yet"
          message="When you tap “I’ve finished” on a recipe, the unused part of each package lands here. You can also add things below."
        />
      )}

      <View style={{ gap: 8 }}>
        {items?.map((l) => {
          const n = daysLeft(l.use_by);
          return (
            <Pressable key={l.id} onPress={() => edit(l)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <H3>{l.name}</H3>
                  {!!l.amount_text && <Muted style={{ fontSize: 13 }}>{l.amount_text}</Muted>}
                </View>
                <Pill tone={n == null ? 'neutral' : n < 0 ? 'bad' : n <= 1 ? 'warn' : 'neutral'} icon="time-outline" text={useByLabel(l.use_by)} />
                <Ionicons name="chevron-forward" size={16} color={C.faint} />
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ gap: 10, marginTop: 4 }}>
        <Label>Add something</Label>
        <Field value={name} onChangeText={setName} placeholder="e.g. cooked rice" onSubmitEditing={add} />
        <Field value={amount} onChangeText={setAmount} placeholder="How much? (optional, e.g. 2 cups)" onSubmitEditing={add} />
        <Muted style={{ fontSize: 13 }}>Keeps about</Muted>
        <Segmented options={KEEPS} value={keeps} onChange={setKeeps} />
        <Button title="Add to leftovers" kind="secondary" icon="add" onPress={add} disabled={!name.trim()} />
      </Card>

      <Popup
        visible={!!editing}
        title={editing?.name ?? ''}
        message={editing ? `${useByLabel(editing.use_by)}.` : undefined}
        icon="file-tray-outline"
        onClose={() => setEditing(null)}
        actions={[
          { label: 'Save', onPress: saveEdit },
          { label: 'Used it up', kind: 'secondary', onPress: () => editing && usedUp([editing.id]) },
          { label: 'Cancel', kind: 'ghost', onPress: () => setEditing(null) },
        ]}>
        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          <Field value={editAmount} onChangeText={setEditAmount} placeholder="How much is left?" />
          <Muted style={{ fontSize: 13 }}>Keeps about (from today)</Muted>
          <Segmented options={KEEPS} value={editKeeps ?? ''} onChange={setEditKeeps} />
        </View>
      </Popup>
    </Screen>
  );
}
