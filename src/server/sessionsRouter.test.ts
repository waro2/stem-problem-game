/**
 * Tests for POST /api/sessions — session persistence.
 * Run: npx vitest src/server/sessionsRouter.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { jwtVerify } from 'jose';
import type { Server } from 'node:http';
import { createApp, type Database } from './app';

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  jwtVerify: vi.fn(),
}));

process.env['SUPABASE_URL'] = 'https://test.supabase.co';

const SECRET = 'test-secret';
const TOKEN = 'valid-test-token';

const mockedJwtVerify = vi.mocked(jwtVerify);

let server: Server;
let baseUrl: string;

const VALID_BODY = {
  problemId: 'p-kinematics-01',
  platform: 'web',
  outcome: 'win',
  totalSteps: 5,
  optimalSteps: 4,
  timeElapsedSeconds: 42.5,
  hintsUsed: 0,
  finalScore: 900,
  stepEfficiencyRatio: 0.8,
  activationPath: ['f1', 'f2', 'f3'],
  startedAt: '2025-01-01T10:00:00.000Z',
  completedAt: '2025-01-01T10:00:42.500Z',
};

beforeEach(() => {
  mockedJwtVerify.mockReset();
  mockedJwtVerify.mockResolvedValue({
    payload: { sub: 'user-1', email: 'alice@example.com' },
  } as never);
});

function start(db: Database) {
  const app = createApp(db, { jwtSecret: SECRET });
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

describe('POST /api/sessions — happy path', () => {
  beforeEach(async () => {
    await start({
      session: {
        create: vi.fn().mockResolvedValue({ id: 'session-abc' }),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
    } as unknown as Database);
  });

  it('creates a session and returns its id', async () => {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'session-abc' });
  });
});

describe('POST /api/sessions — auth guard', () => {
  beforeEach(async () => {
    await start({
      session: {
        create: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
    } as unknown as Database);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    mockedJwtVerify.mockResolvedValue(null as never);
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer bad-token',
      },
      body: JSON.stringify(VALID_BODY),
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/sessions — validation', () => {
  beforeEach(async () => {
    await start({
      session: {
        create: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
    } as unknown as Database);
  });

  it('returns 400 when outcome is missing', async () => {
    const { outcome, ...body } = VALID_BODY;
    void outcome;
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when platform is invalid', async () => {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ ...VALID_BODY, platform: 'unknown' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when totalSteps is negative', async () => {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ ...VALID_BODY, totalSteps: -1 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when startedAt is not a valid ISO date', async () => {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ ...VALID_BODY, startedAt: 'not-a-date' }),
    });
    expect(res.status).toBe(400);
  });
});
