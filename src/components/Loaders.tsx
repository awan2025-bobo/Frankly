// Loading animations in the same flat clipart style as the floating vegetables.
//   ChoppingLoader -> "Not sure?" while new ideas are generated: a knife chopping a carrot on a board
//   SizzlingPan    -> "Building your Frankly…": a pan sizzling
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { C, F } from '@/lib/theme';

const native = true;

/** A knife chops a carrot on a cutting board; slices pile up, then it starts over. */
export function ChoppingLoader({ text }: { text?: string }) {
  const knife = useRef(new Animated.Value(0)).current;
  const [slices, setSlices] = useState(0);

  useEffect(() => {
    const chop = Animated.loop(
      Animated.sequence([
        Animated.timing(knife, { toValue: 1, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: native }),
        Animated.timing(knife, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      ]),
    );
    chop.start();
    const t = setInterval(() => setSlices((n) => (n + 1) % 7), 420);
    return () => {
      chop.stop();
      clearInterval(t);
    };
  }, [knife]);

  // The carrot gets shorter as slices come off.
  const carrotLen = 70 - slices * 8;
  return (
    <View style={st.wrap}>
      <View style={{ width: 220, height: 130 }}>
        <Svg width={220} height={130} viewBox="0 0 220 130" style={StyleSheet.absoluteFill}>
          {/* board */}
          <Rect x={14} y={78} width={196} height={34} rx={14} fill="#A86F45" />
          <Rect x={10} y={72} width={196} height={34} rx={14} fill="#C98557" />
          <Circle cx={190} cy={89} r={5} fill="#A86F45" />
          {/* carrot (shrinking) */}
          <Path d={`M${118 - carrotLen} 84 L118 78 L118 92 Z`} fill="#E07A35" />
          <Path d={`M118 78c6-6 14-8 20-4-6 3-10 7-12 12zM118 82c8-1 14 2 16 8-7-1-12-3-16-6z`} fill="#6E9A3C" />
          {/* slices, one per chop */}
          {Array.from({ length: slices }).map((_, i) => (
            <Ellipse key={i} cx={36 + (i % 4) * 13} cy={i < 4 ? 92 : 84} rx={6} ry={4} fill="#EE9A5C" stroke="#E07A35" strokeWidth={1.5} />
          ))}
        </Svg>
        {/* knife, hinged at the handle so the blade chops down */}
        <Animated.View
          style={[
            st.knife,
            {
              transformOrigin: 'right center',
              transform: [{ rotate: knife.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '0deg'] }) }],
            },
          ]}>
          <Svg width={120} height={30} viewBox="0 0 120 30">
            {/* chef's knife: straight spine on top, curved cutting edge underneath, tip pointing at the carrot */}
            <Path d="M82 8 L14 8 C 8 8, 4 10, 3 13 C 18 25, 58 26, 82 22 Z" fill="#D9D6CC" />
            <Path d="M14 10 L82 10" stroke="#B8B4A8" strokeWidth={2} />
            <Rect x={80} y={7} width={38} height={16} rx={6} fill="#4A4538" />
            <Circle cx={92} cy={15} r={2} fill="#B8B4A8" />
            <Circle cx={106} cy={15} r={2} fill="#B8B4A8" />
          </Svg>
        </Animated.View>
      </View>
      {text ? <Text style={st.text}>{text}</Text> : null}
    </View>
  );
}

/** A frying pan with oil popping and a little steam. */
export function SizzlingPan({ size = 180 }: { size?: number }) {
  const jitter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const steps = [1, -1, 0.5, -0.6, 0];
    const loop = Animated.loop(Animated.sequence(steps.map((v) => Animated.timing(jitter, { toValue: v, duration: 60, useNativeDriver: native }))));
    loop.start();
    return () => loop.stop();
  }, [jitter]);
  const k = size / 180;
  return (
    <View style={{ width: size, height: size * 0.75 }}>
      {[0.36, 0.5, 0.62].map((fx, i) => (
        <Wisp key={`w${i}`} x={size * fx} y={size * 0.12} delay={i * 500} />
      ))}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: size * 0.25,
          transform: [
            { translateX: jitter.interpolate({ inputRange: [-1, 1], outputRange: [-1.5, 1.5] }) },
            { rotate: jitter.interpolate({ inputRange: [-1, 1], outputRange: ['-1deg', '1deg'] }) },
          ],
        }}>
        <Svg width={size} height={size * 0.5} viewBox="0 0 180 90">
          {/* handle */}
          <Rect x={128} y={36} width={52} height={12} rx={6} fill="#4A4538" />
          {/* pan */}
          <Ellipse cx={72} cy={46} rx={66} ry={30} fill="#3A3A3A" />
          <Ellipse cx={72} cy={42} rx={66} ry={28} fill="#5A5A5A" />
          <Ellipse cx={72} cy={42} rx={56} ry={21} fill="#2E2E2E" />
          {/* oil shine + a little garlic/onion */}
          <Ellipse cx={58} cy={38} rx={22} ry={7} fill="#C9A44A" opacity={0.55} />
          <Circle cx={80} cy={44} r={5} fill="#F0DCA6" />
          <Circle cx={92} cy={38} r={4} fill="#F0DCA6" />
          <Circle cx={66} cy={48} r={4} fill="#83AE4A" />
        </Svg>
      </Animated.View>
      {[0.3, 0.42, 0.55, 0.66].map((fx, i) => (
        <Pop key={`p${i}`} x={size * fx} y={size * 0.42} delay={i * 230} scale={k} />
      ))}
    </View>
  );
}

function Pop({ x, y, delay, scale }: { x: number; y: number; delay: number; scale: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 5 * scale,
        height: 5 * scale,
        borderRadius: 3,
        backgroundColor: '#E9C46A',
        opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -22 * scale, -6 * scale] }) },
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, (delay % 2 ? 10 : -10) * scale] }) },
        ],
      }}
    />
  );
}

function Wisp({ x, y, delay }: { x: number; y: number; delay: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - 8,
        top: y,
        width: 16,
        height: 34,
        opacity: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, -30] }) }],
      }}>
      <Svg viewBox="0 0 16 34">
        <Path d="M8 32c-6-5 6-10 0-15S8 6 8 2" stroke={C.muted} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  knife: { position: 'absolute', left: 64, top: 46 },
  text: { fontFamily: F.medium, fontSize: 14, color: C.muted, textAlign: 'center' },
});
