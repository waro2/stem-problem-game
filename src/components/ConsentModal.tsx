/**
 * ConsentModal — GDPR consent gate  (GDD §8.4)
 * Shown on first login (profile.consentGivenAt === null) before any
 * analytics event is emitted. Accept records consent and unblocks
 * emitEvent(); Decline records refusal and keeps emitEvent() blocked.
 */

import { useAuth } from '@auth/AuthContext';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface ConsentModalProps {
  lang: Lang;
  onShowPrivacy: () => void;
  onShowTerms: () => void;
}

export function ConsentModal({ lang, onShowPrivacy, onShowTerms }: ConsentModalProps) {
  const { giveConsent, refuseConsent } = useAuth();

  return (
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
        <h2 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{t('consentTitle', lang)}</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#595959', lineHeight: 1.5 }}>{t('consentBody', lang)}</p>

        <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #F0F0F0', paddingTop: 10 }}>
          <button
            onClick={onShowPrivacy}
            style={{ border: 'none', background: 'none', color: '#2E75B6', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            {t('footerPrivacyLink', lang)}
          </button>
          <button
            onClick={onShowTerms}
            style={{ border: 'none', background: 'none', color: '#2E75B6', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            {t('footerTermsLink', lang)}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => { void refuseConsent(); }}
            style={{
              border: '1px solid #D6DCE4',
              background: 'transparent',
              color: '#595959',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {t('consentDeclineButton', lang)}
          </button>
          <button
            onClick={() => { void giveConsent(); }}
            style={{
              border: '1px solid #2E75B6',
              background: '#2E75B6',
              color: '#fff',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('consentAcceptButton', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
