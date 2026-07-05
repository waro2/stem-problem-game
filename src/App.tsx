/**
 * App — Root component: AuthProvider + global layout + React Router routes.
 * The game screen (/) preserves all existing logic unchanged.
 */

import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { Formula } from '@game/types';
import type { UserRole } from '@game/types';
import { useGameStore } from '@game/store';
import { loadProblemFromUrl } from '@game/problemLoader';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { initEventClient, subscribeToPendingEvents } from '@api/events';
import { saveSession } from '@api/sessions';
import { createProblem } from '@api/problems';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { GameScreen } from '@components/GameScreen';
import { GameScreenMobile } from '@components/GameScreenMobile';
import { SummaryScreen } from '@components/SummaryScreen';
import { TutorialOverlay } from '@components/TutorialOverlay';
import { AuthProvider, useAuth } from '@auth/AuthContext';
import { ConsentModal } from '@components/ConsentModal';
import { NavBar } from '@components/NavBar';
import { ConceptLibrary } from './pages/ConceptLibrary';
import { Settings } from './pages/Settings';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { Login } from './pages/Login';
import { ProblemLibrary } from './pages/ProblemLibrary';
import { Achievements } from './pages/Achievements';
import { InstructorDashboard } from './pages/InstructorDashboard';
import { ResearchDashboard } from './pages/ResearchDashboard';
import { ProblemEditor } from './pages/ProblemEditor';

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';
const DEFAULT_PROBLEM_URL = '/problems/physics-kinematics-01.json';
const MOBILE_BREAKPOINT = '(max-width: 768px)';

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

// ── Shared helpers ────────────────────────────────────────────────────────────

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

// ── ProtectedRoute ────────────────────────────────────────────────────────────

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}) {
  const { status, profile } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        …
      </div>
    );
  }
  if (status === 'signed-out') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// ── Route page components ─────────────────────────────────────────────────────

function LoginPage() {
  const { status } = useAuth();
  const { lang, setLang } = useGameStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status === 'signed-in') {
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    }
  }, [status, navigate, location]);

  if (status === 'loading' || status === 'signed-in') return null;
  return <Login lang={lang} onLangChange={setLang} />;
}

function LibraryPage() {
  const { profile } = useAuth();
  const { lang, setLang } = useGameStore();
  const navigate = useNavigate();
  return (
    <ProblemLibrary
      apiUrl={API_URL}
      userId={profile!.id}
      lang={lang}
      onLangChange={setLang}
      onSelectProblem={() => navigate('/')}
    />
  );
}

function AchievementsPage() {
  const { profile } = useAuth();
  const { lang, setLang } = useGameStore();
  return (
    <Achievements
      apiUrl={API_URL}
      userId={profile!.id}
      lang={lang}
      onLangChange={setLang}
    />
  );
}

function InstructorPage() {
  const { profile } = useAuth();
  const { lang, setLang } = useGameStore();
  return (
    <InstructorDashboard
      apiUrl={API_URL}
      cohortId={profile?.cohortsManaged?.[0]?.id ?? ''}
      role={profile!.role}
      lang={lang}
      onLangChange={setLang}
    />
  );
}

function ResearchPage() {
  const { lang, setLang } = useGameStore();
  return <ResearchDashboard apiUrl={API_URL} lang={lang} onLangChange={setLang} />;
}

function EditorPage() {
  const { lang, setLang } = useGameStore();
  return <ProblemEditor apiUrl={API_URL} lang={lang} onLangChange={setLang} />;
}

// ── GamePage (existing game logic, unchanged) ─────────────────────────────────

function GamePage() {
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
  } = useGameStore();
  const { profile, getAccessToken } = useAuth();

  const isMobile = useIsMobile();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [newlyIdentifiedVarId, setNewlyIdentifiedVarId] = useState<string | null>(null);
  const [newlyActivatedFormulaId, setNewlyActivatedFormulaId] = useState<string | null>(null);
  const [conceptFormula, setConceptFormula] = useState<Formula | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const prevIdentifiedRef = useRef<ReadonlySet<string> | null>(null);
  const prevActivatedRef = useRef<ReadonlySet<string> | null>(null);

  useEffect(() => {
    loadProblemFromUrl(DEFAULT_PROBLEM_URL).catch(err => console.error('[app] failed to load problem', err));
    return subscribeToPendingEvents(setPendingEventCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the session to the DB whenever the game ends (win or stuck).
  // Only runs when the user is authenticated; anonymous sessions stay local-only.
  useEffect(() => {
    if (!summary || !profile) return;
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const { gameState: gs, sessionStartTime } = useGameStore.getState();
      const p = Capacitor.getPlatform();
      const platform = p === 'ios' || p === 'android' ? p : ('web' as const);
      const startedAt = sessionStartTime
        ? new Date(sessionStartTime).toISOString()
        : new Date(Date.now() - summary.elapsedSeconds * 1000).toISOString();
      const completedAt = new Date().toISOString();
      try {
        // Ensure the problem exists in the DB before creating the session.
        // Problems are loaded from JSON files and are not auto-seeded; the upsert
        // is idempotent so this is a no-op on subsequent plays of the same problem.
        if (gs) await createProblem(API_URL, gs.problem).catch(() => undefined);
        await saveSession(API_URL, {
          problemId: summary.problemId,
          platform,
          outcome: summary.outcome,
          totalSteps: summary.totalSteps,
          optimalSteps: summary.optimalSteps,
          timeElapsedSeconds: summary.elapsedSeconds,
          hintsUsed: summary.hintsUsed,
          finalScore: summary.score.total,
          stepEfficiencyRatio: summary.optimalSteps / Math.max(1, summary.totalSteps),
          activationPath: summary.activationPath,
          startedAt,
          completedAt,
        }, token);
      } catch (err) {
        console.error('[game] failed to save session', err);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, profile?.id]);

  useEffect(() => {
    setElapsedSeconds(0);
  }, [gameState?.problem.id]);

  useEffect(() => {
    if (!gameState || gameState.phase === 'win' || gameState.phase === 'stuck') return;
    const id = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.phase, gameState?.problem.id]);

  useEffect(() => {
    if (!gameState) return;
    const prev = prevIdentifiedRef.current;
    const next = gameState.identifiedVars;
    prevIdentifiedRef.current = next;
    if (!prev) return;
    const newVar = [...next].find(v => !prev.has(v));
    if (!newVar) return;
    setNewlyIdentifiedVarId(newVar);
    const timeout = setTimeout(() => setNewlyIdentifiedVarId(null), 1500);
    return () => clearTimeout(timeout);
  }, [gameState]);

  useEffect(() => {
    if (!gameState) return;
    const prev = prevActivatedRef.current;
    const next = gameState.activatedFormulas;
    prevActivatedRef.current = next;
    if (!prev) return;
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
    <>
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
    </>
  );
}

// ── AppLayout — global chrome (consent, legal overlays, footer, routes) ───────

function AppLayout() {
  const { lang, setLang, announcement } = useGameStore();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const location = useLocation();
  const showNavBar = location.pathname !== '/login';

  // Bootstrap: init analytics client once, hide native splash.
  useEffect(() => {
    initEventClient(API_URL);
    if (Capacitor.isNativePlatform()) void SplashScreen.hide();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ConsentGate lang={lang} onShowPrivacy={() => setShowPrivacy(true)} onShowTerms={() => setShowTerms(true)} />

      <div
        aria-live="polite"
        role="status"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        {announcement}
      </div>

      {showPrivacy && (
        <PrivacyPolicy lang={lang} onLangChange={setLang} onBack={() => setShowPrivacy(false)} />
      )}
      {showTerms && (
        <TermsOfService lang={lang} onLangChange={setLang} onBack={() => setShowTerms(false)} />
      )}

      {!showPrivacy && !showTerms && (
        <>
          {showNavBar && <NavBar lang={lang} />}
          <Routes>
            <Route path="/" element={<GamePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/library"
              element={<ProtectedRoute><LibraryPage /></ProtectedRoute>}
            />
            <Route
              path="/achievements"
              element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>}
            />
            <Route
              path="/instructor"
              element={
                <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                  <InstructorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/research"
              element={
                <ProtectedRoute allowedRoles={['researcher', 'admin']}>
                  <ResearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor"
              element={
                <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                  <EditorPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

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
        </>
      )}
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <AuthProvider apiUrl={API_URL}>
      <AppLayout />
    </AuthProvider>
  );
}
