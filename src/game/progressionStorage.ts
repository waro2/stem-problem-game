/**
 * Problem progression — localStorage persistence (GDD §5, §9.4)
 *
 * Tracks which problems a player has completed, so unlock state
 * (src/game/progression.ts) survives reloads without a server round-trip.
 */

const COMPLETED_PROBLEMS_KEY = 'stem_game_completed_problems';

/** Read the set of problem IDs the player has completed. */
export function getCompletedProblemIds(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_PROBLEMS_KEY);
    if (!raw) return new Set();

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

/** Record that the player has completed the given problem. */
export function markProblemCompleted(problemId: string): void {
  const completed = new Set(getCompletedProblemIds());
  completed.add(problemId);

  try {
    localStorage.setItem(COMPLETED_PROBLEMS_KEY, JSON.stringify([...completed]));
  } catch {
    // storage unavailable or full — progression simply won't persist
  }
}
