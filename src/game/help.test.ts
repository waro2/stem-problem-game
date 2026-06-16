/**
 * Tests for in-game help content lookup.
 * Run: npx vitest src/game/help.test.ts
 */

import { describe, it, expect } from 'vitest';
import { getHelpContent } from './help';
import type { GamePhase } from './types';

const PHASES: readonly GamePhase[] = ['setup', 'scan', 'activate', 'cascade', 'win', 'stuck'];

describe('getHelpContent', () => {
  it('returns a title and description key for every game phase', () => {
    for (const phase of PHASES) {
      const content = getHelpContent(phase);
      expect(content.titleKey).toMatch(/^helpPhase/);
      expect(content.descKey).toMatch(/^helpPhase/);
    }
  });

  it('returns phase-specific keys for scan, activate and stuck', () => {
    expect(getHelpContent('scan')).toEqual({ titleKey: 'helpPhaseScanTitle', descKey: 'helpPhaseScanDesc' });
    expect(getHelpContent('activate')).toEqual({ titleKey: 'helpPhaseActivateTitle', descKey: 'helpPhaseActivateDesc' });
    expect(getHelpContent('stuck')).toEqual({ titleKey: 'helpPhaseStuckTitle', descKey: 'helpPhaseStuckDesc' });
  });
});
