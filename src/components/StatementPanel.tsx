/**
 * StatementPanel — Problem statement summary, shown below the 3 main panels.
 * Recaps the hypotheses H (given) and conclusions C (to find) for the loaded problem.
 */

import type { CSSProperties } from 'react';
import type { Variable } from '@game/types';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface StatementPanelProps {
  variables: Variable[];
  hypotheses: string[];
  conclusions: string[];
  lang?: Lang;
  style?: CSSProperties;
}

export function StatementPanel({ variables, hypotheses, conclusions, lang = 'fr', style }: StatementPanelProps) {
  const byId = new Map(variables.map(v => [v.id, v]));
  const given = hypotheses.map(id => byId.get(id)).filter((v): v is Variable => v !== undefined);
  const target = conclusions.map(id => byId.get(id)).filter((v): v is Variable => v !== undefined);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.93)',
        borderRadius: 12,
        padding: '16px 24px',
        ...style,
      }}
    >
      <h3 style={{ margin: '0 0 14px', fontSize: 14, textTransform: 'uppercase', color: '#595959' }}>
        {t('panelStatement', lang)}
      </h3>
      <div style={{ display: 'flex', gap: 24 }}>
        <StatementColumn label={t('statementGivenLabel', lang)} variables={given} color="#70AD47" background="#F0FBF0" lang={lang} />
        <StatementColumn label={t('statementTargetLabel', lang)} variables={target} color="#C00000" background="#FBEEEE" lang={lang} />
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatementColumn({
  label, variables, color, background, lang,
}: { label: string; variables: Variable[]; color: string; background: string; lang: Lang }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#595959', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {variables.map(variable => (
          <span
            key={variable.id}
            style={{
              display: 'inline-block',
              border: `1px solid ${color}`,
              background,
              color,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {variable.id} — {lang === 'fr' ? variable.label_fr : variable.label}
            {variable.unit && ` (${variable.unit})`}
          </span>
        ))}
      </div>
    </div>
  );
}
