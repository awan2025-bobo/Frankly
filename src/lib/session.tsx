// Signs the user in anonymously (no login screen) and keeps their profile in memory.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { getProfile, saveProfile } from './api';
import { supabase, supabaseConfigured } from './supabase';
import type { Profile } from './types';

type Session = {
  ready: boolean;
  error: string | null;
  userId: string | null;
  profile: Profile | null;
  updateProfile: (patch: Partial<Profile>) => Promise<Profile>;
  resetDemo: () => Promise<void>;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const boot = useCallback(async () => {
    setError(null);
    try {
      if (!supabaseConfigured) throw new Error('Supabase keys missing. Copy .env.example to .env and fill it in.');
      let { data } = await supabase.auth.getSession();
      if (!data.session) {
        const res = await supabase.auth.signInAnonymously();
        if (res.error) throw res.error;
        data = { session: res.data.session };
      }
      setUserId(data.session!.user.id);
      setProfile(await getProfile());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!userId) throw new Error('Not signed in yet');
      const next = await saveProfile(userId, patch);
      setProfile(next);
      return next;
    },
    [userId],
  );

  const resetDemo = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setReady(false);
    await boot();
  }, [boot]);

  return (
    <Ctx.Provider value={{ ready, error, userId, profile, updateProfile, resetDemo }}>{children}</Ctx.Provider>
  );
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession must be inside SessionProvider');
  return s;
}
