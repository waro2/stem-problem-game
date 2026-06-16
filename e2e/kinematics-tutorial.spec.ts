/**
 * E2E scenario: tutorial walk-through → solve physics-kinematics-01 → DB assertions.
 *
 * Problem: p-kinematics-01  (H={d,v,m}, C={F}, optimal path f1→f3→f2)
 *   f1: d = v · t  (activatable at start — reveals t)
 *   f3: a = v / t  (activatable after f1   — reveals a)
 *   f2: F = m · a  (activatable after f3   — reveals F = conclusion → win)
 *
 * Tutorial steps:
 *   Step 1 — variables panel spotlighted; player clicks "Suivant →"
 *   Step 2 — formulas panel spotlighted; player activates f1 (auto-advances to step 3)
 *   Step 3 — formulas panel spotlighted; player activates f3 (auto-advances to step 4)
 *   Step 4 — progress panel spotlighted; player activates f2 → win → tutorial done
 *
 * Score formula (GDD §6.2):
 *   total = 1000 − steps×20 − hints×50 + max(0, 200 − elapsed×2)
 *   Minimum score for optimal 3-step, hint-free solve: 1000 − 60 = 940
 *
 * DB assertions (events table):
 *   1. A problem_completed row exists for this userId + problemId
 *   2. payload.finalScore matches the score shown in the UI
 *   3. payload.outcome === 'win', payload.activationPath === ['f1','f3','f2']
 */

import { test, expect } from '@playwright/test';
import { findLastEvent, disconnectDb } from './helpers/db';

const PROBLEM_ID = 'p-kinematics-01';
const MIN_OPTIMAL_SCORE = 1000 - 3 * 20; // 940 — lower bound with no time bonus

test.afterAll(async () => {
  await disconnectDb();
});

test('tutorial → cinématique → score en base → événement problem_completed', async ({ page }) => {
  // ── 1. Charger l'application ──────────────────────────────────────────────
  await page.goto('/');

  // Wait for the kinematics problem to finish loading (GameScreen renders the formula board).
  await page.waitForSelector('[data-tutorial="formulas"]');

  // ── 2. Étape tutoriel 1 — cliquer "Suivant →" ────────────────────────────
  // The TutorialOverlay shows "Suivant →" only at step 1 (onNext = nextTutorialStep).
  // At this step the formula board is disabled (formulaBoardDisabled = tutorialStep === 1).
  const nextBtn = page.getByRole('button', { name: 'Suivant →' });
  await expect(nextBtn).toBeVisible();
  await nextBtn.click();

  // ── 3. Étape tutoriel 2 — activer f1 (révèle t) ──────────────────────────
  // After step 1 → 2, the formula board is enabled. f1 is the only activatable formula.
  // FormulaCard outer div has role="button" and aria-label containing "Formule f1" and "Activable".
  const f1Card = page.getByRole('button', { name: /Formule f1.*Activable/ });
  await expect(f1Card).toBeVisible();
  await f1Card.click();

  // ── 4. Étape tutoriel 3 — activer f3 (révèle a) ──────────────────────────
  // f1 activation reveals t, making f3 the next activatable formula.
  // store.ts advances tutorialStep 2→3 after the activation.
  const f3Card = page.getByRole('button', { name: /Formule f3.*Activable/ });
  await expect(f3Card).toBeVisible();
  await f3Card.click();

  // ── 5. Étape tutoriel 4 — activer f2 (révèle F = conclusion → victoire) ──
  // f3 activation reveals a, making f2 activatable. Activating f2 reveals F (the conclusion),
  // setting phase → 'win'. store.ts calls endSession() then markTutorialDone().
  const f2Card = page.getByRole('button', { name: /Formule f2.*Activable/ });
  await expect(f2Card).toBeVisible();
  await f2Card.click();

  // ── 6. L'écran de résumé doit apparaître ─────────────────────────────────
  await expect(page.getByText('🎉 Problème résolu !')).toBeVisible();

  // ── 7. Lire le score affiché dans l'interface ─────────────────────────────
  // SummaryScreen renders <Row label="Score final" value={score.total} bold />, which produces:
  //   <div><span>Score final</span><span>{score.total}</span></div>
  // score.total is Math.round(...) so always an integer.
  const scoreFinalLabel = page.getByText('Score final', { exact: true });
  const scoreRow = scoreFinalLabel.locator('..');
  const scoreText = await scoreRow.locator('span').last().textContent();
  const uiScore = parseInt(scoreText ?? '0', 10);
  expect(uiScore).toBeGreaterThanOrEqual(MIN_OPTIMAL_SCORE);

  // ── 8. Lire le userId depuis le localStorage ──────────────────────────────
  // store.ts writes the anonymous user id to localStorage on first load.
  const userId = await page.evaluate(
    () => window.localStorage.getItem('stem_game_user_id'),
  );
  expect(userId).toBeTruthy();

  // ── 9. Vider la file d'événements vers le serveur (flush immédiat) ────────
  // EventQueue.listenForReconnect() registers: window.addEventListener('online', () => flush()).
  // Dispatching 'online' triggers an immediate POST /api/events instead of waiting 30s.
  const [flushResponse] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('/api/events') && resp.status() === 202,
      { timeout: 15_000 },
    ),
    page.evaluate(() => window.dispatchEvent(new Event('online'))),
  ]);
  expect(flushResponse.status()).toBe(202);

  // ── 10. Vérifier l'événement problem_completed dans la table events ───────
  const event = await findLastEvent(userId!, PROBLEM_ID, 'problem_completed');
  expect(event).not.toBeNull();

  const payload = event!.payload;
  expect(payload.outcome).toBe('win');
  expect(payload.activationPath).toEqual(['f1', 'f3', 'f2']);
  expect(payload.totalSteps).toBe(3);
  expect(payload.hintsUsed).toBe(0);

  // ── 11. Vérifier le score en base correspond au score affiché ─────────────
  // This cross-checks that what the player saw equals what was persisted —
  // the canonical record of the score is the problem_completed event payload.
  expect(payload.finalScore).toBe(uiScore);
  expect(payload.finalScore).toBeGreaterThanOrEqual(MIN_OPTIMAL_SCORE);
});
