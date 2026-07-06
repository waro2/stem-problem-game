/**
 * Profile — user profile page  (/profile)
 * Lets the authenticated user update their display name.
 */

import React, { useState } from 'react';
import { useAuth } from '@auth/AuthContext';
import { updateUserName } from '@api/users';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

const TEAL = '#0F6E56';
const MAX_NAME = 80;

interface ProfileProps {
  apiUrl: string;
  lang: Lang;
}

export function Profile({ apiUrl, lang }: ProfileProps) {
  const { profile, getAccessToken } = useAuth();

  const [name, setName] = useState(profile?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const initial = (profile.name ?? profile.email).charAt(0).toUpperCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError(t('profileNameRequired', lang));
      return;
    }
    if (trimmed.length > MAX_NAME) {
      setError(t('profileNameTooLong', lang));
      return;
    }

    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('not authenticated');
      await updateUserName(apiUrl, trimmed, token);
      setName(trimmed);
      setSaved(true);
    } catch {
      setError(t('dashboardErrorMsg', lang));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        background: '#F5F6F8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          border: '1px solid #D6DCE4',
          borderRadius: 12,
          padding: 32,
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#E1F5EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: TEAL, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{initial}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#2E2E2E' }}>
            {t('profileTitle', lang)}
          </h1>
        </div>

        {/* Editable name */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#595959' }}>
          {t('profileNameLabel', lang)}
          <input
            type="text"
            value={name}
            maxLength={MAX_NAME}
            onChange={e => { setName(e.target.value); setSaved(false); }}
            style={inputStyle}
          />
        </label>

        {/* Read-only email */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#595959' }}>
          {t('profileEmailLabel', lang)}
          <input type="email" value={profile.email} readOnly style={{ ...inputStyle, background: '#F5F6F8', color: '#8C8C8C' }} />
        </label>

        {/* Read-only role */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#595959' }}>
          {t('profileRoleLabel', lang)}
          <input type="text" value={profile.role} readOnly style={{ ...inputStyle, background: '#F5F6F8', color: '#8C8C8C' }} />
        </label>

        {error && (
          <div style={{ border: '2px solid #C00000', background: '#FBEEEE', color: '#C00000', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ border: '2px solid #0F6E56', background: '#E1F5EE', color: TEAL, borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
            {t('profileSavedMsg', lang)}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            border: `1px solid ${TEAL}`,
            background: TEAL,
            color: '#fff',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {t('profileSaveButton', lang)}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #D6DCE4',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  color: '#2E2E2E',
  background: '#fff',
};
