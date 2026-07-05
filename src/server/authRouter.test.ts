/**
 * Tests for the Supabase Auth integration API.
 * Run: npx vitest src/server/authRouter.test.ts
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

const SECRET = 'unused-now-verification-goes-through-jwks';
const TOKEN = 'valid-test-token';

const mockedJwtVerify = vi.mocked(jwtVerify);

let server: Server;
let baseUrl: string;

beforeEach(() => {
  mockedJwtVerify.mockReset();
  mockedJwtVerify.mockResolvedValue({ payload: { sub: 'user-1', email: 'alice@example.com' } } as never);
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

describe('POST /api/auth/sync', () => {
  beforeEach(async () => {
    await start({
      user: {
        upsert: vi.fn().mockResolvedValue({ id: 'user-1', name: null, email: 'alice@example.com', role: 'student', consentGivenAt: null, analyticsConsent: null }),
        update: vi.fn(),
      },
      session: { updateMany: vi.fn() },
      event: { updateMany: vi.fn() },
      $executeRaw: vi.fn(),
    } as unknown as Database);
  });

  it('upserts and returns the user profile for a valid token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'user-1', name: null, email: 'alice@example.com', role: 'student', consentGivenAt: null, analyticsConsent: null });
  });

  it('returns 401 without a bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/sync`, { method: 'POST' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/consent', () => {
  const update = vi.fn().mockResolvedValue({ consentGivenAt: new Date('2026-06-13T00:00:00.000Z'), analyticsConsent: true });

  beforeEach(async () => {
    update.mockClear();
    update.mockResolvedValue({ consentGivenAt: new Date('2026-06-13T00:00:00.000Z'), analyticsConsent: true });
    await start({
      user: {
        upsert: vi.fn(),
        update,
      },
      session: { updateMany: vi.fn() },
      event: { updateMany: vi.fn() },
      $executeRaw: vi.fn(),
    } as unknown as Database);
  });

  it('records acceptance of GDPR analytics consent for the authenticated user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/consent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ granted: true }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ consentGivenAt: '2026-06-13T00:00:00.000Z', analyticsConsent: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: { consentGivenAt: expect.any(Date), analyticsConsent: true },
    }));
  });

  it('records refusal of GDPR analytics consent for the authenticated user', async () => {
    update.mockResolvedValue({ consentGivenAt: new Date('2026-06-13T00:00:00.000Z'), analyticsConsent: false });

    const res = await fetch(`${baseUrl}/api/auth/consent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ granted: false }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ consentGivenAt: '2026-06-13T00:00:00.000Z', analyticsConsent: false });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: { consentGivenAt: expect.any(Date), analyticsConsent: false },
    }));
  });

  it('rejects a request with a missing or non-boolean "granted"', async () => {
    const res = await fetch(`${baseUrl}/api/auth/consent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/link-anonymous', () => {
  beforeEach(async () => {
    await start({
      user: { upsert: vi.fn(), update: vi.fn() },
      session: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
      event: { updateMany: vi.fn().mockResolvedValue({ count: 7 }) },
      $executeRaw: vi.fn(),
    } as unknown as Database);
  });

  it('migrates the anonymous device sessions and events to the authenticated account', async () => {
    const res = await fetch(`${baseUrl}/api/auth/link-anonymous`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymousId: 'anon-123' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ migratedSessions: 3, migratedEvents: 7 });
  });

  it('rejects a request without an anonymousId', async () => {
    const res = await fetch(`${baseUrl}/api/auth/link-anonymous`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('short-circuits with zero counts when anonymousId matches the authenticated id', async () => {
    const res = await fetch(`${baseUrl}/api/auth/link-anonymous`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymousId: 'user-1' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ migratedSessions: 0, migratedEvents: 0 });
  });
});

describe('POST /api/auth/delete-data', () => {
  const executeRaw = vi.fn().mockResolvedValue(1);

  beforeEach(async () => {
    executeRaw.mockClear();
    await start({
      user: { upsert: vi.fn(), update: vi.fn() },
      session: { updateMany: vi.fn() },
      event: { updateMany: vi.fn() },
      $executeRaw: executeRaw,
    } as unknown as Database);
  });

  it('anonymises the authenticated user via anonymise_user()', async () => {
    const res = await fetch(`${baseUrl}/api/auth/delete-data`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(executeRaw.mock.calls[0]?.[1]).toBe('user-1');
  });

  it('returns 401 without a bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/delete-data`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('returns 500 when the database call fails', async () => {
    executeRaw.mockRejectedValueOnce(new Error('connection refused'));
    const res = await fetch(`${baseUrl}/api/auth/delete-data`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    expect(res.status).toBe(500);
  });
});
