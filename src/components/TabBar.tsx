// Bottom navigation from the MVP: Active Recipe, Cookbook, Home (center), "Don't know?", Profile.
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, shadow } from '@/lib/theme';
import type { IconName } from './ui';

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  active: { label: 'Active', icon: 'flame-outline', iconOn: 'flame' },
  cookbook: { label: 'Cookbook', icon: 'book-outline', iconOn: 'book' },
  index: { label: 'Cook', icon: 'restaurant-outline', iconOn: 'restaurant' },
  discover: { label: 'Not sure?', icon: 'bulb-outline', iconOn: 'bulb' },
  profile: { label: 'Profile', icon: 'person-outline', iconOn: 'person' },
};

// Cream icons on olive, like the MOYA bottom bar; inactive tabs are faded cream.
const FADED = 'rgba(238,232,220,0.62)';

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const center = route.name === 'index';
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        if (center) {
          return (
            <Pressable key={route.key} onPress={onPress} style={st.item} accessibilityLabel="Home">
              <View style={[st.center, focused && { backgroundColor: C.onPrimary }]}>
                <Ionicons name={tab.iconOn} size={28} color={C.primary} />
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable key={route.key} onPress={onPress} style={st.item} accessibilityLabel={tab.label}>
            <Ionicons name={focused ? tab.iconOn : tab.icon} size={22} color={focused ? C.onPrimary : FADED} />
            <Text style={[st.label, focused && { color: C.onPrimary }]}>{tab.label.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.primary,
    paddingTop: 10,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: F.medium, fontSize: 9.5, letterSpacing: 1.2, color: FADED },
  center: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 4,
    borderColor: C.bg,
    ...shadow,
  },
});
