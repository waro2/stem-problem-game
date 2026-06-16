/**
 * Tests for the deduction glossary entries.
 * Run: npx vitest src/game/glossary.test.ts
 */

import { describe, it, expect } from 'vitest';
import { getGlossaryEntries } from './glossary';

describe('getGlossaryEntries', () => {
  it('lists exactly the six core vocabulary terms', () => {
    const entries = getGlossaryEntries();

    expect(entries).toHaveLength(6);
    expect(entries.map(e => e.termKey)).toEqual([
      'glossaryVariableTerm',
      'glossaryFormulaTerm',
      'glossaryHypothesisTerm',
      'glossaryConclusionTerm',
      'glossaryActivationTerm',
      'glossaryCascadeTerm',
    ]);
  });

  it('pairs each term with its matching definition key', () => {
    for (const entry of getGlossaryEntries()) {
      const expectedDescKey = entry.termKey.replace(/Term$/, 'Desc');
      expect(entry.descKey).toBe(expectedDescKey);
    }
  });
});
