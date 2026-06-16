/**
 * Settings — Privacy controls  (GDD §8.4 GDPR)
 * "Delete my data" calls anonymise_user() via the API, then signs the
 * player out automatically.
 */

import React, { useState } from 'react';
import { useAuth } from '@auth/AuthContext';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { LangSwitch } from '@components/GameScreen';

interface SettingsProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onBack: () => void;
}

export function Settings({ lang, onLangChange, onBack }: SettingsProps) {
  const { deleteMyData } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    setError(false);
    try {
      await deleteMyData();
      setConfirmOpen(false);
    } catch (err) {
      console.error('[settings] failed to delete user data', err);
      setError(true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#F5F6F8' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: '#fff',
          borderBottom: '1px solid #D6DCE4',
        }}
      >
        <button
          onClick={onBack}
          style={{ border: 'none', background: 'none', color: '#2E75B6', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          {t('glossaryBackButton', lang)}
        </button>
        <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{t('settingsTitle', lang)}</h1>
        <LangSwitch lang={lang} onChange={onLangChange} />
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <section style={{ background: '#fff', border: '1px solid #D6DCE4', borderRadius: 10, padding: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, color: '#2E2E2E' }}>{t('privacySectionTitle', lang)}</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#595959', lineHeight: 1.5 }}>
            {t('deleteDataDescription', lang)}
          </p>

          {error && (
            <div style={{ border: '2px solid #C00000', background: '#FBEEEE', color: '#C00000', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
              {t('deleteDataErrorMsg', lang)}
            </div>
          )}

          <button
            onClick={() => setConfirmOpen(true)}
            style={{
              border: '1px solid #C00000',
              background: '#fff',
              color: '#C00000',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('deleteDataButton', lang)}
          </button>
        </section>
      </main>

      {confirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #D6DCE4',
              borderRadius: 10,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{t('deleteDataConfirmTitle', lang)}</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#595959', lineHeight: 1.5 }}>{t('deleteDataConfirmBody', lang)}</p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                style={{
                  border: '1px solid #D6DCE4',
                  background: 'transparent',
                  color: '#595959',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 14,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {t('deleteDataCancelButton', lang)}
              </button>
              <button
                onClick={() => { void handleDelete(); }}
                disabled={deleting}
                style={{
                  border: '1px solid #C00000',
                  background: '#C00000',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {t('deleteDataConfirmButton', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
