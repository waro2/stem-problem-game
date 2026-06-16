/**
 * ExplorationMode — Suggests an additional hypothesis when a problem is
 * not solvable from H  (GDD §3, §9.3)
 *
 * For each variable not already in H, checks (via validateSolvability())
 * whether adding it to H would make the problem solvable. Renders nothing
 * if the problem is already solvable from H.
 */

import { validateSolvability, findUnlockingHypotheses } from '@game/engine';
import type { Problem } from '@game/types';
import { t } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface ExplorationModeProps {
  problem: Problem;
  lang: Lang;
  /** Called when the player picks a candidate hypothesis to add to H. */
  onSelectHypothesis?: (variableId: string) => void;
}

export function ExplorationMode({ problem, lang, onSelectHypothesis }: ExplorationModeProps) {
  if (validateSolvability(problem)) return null;

  const varById = new Map(problem.variables.map(v => [v.id, v]));
  const candidates = findUnlockingHypotheses(problem)
    .map(vid => varById.get(vid))
    .filter((v): v is NonNullable<typeof v> => v !== undefined);

  return (
    <section style={{ background: '#fff', border: '1px solid #D6DCE4', borderRadius: 10, padding: 16 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 14, color: '#2E2E2E' }}>{t('explorationModeTitle', lang)}</h2>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#595959' }}>{t('explorationModeDescription', lang)}</p>

      {candidates.length === 0 ? (
        <div style={{ fontSize: 13, color: '#595959' }}>{t('explorationNoCandidateMsg', lang)}</div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {candidates.map(v => (
            <button
              key={v.id}
              onClick={() => onSelectHypothesis?.(v.id)}
              style={{
                border: '1px solid #2E75B6',
                background: '#fff',
                color: '#2E75B6',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {lang === 'fr' ? v.label_fr : v.label}
              {v.unit ? ` (${v.unit})` : ''}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
