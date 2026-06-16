/**
 * STEM Problem Game — CSRF protection for state-changing requests
 * Source: GDD §8.2 (Server Architecture); OWASP CSRF Cheat Sheet
 *         ("Verifying Origin with Standard Headers").
 *
 * This API is stateless (Bearer-token auth, no cookies/sessions), so a
 * cross-site request cannot ride an ambient session. As defense in depth,
 * any state-changing request that DOES carry a browser-set Origin (or, if
 * absent, Referer) header must match an allowed origin — a forged
 * cross-site form/script submission from an attacker page will have that
 * header set to the attacker's origin and gets rejected. Requests without
 * either header (non-browser clients, e.g. server-to-server calls) pass
 * through unchecked, since there is no ambient credential for them to ride.
 */

import type { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Express middleware factory: blocks cross-origin state-changing requests. */
export function requireSameOrigin(allowedOrigins: readonly string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const origin = req.headers.origin ?? (req.headers.referer ? originOf(req.headers.referer) : null);
    if (origin !== null && !allowedOrigins.includes(origin)) {
      res.status(403).json({ error: 'Cross-origin request blocked (CSRF protection)' });
      return;
    }

    next();
  };
}
