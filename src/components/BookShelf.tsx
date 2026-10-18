// A scrolling stack of cookbooks, shared by the "Not sure?" tab and the Saved / Cooked books.
//   - Snaps so one book is always centered. Books simply get smaller and shorter the farther they
//     are from the center, and larger and squarer near it. No 3D wheel, no overlapping.
//   - The first book starts centered under a big header that compresses upward as you scroll.
//   - Tap an off-center book to bring it to the center; tap the centered one to open it: it flies to
//     the middle and its cover swings open to a page (renderPage).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, F, R, shadow } from '@/lib/theme';
import { Muted, type IconName } from './ui';

export type ShelfItem = {
  key: string;
  title: string;
  blurb: string;
  tags: { icon?: IconName; text: string }[];
  extra: string; // shown when the book is centered
};

// Covers cycle through the palette; small offsets make it look like a real, slightly messy stack.
export const COVERS = [C.primary, C.accent, '#8A8463', C.good, '#9C6B45', '#5E6B47'];
const TILT = [-1.6, 1.2, -0.6, 1.8, -1.2, 0.8, -1.8, 1.4];
const SHIFT = [-6, 8, -2, 10, -8, 4, -4, 6];

// Geometry: slots are tall enough that the big centered book never touches its neighbors.
const SLOT = 176;
const SMALL = 100;
const BIG = 240;

type Rect = { x: number; y: number; w: number; h: number };

export function BookShelf({
  title,
  subtitle,
  top,
  control,
  items,
  loadingText = 'Pulling cookbooks off the shelf…',
  error,
  empty,
  footer,
  resetKey,
  coverSub = 'A Frankly cookbook',
  renderPage,
}: {
  title: string;
  subtitle?: string;
  top?: ReactNode; // above the title, e.g. a Back link
  control?: ReactNode; // under the title, e.g. the cuisine dropdown (always visible)
  items: ShelfItem[] | null;
  loadingText?: string;
  error?: ReactNode;
  empty?: ReactNode;
  footer?: ReactNode;
  resetKey?: unknown; // scroll back to the first book when this changes
  coverSub?: string;
  renderPage: (item: ShelfItem, close: (then?: () => void) => void) => ReactNode;
}) {
  const [viewH, setViewH] = useState(640);
  const [centered, setCentered] = useState(0);
  const [open, setOpen] = useState<{ item: ShelfItem; color: string; from: Rect } | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [resetKey]);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => setCentered(Math.max(0, Math.round(value / SLOT))));
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const headerMin = (top ? 30 : 0) + (control ? 124 : 70);
  const centerY = viewH * 0.58;
  const headerMax = Math.max(headerMin + 40, centerY - BIG / 2 - 14);
  const padTop = centerY - SLOT / 2;
  const padBottom = Math.max(viewH - centerY - SLOT / 2, 80);

  const collapse = scrollY.interpolate({ inputRange: [0, SLOT], outputRange: [0, 1], extrapolate: 'clamp' });
  const headerH = collapse.interpolate({ inputRange: [0, 1], outputRange: [headerMax, headerMin] });
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
          {error}
          {!items && !error && (
            <View style={{ alignItems: 'center', gap: 8, height: SLOT, justifyContent: 'center' }}>
              <ActivityIndicator color={C.primary} />
              <Muted>{loadingText}</Muted>
            </View>
          )}
          {items?.length === 0 && empty}
          {items?.map((item, i) => (
            <Book
              key={item.key}
              item={item}
              index={i}
              scrollY={scrollY}
              hidden={open?.item.key === item.key}
              onTap={(from) => {
                if (i !== centered) scrollRef.current?.scrollTo({ y: i * SLOT, animated: true });
                else setOpen({ item, color: COVERS[i % COVERS.length], from });
              }}
            />
          ))}
          {items && items.length > 0 && footer}
        </Animated.ScrollView>

        {/* Header: big at first, compresses upward as you scroll, comes back at the first book */}
        <Animated.View style={[st.header, { height: headerH }]}>
          {top}
          {/* Space goes ABOVE the title, so the heading sits just over the first book (no awkward gap). */}
          <View style={{ flex: 1 }} />
          <Animated.Text style={[st.title, { fontSize: titleSize, lineHeight: titleLine }]}>{title}</Animated.Text>
          {subtitle ? (
            <Animated.Text style={[st.sub, { opacity: subOpacity, maxHeight: subHeight }]} numberOfLines={2}>
              {subtitle}
            </Animated.Text>
          ) : null}
          {control}
        </Animated.View>
      </View>

      {open && <OpenBook {...open} coverSub={coverSub} renderPage={renderPage} onClosed={() => setOpen(null)} />}
    </SafeAreaView>
  );
}

/** One book: a short tilted spine off-center, a taller upright card in the center. */
function Book({
  item,
  index,
  scrollY,
  hidden,
  onTap,
}: {
  item: ShelfItem;
  index: number;
  scrollY: Animated.Value;
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
  const scale = scrollY.interpolate({ inputRange: far, outputRange: [0.72, 0.86, 1, 0.86, 0.72], extrapolate: 'clamp' });
  const opacity = scrollY.interpolate({ inputRange: far, outputRange: [0.45, 0.8, 1, 0.8, 0.45], extrapolate: 'clamp' });
  const marginLeft = scrollY.interpolate({ inputRange: near, outputRange: [16 + shift, 26, 16 + shift], extrapolate: 'clamp' });
  const marginRight = scrollY.interpolate({ inputRange: near, outputRange: [16 - shift, 26, 16 - shift], extrapolate: 'clamp' });
  const rotate = scrollY.interpolate({ inputRange: near, outputRange: [`${tilt}deg`, '0deg', `${tilt}deg`], extrapolate: 'clamp' });
  const extra = scrollY.interpolate({ inputRange: [c - SLOT * 0.5, c, c + SLOT * 0.5], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const lift = press.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  const tap = () => ref.current?.measureInWindow((x, y, w, h) => onTap({ x, y, w, h }));

  return (
    <View style={st.slot}>
      <Pressable
        onPressIn={() => Animated.spring(press, { toValue: 1, useNativeDriver: false, speed: 30, bounciness: 12 }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, useNativeDriver: false, speed: 30, bounciness: 12 }).start()}
        onPress={tap}>
        <Animated.View
          ref={ref}
          style={[
            st.book,
            {
              height,
              marginLeft,
              marginRight,
              backgroundColor: color,
              opacity: hidden ? 0 : opacity,
              transform: [{ scale }, { translateY: lift }, { rotate }],
            },
          ]}>
          <View style={st.row}>
            <View style={st.band} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={st.bookTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={st.blurb} numberOfLines={1}>
                {item.blurb}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {item.tags.map((t) => (
                  <View key={t.text} style={st.tag}>
                    {t.icon && <Ionicons name={t.icon} size={11} color={C.onPrimary} />}
                    <Text style={st.tagText}>{t.text}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={[st.band, { marginLeft: 0, marginRight: 4 }]} />
          </View>
          <Animated.View style={[st.extra, { opacity: extra }]}>
            <Text style={st.extraText} numberOfLines={3}>
              {item.extra}
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

/** The picked book flies to the center and grows, then its cover swings open to the page. */
function OpenBook({
  item,
  color,
  from,
  coverSub,
  renderPage,
  onClosed,
}: {
  item: ShelfItem;
  color: string;
  from: Rect;
  coverSub: string;
  renderPage: (item: ShelfItem, close: (then?: () => void) => void) => ReactNode;
  onClosed: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const W = Math.min(width - 48, 340);
  const H = Math.min(height * 0.64, 480);
  const fly = useRef(new Animated.Value(0)).current;
  const cover = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fly, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(cover, { toValue: 1, duration: 340, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [fly, cover]);

  // Same animation in reverse, but quicker on the way out. `then` runs after it's closed.
  const close = (then?: () => void) =>
    Animated.sequence([
      Animated.timing(cover, { toValue: 0, duration: 150, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(fly, { toValue: 0, duration: 130, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
    ]).start(() => {
      onClosed();
      then?.();
    });

  const box = {
    left: fly.interpolate({ inputRange: [0, 1], outputRange: [from.x, (width - W) / 2] }),
    top: fly.interpolate({ inputRange: [0, 1], outputRange: [from.y, (height - H) / 2] }),
    width: fly.interpolate({ inputRange: [0, 1], outputRange: [from.w, W] }),
    height: fly.interpolate({ inputRange: [0, 1], outputRange: [from.h, H] }),
  };
  const coverStyle = {
    transformOrigin: 'left center',
    transform: [{ perspective: 1400 }, { rotateY: cover.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-168deg'] }) }],
  } as const;

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => close()}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(46,51,37,0.5)', opacity: fly }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute' }, box]}>
        <Animated.View style={[st.page, { opacity: cover.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }) }]}>
          <View style={[st.pageSpine, { backgroundColor: color }]} />
          <View style={{ flex: 1 }}>
            {/* Scrolls when the details are longer than the page. */}
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 22, gap: 12 }} showsVerticalScrollIndicator={false}>
              {renderPage(item, (then?: () => void) => close(then))}
            </ScrollView>
            <Pressable onPress={() => close()} hitSlop={12} style={{ position: 'absolute', right: 16, top: 16, zIndex: 2 }}>
              <Ionicons name="close" size={24} color={C.muted} />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View style={[st.cover, { backgroundColor: color }, coverStyle]}>
          <View style={st.coverSpine} />
          <Text style={st.coverTitle} numberOfLines={3}>
            {item.title}
          </Text>
          <Text style={st.coverSub}>{coverSub}</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export const shelfStyles = StyleSheet.create({
  why: { flexDirection: 'row', gap: 8, backgroundColor: C.cardAlt, borderRadius: R.md, padding: 12 },
});

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
  list: { maxWidth: 640, width: '100%', alignSelf: 'center' },

  slot: { height: SLOT, justifyContent: 'center' },
  book: { borderRadius: 10, overflow: 'hidden', ...shadow, shadowOpacity: 0.16 },
  row: { height: SMALL, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 },
  band: { width: 4, alignSelf: 'stretch', marginVertical: 14, marginLeft: 4, borderRadius: 2, backgroundColor: 'rgba(238,232,220,0.35)' },
  pages: { position: 'absolute', right: 0, top: 6, bottom: 6, width: 6, backgroundColor: 'rgba(238,232,220,0.55)', borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  bookTitle: { fontFamily: F.display, fontSize: 20, color: C.onPrimary },
  blurb: { fontFamily: F.body, fontSize: 12.5, color: 'rgba(238,232,220,0.8)' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(238,232,220,0.18)' },
  tagText: { fontFamily: F.medium, fontSize: 11, color: C.onPrimary },
  extra: { paddingHorizontal: 34, paddingBottom: 18, gap: 12, flex: 1, justifyContent: 'space-between' },
  extraText: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.onPrimary },
  openHint: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(238,232,220,0.2)' },
  openHintText: { fontFamily: F.bold, fontSize: 12, color: C.onPrimary },

  page: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, overflow: 'hidden', ...shadow, shadowOpacity: 0.2 },
  pageSpine: { width: 10 },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, padding: 24, paddingLeft: 34, justifyContent: 'flex-end', gap: 6, backfaceVisibility: 'hidden', ...shadow, shadowOpacity: 0.25 },
  coverSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 16, backgroundColor: 'rgba(0,0,0,0.16)' },
  coverTitle: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.onPrimary },
  coverSub: { fontFamily: F.medium, fontSize: 12, letterSpacing: 1.2, color: 'rgba(238,232,220,0.75)' },
});
