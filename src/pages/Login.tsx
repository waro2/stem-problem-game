/**
 * Login — Student / instructor authentication  (GDD §8.2)
 * Single email/password form for both modes; role assignment is
 * server-side only (new accounts are always created as 'student').
 */

import React, { useState } from 'react';
import { useAuth } from '@auth/AuthContext';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { LangSwitch } from '@components/GameScreen';

interface LoginProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

type Mode = 'login' | 'signup';

export function Login({ lang, onLangChange }: LoginProps) {
  const { signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = mode === 'login'
      ? await signInWithPassword(email, password)
      : await signUp(email, password);

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setSignupDone(true);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSignupDone(false);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#F5F6F8', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '14px 24px',
        }}
      >
        <LangSwitch lang={lang} onChange={onLangChange} />
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#fff',
            border: '1px solid #D6DCE4',
            borderRadius: 10,
            padding: 24,
            width: '100%',
            maxWidth: 360,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>
            {t(mode === 'login' ? 'loginTitle' : 'signupTitle', lang)}
          </h1>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#595959' }}>
            {t('emailLabel', lang)}
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#595959' }}>
            {t('passwordLabel', lang)}
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          </label>

          {error && (
            <div style={{ border: '2px solid #C00000', background: '#FBEEEE', color: '#C00000', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
              {error}
            </div>
          )}

          {signupDone && (
            <div style={{ border: '2px solid #70AD47', background: '#EEF6E9', color: '#70AD47', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
              {t('signupSuccessMsg', lang)}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              border: '1px solid #2E75B6',
              background: '#2E75B6',
              color: '#fff',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {t(mode === 'login' ? 'loginButton' : 'signupButton', lang)}
          </button>

          <button
            type="button"
            onClick={switchMode}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#2E75B6',
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
            }}
          >
            {t(mode === 'login' ? 'switchToSignupPrompt' : 'switchToLoginPrompt', lang)}
          </button>
        </form>
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #D6DCE4',
  borderRadius: 6,
  padding: '6px 8px',
  fontSize: 14,
};
