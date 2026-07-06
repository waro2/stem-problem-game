/**
 * Tests for PATCH /api/users/me — user profile update.
 * Run: npx vitest src/server/usersRouter.test.ts
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

describe('PATCH /api/users/me', () => {
  const updateMock = vi.fn().mockResolvedValue({
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    role: 'student',
  });

  beforeEach(async () => {
    mockedJwtVerify.mockReset();
    mockedJwtVerify.mockResolvedValue({ payload: { sub: 'user-1', email: 'alice@example.com' } } as never);
    updateMock.mockClear();
    await start({
      user: { upsert: vi.fn(), update: updateMock },
    } as unknown as Database);
  });

  it('updates the display name and returns the updated profile', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'user-1', email: 'alice@example.com', name: 'Alice', role: 'student' });
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: { name: 'Alice' },
    }));
  });

  it('trims whitespace before saving', async () => {
    await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  Alice  ' }),
    });
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Alice' } }));
  });

  it('returns 400 when name is missing', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is empty after trim', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name exceeds 80 characters', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A'.repeat(81) }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 200 for a name exactly 80 characters long', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A'.repeat(80) }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 401 without a bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 500 when the database call fails', async () => {
    updateMock.mockRejectedValueOnce(new Error('connection refused'));
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' }),
    });
    expect(res.status).toBe(500);
  });
});
