/**
 * GameScreenMobile — Mobile layout  (GDD §5.1)
 * Replaces the 3-column desktop layout with a single-pane view and
 * bottom tab navigation: Variables | Formulas | Progress.
 * Formula cards support swipe-to-activate.
 */

import React, { useEffect, useState } from 'react';
import type { GameState, FormulaEvaluation, HintTier } from '@game/types';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { VariableBoard } from './VariableBoard';
import { FormulaBoard } from './FormulaBoard';
import { ProgressPanel } from './ProgressPanel';
import { LangSwitch, HelpButton, SettingsButton, PendingEventsBadge } from './GameScreen';
import { HelpPanel } from './HelpPanel';

type MobileTab = 'variables' | 'formulas' | 'progress';

const TABS: { id: MobileTab; icon: string; labelKey: 'panelVariables' | 'panelFormulas' | 'panelProgress' }[] = [
  { id: 'variables', icon: '🔢', labelKey: 'panelVariables' },
  { id: 'formulas', icon: '⚡', labelKey: 'panelFormulas' },
  { id: 'progress', icon: '📊', labelKey: 'panelProgress' },
];

/**
 * Which tab each tutorial step focuses on. Step 4 stays on "formulas" (not
 * "progress") since that's where the final activation control lives.
 */
const TUTORIAL_TAB: Record<number, MobileTab> = {
  1: 'variables',
  2: 'formulas',
  3: 'formulas',
  4: 'formulas',
};

interface GameScreenMobileProps {
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

export function GameScreenMobile({
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
}: GameScreenMobileProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('formulas');
  const [helpOpen, setHelpOpen] = useState(false);
  const { problem } = gameState;
  const title = lang === 'fr' ? problem.title_fr : problem.title;

  // While the tutorial is active, lock the visible tab to the one it is
  // currently explaining, and prevent activations during step 1.
  const tutorialTab = tutorialStep !== null ? TUTORIAL_TAB[tutorialStep] : null;
  useEffect(() => {
    if (tutorialTab) setActiveTab(tutorialTab);
  }, [tutorialTab]);

  const formulaBoardDisabled = tutorialStep === 1;
  const hintsDisabled = tutorialStep !== null;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#F5F6F8', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#fff',
          borderBottom: '1px solid #D6DCE4',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 16, color: '#2E2E2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <PendingEventsBadge count={pendingEventCount} lang={lang} />
          <HelpButton onClick={() => setHelpOpen(true)} lang={lang} />
          <SettingsButton onClick={onOpenSettings} lang={lang} />
          <LangSwitch lang={lang} onChange={onLangChange} />
        </div>
      </header>

      {helpOpen && <HelpPanel phase={gameState.phase} onClose={() => setHelpOpen(false)} lang={lang} />}

      <main style={{ flex: 1, padding: 16, paddingBottom: 84, overflowY: 'auto' }}>
        {activeTab === 'variables' && (
          <div data-tutorial="variables">
            <VariableBoard
              variables={problem.variables}
              identifiedVars={gameState.identifiedVars}
              hypotheses={problem.hypotheses}
              conclusions={problem.conclusions}
              newlyIdentifiedVarId={newlyIdentifiedVarId}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'formulas' && (
          <div data-tutorial="formulas">
            <h3 style={{ margin: '0 0 10px', fontSize: 14, textTransform: 'uppercase', color: '#595959' }}>
              {t('panelFormulas', lang)}
            </h3>
            <FormulaBoard
              formulas={problem.formulas}
              evaluations={evaluations}
              activatedFormulas={gameState.activatedFormulas}
              newlyActivatedFormulaId={newlyActivatedFormulaId}
              swipeToActivate
              disabled={formulaBoardDisabled}
              onActivate={onActivate}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'progress' && (
          <div data-tutorial="progress">
            <ProgressPanel
              gameState={gameState}
              elapsedSeconds={elapsedSeconds}
              onRequestHint={onRequestHint}
              hintsDisabled={hintsDisabled}
              lang={lang}
            />
          </div>
        )}
      </main>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          background: '#fff',
          borderTop: '1px solid #D6DCE4',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {TABS.map(tab => (
          <TabButton
            key={tab.id}
            icon={tab.icon}
            label={t(tab.labelKey, lang)}
            active={activeTab === tab.id}
            disabled={tutorialTab !== null && tutorialTab !== tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </nav>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function TabButton({
  icon, label, active, disabled = false, onClick,
}: { icon: string; label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-current={active}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '8px 0',
        border: 'none',
        background: 'none',
        color: disabled ? '#D6DCE4' : active ? '#2E75B6' : '#8C8C8C',
        fontWeight: active ? 700 : 500,
        fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      {label}
    </button>
  );
}
