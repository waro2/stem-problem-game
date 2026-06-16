/**
 * In-game help content — maps the current GamePhase to the i18n keys
 * used by HelpPanel.tsx to explain what the player should do next.
 * Source: GDD §3 (Activation rule), §5 (UI Design)
 *
 * Pure functions only — no side effects, no imports from React.
 */

import type { GamePhase } from './types';

/** i18n keys used by HelpPanel (kept as a literal union so they stay in
 *  sync with the corresponding entries in src/i18n/strings.ts). */
export type HelpStringKey =
  | 'helpPhaseSetupTitle'    | 'helpPhaseSetupDesc'
  | 'helpPhaseScanTitle'     | 'helpPhaseScanDesc'
  | 'helpPhaseActivateTitle' | 'helpPhaseActivateDesc'
  | 'helpPhaseCascadeTitle'  | 'helpPhaseCascadeDesc'
  | 'helpPhaseWinTitle'      | 'helpPhaseWinDesc'
  | 'helpPhaseStuckTitle'    | 'helpPhaseStuckDesc';

export interface HelpContent {
  titleKey: HelpStringKey;
  descKey: HelpStringKey;
}

const PHASE_HELP: Record<GamePhase, HelpContent> = {
  setup:    { titleKey: 'helpPhaseSetupTitle',    descKey: 'helpPhaseSetupDesc' },
  scan:     { titleKey: 'helpPhaseScanTitle',     descKey: 'helpPhaseScanDesc' },
  activate: { titleKey: 'helpPhaseActivateTitle', descKey: 'helpPhaseActivateDesc' },
  cascade:  { titleKey: 'helpPhaseCascadeTitle',  descKey: 'helpPhaseCascadeDesc' },
  win:      { titleKey: 'helpPhaseWinTitle',      descKey: 'helpPhaseWinDesc' },
  stuck:    { titleKey: 'helpPhaseStuckTitle',    descKey: 'helpPhaseStuckDesc' },
};

/** Get the i18n keys describing the current game phase. */
export function getHelpContent(phase: GamePhase): HelpContent {
  return PHASE_HELP[phase];
}
