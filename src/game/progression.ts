/**
 * Problem progression — unlock rules (GDD §5)
 *
 * Problems unlock sequentially in catalog order: the first problem is
 * always unlocked, and each subsequent problem unlocks once the one
 * before it has been completed.
 *
 * Pure functions only — no side effects, no imports from React.
 */

/** Return the set of problem IDs that are currently unlocked, given catalog order and completed IDs. */
export function computeUnlockedIds(
  orderedProblemIds: readonly string[],
  completedIds: ReadonlySet<string>
): Set<string> {
  const unlocked = new Set<string>();

  for (let i = 0; i < orderedProblemIds.length; i++) {
    const id = orderedProblemIds[i];
    if (id === undefined) break;

    if (i === 0) {
      unlocked.add(id);
      continue;
    }

    const previousId = orderedProblemIds[i - 1];
    if (previousId !== undefined && completedIds.has(previousId)) {
      unlocked.add(id);
    } else {
      break; // progression is strictly sequential
    }
  }

  return unlocked;
}

/** True iff the given problem is unlocked, given catalog order and completed IDs. */
export function isUnlocked(
  problemId: string,
  orderedProblemIds: readonly string[],
  completedIds: ReadonlySet<string>
): boolean {
  return computeUnlockedIds(orderedProblemIds, completedIds).has(problemId);
}
