// Profile: what Frankly remembers, preferences, and settings.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { Body, Button, Card, H1, H3, Muted, Pill, Popup, Screen, type IconName } from '@/components/ui';
import { KitchenScene } from '@/components/KitchenScene';
import { getMemoryStats } from '@/lib/api';
import { useSession } from '@/lib/session';
import { setSoundsOn, useSoundsOn } from '@/lib/sounds';
import { C, F } from '@/lib/theme';

type Stats = Awaited<ReturnType<typeof getMemoryStats>>;

export default function Profile() {
  const { profile, resetDemo } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMemoryStats().then(setStats).catch(() => {});
    }, []),
  );

  if (!profile) return null;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={st.avatar}>
          <Text style={st.avatarText}>{(profile.name || 'F').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View>
          <H1 style={{ fontSize: 28 }}>{profile.name || 'Chef'}</H1>
          <Muted>{profile.cooks_for === 'others' ? `Cooks for ${profile.household_size}` : 'Cooks for one'}</Muted>
        </View>
      </View>

      {/* Kitchen clipart behind the card */}
      <View style={st.memory}>
        <KitchenScene />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="sparkles" size={18} color={C.accent} />
          <Text style={st.memoryTitle}>What Frankly remembers</Text>
        </View>
        <View style={st.stats}>
          <Stat value={String(stats?.cooked ?? 0)} label="meals cooked" />
          <Stat value={stats?.avgEnjoyment != null ? stats.avgEnjoyment.toFixed(1) : '—'} label="avg. enjoyment" />
          <Stat value={String(stats?.staples.length ?? 0)} label="staples on hand" />
        </View>
        {stats?.lastCooked && (
          <Text style={st.memoryNote}>
            Last cooked: {stats.lastCooked.title}, {new Date(stats.lastCooked.cooked_at).toLocaleDateString()}
          </Text>
        )}
        {!!stats?.staples.length && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {stats.staples.slice(0, 12).map((s) => (
              <Pill key={s} text={s} icon="home-outline" />
            ))}
          </View>
        )}
        <Text style={[st.memoryNote, { fontSize: 12 }]}>Every rating and cooked date shapes your next recipe and suggestions.</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Row icon="options-outline" title="Change preferences" subtitle="Tastes, diet, allergens, appliances, stores" onPress={() => router.push('/preferences')} />
        <Row
          icon="location-outline"
          title="Location & stores"
          subtitle={profile.kroger_stores.length ? profile.kroger_stores.map((s) => s.name).join(' · ') : 'Not set yet'}
          onPress={() => router.push({ pathname: '/preferences', params: { section: 'location' } })}
        />
      </View>

      <View style={{ gap: 8, marginTop: 8 }}>
        <H3>Settings</H3>
        <SoundRow />
        <Card style={{ gap: 6 }}>
          <Body style={{ fontSize: 14 }}>Prices are live from Kroger-family stores (QFC, Fred Meyer) and may change in store.</Body>
          <Muted style={{ fontSize: 12 }}>Your data is tied to this device. No account needed.</Muted>
        </Card>
        <Button title="Reset demo (start over)" kind="danger" icon="refresh" onPress={() => setConfirmReset(true)} />
      </View>

      <Popup
        visible={confirmReset}
        title="Start over?"
        message="This signs you out and starts a fresh Frankly with onboarding. Your old recipes won't show up again."
        icon="refresh"
        onClose={() => setConfirmReset(false)}
        actions={[
          { label: 'Reset', kind: 'danger', onPress: () => { setConfirmReset(false); resetDemo(); } },
          { label: 'Cancel', kind: 'ghost', onPress: () => setConfirmReset(false) },
        ]}
      />
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function SoundRow() {
  const on = useSoundsOn();
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
      <Ionicons name={on ? 'volume-high-outline' : 'volume-mute-outline'} size={22} color={C.primary} />
      <View style={{ flex: 1 }}>
        <H3>Sounds</H3>
        <Muted style={{ fontSize: 13 }}>A soft click when you tap</Muted>
      </View>
      <Switch
        value={on}
        onValueChange={setSoundsOn}
        trackColor={{ false: C.line, true: C.primary }}
        thumbColor={C.onPrimary}
        accessibilityLabel="Sounds"
      />
    </Card>
  );
}

function Row({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
        <Ionicons name={icon} size={22} color={C.primary} />
        <View style={{ flex: 1 }}>
          <H3>{title}</H3>
          <Muted numberOfLines={1} style={{ fontSize: 13 }}>
            {subtitle}
          </Muted>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.faint} />
      </Card>
    </Pressable>
  );
}

const st = StyleSheet.create({
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.display, fontSize: 26, color: C.onPrimary },
  stats: { flexDirection: 'row' },
  statValue: { fontFamily: F.display, fontSize: 30, color: C.onPrimary },
  statLabel: { fontFamily: F.body, fontSize: 12, textAlign: 'center', color: 'rgba(238,232,220,0.75)' },
  memory: { borderRadius: 24, overflow: 'hidden', padding: 18, gap: 12, minHeight: 200, backgroundColor: C.primary },
  memoryTitle: { fontFamily: F.bold, fontSize: 16, color: C.onPrimary },
  memoryNote: { fontFamily: F.body, fontSize: 13, color: 'rgba(238,232,220,0.8)' },
});
