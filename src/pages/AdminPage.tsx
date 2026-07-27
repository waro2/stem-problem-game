/**
 * AdminPage.tsx
 * Destination : src/pages/AdminPage.tsx
 *
 * Page d'administration réservée aux utilisateurs avec role === 'admin'.
 * Deux onglets :
 *   • Utilisateurs — tableau avec dropdowns rôle / cohorte + suppression
 *   • Cohortes     — liste + formulaire de création + suppression
 */

import { useState, useEffect, useCallback } from 'react';
import {
  adminGetUsers,
  adminUpdateUser,
  adminDeleteUser,
  adminGetCohorts,
  adminCreateCohort,
  adminDeleteCohort,
} from '@api/admin';
import type { AdminUser, AdminCohort, UserRole } from '@api/admin';

// ── Constantes ────────────────────────────────────────────────────────────

const TEAL = '#0F6E56';
const TEAL_LT = '#E6F4F0';
const DANGER = '#C0392B';
const GRAY = '#8C8C8C';

const ROLES: UserRole[] = ['student', 'instructor', 'researcher', 'admin'];

const ROLE_LABELS: Record<UserRole, string> = {
  student:    'Étudiant',
  instructor: 'Enseignant',
  researcher: 'Chercheur',
  admin:      'Admin',
};

// ── Sous-composants ───────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 20px',
        border: 'none',
        borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
        background: 'none',
        color: active ? TEAL : GRAY,
        fontWeight: active ? 600 : 400,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'color .15s',
      }}
    >
      {children}
    </button>
  );
}

function Badge({ role }: { role: UserRole }) {
  const colors: Record<UserRole, { bg: string; color: string }> = {
    student:    { bg: '#EEF2FF', color: '#3730A3' },
    instructor: { bg: TEAL_LT,  color: TEAL },
    researcher: { bg: '#FFF7ED', color: '#C2410C' },
    admin:      { bg: '#FEF2F2', color: DANGER },
  };
  const { bg, color } = colors[role];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

// ── Onglet Utilisateurs ───────────────────────────────────────────────────

function UsersTab({ cohorts }: { cohorts: AdminCohort[] }) {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<Set<string>>(new Set());
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await adminGetUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRoleChange = async (user: AdminUser, role: UserRole) => {
    setSaving(s => new Set(s).add(user.id));
    try {
      await adminUpdateUser(user.id, { role });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(user.id); return n; });
    }
  };

  const handleCohortChange = async (user: AdminUser, cohortId: string) => {
    setSaving(s => new Set(s).add(user.id));
    const newCohortId = cohortId === '' ? null : cohortId;
    try {
      await adminUpdateUser(user.id, { cohortId: newCohortId });
      const cohort = cohorts.find(c => c.id === newCohortId) ?? null;
      setUsers(prev =>
        prev.map(u =>
          u.id === user.id
            ? { ...u, cohortId: newCohortId, cohort: cohort ? { id: cohort.id, name: cohort.name } : null }
            : u,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(user.id); return n; });
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Supprimer ${user.email} ?`)) return;
    try {
      await adminDeleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur suppression');
    }
  };

  if (loading) return <p style={{ color: GRAY, padding: 24 }}>Chargement…</p>;

  return (
    <div>
      {error && (
        <div style={{ background: '#FEF2F2', color: DANGER, padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: DANGER, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <p style={{ color: GRAY, fontSize: 13, marginBottom: 12 }}>
        {users.length} utilisateur{users.length !== 1 ? 's' : ''}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: TEAL, color: '#fff' }}>
              {['Email', 'Nom', 'Rôle', 'Cohorte', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => {
              const isSaving = saving.has(user.id);
              return (
                <tr
                  key={user.id}
                  style={{ background: i % 2 === 0 ? '#fff' : TEAL_LT, opacity: isSaving ? 0.6 : 1 }}
                >
                  {/* Email */}
                  <td style={{ padding: '10px 14px', color: '#333' }}>{user.email}</td>

                  {/* Nom */}
                  <td style={{ padding: '10px 14px', color: '#555' }}>
                    {user.name ?? <span style={{ color: '#bbb' }}>—</span>}
                  </td>

                  {/* Rôle (dropdown) */}
                  <td style={{ padding: '10px 14px' }}>
                    <select
                      value={user.role}
                      disabled={isSaving}
                      onChange={e => void handleRoleChange(user, e.target.value as UserRole)}
                      style={{
                        border: `1px solid ${TEAL}`,
                        borderRadius: 4,
                        padding: '3px 6px',
                        fontSize: 12,
                        color: TEAL,
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <span style={{ marginLeft: 6 }}>
                      <Badge role={user.role} />
                    </span>
                  </td>

                  {/* Cohorte (dropdown) */}
                  <td style={{ padding: '10px 14px' }}>
                    <select
                      value={user.cohortId ?? ''}
                      disabled={isSaving}
                      onChange={e => void handleCohortChange(user, e.target.value)}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        padding: '3px 6px',
                        fontSize: 12,
                        background: '#fff',
                        cursor: 'pointer',
                        minWidth: 120,
                      }}
                    >
                      <option value="">— Aucune —</option>
                      {cohorts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Supprimer */}
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={() => void handleDelete(user)}
                      disabled={isSaving}
                      title="Supprimer"
                      style={{
                        border: `1px solid ${DANGER}`,
                        borderRadius: 4,
                        background: 'none',
                        color: DANGER,
                        fontSize: 12,
                        padding: '3px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Onglet Cohortes ───────────────────────────────────────────────────────

function CohortsTab() {
  const [cohorts, setCohorts]     = useState<AdminCohort[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newName, setNewName]     = useState('');
  const [creating, setCreating]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCohorts(await adminGetCohorts());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const cohort = await adminCreateCohort({ name: newName.trim() });
      setCohorts(prev => [...prev, { ...cohort, _count: { members: 0 } }]);
      setNewName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur création');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (cohort: AdminCohort) => {
    if (!window.confirm(`Supprimer la cohorte "${cohort.name}" ? Ses ${cohort._count.members} membre(s) seront désaffectés.`)) return;
    try {
      await adminDeleteCohort(cohort.id);
      setCohorts(prev => prev.filter(c => c.id !== cohort.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur suppression');
    }
  };

  return (
    <div>
      {error && (
        <div style={{ background: '#FEF2F2', color: DANGER, padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: DANGER, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Formulaire création */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleCreate()}
          placeholder="Nom de la nouvelle cohorte…"
          style={{
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 13,
            width: 260,
            outline: 'none',
          }}
        />
        <button
          onClick={() => void handleCreate()}
          disabled={creating || !newName.trim()}
          style={{
            background: TEAL,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: newName.trim() ? 'pointer' : 'not-allowed',
            opacity: newName.trim() ? 1 : 0.6,
          }}
        >
          {creating ? 'Création…' : '+ Créer'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: GRAY }}>Chargement…</p>
      ) : cohorts.length === 0 ? (
        <p style={{ color: GRAY, fontStyle: 'italic' }}>Aucune cohorte pour l&apos;instant.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: TEAL, color: '#fff' }}>
              {['Nom', 'Membres', 'Classement', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : TEAL_LT }}>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{c.name}</td>
                <td style={{ padding: '10px 14px', color: GRAY }}>{c._count.members}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: c.leaderboardEnabled ? TEAL_LT : '#f5f5f5',
                    color: c.leaderboardEnabled ? TEAL : GRAY,
                  }}>
                    {c.leaderboardEnabled ? 'Activé' : 'Désactivé'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <button
                    onClick={() => void handleDelete(c)}
                    style={{
                      border: `1px solid ${DANGER}`,
                      borderRadius: 4,
                      background: 'none',
                      color: DANGER,
                      fontSize: 12,
                      padding: '3px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────

export function AdminPage() {
  const [tab, setTab]           = useState<'users' | 'cohorts'>('users');
  const [cohorts, setCohorts]   = useState<AdminCohort[]>([]);

  // Charger les cohortes au montage (nécessaires aussi dans l'onglet Users)
  useEffect(() => {
    adminGetCohorts().then(setCohorts).catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEAL, margin: 0 }}>
          Administration
        </h1>
        <p style={{ color: GRAY, fontSize: 13, marginTop: 4 }}>
          Gestion des utilisateurs et des cohortes
        </p>
      </div>

      {/* Onglets */}
      <div style={{ borderBottom: '1px solid #E8ECF0', marginBottom: 24, display: 'flex', gap: 4 }}>
        <TabButton active={tab === 'users'}   onClick={() => setTab('users')}>
          Utilisateurs
        </TabButton>
        <TabButton active={tab === 'cohorts'} onClick={() => setTab('cohorts')}>
          Cohortes
        </TabButton>
      </div>

      {/* Contenu */}
      {tab === 'users'   && <UsersTab cohorts={cohorts} />}
      {tab === 'cohorts' && <CohortsTab />}
    </div>
  );
}
