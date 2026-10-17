// Flat, low-detail clipart vegetables (DubHacks kitchen style) that bob gently around Home.
// Purely decorative: they never block touches.
import { useEffect, useRef, type ReactElement } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

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

const Carrot = () => (
  <Svg viewBox="0 0 64 64">
    <Path d="M40 12c-3-5-1-9 2-10 1 4 4 6 9 5-2 4-5 6-9 6" fill="#6E9A3C" />
    <Path d="M42 14c5-1 8 3 7 8L18 58c-3 3-8-1-6-5z" fill="#E07A35" />
    <Path d="M30 30l5 3M24 39l5 3M19 48l4 2" stroke="#B85E26" strokeWidth={2.2} strokeLinecap="round" />
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

type Spot = { V: () => ReactElement; size: number; top: DimensionValue; left?: DimensionValue; right?: DimensionValue; tilt: number; dur: number };

// Kept to the edges so the question and the line stay clear.
const SPOTS: Spot[] = [
  { V: Tomato, size: 58, top: '9%', right: '8%', tilt: 14, dur: 3400 },
  { V: Mushroom, size: 50, top: '20%', left: '6%', tilt: -10, dur: 4100 },
  { V: Basil, size: 38, top: '14%', left: '42%', tilt: 20, dur: 3800 },
  { V: Onion, size: 62, top: '66%', left: '-4%', tilt: -16, dur: 4600 },
  { V: Pepper, size: 54, top: '74%', right: '6%', tilt: 12, dur: 3900 },
  { V: Carrot, size: 46, top: '82%', left: '24%', tilt: -8, dur: 4300 },
  { V: Cheese, size: 42, top: '88%', right: '14%', tilt: 10, dur: 5000 },
];

function Floater({ spot, index }: { spot: Spot; index: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 180),
        Animated.timing(t, { toValue: 1, duration: spot.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: spot.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, spot.dur, index]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: [`${spot.tilt}deg`, `${spot.tilt + 8}deg`] });
  const { V } = spot;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: spot.top,
        left: spot.left,
        right: spot.right,
        width: spot.size,
        height: spot.size,
        opacity: 0.9,
        transform: [{ translateY }, { rotate }],
      }}>
      <V />
    </Animated.View>
  );
}

export function FloatingVeggies() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SPOTS.map((s, i) => (
        <Floater key={i} spot={s} index={i} />
      ))}
    </View>
  );
}
