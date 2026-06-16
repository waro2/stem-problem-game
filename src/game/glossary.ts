/**
 * Deduction glossary — core vocabulary definitions  (CLAUDE.md domain vocabulary)
 * Shown in HelpPanel.tsx under Settings → Help.
 *
 * Pure functions only — no side effects, no imports from React.
 */

/** i18n keys used by the glossary (kept in sync with src/i18n/strings.ts). */
export type GlossaryStringKey =
  | 'glossaryVariableTerm'    | 'glossaryVariableDesc'
  | 'glossaryFormulaTerm'     | 'glossaryFormulaDesc'
  | 'glossaryHypothesisTerm'  | 'glossaryHypothesisDesc'
  | 'glossaryConclusionTerm'  | 'glossaryConclusionDesc'
  | 'glossaryActivationTerm'  | 'glossaryActivationDesc'
  | 'glossaryCascadeTerm'     | 'glossaryCascadeDesc';

export interface GlossaryEntry {
  termKey: GlossaryStringKey;
  descKey: GlossaryStringKey;
}

const GLOSSARY_ENTRIES: readonly GlossaryEntry[] = [
  { termKey: 'glossaryVariableTerm',   descKey: 'glossaryVariableDesc' },
  { termKey: 'glossaryFormulaTerm',    descKey: 'glossaryFormulaDesc' },
  { termKey: 'glossaryHypothesisTerm', descKey: 'glossaryHypothesisDesc' },
  { termKey: 'glossaryConclusionTerm', descKey: 'glossaryConclusionDesc' },
  { termKey: 'glossaryActivationTerm', descKey: 'glossaryActivationDesc' },
  { termKey: 'glossaryCascadeTerm',    descKey: 'glossaryCascadeDesc' },
];

/** Ordered list of glossary entries (term + definition i18n keys). */
export function getGlossaryEntries(): readonly GlossaryEntry[] {
  return GLOSSARY_ENTRIES;
}
