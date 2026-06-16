/**
 * ConceptLibrary — Bilingual concept explanation page  (GDD §3, §6.5)
 * Opened from SummaryScreen when stuck, via the conceptName of a
 * formula that was never activated. Explains the formula and the
 * variables it links, in FR and EN.
 */

import React from 'react';
import type { Formula, Variable } from '@game/types';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { LangSwitch } from '@components/GameScreen';

interface ConceptLibraryProps {
  formula: Formula;
  variables: Variable[];
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onBack: () => void;
}

export function ConceptLibrary({ formula, variables, lang, onLangChange, onBack }: ConceptLibraryProps) {
  const conceptName = (lang === 'fr' ? formula.conceptName_fr : formula.conceptName) ?? formula.conceptName;
  const expression = (lang === 'fr' && formula.expression_fr) ? formula.expression_fr : formula.expression;

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
          style={{
            border: 'none',
            background: 'none',
            color: '#2E75B6',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {t('glossaryBackButton', lang)}
        </button>
        <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{t('conceptLibraryTitle', lang)}</h1>
        <LangSwitch lang={lang} onChange={onLangChange} />
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <section style={{ background: '#fff', border: '1px solid #D6DCE4', borderRadius: 10, padding: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#2E2E2E' }}>{conceptName}</h2>

          <h3 style={{ margin: '0 0 6px', fontSize: 13, color: '#595959' }}>{t('conceptFormulaLabel', lang)}</h3>
          <div style={{ fontFamily: 'monospace', fontSize: 15, color: '#2E2E2E', marginBottom: 16 }}>{expression}</div>

          <h3 style={{ margin: '0 0 6px', fontSize: 13, color: '#595959' }}>{t('conceptVariablesLabel', lang)}</h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#2E2E2E' }}>
            {variables.map(v => (
              <li key={v.id}>
                {lang === 'fr' ? v.label_fr : v.label}
                {v.unit && <span style={{ color: '#595959' }}> ({v.unit})</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
