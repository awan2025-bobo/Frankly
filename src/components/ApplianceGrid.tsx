// Onboarding / preferences: big square appliance tiles with line icons (no emojis).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Pressable } from './Pressable';
import { C, F, R } from '@/lib/theme';

type McIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, McIcon> = {
  Stovetop: 'stove',
  Oven: 'toaster-oven',
  Microwave: 'microwave',
  'Slow cooker': 'pot',
  'Instant Pot': 'pot-steam',
  'Rice cooker': 'rice',
  Blender: 'blender',
  'Food processor': 'blender-outline',
  'Toaster oven': 'bread-slice-outline',
  Grill: 'grill',
  'Stand mixer': 'bowl-mix',
};

export function ApplianceGrid({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <View style={st.grid}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <Pressable
            key={o}
            onPress={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => [st.tile, on && st.tileOn, pressed && { transform: [{ scale: 0.95 }, { rotate: on ? '1.5deg' : '-1.5deg' }] }]}>
            {o === 'Air fryer' ? (
              <AirFryerIcon size={34} color={on ? C.onPrimary : C.primary} />
            ) : (
              <MaterialCommunityIcons name={ICONS[o] ?? 'chef-hat'} size={34} color={on ? C.onPrimary : C.primary} />
            )}
            <Text style={[st.label, on && { color: C.onPrimary }]} numberOfLines={2}>
              {o}
            </Text>
            {on && (
              <View style={st.check}>
                <MaterialCommunityIcons name="check" size={13} color={C.primary} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** The icon set has no air fryer, so here's one in the same style: body, dial, basket drawer with handle. */
function AirFryerIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3h12a3 3 0 0 1 3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3z" fill="none" stroke={color} strokeWidth={1.9} />
      <Circle cx={12} cy={7.2} r={1.9} fill={color} />
      <Rect x={5.6} y={11.2} width={12.8} height={7.4} rx={1.6} fill="none" stroke={color} strokeWidth={1.7} />
      <Path d="M9.5 14.9h5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: R.md,
    backgroundColor: C.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  tileOn: { backgroundColor: C.primary },
  label: { fontFamily: F.medium, fontSize: 13, color: C.ink, textAlign: 'center' },
  check: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: C.onPrimary, alignItems: 'center', justifyContent: 'center' },
});
