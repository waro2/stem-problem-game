/**
 * Tests for Supabase JWT verification and the requireAuth middleware.
 * Run: npx vitest src/server/authMiddleware.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jwtVerify } from 'jose';
import { verifyAuthToken, requireAuth, type AuthenticatedRequest } from './authMiddleware';

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  jwtVerify: vi.fn(),
}));

const mockedJwtVerify = vi.mocked(jwtVerify);
const SECRET = 'unused-now-verification-goes-through-jwks';

beforeEach(() => {
  mockedJwtVerify.mockReset();
  process.env['SUPABASE_URL'] = 'https://test.supabase.co';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('verifyAuthToken', () => {
  it('extracts the user id and email from a valid token', async () => {
    mockedJwtVerify.mockResolvedValue({ payload: { sub: 'user-1', email: 'alice@example.com' } } as never);
    await expect(verifyAuthToken('valid-token', SECRET)).resolves.toEqual({ id: 'user-1', email: 'alice@example.com' });
  });

  it('returns null when the JWKS rejects the signature', async () => {
    mockedJwtVerify.mockRejectedValue(new Error('signature verification failed'));
    await expect(verifyAuthToken('wrong-signature-token', SECRET)).resolves.toBeNull();
  });

  it('returns null for an expired token', async () => {
    mockedJwtVerify.mockRejectedValue(new Error('"exp" claim timestamp check failed'));
    await expect(verifyAuthToken('expired-token', SECRET)).resolves.toBeNull();
  });

  it('returns null when the email claim is missing', async () => {
    mockedJwtVerify.mockResolvedValue({ payload: { sub: 'user-1' } } as never);
    await expect(verifyAuthToken('token-without-email', SECRET)).resolves.toBeNull();
  });

  it('returns null for a malformed token string', async () => {
    mockedJwtVerify.mockRejectedValue(new Error('Invalid Compact JWS'));
    await expect(verifyAuthToken('not-a-jwt', SECRET)).resolves.toBeNull();
  });
});

describe('requireAuth', () => {
  function mockRes() {
    const res = { status: vi.fn(), json: vi.fn() } as unknown as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
    res.status.mockReturnValue(res);
    return res;
  }

  it('attaches authUser and calls next() for a valid bearer token', async () => {
    mockedJwtVerify.mockResolvedValue({ payload: { sub: 'user-1', email: 'alice@example.com' } } as never);
    const req = { headers: { authorization: 'Bearer valid-token' } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(SECRET)(req, res as never, next);

    expect(req.authUser).toEqual({ id: 'user-1', email: 'alice@example.com' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when the authorization header is missing', async () => {
    const req = { headers: {} } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(SECRET)(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', async () => {
    mockedJwtVerify.mockRejectedValue(new Error('signature verification failed'));
    const req = { headers: { authorization: 'Bearer not-a-jwt' } } as unknown as AuthenticatedRequest;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(SECRET)(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
