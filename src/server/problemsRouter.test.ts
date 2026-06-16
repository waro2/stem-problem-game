/**
 * Tests for POST /api/problems.
 * Run: npx vitest src/server/problemsRouter.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { createApp, type Database } from './app';

const SOLVABLE_PROBLEM = {
  id: 'p-kinematics-01',
  domain: 'physics',
  difficulty: 'intermediate',
  title: 'Kinematics Chain',
  title_fr: 'Chaîne Cinématique',
  variables: [
    { id: 'd', label: 'distance', label_fr: 'distance', unit: 'm', domain: 'physics' },
    { id: 'v', label: 'velocity', label_fr: 'vitesse', unit: 'm/s', domain: 'physics' },
    { id: 't', label: 'time', label_fr: 'temps', unit: 's', domain: 'physics' },
  ],
  formulas: [
    { id: 'f1', expression: 'd = v · t', variableIds: ['d', 'v', 't'] },
  ],
  hypotheses: ['d', 'v'],
  conclusions: ['t'],
};

// 'm' is never identified by any formula, so the conclusion is unreachable.
const UNSOLVABLE_PROBLEM = {
  ...SOLVABLE_PROBLEM,
  id: 'p-unsolvable-01',
  hypotheses: ['d', 'v'],
  conclusions: ['m'],
};

let server: Server;
let baseUrl: string;
let upsert: ReturnType<typeof vi.fn>;

function start(db: Database) {
  const app = createApp(db);
  return new Promise<void>(resolve => {
    server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
}

afterEach(() => new Promise<void>(resolve => server.close(() => resolve())));

describe('POST /api/problems', () => {
  beforeEach(async () => {
    upsert = vi.fn().mockResolvedValue({ id: SOLVABLE_PROBLEM.id });
    await start({ problem: { upsert } } as unknown as Database);
  });

  it('accepts a solvable problem and persists it', async () => {
    const res = await fetch(`${baseUrl}/api/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SOLVABLE_PROBLEM),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ id: SOLVABLE_PROBLEM.id, optimalSteps: 1, solvable: true });

    expect(upsert).toHaveBeenCalledTimes(1);
    const [{ where, create, update }] = upsert.mock.calls[0]!;
    expect(where).toEqual({ id: SOLVABLE_PROBLEM.id });
    expect(create).toMatchObject({
      id: SOLVABLE_PROBLEM.id,
      domain: 'physics',
      difficulty: 'intermediate',
      titleEn: SOLVABLE_PROBLEM.title,
      titleFr: SOLVABLE_PROBLEM.title_fr,
      hypotheses: SOLVABLE_PROBLEM.hypotheses,
      conclusions: SOLVABLE_PROBLEM.conclusions,
      optimalSteps: 1,
      solvable: true,
    });
    expect(update).toEqual(create);
  });

  it('rejects an unsolvable problem with 400 and never persists it', async () => {
    const res = await fetch(`${baseUrl}/api/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(UNSOLVABLE_PROBLEM),
    });

    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects a malformed body with 400', async () => {
    const res = await fetch(`${baseUrl}/api/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'p-incomplete' }),
    });

    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('POST /api/problems — persistence failure', () => {
  beforeEach(async () => {
    upsert = vi.fn().mockRejectedValue(new Error('connection refused'));
    await start({ problem: { upsert } } as unknown as Database);
  });

  it('returns 500 when the database write fails', async () => {
    const res = await fetch(`${baseUrl}/api/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SOLVABLE_PROBLEM),
    });

    expect(res.status).toBe(500);
  });
});

describe('GET /api/problems', () => {
  const problemFindMany = vi.fn().mockResolvedValue([
    { id: 'p-kinematics-01', domain: 'physics', difficulty: 'intermediate', titleEn: 'Kinematics Chain', titleFr: 'Chaîne Cinématique' },
  ]);

  it('returns the catalog with completed=false and previousScore=null when no userId is given', async () => {
    const sessionFindMany = vi.fn();
    await start({ problem: { findMany: problemFindMany }, session: { findMany: sessionFindMany } } as unknown as Database);

    const res = await fetch(`${baseUrl}/api/problems`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([
      { id: 'p-kinematics-01', domain: 'physics', difficulty: 'intermediate', title: 'Kinematics Chain', title_fr: 'Chaîne Cinématique', completed: false, previousScore: null },
    ]);
    expect(sessionFindMany).not.toHaveBeenCalled();
  });

  it('annotates the catalog with the user\'s completion status and previous score', async () => {
    const sessionFindMany = vi.fn().mockResolvedValue([
      { problemId: 'p-kinematics-01', outcome: 'win', finalScore: 900, startedAt: new Date('2026-06-03T10:00:00Z') },
    ]);
    await start({ problem: { findMany: problemFindMany }, session: { findMany: sessionFindMany } } as unknown as Database);

    const res = await fetch(`${baseUrl}/api/problems?userId=user-1`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([
      { id: 'p-kinematics-01', domain: 'physics', difficulty: 'intermediate', title: 'Kinematics Chain', title_fr: 'Chaîne Cinématique', completed: true, previousScore: 900 },
    ]);
    expect(sessionFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', outcome: { not: null } },
      select: { problemId: true, outcome: true, finalScore: true, startedAt: true },
    });
  });

  it('returns 500 when the database read fails', async () => {
    await start({
      problem: { findMany: vi.fn().mockRejectedValue(new Error('connection refused')) },
      session: { findMany: vi.fn() },
    } as unknown as Database);

    const res = await fetch(`${baseUrl}/api/problems`);
    expect(res.status).toBe(500);
  });
});
