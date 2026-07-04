/**
 * POST /api/sessions — persist a completed game session to the database.
 * Only called when the user is authenticated; anonymous sessions stay local-only.
 */

import type { Platform, GameOutcome } from '@game/types';

export interface SaveSessionPayload {
  problemId: string;
  platform: Platform;
  outcome: GameOutcome;
  totalSteps: number;
  optimalSteps: number;
  timeElapsedSeconds: number;
  hintsUsed: number;
  finalScore: number;
  stepEfficiencyRatio: number;
  activationPath: string[];
  startedAt: string;   // ISO-8601
  completedAt: string; // ISO-8601
}

/** Returns the new session id, or throws on network / server error. */
export async function saveSession(
  apiUrl: string,
  payload: SaveSessionPayload,
  token: string,
): Promise<string> {
  const res = await fetch(`${apiUrl}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[sessions] POST /api/sessions failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}
