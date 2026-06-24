/**
 * Auth middleware — verifies Supabase Auth JWTs  (GDD §8.2)
 *
 * Supabase now signs JWTs with ES256 (asymmetric keys) rather than the
 * legacy HS256 project secret. We verify against Supabase's published
 * JWKS instead of a shared secret. The `sub` claim is the Supabase user
 * id, which doubles as our `users.id` primary key once synced via
 * /api/auth/sync.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request, Response, NextFunction } from 'express';

export interface AuthUser {
  /** Supabase user id (JWT `sub` claim) — also the users.id primary key. */
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

type RemoteJWKSet = ReturnType<typeof createRemoteJWKSet>;
let jwks: RemoteJWKSet | null = null;

/** Lazily built so a missing SUPABASE_URL fails with a clear error on first use, not a cryptic "Invalid URL" at import time. */
function getJwks(supabaseUrl: string): RemoteJWKSet {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

/**
 * Verify a Supabase-issued JWT and extract the `sub` (user id) and `email`
 * claims. Returns null if the token is invalid, expired, or missing the
 * expected claims.
 */
export async function verifyAuthToken(token: string, _secret: string): Promise<AuthUser | null> {
  const supabaseUrl = process.env['SUPABASE_URL'];
  if (!supabaseUrl) {
    console.error('[auth] SUPABASE_URL is not set — cannot verify JWTs');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(supabaseUrl), {
      issuer: `${supabaseUrl}/auth/v1`,
    });
    if (typeof payload['sub'] !== 'string' || typeof payload['email'] !== 'string') return null;

    return { id: payload['sub'], email: payload['email'] };
  } catch (error) {
    console.error('[auth] JWT verification failed:', error instanceof Error ? error.name : typeof error, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Express middleware factory: rejects requests without a valid Supabase JWT bearer token. */
export function requireAuth(jwtSecret: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }

    const user = await verifyAuthToken(token, jwtSecret);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.authUser = user;
    next();
  };
}
