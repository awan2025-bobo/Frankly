// Onboarding / preferences: big square appliance tiles with line icons (no emojis).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, F, R } from '@/lib/theme';

type McIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, McIcon> = {
  Stovetop: 'stove',
  Oven: 'toaster-oven',
  Microwave: 'microwave',
  'Air fryer': 'fan',
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
            <MaterialCommunityIcons name={ICONS[o] ?? 'chef-hat'} size={34} color={on ? C.onPrimary : C.primary} />
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
