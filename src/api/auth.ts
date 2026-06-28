/**
 * STEM Problem Game — Auth data contract  (GDD §8.2, §8.4 GDPR)
 *
 * Shared between src/server/authRouter.ts (producer) and
 * src/auth/AuthContext.tsx (consumer).
 */

import type { UserRole } from '../game/types';

export interface AuthProfile {
  id: string;
  email: string;
  role: UserRole;
  /** The cohort this user belongs to as a member (null for students without a cohort, and for instructors — see cohortsManaged instead). */
  cohortId?: string | null;
  /** The cohorts this user manages as an instructor. */
  cohortsManaged?: { id: string }[];
  /** ISO timestamp of the GDPR consent decision (accept or refuse), or null if not yet decided. */
  consentGivenAt: string | null;
  /** The GDPR analytics-consent choice: true = accepted, false = refused, null = not yet decided. */
  analyticsConsent: boolean | null;
}

export interface LinkAnonymousResponse {
  migratedSessions: number;
  migratedEvents: number;
}

/** Upsert the local profile from the verified Supabase session and fetch its consent status. */
export async function syncUserProfile(apiUrl: string, accessToken: string): Promise<AuthProfile> {
  const res = await fetch(`${apiUrl}/api/auth/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to sync user profile: ${res.status}`);
  return res.json() as Promise<AuthProfile>;
}

/** Record the user's GDPR analytics-consent choice (accept or refuse). */
export async function recordConsent(apiUrl: string, accessToken: string, granted: boolean): Promise<{ consentGivenAt: string; analyticsConsent: boolean }> {
  const res = await fetch(`${apiUrl}/api/auth/consent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ granted }),
  });
  if (!res.ok) throw new Error(`Failed to record consent: ${res.status}`);
  return res.json() as Promise<{ consentGivenAt: string; analyticsConsent: boolean }>;
}

/** Re-assign the anonymous device's sessions and events to the authenticated account. */
export async function linkAnonymousAccount(apiUrl: string, accessToken: string, anonymousId: string): Promise<LinkAnonymousResponse> {
  const res = await fetch(`${apiUrl}/api/auth/link-anonymous`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonymousId }),
  });
  if (!res.ok) throw new Error(`Failed to link anonymous account: ${res.status}`);
  return res.json() as Promise<LinkAnonymousResponse>;
}

/** GDPR right-to-erasure (GDD §8.4): anonymise the authenticated user's PII via anonymise_user(). */
export async function deleteUserData(apiUrl: string, accessToken: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/auth/delete-data`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to delete user data: ${res.status}`);
}
