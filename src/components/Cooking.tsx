// "Cooking it up…" loader. The rotating lines show the steps the agent is taking.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { C } from '@/lib/theme';
import { H1, Muted } from './ui';

export function Cooking({ title, lines }: { title: string; lines: string[] }) {
  const [i, setI] = useState(0);
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, lines.length - 1)), 2600);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      clearInterval(t);
      loop.stop();
    };
  }, [bob, lines.length]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] });

  return (
    <View style={st.wrap}>
      <Animated.View style={[st.pot, { transform: [{ translateY }, { rotate }] }]}>
        <Ionicons name="restaurant" size={44} color={C.white} />
      </Animated.View>
      <H1 style={{ textAlign: 'center' }}>{title}</H1>
      <View style={{ gap: 6, alignItems: 'center' }}>
        {lines.slice(0, i + 1).map((l, k) => (
          <View key={l} style={st.line}>
            <Ionicons
              name={k < i ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={k < i ? C.good : C.faint}
            />
            <Muted style={k === i ? { color: C.ink } : undefined}>{l}</Muted>
          </View>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  pot: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
