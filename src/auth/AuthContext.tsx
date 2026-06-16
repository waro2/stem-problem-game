/**
 * Supabase Auth context  (GDD §8.2, §8.4 GDPR)
 *
 * Wraps Supabase session management, profile sync, anonymous→real
 * userId linking, and GDPR consent state behind a single `useAuth()` hook.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { syncUserProfile, recordConsent, linkAnonymousAccount, deleteUserData, type AuthProfile } from '../api/auth';
import { useGameStore, ANONYMOUS_USER_ID_KEY } from '../game/store';
import { setAnalyticsConsent } from '../api/events';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface AuthContextValue {
  status: AuthStatus;
  profile: AuthProfile | null;
  /** True once the profile is loaded and GDPR consent has not yet been decided. */
  needsConsent: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Record acceptance of analytics consent and unblock emitEvent(). */
  giveConsent: () => Promise<void>;
  /** Record refusal of analytics consent; emitEvent() stays blocked. */
  refuseConsent: () => Promise<void>;
  /** GDPR right-to-erasure (GDD §8.4): anonymise the user's data, then sign out. */
  deleteMyData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** localStorage key tracking which anonymous device id has already been linked, to avoid repeat calls. */
const LINKED_ANON_ID_KEY = 'stem_game_linked_anon_id';

export function AuthProvider({ apiUrl, children }: { apiUrl: string; children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const setUserId = useGameStore(s => s.setUserId);

  const handleSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setStatus('signed-out');
      setProfile(null);
      // Anonymous play has no consent prompt — let analytics flow as before.
      setAnalyticsConsent(true);
      return;
    }

    try {
      const syncedProfile = await syncUserProfile(apiUrl, session.access_token);
      setProfile(syncedProfile);
      setUserId(syncedProfile.id);
      // Block analytics until the user has made an explicit consent choice;
      // once decided, honour their stored choice (accept or refuse).
      setAnalyticsConsent(syncedProfile.consentGivenAt === null ? false : (syncedProfile.analyticsConsent ?? false));

      const anonymousId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
      const alreadyLinked = localStorage.getItem(LINKED_ANON_ID_KEY);
      if (anonymousId && anonymousId !== alreadyLinked) {
        await linkAnonymousAccount(apiUrl, session.access_token, anonymousId);
        localStorage.setItem(LINKED_ANON_ID_KEY, anonymousId);
      }

      setStatus('signed-in');
    } catch (err) {
      console.error('[auth] failed to sync session', err);
      setStatus('signed-out');
    }
  }, [apiUrl, setUserId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => handleSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, [handleSession]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const recordConsentChoice = useCallback(async (granted: boolean) => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;
    const { consentGivenAt, analyticsConsent } = await recordConsent(apiUrl, accessToken, granted);
    setProfile(prev => (prev ? { ...prev, consentGivenAt, analyticsConsent } : prev));
    setAnalyticsConsent(granted);
  }, [apiUrl]);

  const giveConsent = useCallback(() => recordConsentChoice(true), [recordConsentChoice]);
  const refuseConsent = useCallback(() => recordConsentChoice(false), [recordConsentChoice]);

  const deleteMyData = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;
    await deleteUserData(apiUrl, accessToken);
    await supabase.auth.signOut();
  }, [apiUrl]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    profile,
    needsConsent: profile !== null && profile.consentGivenAt === null,
    signInWithPassword,
    signUp,
    signOut,
    giveConsent,
    refuseConsent,
    deleteMyData,
  }), [status, profile, signInWithPassword, signUp, signOut, giveConsent, refuseConsent, deleteMyData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
