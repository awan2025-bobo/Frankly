import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useSession } from '@/lib/session';

// The center Home tab opens first.
export const unstable_settings = { initialRouteName: 'index' };

export default function TabsLayout() {
  const { profile } = useSession();
  if (!profile) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="active" />
      <Tabs.Screen name="cookbook" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
