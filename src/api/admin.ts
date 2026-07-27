/**
 * admin_api.ts
 * Destination : src/api/admin.ts
 *
 * Fonctions d'accès aux routes /api/admin/* (toutes authentifiées).
 * Le token Supabase est obtenu via supabase.auth.getSession().
 */

import { supabase } from '@auth/supabaseClient';

const API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

// ── Types ─────────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'instructor' | 'researcher' | 'admin';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  cohortId: string | null;
  cohort: { id: string; name: string } | null;
  createdAt: string;
}

export interface AdminCohort {
  id: string;
  name: string;
  instructorId: string;
  leaderboardEnabled: boolean;
  _count: { members: number };
}

// ── Utilitaire : récupère le token JWT courant ─────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = supabase
    ? ((await supabase.auth.getSession()).data.session?.access_token ?? '')
    : '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Utilisateurs ──────────────────────────────────────────────────────────

export const adminGetUsers = () =>
  apiFetch<AdminUser[]>('/api/admin/users');

export const adminUpdateUser = (
  id: string,
  patch: { role?: UserRole; cohortId?: string | null },
) =>
  apiFetch<AdminUser>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const adminDeleteUser = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' });

// ── Cohortes ──────────────────────────────────────────────────────────────

export const adminGetCohorts = () =>
  apiFetch<AdminCohort[]>('/api/admin/cohorts');

export const adminCreateCohort = (payload: {
  name: string;
  instructorId?: string;
  leaderboardEnabled?: boolean;
}) =>
  apiFetch<AdminCohort>('/api/admin/cohorts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const adminDeleteCohort = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/admin/cohorts/${id}`, { method: 'DELETE' });
