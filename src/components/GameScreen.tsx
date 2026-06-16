/**
 * GameScreen — Main 3-column game layout  (GDD §5.1)
 * Columns: Variables (left) | Formulas (center) | Progress & Hints (right).
 */

import React, { useState } from 'react';
import type { GameState, FormulaEvaluation, HintTier } from '@game/types';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { VariableBoard } from './VariableBoard';
import { FormulaBoard } from './FormulaBoard';
import { ProgressPanel } from './ProgressPanel';
import { HelpPanel } from './HelpPanel';

interface GameScreenProps {
  gameState: GameState;
  evaluations: FormulaEvaluation[];
  elapsedSeconds: number;
  newlyIdentifiedVarId: string | null;
  newlyActivatedFormulaId: string | null;
  onActivate: (formulaId: string) => void;
  onRequestHint: (tier: HintTier) => void;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  /** Opens the Settings page (GDD §8.4 — Privacy / data deletion). */
  onOpenSettings: () => void;
  /** Current tutorial step (1-4), or null when the tutorial is inactive. */
  tutorialStep?: number | null;
  /** Number of analytics events queued but not yet confirmed sent (GDD §9.4). */
  pendingEventCount?: number;
}

export function GameScreen({
  gameState,
  evaluations,
  elapsedSeconds,
  newlyIdentifiedVarId,
  newlyActivatedFormulaId,
  onActivate,
  onRequestHint,
  lang,
  onLangChange,
  onOpenSettings,
  tutorialStep = null,
  pendingEventCount = 0,
}: GameScreenProps) {
  const { problem } = gameState;
  const title = lang === 'fr' ? problem.title_fr : problem.title;
  // During step 1 ("Meet the Variables"), block activations so the player
  // focuses on the variables panel before formulas come into play.
  const formulaBoardDisabled = tutorialStep === 1;
  const hintsDisabled = tutorialStep !== null;
  const [helpOpen, setHelpOpen] = useState(false);

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
        <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PendingEventsBadge count={pendingEventCount} lang={lang} />
          <HelpButton onClick={() => setHelpOpen(true)} lang={lang} />
          <SettingsButton onClick={onOpenSettings} lang={lang} />
          <LangSwitch lang={lang} onChange={onLangChange} />
        </div>
      </header>

      {helpOpen && <HelpPanel phase={gameState.phase} onClose={() => setHelpOpen(false)} lang={lang} />}

      <main
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr 260px',
          gap: 20,
          padding: 24,
          alignItems: 'start',
        }}
      >
        <Panel data-tutorial="variables">
          <VariableBoard
            variables={problem.variables}
            identifiedVars={gameState.identifiedVars}
            hypotheses={problem.hypotheses}
            conclusions={problem.conclusions}
            newlyIdentifiedVarId={newlyIdentifiedVarId}
            lang={lang}
          />
        </Panel>

        <Panel data-tutorial="formulas">
          <h3 style={{ margin: '0 0 10px', fontSize: 14, textTransform: 'uppercase', color: '#595959' }}>
            {t('panelFormulas', lang)}
          </h3>
          <FormulaBoard
            formulas={problem.formulas}
            evaluations={evaluations}
            activatedFormulas={gameState.activatedFormulas}
            newlyActivatedFormulaId={newlyActivatedFormulaId}
            disabled={formulaBoardDisabled}
            onActivate={onActivate}
            lang={lang}
          />
        </Panel>

        <Panel data-tutorial="progress">
          <ProgressPanel
            gameState={gameState}
            elapsedSeconds={elapsedSeconds}
            onRequestHint={onRequestHint}
            hintsDisabled={hintsDisabled}
            lang={lang}
          />
        </Panel>
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Panel({ children, ...rest }: { children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div style={{ background: '#fff', border: '1px solid #D6DCE4', borderRadius: 10, padding: 16 }} {...rest}>
      {children}
    </div>
  );
}

export function HelpButton({ onClick, lang }: { onClick: () => void; lang: Lang }) {
  return (
    <button
      onClick={onClick}
      aria-label={t('helpPanelTitle', lang)}
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: '1px solid #2E75B6',
        background: '#fff',
        color: '#2E75B6',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      {t('helpButton', lang)}
    </button>
  );
}

export function SettingsButton({ onClick, lang }: { onClick: () => void; lang: Lang }) {
  return (
    <button
      onClick={onClick}
      aria-label={t('settingsButton', lang)}
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: '1px solid #2E75B6',
        background: '#fff',
        color: '#2E75B6',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      ⚙️
    </button>
  );
}

/** Shown while analytics events are queued offline, waiting to sync (GDD §9.4). */
export function PendingEventsBadge({ count, lang }: { count: number; lang: Lang }) {
  if (count === 0) return null;

  return (
    <span
      title={String(count)}
      style={{
        border: '1px solid #ED7D31',
        background: '#FBF1E8',
        color: '#ED7D31',
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {t('pendingEventsBadge', lang)}
    </span>
  );
}

export function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  const langs: Lang[] = ['fr', 'en'];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {langs.map(l => (
        <button
          key={l}
          onClick={() => onChange(l)}
          style={{
            border: '1px solid #2E75B6',
            background: lang === l ? '#2E75B6' : '#fff',
            color: lang === l ? '#fff' : '#2E75B6',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
