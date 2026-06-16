/**
 * Tests for Supabase JWT verification and the requireAuth middleware.
 * Run: npx vitest src/server/authMiddleware.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyAuthToken, requireAuth, type AuthenticatedRequest } from './authMiddleware';

const SECRET = 'test-jwt-secret';

describe('verifyAuthToken', () => {
  it('extracts the user id and email from a valid token', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'alice@example.com' }, SECRET);
    expect(verifyAuthToken(token, SECRET)).toEqual({ id: 'user-1', email: 'alice@example.com' });
  });

  it('returns null for a token signed with the wrong secret', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'alice@example.com' }, 'wrong-secret');
    expect(verifyAuthToken(token, SECRET)).toBeNull();
  });

  it('returns null for an expired token', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'alice@example.com' }, SECRET, { expiresIn: -1 });
    expect(verifyAuthToken(token, SECRET)).toBeNull();
  });

  it('returns null when the email claim is missing', () => {
    const token = jwt.sign({ sub: 'user-1' }, SECRET);
    expect(verifyAuthToken(token, SECRET)).toBeNull();
  });

  it('returns null for a malformed token string', () => {
    expect(verifyAuthToken('not-a-jwt', SECRET)).toBeNull();
  });
});

describe('requireAuth', () => {
  function mockRes() {
    const res = { status: vi.fn(), json: vi.fn() } as unknown as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
    res.status.mockReturnValue(res);
    return res;
  }

  it('attaches authUser and calls next() for a valid bearer token', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'alice@example.com' }, SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = vi.fn();

    requireAuth(SECRET)(req, res as never, next);

    expect(req.authUser).toEqual({ id: 'user-1', email: 'alice@example.com' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when the authorization header is missing', () => {
    const req = { headers: {} } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = vi.fn();

    requireAuth(SECRET)(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', () => {
    const req = { headers: { authorization: 'Bearer not-a-jwt' } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = vi.fn();

    requireAuth(SECRET)(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
