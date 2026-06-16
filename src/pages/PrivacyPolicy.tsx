import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { LangSwitch } from '@components/GameScreen';

interface PrivacyPolicyProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onBack: () => void;
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #D6DCE4',
        borderRadius: 10,
        padding: '16px 20px',
      }}
    >
      <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#2E75B6' }}>{title}</h2>
      {body.split('\n\n').map((para, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '8px 0 0', fontSize: 13, color: '#595959', lineHeight: 1.65 }}>
          {para}
        </p>
      ))}
    </section>
  );
}

export function PrivacyPolicy({ lang, onLangChange, onBack }: PrivacyPolicyProps) {
  const sections: Array<[string, string]> = [
    [t('privacyS1Title', lang), t('privacyS1Body', lang)],
    [t('privacyS2Title', lang), t('privacyS2Body', lang)],
    [t('privacyS3Title', lang), t('privacyS3Body', lang)],
    [t('privacyS4Title', lang), t('privacyS4Body', lang)],
    [t('privacyS5Title', lang), t('privacyS5Body', lang)],
    [t('privacyS6Title', lang), t('privacyS6Body', lang)],
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        overflowY: 'auto',
        background: '#F5F6F8',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
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
          {t('legalBackButton', lang)}
        </button>
        <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{t('privacyPolicyTitle', lang)}</h1>
        <LangSwitch lang={lang} onChange={onLangChange} />
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 24px 48px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#8C8C8C' }}>{t('legalLastUpdated', lang)}</p>
        {sections.map(([title, body]) => (
          <Section key={title} title={title} body={body} />
        ))}
      </main>
    </div>
  );
}
