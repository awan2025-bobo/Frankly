// Cookbook: the books on the shelf: Saved Recipes, Cooked Recipes and Leftovers.
// Tapping a book plays a short transition: the book grows to fill the screen and its cover swings
// open onto the page, then the book's recipe list appears underneath.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { H1, Muted, Screen } from '@/components/ui';
import { countLeftovers, countRecipes } from '@/lib/api';
import { C, F, R, shadow } from '@/lib/theme';

type BookIcon = 'bookmark' | 'checkmark-done' | 'file-tray-full';
type Opening = { rect: { x: number; y: number; w: number; h: number }; color: string; title: string; icon: BookIcon; href: string };

export default function Cookbook() {
  const [counts, setCounts] = useState({ saved: 0, cooked: 0, leftovers: 0 });
  const [opening, setOpening] = useState<Opening | null>(null);

  useFocusEffect(
    useCallback(() => {
      countRecipes().then((c) => setCounts((p) => ({ ...p, ...c }))).catch(() => {});
      countLeftovers().then((leftovers) => setCounts((p) => ({ ...p, leftovers }))).catch(() => {});
    }, []),
  );

  return (
    <Screen>
      <H1>Cookbook</H1>
      <Muted>Everything you've saved and cooked, remembered.</Muted>
      <View style={st.shelf}>
        <Book
          title="Saved Recipes"
          count={counts.saved}
          color={C.accent}
          icon="bookmark"
          onOpen={(rect) => setOpening({ rect, color: C.accent, title: 'Saved Recipes', icon: 'bookmark', href: '/cookbook/saved' })}
        />
        <Book
          title="Cooked Recipes"
          count={counts.cooked}
          color={C.primary}
          icon="checkmark-done"
          onOpen={(rect) => setOpening({ rect, color: C.primary, title: 'Cooked Recipes', icon: 'checkmark-done', href: '/cookbook/cooked' })}
        />
        <Book
          title="Leftovers"
          count={counts.leftovers}
          unit="item"
          color={C.warn}
          icon="file-tray-full"
          onOpen={(rect) => setOpening({ rect, color: C.warn, title: 'Leftovers', icon: 'file-tray-full', href: '/cookbook/leftovers' })}
        />
      </View>
      {opening && <OpenTransition {...opening} onDone={() => setOpening(null)} />}
    </Screen>
  );
}

function Book({
  title,
  count,
  unit = 'recipe',
  color,
  icon,
  onOpen,
}: {
  title: string;
  count: number;
  unit?: string;
  color: string;
  icon: BookIcon;
  onOpen: (rect: Opening['rect']) => void;
}) {
  const ref = useRef<View>(null);
  return (
    <Pressable
      ref={ref}
      onPress={() => ref.current?.measureInWindow((x, y, w, h) => onOpen({ x, y, w, h }))}
      style={({ pressed }) => [st.book, { backgroundColor: color }, pressed && { transform: [{ rotate: '-1.5deg' }] }]}>
      <BookFace title={title} icon={icon} count={count} unit={unit} />
    </Pressable>
  );
}

function BookFace({ title, icon, count, unit = 'recipe' }: { title: string; icon: BookIcon; count?: number; unit?: string }) {
  return (
    <>
      <View style={st.spine} />
      <View style={st.cover}>
        <Ionicons name={icon} size={28} color="rgba(255,255,255,0.9)" />
        <Text style={st.bookTitle}>{title}</Text>
        {count != null && (
          <Text style={st.bookCount}>
            {count} {count === 1 ? unit : `${unit}s`}
          </Text>
        )}
      </View>
      <View style={st.pages} />
    </>
  );
}

/** The tapped book grows to full screen, its cover swings open, then we navigate and fade out. */
function OpenTransition({ rect, color, title, icon, href, onDone }: Opening & { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const grow = useRef(new Animated.Value(0)).current;
  const open = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  // Start as soon as the overlay mounts.
  useEffect(() => {
    Animated.sequence([
      Animated.timing(grow, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(open, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start(() => {
      router.push(href);
      Animated.timing(fade, { toValue: 0, duration: 220, delay: 120, useNativeDriver: false }).start(onDone);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const box = {
    left: grow.interpolate({ inputRange: [0, 1], outputRange: [rect.x, 0] }),
    top: grow.interpolate({ inputRange: [0, 1], outputRange: [rect.y, 0] }),
    width: grow.interpolate({ inputRange: [0, 1], outputRange: [rect.w, width] }),
    height: grow.interpolate({ inputRange: [0, 1], outputRange: [rect.h, height] }),
    borderRadius: grow.interpolate({ inputRange: [0, 1], outputRange: [R.md, 0] }),
  };
  const cover = {
    transformOrigin: 'left center',
    transform: [{ perspective: 1600 }, { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-150deg'] }) }],
  } as const;

  return (
    <Modal transparent visible animationType="none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="none">
        <Animated.View style={[{ position: 'absolute', overflow: 'hidden' }, box]}>
          {/* the page underneath matches the next screen's background, so the hand-off is seamless */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, backfaceVisibility: 'hidden' }, cover]}>
            <BookFace title={title} icon={icon} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  shelf: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  book: { width: '47%', flexGrow: 1, maxWidth: '48%', aspectRatio: 0.72, borderRadius: R.md, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, overflow: 'hidden', ...shadow },
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
