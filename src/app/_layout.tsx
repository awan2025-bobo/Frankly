import { Fraunces_600SemiBold_Italic, Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button, Body, H2 } from '@/components/ui';
import { SessionProvider, useSession } from '@/lib/session';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function Gate() {
  const { ready, error, resetDemo } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.tomato} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <H2>Frankly can't reach its kitchen</H2>
        <Body style={{ textAlign: 'center' }}>{error}</Body>
        <Button title="Try again" onPress={resetDemo} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="finish/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Fraunces_700Bold, Fraunces_600SemiBold_Italic, Inter_400Regular, Inter_500Medium, Inter_700Bold });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Gate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
