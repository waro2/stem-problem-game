/**
 * Auth middleware — verifies Supabase Auth JWTs  (GDD §8.2)
 *
 * Supabase issues HS256 JWTs signed with the project's JWT secret
 * (SUPABASE_JWT_SECRET). The `sub` claim is the Supabase user id, which
 * doubles as our `users.id` primary key once synced via /api/auth/sync.
 */

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface AuthUser {
  /** Supabase user id (JWT `sub` claim) — also the users.id primary key. */
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

/**
 * Verify a Supabase-issued JWT and extract the `sub` (user id) and `email`
 * claims. Pure — no I/O. Returns null if the token is invalid, expired, or
 * missing the expected claims.
 */
export function verifyAuthToken(token: string, secret: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload !== 'object' || payload === null) return null;

    const { sub, email } = payload as Record<string, unknown>;
    if (typeof sub !== 'string' || typeof email !== 'string') return null;

    return { id: sub, email };
  } catch {
    return null;
  }
}

/** Express middleware factory: rejects requests without a valid Supabase JWT bearer token. */
export function requireAuth(jwtSecret: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }

    const user = verifyAuthToken(token, jwtSecret);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.authUser = user;
    next();
  };
}
