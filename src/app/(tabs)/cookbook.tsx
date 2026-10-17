// Cookbook: two "books", Saved Recipes and Cooked Recipes.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { H1, Muted, Screen } from '@/components/ui';
import { countRecipes } from '@/lib/api';
import { C, F, R, shadow } from '@/lib/theme';

export default function Cookbook() {
  const [counts, setCounts] = useState({ saved: 0, cooked: 0 });

  useFocusEffect(
    useCallback(() => {
      countRecipes().then(setCounts).catch(() => {});
    }, []),
  );

  return (
    <Screen>
      <H1>Cookbook</H1>
      <Muted>Everything you've saved and cooked, remembered.</Muted>
      <View style={st.shelf}>
        <Book title="Saved Recipes" count={counts.saved} color={C.accent} icon="bookmark" onPress={() => router.push('/cookbook/saved')} />
        <Book title="Cooked Recipes" count={counts.cooked} color={C.primary} icon="checkmark-done" onPress={() => router.push('/cookbook/cooked')} />
      </View>
    </Screen>
  );
}

function Book({
  title,
  count,
  color,
  icon,
  onPress,
}: {
  title: string;
  count: number;
  color: string;
  icon: 'bookmark' | 'checkmark-done';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.book, { backgroundColor: color }, pressed && { transform: [{ rotate: '-1.5deg' }] }]}>
      <View style={st.spine} />
      <View style={st.cover}>
        <Ionicons name={icon} size={28} color="rgba(255,255,255,0.9)" />
        <Text style={st.bookTitle}>{title}</Text>
        <Text style={st.bookCount}>
          {count} {count === 1 ? 'recipe' : 'recipes'}
        </Text>
      </View>
      <View style={st.pages} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  shelf: { flexDirection: 'row', gap: 16, marginTop: 12 },
  book: { flex: 1, aspectRatio: 0.72, borderRadius: R.md, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, overflow: 'hidden', ...shadow },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, backgroundColor: 'rgba(0,0,0,0.18)' },
  pages: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 5,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  cover: { flex: 1, padding: 18, paddingLeft: 28, justifyContent: 'flex-end', gap: 6 },
  bookTitle: { fontFamily: F.display, fontSize: 22, lineHeight: 26, color: C.onPrimary },
  bookCount: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
});
