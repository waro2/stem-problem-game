/**
 * App — Main page of the web UI  (GDD §5.1)
 * Handles bootstrap (problem loading, analytics client, timers) and
 * delegates the three-panel layout to GameScreen.
 */

import { useEffect, useRef, useState } from 'react';
import type { Formula } from '@game/types';
import { useGameStore } from '@game/store';
import { loadProblemFromUrl } from '@game/problemLoader';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { initEventClient, subscribeToPendingEvents } from '@api/events';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { GameScreen } from '@components/GameScreen';
import { GameScreenMobile } from '@components/GameScreenMobile';
import { SummaryScreen } from '@components/SummaryScreen';
import { TutorialOverlay } from '@components/TutorialOverlay';
import { AuthProvider, useAuth } from '@auth/AuthContext';
import { ConsentModal } from '@components/ConsentModal';
import { ConceptLibrary } from './pages/ConceptLibrary';
import { Settings } from './pages/Settings';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';
const DEFAULT_PROBLEM_URL = '/problems/physics-kinematics-01.json';
const MOBILE_BREAKPOINT = '(max-width: 768px)';

/** Panel spotlighted by each tutorial step. Step 4 targets the Progress panel
 *  on desktop, but stays on the Formulas panel on mobile (where the final
 *  swipe-to-activate control lives). */
const TUTORIAL_TARGET_DESKTOP: Record<number, string> = {
  1: '[data-tutorial="variables"]',
  2: '[data-tutorial="formulas"]',
  3: '[data-tutorial="formulas"]',
  4: '[data-tutorial="progress"]',
};
const TUTORIAL_TARGET_MOBILE: Record<number, string> = {
  ...TUTORIAL_TARGET_DESKTOP,
  4: '[data-tutorial="formulas"]',
};

/**
 * Renders the GDPR consent banner when an authenticated profile has not
 * yet decided whether to allow analytics (GDD §8.4). Must be rendered
 * inside <AuthProvider>.
 */
function ConsentGate({
  lang,
  onShowPrivacy,
  onShowTerms,
}: {
  lang: Lang;
  onShowPrivacy: () => void;
  onShowTerms: () => void;
}) {
  const { needsConsent } = useAuth();
  if (!needsConsent) return null;
  return <ConsentModal lang={lang} onShowPrivacy={onShowPrivacy} onShowTerms={onShowTerms} />;
}

/** True when the viewport matches the mobile breakpoint. */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_BREAKPOINT).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export function App() {
  const {
    gameState,
    summary,
    lang,
    setLang,
    loadProblem,
    activate,
    requestHint,
    getAllEvaluations,
    tutorialStep,
    nextTutorialStep,
    skipTutorial,
    pendingEventCount,
    setPendingEventCount,
    announcement,
  } = useGameStore();

  const isMobile = useIsMobile();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [newlyIdentifiedVarId, setNewlyIdentifiedVarId] = useState<string | null>(null);
  const [newlyActivatedFormulaId, setNewlyActivatedFormulaId] = useState<string | null>(null);
  const [conceptFormula, setConceptFormula] = useState<Formula | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const prevIdentifiedRef = useRef<ReadonlySet<string> | null>(null);
  const prevActivatedRef = useRef<ReadonlySet<string> | null>(null);

  // Bootstrap: init the analytics client, load the first problem, hide native splash.
  useEffect(() => {
    initEventClient(API_URL);
    loadProblemFromUrl(DEFAULT_PROBLEM_URL).catch(err => console.error('[app] failed to load problem', err));
    if (Capacitor.isNativePlatform()) {
      void SplashScreen.hide();
    }
    return subscribeToPendingEvents(setPendingEventCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only: all refs are module-level constants or stable Zustand actions

  // Reset the clock whenever a new problem is loaded.
  useEffect(() => {
    setElapsedSeconds(0);
  }, [gameState?.problem.id]); // only react to problem change, not every state update

  // Tick the clock while the session is active.
  useEffect(() => {
    if (!gameState || gameState.phase === 'win' || gameState.phase === 'stuck') return;
    const id = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.phase, gameState?.problem.id]); // gameState.phase/.problem.id are the only volatile parts that should restart the interval

  // Briefly flag the variable revealed by the most recent activation.
  useEffect(() => {
    if (!gameState) return;
    const prev = prevIdentifiedRef.current;
    const next = gameState.identifiedVars;
    prevIdentifiedRef.current = next;
    if (!prev) return; // first load — nothing to flash yet

    const newVar = [...next].find(v => !prev.has(v));
    if (!newVar) return;

    setNewlyIdentifiedVarId(newVar);
    const timeout = setTimeout(() => setNewlyIdentifiedVarId(null), 1500);
    return () => clearTimeout(timeout);
  }, [gameState]);

  // Briefly flag the formula activated by the most recent step (golden halo, 0.5s).
  useEffect(() => {
    if (!gameState) return;
    const prev = prevActivatedRef.current;
    const next = gameState.activatedFormulas;
    prevActivatedRef.current = next;
    if (!prev) return; // first load — nothing to flash yet

    const newFormula = [...next].find(f => !prev.has(f));
    if (!newFormula) return;

    setNewlyActivatedFormulaId(newFormula);
    const timeout = setTimeout(() => setNewlyActivatedFormulaId(null), 500);
    return () => clearTimeout(timeout);
  }, [gameState]);

  if (!gameState) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        {t('loading', lang)}
      </div>
    );
  }

  const handleReplay = () => {
    prevIdentifiedRef.current = null;
    prevActivatedRef.current = null;
    setNewlyIdentifiedVarId(null);
    setNewlyActivatedFormulaId(null);
    setConceptFormula(null);
    loadProblem(gameState.problem);
  };

  const Screen = isMobile ? GameScreenMobile : GameScreen;

  return (
    <AuthProvider apiUrl={API_URL}>
      <ConsentGate
        lang={lang}
        onShowPrivacy={() => setShowPrivacy(true)}
        onShowTerms={() => setShowTerms(true)}
      />

      {/* Screen-reader live region */}
      <div
        aria-live="polite"
        role="status"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        {announcement}
      </div>

      {/* Legal pages — fixed overlays above ConsentModal (zIndex 1100) */}
      {showPrivacy && (
        <PrivacyPolicy lang={lang} onLangChange={setLang} onBack={() => setShowPrivacy(false)} />
      )}
      {showTerms && (
        <TermsOfService lang={lang} onLangChange={setLang} onBack={() => setShowTerms(false)} />
      )}

      {showSettings ? (
        <Settings lang={lang} onLangChange={setLang} onBack={() => setShowSettings(false)} />
      ) : (
        <>
          <Screen
            gameState={gameState}
            evaluations={getAllEvaluations()}
            elapsedSeconds={elapsedSeconds}
            newlyIdentifiedVarId={newlyIdentifiedVarId}
            newlyActivatedFormulaId={newlyActivatedFormulaId}
            onActivate={activate}
            onRequestHint={requestHint}
            lang={lang}
            onLangChange={setLang}
            onOpenSettings={() => setShowSettings(true)}
            tutorialStep={tutorialStep}
            pendingEventCount={pendingEventCount}
          />
          {tutorialStep !== null && (
            <TutorialOverlay
              step={tutorialStep}
              targetSelector={(isMobile ? TUTORIAL_TARGET_MOBILE : TUTORIAL_TARGET_DESKTOP)[tutorialStep]!}
              onNext={tutorialStep === 1 ? nextTutorialStep : undefined}
              onSkip={skipTutorial}
              lang={lang}
              isMobile={isMobile}
            />
          )}
          {summary && !conceptFormula && (
            <SummaryScreen
              summary={summary}
              problem={gameState.problem}
              onReplay={handleReplay}
              onOpenConcept={setConceptFormula}
              lang={lang}
            />
          )}
          {conceptFormula && (
            <ConceptLibrary
              formula={conceptFormula}
              variables={gameState.problem.variables.filter(v => conceptFormula.variableIds.includes(v.id))}
              lang={lang}
              onLangChange={setLang}
              onBack={() => setConceptFormula(null)}
            />
          )}
        </>
      )}

      {/* Footer — hidden when a full-screen page is active */}
      {!showPrivacy && !showTerms && !showSettings && (
        <footer
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            padding: '6px 16px',
            background: 'rgba(255,255,255,0.92)',
            borderTop: '1px solid #E8ECF0',
            backdropFilter: 'blur(4px)',
          }}
        >
          <button
            onClick={() => setShowPrivacy(true)}
            style={{ border: 'none', background: 'none', color: '#8C8C8C', fontSize: 11, cursor: 'pointer', padding: 0 }}
          >
            {t('footerPrivacyLink', lang)}
          </button>
          <button
            onClick={() => setShowTerms(true)}
            style={{ border: 'none', background: 'none', color: '#8C8C8C', fontSize: 11, cursor: 'pointer', padding: 0 }}
          >
            {t('footerTermsLink', lang)}
          </button>
        </footer>
      )}
    </AuthProvider>
  );
}
