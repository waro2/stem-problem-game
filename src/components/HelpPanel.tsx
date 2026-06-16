/**
 * HelpPanel — Explains the current game phase to the player  (GDD §5)
 * Opened via the persistent "?" button in the header.
 */

import React, { useState } from 'react';
import type { GamePhase } from '@game/types';
import { getHelpContent } from '@game/help';
import { getGlossaryEntries } from '@game/glossary';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface HelpPanelProps {
  phase: GamePhase;
  onClose: () => void;
  lang: Lang;
}

type HelpView = 'phase' | 'glossary';

export function HelpPanel({ phase, onClose, lang }: HelpPanelProps) {
  const [view, setView] = useState<HelpView>('phase');
  const content = getHelpContent(phase);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(46, 46, 46, 0.45)',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          minWidth: 280,
          maxWidth: 420,
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>
            {view === 'phase' ? t('helpPanelTitle', lang) : t('glossaryTitle', lang)}
          </h2>
          <button
            aria-label={t('helpCloseButton', lang)}
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: 20,
              lineHeight: 1,
              color: '#8C8C8C',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {view === 'phase' ? (
          <>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, color: '#2E75B6' }}>{t(content.titleKey, lang)}</h3>
            <p style={{ margin: 0, fontSize: 14, color: '#2E2E2E', lineHeight: 1.5 }}>{t(content.descKey, lang)}</p>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setView('glossary')} style={secondaryButtonStyle}>
                {t('glossaryButton', lang)}
              </button>
              <button onClick={onClose} style={primaryButtonStyle}>
                {t('helpCloseButton', lang)}
              </button>
            </div>
          </>
        ) : (
          <>
            <dl style={{ margin: 0 }}>
              {getGlossaryEntries().map(entry => (
                <div key={entry.termKey} style={{ marginBottom: 12 }}>
                  <dt style={{ fontSize: 14, fontWeight: 700, color: '#2E75B6' }}>{t(entry.termKey, lang)}</dt>
                  <dd style={{ margin: '2px 0 0', fontSize: 13, color: '#2E2E2E', lineHeight: 1.5 }}>
                    {t(entry.descKey, lang)}
                  </dd>
                </div>
              ))}
            </dl>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setView('phase')} style={secondaryButtonStyle}>
                {t('glossaryBackButton', lang)}
              </button>
              <button onClick={onClose} style={primaryButtonStyle}>
                {t('helpCloseButton', lang)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const primaryButtonStyle: React.CSSProperties = {
  border: '1px solid #2E75B6',
  background: '#2E75B6',
  color: '#fff',
  borderRadius: 6,
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #2E75B6',
  background: '#fff',
  color: '#2E75B6',
  borderRadius: 6,
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};
