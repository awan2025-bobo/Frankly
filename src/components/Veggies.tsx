// Home's kitchen stage: flat clipart vegetables (DubHacks kitchen style) and a cooking pot.
//   idle    -> vegetables bob and drift around the edges
//   docked  -> a pot glides up from the bottom and the vegetables fly into it
//   away    -> the pot drops out of the overlay (the preview slide shows <InlinePot/> at the end of its content)
//   cooking -> the pot moves to the center and cycles: sizzle (jitter, bubbles, steam) -> lid opens and
//              ingredients drop in -> smoke, with a progress bar under "Cooking it up…"
//   done    -> a quick "pop" with a little burst, then onDone() so Home can show the recipe
// Purely decorative: it never blocks touches.
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type DimensionValue, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { C, F } from '@/lib/theme';

// ---------- Art ----------

const Tomato = () => (
  <Svg viewBox="0 0 64 64">
    <Circle cx={33} cy={34} r={27} fill="#B9472E" />
    <Circle cx={31} cy={32} r={27} fill="#DE6644" />
    <Circle cx={31} cy={32} r={21} fill="#EE8E68" />
    {[0, 72, 144, 216, 288].map((a) => (
      <Ellipse key={a} cx={31} cy={20} rx={5.5} ry={8} fill="#F5B996" transform={`rotate(${a} 31 32)`} />
    ))}
    <Circle cx={31} cy={32} r={4} fill="#F7C9A8" />
  </Svg>
);

const Mushroom = () => (
  <Svg viewBox="0 0 64 64">
    <Path d="M8 32C8 16 19 8 33 8s26 8 26 24c0 3-2 4-5 4H13c-3 0-5-1-5-4z" fill="#B88E52" />
    <Path d="M6 30C6 15 17 6 31 6s25 9 25 24c0 3-2 4-5 4H11c-3 0-5-1-5-4z" fill="#F0DCA6" />
    <Path d="M23 34h16v16c0 5-3 8-8 8s-8-3-8-8z" fill="#E6CF9C" />
    <Circle cx={22} cy={19} r={4} fill="#C9A15E" />
    <Circle cx={39} cy={15} r={3} fill="#C9A15E" />
    <Circle cx={44} cy={25} r={2.5} fill="#C9A15E" />
  </Svg>
);

const Onion = () => (
  <Svg viewBox="0 0 64 64">
    <Ellipse cx={33} cy={34} rx={27} ry={25} fill="#8E2E57" />
    <Ellipse cx={31} cy={32} rx={27} ry={25} fill="#C9578A" />
    <Ellipse cx={31} cy={32} rx={23} ry={21} fill="#F3CFDF" />
    {[17, 12, 7].map((r) => (
      <Ellipse key={r} cx={31} cy={32} rx={r} ry={r * 0.92} fill="none" stroke="#C9578A" strokeWidth={2} />
    ))}
  </Svg>
);

const Pepper = () => (
  <Svg viewBox="0 0 64 64">
    <Path
      fillRule="evenodd"
      d="M32 6c7 0 10 4 15 4 6 0 11 6 10 13-1 5 3 8 2 15-1 9-8 14-14 15-5 1-8 5-13 5S24 54 19 53c-7-1-13-7-13-16 0-6 3-8 2-14C7 15 13 10 19 10c5 0 7-4 13-4zm0 9c-4 0-6 3-10 3-4 0-7 3-7 8 0 4-2 6-1 10 1 6 5 9 9 9 4 0 6 4 9 4s5-4 9-4 8-3 9-9c0-4-2-6-1-10 0-5-3-8-7-8-4 0-6-3-10-3z"
      fill="#6E9A3C"
    />
  </Svg>
);

// Leaves are drawn first and tucked under the top of the carrot so they stay attached.
const Carrot = () => (
  <Svg viewBox="0 0 64 64">
    <Path d="M44 17c-1-7 2-12 7-14 0 5 2 8 7 9-3 4-8 6-14 5z" fill="#6E9A3C" />
    <Path d="M44 17c-6-3-8-8-6-13 4 2 7 5 8 9z" fill="#83AE4A" />
    <Path d="M37 13c7-3 15 4 13 11L20 55c-3 4-10-1-7-6z" fill="#E07A35" />
    <Path d="M38 24l-5-3M31 33l-5-3M24 43l-4-2" stroke="#B85E26" strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

const Basil = () => (
  <Svg viewBox="0 0 64 64">
    <Path d="M10 54C8 30 24 12 54 10 56 38 38 56 10 54z" fill="#5E7F38" />
    <Path d="M14 50C24 38 36 26 50 14" stroke="#9DBB6A" strokeWidth={2.5} strokeLinecap="round" fill="none" />
  </Svg>
);

const Cheese = () => (
  <Svg viewBox="0 0 64 64">
    <Path d="M6 44l50-22v24z" fill="#D9A23A" />
    <Path d="M6 40l50-22v24H6z" fill="#F2C55C" />
    <Circle cx={36} cy={32} r={3.5} fill="#D9A23A" />
    <Circle cx={47} cy={36} r={2.5} fill="#D9A23A" />
    <Rect x={20} y={36} width={4} height={4} rx={2} fill="#D9A23A" />
  </Svg>
);

/** A cooking pot in the same flat style, with orange soup showing at the top. */
const Pot = () => (
  <Svg viewBox="0 0 120 100">
    <Path d="M18 34h92v38c0 12-9 20-22 20H40c-13 0-22-8-22-20z" fill="#9F987F" />
    <Path d="M14 30h92v38c0 12-9 20-22 20H36c-13 0-22-8-22-20z" fill="#CBC5B0" />
    <Rect x={24} y={42} width={7} height={30} rx={3.5} fill="#E4DFCF" opacity={0.8} />
    <Rect x={1} y={38} width={16} height={9} rx={4.5} fill="#9F987F" />
    <Rect x={103} y={38} width={16} height={9} rx={4.5} fill="#9F987F" />
    <Rect x={9} y={24} width={102} height={11} rx={5.5} fill="#DDD8C5" />
    <Ellipse cx={60} cy={28} rx={44} ry={6.5} fill="#4A4538" />
    <Ellipse cx={60} cy={29} rx={40} ry={5} fill="#E58A4F" />
    <Circle cx={46} cy={28.5} r={2.2} fill="#F2B07F" />
    <Circle cx={70} cy={29.5} r={1.6} fill="#F2B07F" />
  </Svg>
);

// ---------- Layout ----------

type Spot = { V: () => ReactElement; size: number; top: DimensionValue; left?: DimensionValue; right?: DimensionValue; tilt: number; dur: number };

// Kept to the edges so the question and the line stay clear.
const SPOTS: Spot[] = [
  { V: Tomato, size: 58, top: '9%', right: '8%', tilt: 14, dur: 2600 },
  { V: Mushroom, size: 50, top: '20%', left: '6%', tilt: -10, dur: 3100 },
  { V: Basil, size: 38, top: '14%', left: '42%', tilt: 20, dur: 2800 },
  { V: Onion, size: 62, top: '66%', left: '-4%', tilt: -16, dur: 3300 },
  { V: Pepper, size: 54, top: '74%', right: '6%', tilt: 12, dur: 2900 },
  { V: Carrot, size: 46, top: '82%', left: '24%', tilt: -8, dur: 3200 },
  { V: Cheese, size: 42, top: '88%', right: '14%', tilt: 10, dur: 3500 },
];

const POT = 150; // pot width in px
const native = true;

export type StageMode = 'idle' | 'docked' | 'away' | 'cooking' | 'done';

function Floater({ spot, index, target, gathered }: { spot: Spot; index: number; target: { x: number; y: number } | null; gathered: boolean }) {
  const bob = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const g = useRef(new Animated.Value(0)).current;
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);

  // Bob up and down, and drift side to side on a different rhythm so it never looks mechanical.
  useEffect(() => {
    const wave = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
          Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        ]),
      );
    const a = wave(bob, spot.dur);
    const b = wave(drift, spot.dur * 1.37);
    const start = setTimeout(() => {
      a.start();
      b.start();
    }, index * 160);
    return () => {
      clearTimeout(start);
      a.stop();
      b.stop();
    };
  }, [bob, drift, spot.dur, index]);

  // Fly into the pot (staggered), or back out to the original spot.
  useEffect(() => {
    Animated.timing(g, {
      toValue: gathered ? 1 : 0,
      duration: gathered ? 620 : 520,
      delay: gathered ? 180 + index * 70 : index * 50,
      easing: gathered ? Easing.in(Easing.back(1.4)) : Easing.out(Easing.back(1.2)),
      useNativeDriver: native,
    }).start();
  }, [gathered, g, index]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setCenter({ x: x + width / 2, y: y + height / 2 });
  };

  const dx = center && target ? target.x - center.x : 0;
  const dy = center && target ? target.y - center.y : 0;
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [10, -18] });
  const driftX = drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  const translateX = Animated.add(driftX, g.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }));
  const translateY = Animated.add(bobY, g.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }));
  const rotate = Animated.add(
    bob.interpolate({ inputRange: [0, 1], outputRange: [spot.tilt - 8, spot.tilt + 10] }),
    g.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }),
  ).interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const scale = g.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  const opacity = g.interpolate({ inputRange: [0, 0.85, 1], outputRange: [0.92, 0.92, 0] });
  const { V } = spot;
  return (
    <Animated.View
      onLayout={onLayout}
      style={{
        position: 'absolute',
        top: spot.top,
        left: spot.left,
        right: spot.right,
        width: spot.size,
        height: spot.size,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      }}>
      <V />
    </Animated.View>
  );
}

/** One bubble that rises out of the pot, pops, and repeats. */
function Bubble({ x, delay, size, run }: { x: number; delay: number; size: number; run: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [run, delay, t]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: POT * 0.2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: '#F2B07F',
        backgroundColor: 'rgba(229,138,79,0.35)',
        opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 0.9, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -46] }) },
          { scale: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.5, 1, 1.4] }) },
        ],
      }}
    />
  );
}

/** A wisp of steam drifting up. */
function Steam({ x, delay, run }: { x: number; delay: number; run: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [run, delay, t]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - 10,
        top: -18,
        width: 20,
        height: 40,
        opacity: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.55, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 6, -4] }) },
        ],
      }}>
      <Svg viewBox="0 0 20 40">
        <Path d="M10 38c-7-6 7-12 0-18S10 8 10 2" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

/** Finish burst: little bits fly out of the pot. */
function Burst({ fire }: { fire: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!fire) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [fire, t]);
  const colors = ['#DE6644', '#6E9A3C', '#F2C55C', '#C9578A', '#E07A35', '#F0DCA6', '#83AE4A', '#E58A4F'];
  return (
    <>
      {colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: POT / 2 - 6,
              top: POT * 0.18,
              width: 12,
              height: 12,
              borderRadius: i % 2 ? 6 : 3,
              backgroundColor: c,
              opacity: t.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * 90] }) },
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * 70 - 20] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${180 + i * 30}deg`] }) },
              ],
            }}
          />
        );
      })}
    </>
  );
}

/** The pot sitting at the end of a scrolling page (the preview slide). It zooms down into place and bobs a little. */
export function InlinePot() {
  const enter = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, useNativeDriver: native, speed: 8, bounciness: 9 }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, bob]);
  return (
    <Animated.View
      style={{
        alignSelf: 'center',
        width: POT,
        height: POT * 0.84,
        marginTop: 12,
        opacity: enter,
        transform: [
          { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [-160, 0] }), bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })) },
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [1.3, 1] }) },
        ],
      }}>
      <Pot />
    </Animated.View>
  );
}

/** The pot's lid, used in the "lid opens, ingredients go in" phase. */
const LidArt = () => (
  <Svg viewBox="0 0 120 30">
    <Path d="M10 26 C 14 10, 106 10, 110 26 Z" fill="#9F987F" />
    <Path d="M8 24 C 12 8, 104 8, 108 24 Z" fill="#DDD8C5" />
    <Rect x={50} y={2} width={20} height={9} rx={4.5} fill="#4A4538" />
  </Svg>
);

/** Phase 2: the lid lands, swings open, a few ingredients drop in, and it closes again. */
function LidAndDrops({ run }: { run: number }) {
  const lid = useRef(new Animated.Value(0)).current; // 0 hidden above, 1 on the pot
  const tilt = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const drops = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    if (!run) return;
    lid.setValue(0);
    tilt.setValue(0);
    drops.forEach((d) => d.setValue(0));
    Animated.sequence([
      Animated.timing(lid, { toValue: 1, duration: 280, easing: Easing.out(Easing.back(1.5)), useNativeDriver: native }),
      Animated.timing(tilt, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.stagger(
        170,
        drops.map((d) => Animated.timing(d, { toValue: 1, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: native })),
      ),
      Animated.timing(tilt, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: native }),
      Animated.delay(250),
      Animated.timing(lid, { toValue: 0, duration: 260, useNativeDriver: native }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  const DropArt = [Tomato, Carrot, Mushroom];
  return (
    <>
      {drops.map((d, i) => {
        const V = DropArt[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: POT * (0.3 + i * 0.14),
              top: POT * 0.08,
              width: 30,
              height: 30,
              opacity: d.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateY: d.interpolate({ inputRange: [0, 1], outputRange: [-110, 4] }) },
                { rotate: d.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${120 + i * 60}deg`] }) },
                { scale: d.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) },
              ],
            }}>
            <V />
          </Animated.View>
        );
      })}
      <Animated.View
        style={{
          position: 'absolute',
          left: POT * 0.07,
          top: POT * 0.04,
          width: POT * 0.86,
          height: POT * 0.22,
          opacity: lid.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transformOrigin: 'left bottom',
          transform: [
            { translateY: lid.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
            { translateY: tilt.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
            { rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-38deg'] }) },
          ],
        }}>
        <LidArt />
      </Animated.View>
    </>
  );
}

/** Phase 3: soft smoke puffs billowing out of the pot. */
function Puff({ x, delay, run }: { x: number; delay: number; run: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [run, delay, t]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - 16,
        top: POT * 0.05,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(150,146,130,0.45)',
        opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -70] }) },
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, (delay % 2 ? 1 : -1) * 18] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) },
        ],
      }}
    />
  );
}

// The recipe loader cycles through these every few seconds until the recipe is ready.
const PHASES = ['sizzle', 'lid', 'smoke'] as const;
const PHASE_MS = 3000;
// Typical time to a real recipe (Claude + live Kroger prices). The bar eases toward 92% over this, then finishes on done.
const EXPECTED_MS = 15000;

export function VeggieStage({
  mode,
  caption,
  onDone,
}: {
  mode: StageMode;
  caption?: string;
  onDone?: () => void;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const potY = useRef(new Animated.Value(0)).current; // 0 = hidden below, 1 = docked, 2 = center
  const potScale = useRef(new Animated.Value(1)).current;
  const potOpacity = useRef(new Animated.Value(1)).current;
  const jitter = useRef(new Animated.Value(0)).current;
  const captionOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [burst, setBurst] = useState(0);
  const [phase, setPhase] = useState(0);
  const [lidRun, setLidRun] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const h = size?.h ?? 800;
  const w = size?.w ?? 390;
  const hiddenTop = h + 20;
  const dockTop = h - POT * 0.86 - 10;
  const centerTop = h * 0.3 - POT / 2;
  const cooking = mode === 'cooking';
  const sizzling = cooking && PHASES[phase] !== 'lid';

  // Pot position + scale per mode.
  useEffect(() => {
    const to = mode === 'idle' || mode === 'away' ? 0 : mode === 'docked' ? 1 : 2;
    Animated.spring(potY, { toValue: to, useNativeDriver: native, speed: mode === 'away' ? 14 : 9, bounciness: mode === 'idle' || mode === 'away' ? 0 : 7 }).start();
    Animated.spring(potScale, { toValue: mode === 'cooking' || mode === 'done' ? 1.35 : 1, useNativeDriver: native, speed: 10, bounciness: 6 }).start();
    Animated.timing(captionOpacity, { toValue: mode === 'cooking' || mode === 'done' ? 1 : 0, duration: 300, useNativeDriver: native }).start();
    // Fade out as it drops away, so it never lingers behind the preview slide's inline pot.
    Animated.timing(potOpacity, { toValue: mode === 'away' ? 0 : 1, duration: mode === 'away' ? 260 : 120, useNativeDriver: native }).start();
  }, [mode, potY, potScale, captionOpacity, potOpacity]);

  // Cycle sizzle -> lid opens + ingredients in -> smoke, every few seconds while cooking.
  useEffect(() => {
    if (!cooking) {
      setPhase(0);
      return;
    }
    const t = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), PHASE_MS);
    return () => clearInterval(t);
  }, [cooking]);
  useEffect(() => {
    if (cooking && PHASES[phase] === 'lid') setLidRun((n) => n + 1);
  }, [phase, cooking]);

  // Progress bar: eases toward 92% while cooking, snaps to 100% when done.
  useEffect(() => {
    if (mode === 'cooking') {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 0.92, duration: EXPECTED_MS, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    } else if (mode === 'done') {
      Animated.timing(progress, { toValue: 1, duration: 250, useNativeDriver: false }).start();
    } else {
      progress.stopAnimation();
      progress.setValue(0);
    }
  }, [mode, progress]);

  // Sizzle: tiny fast jitter (sizzle and smoke phases).
  useEffect(() => {
    if (!sizzling) {
      jitter.stopAnimation();
      jitter.setValue(0);
      return;
    }
    const steps = [1, -1, 0.6, -0.8, 0.3, -0.4, 0];
    const loop = Animated.loop(
      Animated.sequence(steps.map((v) => Animated.timing(jitter, { toValue: v, duration: 55, useNativeDriver: native }))),
    );
    loop.start();
    return () => loop.stop();
  }, [sizzling, jitter]);

  // Finish: pop + burst, then hand back to Home.
  useEffect(() => {
    if (mode !== 'done') return;
    setBurst((b) => b + 1);
    Animated.sequence([
      Animated.spring(potScale, { toValue: 1.6, useNativeDriver: native, speed: 40, bounciness: 14 }),
      Animated.spring(potScale, { toValue: 1.35, useNativeDriver: native, speed: 30, bounciness: 8 }),
    ]).start();
    const t = setTimeout(() => doneRef.current?.(), 750);
    return () => clearTimeout(t);
  }, [mode, potScale]);

  const translateY = potY.interpolate({ inputRange: [0, 1, 2], outputRange: [hiddenTop, dockTop, centerTop] });
  const target = { x: w / 2, y: dockTop + POT * 0.22 };
  const showBubbles = cooking && PHASES[phase] === 'sizzle';
  const showSmoke = cooking && PHASES[phase] === 'smoke';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {SPOTS.map((s, i) => (
        <Floater key={i} spot={s} index={i} target={size ? target : null} gathered={mode !== 'idle'} />
      ))}

      <Animated.View
        style={{
          position: 'absolute',
          left: w / 2 - POT / 2,
          top: 0,
          width: POT,
          height: POT * 0.84,
          opacity: potOpacity,
          transform: [
            { translateY },
            { translateX: jitter.interpolate({ inputRange: [-1, 1], outputRange: [-1.6, 1.6] }) },
            { rotate: jitter.interpolate({ inputRange: [-1, 1], outputRange: ['-1.4deg', '1.4deg'] }) },
            { scale: potScale },
          ],
        }}>
        {[0.32, 0.45, 0.58, 0.7].map((fx, i) => (
          <Steam key={`s${i}`} x={POT * fx} delay={i * 420} run={showBubbles} />
        ))}
        {[0.3, 0.42, 0.55, 0.66, 0.38, 0.6].map((fx, i) => (
          <Bubble key={`b${i}`} x={POT * fx} delay={i * 210} size={8 + (i % 3) * 4} run={showBubbles} />
        ))}
        {[0.3, 0.42, 0.52, 0.62, 0.72].map((fx, i) => (
          <Puff key={`p${i}`} x={POT * fx} delay={i * 260} run={showSmoke} />
        ))}
        <Pot />
        <LidAndDrops run={lidRun} />
        <Burst fire={burst} />
      </Animated.View>

      {caption ? (
        <Animated.View style={[st.captionWrap, { top: h * 0.3 + POT * 0.8, opacity: captionOpacity }]}>
          <Text style={st.captionTitle}>Cooking it up…</Text>
          <Text style={st.caption}>{caption}</Text>
          <View style={st.track}>
            <Animated.View style={[st.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  captionWrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center', gap: 8 },
  captionTitle: { fontFamily: F.display, fontSize: 30, color: C.ink, textAlign: 'center' },
  caption: { fontFamily: F.medium, fontSize: 15, color: C.muted, textAlign: 'center' },
  track: { width: 240, height: 10, borderRadius: 5, backgroundColor: C.cardAlt, overflow: 'hidden', marginTop: 10 },
  fill: { height: 10, borderRadius: 5, backgroundColor: C.primary },
});
