// "Don't know what to make today?" Ideas from the What-should-I-make agent, shown as a stack of cookbooks.
//   - The list snaps so one book is always centered. The centered book straightens and grows into a
//     squarer card that shows more; the others stay short, tilted spines that turn away like a wheel.
//   - The first book starts centered. The header starts big above it and compresses upward as you
//     scroll (back to big at the first book). The cuisine dropdown is always visible.
//   - Tap an off-center book to bring it to the center; tap the centered book to open it: it flies
//     to the middle and its cover swings open to the details.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Card, H1, Muted, Pill, Sheet } from '@/components/ui';
import { suggestDishes } from '@/lib/api';
import { CUISINES } from '@/lib/options';
import { useSession } from '@/lib/session';
import { C, F, R, shadow } from '@/lib/theme';
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

// Book covers cycle through the palette; small offsets make it look like a real, slightly messy stack.
const COVERS = [C.primary, C.accent, '#8A8463', C.good, '#9C6B45', '#5E6B47'];
const TILT = [-1.6, 1.2, -0.6, 1.8, -1.2, 0.8, -1.8, 1.4];
const SHIFT = [-6, 8, -2, 10, -8, 4, -4, 6];

// Wheel geometry: every book gets a fixed slot, and the scroll snaps to slots.
const SLOT = 118;
const SMALL = 92;
const BIG = 236;
const HEADER_MIN = 124;

type Rect = { x: number; y: number; w: number; h: number };

export default function Discover() {
  const { profile } = useSession();
  const [cuisine, setCuisine] = useState<string>(() => launchCuisine ?? profile?.cuisines[0] ?? 'Any');
  const [picker, setPicker] = useState(false);
  const [dishes, setDishes] = useState<Suggestion[] | null>(cache.get(cuisine) ?? null);
  const [open, setOpen] = useState<{ dish: Suggestion; color: string; tilt: number; from: Rect } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewH, setViewH] = useState(640);
  const [centered, setCentered] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

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
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [cuisine, load]);

  // Track which book is centered (it draws on top of its neighbors).
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => setCentered(Math.max(0, Math.round(value / SLOT))));
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const mine = profile?.cuisines ?? [];
  const options = ['Any', ...mine, ...CUISINES.filter((c) => !mine.includes(c))];

  // The wheel's center line sits a bit below the middle so the big header fits above the first book.
  const centerY = viewH * 0.57;
  const headerMax = Math.max(HEADER_MIN + 40, centerY - BIG / 2 - 14);
  const padTop = centerY - SLOT / 2;
  const padBottom = Math.max(viewH - centerY - SLOT / 2, 80);

  // Header starts big (first book centered), then compresses upward as you scroll.
  const collapse = scrollY.interpolate({ inputRange: [0, SLOT], outputRange: [0, 1], extrapolate: 'clamp' });
  const headerH = collapse.interpolate({ inputRange: [0, 1], outputRange: [headerMax, HEADER_MIN] });
  const titleSize = collapse.interpolate({ inputRange: [0, 1], outputRange: [40, 28] });
  const titleLine = collapse.interpolate({ inputRange: [0, 1], outputRange: [44, 34] });
  const subOpacity = collapse.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' });
  const subHeight = collapse.interpolate({ inputRange: [0, 0.8], outputRange: [42, 0], extrapolate: 'clamp' });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ flex: 1 }} onLayout={(e) => setViewH(e.nativeEvent.layout.height)}>
        <Animated.ScrollView
          ref={scrollRef}
          style={StyleSheet.absoluteFill}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          snapToInterval={SLOT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[st.list, { paddingTop: padTop, paddingBottom: padBottom }]}>
          {error && (
            <Card>
              <Muted style={{ color: C.bad }}>{error}</Muted>
              <Button title="Try again" kind="secondary" onPress={() => load(cuisine, true)} />
            </Card>
          )}
          {!dishes && !error && (
            <View style={{ alignItems: 'center', gap: 8, height: SLOT, justifyContent: 'center' }}>
              <ActivityIndicator color={C.primary} />
              <Muted>Pulling cookbooks off the shelf…</Muted>
            </View>
          )}
          {dishes?.map((d, i) => (
            <Book
              key={d.name}
              dish={d}
              index={i}
              scrollY={scrollY}
              front={i === centered}
              hidden={open?.dish.name === d.name}
              onTap={(from) => {
                if (i !== centered) scrollRef.current?.scrollTo({ y: i * SLOT, animated: true });
                else setOpen({ dish: d, color: COVERS[i % COVERS.length], tilt: 0, from });
              }}
            />
          ))}
          {dishes && (
            <Button title="Show me different ideas" kind="ghost" icon="refresh" onPress={() => load(cuisine, true)} style={{ marginTop: 18 }} />
          )}
        </Animated.ScrollView>

        {/* Header: big at first, compresses upward as you scroll, comes back at the first book */}
        <Animated.View style={[st.header, { height: headerH }]}>
          <Animated.Text style={[st.title, { fontSize: titleSize, lineHeight: titleLine }]}>Not sure what to make?</Animated.Text>
          <Animated.Text style={[st.sub, { opacity: subOpacity, maxHeight: subHeight }]} numberOfLines={2}>
            Ideas from your tastes, your ratings, and what you haven&apos;t cooked in a while.
          </Animated.Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setPicker(true)} style={st.dropdown}>
            <Ionicons name="globe-outline" size={18} color={C.muted} />
            <Text style={st.dropdownText}>{cuisine === 'Any' ? 'Any cuisine' : cuisine}</Text>
            <Ionicons name="chevron-down" size={18} color={C.ink} />
          </Pressable>
        </Animated.View>
      </View>

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

      {open && (
        <OpenBook
          {...open}
          onClose={() => setOpen(null)}
          onCook={(dish) => {
            setOpen(null);
            router.navigate({ pathname: '/', params: { dish, t: String(Date.now()) } });
          }}
        />
      )}
    </SafeAreaView>
  );
}

/**
 * One cookbook in the stack. Off-center it's a short tilted spine; as it reaches the center it
 * straightens, stands upright and grows into a squarer card that shows more.
 */
function Book({
  dish,
  index,
  scrollY,
  front,
  hidden,
  onTap,
}: {
  dish: Suggestion;
  index: number;
  scrollY: Animated.Value;
  front: boolean;
  hidden: boolean;
  onTap: (from: Rect) => void;
}) {
  const ref = useRef<View>(null);
  const press = useRef(new Animated.Value(0)).current;
  const color = COVERS[index % COVERS.length];
  const tilt = TILT[index % TILT.length];
  const shift = SHIFT[index % SHIFT.length];

  const c = index * SLOT; // scroll offset where this book is centered
  const near = [c - SLOT, c, c + SLOT];
  const far = [c - 2 * SLOT, c - SLOT, c, c + SLOT, c + 2 * SLOT];
  const height = scrollY.interpolate({ inputRange: near, outputRange: [SMALL, BIG, SMALL], extrapolate: 'clamp' });
  const marginLeft = scrollY.interpolate({ inputRange: near, outputRange: [12 + shift, 30, 12 + shift], extrapolate: 'clamp' });
  const marginRight = scrollY.interpolate({ inputRange: near, outputRange: [12 - shift, 30, 12 - shift], extrapolate: 'clamp' });
  const rotateX = scrollY.interpolate({ inputRange: far, outputRange: ['-40deg', '-20deg', '0deg', '20deg', '40deg'], extrapolate: 'clamp' });
  const rotate = scrollY.interpolate({ inputRange: near, outputRange: [`${tilt}deg`, '0deg', `${tilt}deg`], extrapolate: 'clamp' });
  const scale = scrollY.interpolate({ inputRange: far, outputRange: [0.86, 0.94, 1, 0.94, 0.86], extrapolate: 'clamp' });
  const opacity = scrollY.interpolate({ inputRange: far, outputRange: [0.5, 0.8, 1, 0.8, 0.5], extrapolate: 'clamp' });
  const extra = scrollY.interpolate({ inputRange: [c - SLOT * 0.6, c, c + SLOT * 0.6], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const lift = press.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  const tap = () => ref.current?.measureInWindow((x, y, w, h) => onTap({ x, y, w, h }));

  return (
    <View style={[st.slot, { zIndex: front ? 10 : 1 }]}>
      <Pressable
        onPressIn={() => Animated.spring(press, { toValue: 1, useNativeDriver: false, speed: 30, bounciness: 12 }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, useNativeDriver: false, speed: 30, bounciness: 12 }).start()}
        onPress={tap}>
        <Animated.View
          ref={ref}
          style={[
            st.spine,
            {
              height,
              marginLeft,
              marginRight,
              backgroundColor: color,
              opacity: hidden ? 0 : opacity,
              transform: [{ perspective: 900 }, { rotateX }, { scale }, { translateY: lift }, { rotate }],
            },
          ]}>
          <View style={st.spineRow}>
            <View style={st.band} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={st.spineTitle} numberOfLines={1}>
                {dish.name}
              </Text>
              <Text style={st.spineBlurb} numberOfLines={1}>
                {dish.description}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={st.spineTag}>
                  <Text style={st.spineTagText}>{TAGS[dish.tag]}</Text>
                </View>
                <View style={st.spineTag}>
                  <Ionicons name="time-outline" size={11} color={C.onPrimary} />
                  <Text style={st.spineTagText}>{dish.total_minutes} min</Text>
                </View>
              </View>
            </View>
            <View style={[st.band, { marginLeft: 0, marginRight: 4 }]} />
          </View>
          {/* more detail, revealed as the book reaches the center */}
          <Animated.View style={[st.extra, { opacity: extra }]}>
            <Text style={st.extraWhy} numberOfLines={3}>
              {dish.why}
            </Text>
            <View style={st.openHint}>
              <Ionicons name="book-outline" size={14} color={C.onPrimary} />
              <Text style={st.openHintText}>Tap to open</Text>
            </View>
          </Animated.View>
          <View style={st.pages} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** The picked book flies to the center and grows, then its cover swings open to the details page. */
function OpenBook({
  dish,
  color,
  tilt,
  from,
  onClose,
  onCook,
}: {
  dish: Suggestion;
  color: string;
  tilt: number;
  from: Rect;
  onClose: () => void;
  onCook: (dish: string) => void;
}) {
  const { width, height } = useWindowDimensions();
  const W = Math.min(width - 48, 340);
  const H = Math.min(height * 0.62, 460);
  const fly = useRef(new Animated.Value(0)).current;
  const cover = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fly, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(cover, { toValue: 1, duration: 560, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [fly, cover]);

  // Same animation in reverse, but quicker on the way out.
  const close = () =>
    Animated.sequence([
      Animated.timing(cover, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(fly, { toValue: 0, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
    ]).start(onClose);

  const box = {
    left: fly.interpolate({ inputRange: [0, 1], outputRange: [from.x, (width - W) / 2] }),
    top: fly.interpolate({ inputRange: [0, 1], outputRange: [from.y, (height - H) / 2] }),
    width: fly.interpolate({ inputRange: [0, 1], outputRange: [from.w, W] }),
    height: fly.interpolate({ inputRange: [0, 1], outputRange: [from.h, H] }),
    transform: [{ rotate: fly.interpolate({ inputRange: [0, 1], outputRange: [`${tilt}deg`, '0deg'] }) }],
  };
  const coverStyle = {
    transformOrigin: 'left center',
    transform: [{ perspective: 1400 }, { rotateY: cover.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-168deg'] }) }],
  } as const;

  return (
    <Modal transparent visible animationType="none" onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(46,51,37,0.5)', opacity: fly }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute' }, box]}>
        {/* the page under the cover */}
        <Animated.View style={[st.page, { opacity: cover.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }) }]}>
          <View style={[st.pageSpine, { backgroundColor: color }]} />
          <View style={{ flex: 1, padding: 22, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <H1 style={{ fontSize: 26, lineHeight: 31, flex: 1 }}>{dish.name}</H1>
              <Pressable onPress={close} hitSlop={12}>
                <Ionicons name="close" size={24} color={C.muted} />
              </Pressable>
            </View>
            <Body>{dish.description}</Body>
            <View style={st.why}>
              <Ionicons name="sparkles" size={18} color={C.accent} />
              <Body style={{ flex: 1, fontSize: 14 }}>{dish.why}</Body>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Pill icon="time-outline" text={`${dish.total_minutes} min`} />
              <Pill icon="bar-chart-outline" text={`Difficulty ${dish.difficulty}/10`} />
              <Pill text={TAGS[dish.tag]} />
            </View>
            <View style={{ flex: 1 }} />
            <Button title="Cook this: show me the recipe" icon="flame" onPress={() => onCook(dish.name)} />
          </View>
        </Animated.View>

        {/* the cover, hinged on the left */}
        <Animated.View style={[st.cover, { backgroundColor: color }, coverStyle]}>
          <View style={st.coverSpine} />
          <Text style={st.coverTitle} numberOfLines={3}>
            {dish.name}
          </Text>
          <Text style={st.coverSub}>A Frankly cookbook</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: C.bg,
    zIndex: 20,
    overflow: 'hidden',
  },
  title: { fontFamily: F.display, color: C.ink },
  sub: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.muted },
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
  list: { paddingHorizontal: 0, maxWidth: 640, width: '100%', alignSelf: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: R.md, backgroundColor: C.cardAlt },
  optionText: { fontFamily: F.medium, fontSize: 15, color: C.ink },

  // Fixed-height slot; the book inside can grow past it (centered) to overlap its neighbors.
  slot: { height: SLOT, justifyContent: 'center' },
  spine: {
    borderRadius: 10,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.16,
  },
  spineRow: { height: SMALL, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 },
  band: { width: 4, alignSelf: 'stretch', marginVertical: 12, marginLeft: 4, borderRadius: 2, backgroundColor: 'rgba(238,232,220,0.35)' },
  pages: { position: 'absolute', right: 0, top: 6, bottom: 6, width: 6, backgroundColor: 'rgba(238,232,220,0.55)', borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  spineTitle: { fontFamily: F.display, fontSize: 20, color: C.onPrimary },
  spineBlurb: { fontFamily: F.body, fontSize: 12.5, color: 'rgba(238,232,220,0.8)' },
  spineTag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(238,232,220,0.18)' },
  spineTagText: { fontFamily: F.medium, fontSize: 11, color: C.onPrimary },
  extra: { paddingHorizontal: 34, paddingBottom: 18, gap: 12, flex: 1, justifyContent: 'space-between' },
  extraWhy: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.onPrimary },
  openHint: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(238,232,220,0.2)' },
  openHintText: { fontFamily: F.bold, fontSize: 12, color: C.onPrimary },

  page: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, overflow: 'hidden', ...shadow, shadowOpacity: 0.2 },
  pageSpine: { width: 10 },
  why: { flexDirection: 'row', gap: 8, backgroundColor: C.cardAlt, borderRadius: R.md, padding: 12 },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, padding: 24, paddingLeft: 34, justifyContent: 'flex-end', gap: 6, backfaceVisibility: 'hidden', ...shadow, shadowOpacity: 0.25 },
  coverSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 16, backgroundColor: 'rgba(0,0,0,0.16)' },
  coverTitle: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.onPrimary },
  coverSub: { fontFamily: F.medium, fontSize: 12, letterSpacing: 1.2, color: 'rgba(238,232,220,0.75)' },
});
