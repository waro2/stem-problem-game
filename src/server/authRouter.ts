/**
 * /api/auth — Supabase Auth integration  (GDD §8.2, §8.4 GDPR)
 *
 * POST /api/auth/sync           Upsert the local user profile from the
 *                                verified Supabase JWT (id, email). Created
 *                                with role=student by default; returns the
 *                                profile including consentGivenAt so the
 *                                client can show the GDPR consent modal on
 *                                first login.
 * POST /api/auth/consent         Record the user's GDPR analytics-consent
 *                                choice (accept or refuse). Body: { granted: boolean }.
 * POST /api/auth/link-anonymous  Re-assign the anonymous device's sessions
 *                                and events to the authenticated account,
 *                                merging pre-login progress into the real
 *                                profile.
 * POST /api/auth/delete-data     GDPR right-to-erasure (GDD §8.4): anonymises
 *                                the user's PII via the anonymise_user() SQL
 *                                function, keeping analytics rows intact.
 */

import { Router, type Response } from 'express';
import type { UserRole } from '../game/types';
import { isString, isBoolean } from './validators';
import { requireAuth, type AuthenticatedRequest } from './authMiddleware';

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export interface AuthDatabase {
  user: {
    upsert: (args: {
      where: { id: string };
      create: { id: string; email: string; role: 'student' };
      update: Record<string, never>;
      select: { id: true; email: true; role: true; cohortId: true; consentGivenAt: true; analyticsConsent: true };
    }) => Promise<{ id: string; email: string; role: UserRole; cohortId: string | null; consentGivenAt: Date | null; analyticsConsent: boolean | null }>;
    update: (args: {
      where: { id: string };
      data: { consentGivenAt: Date; analyticsConsent: boolean };
      select: { consentGivenAt: true; analyticsConsent: true };
    }) => Promise<{ consentGivenAt: Date | null; analyticsConsent: boolean | null }>;
  };
  session: {
    updateMany: (args: { where: { userId: string }; data: { userId: string } }) => Promise<{ count: number }>;
  };
  event: {
    updateMany: (args: { where: { userId: string }; data: { userId: string } }) => Promise<{ count: number }>;
  };
  /** Tagged-template raw query — used to call the anonymise_user() SQL function. */
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
}

export function createAuthRouter(db: AuthDatabase, jwtSecret: string): Router {
  const router = Router();
  const auth = requireAuth(jwtSecret);

  router.post('/api/auth/sync', auth, async (req: AuthenticatedRequest, res: Response) => {
    const authUser = req.authUser!;

    try {
      const profile = await db.user.upsert({
        where: { id: authUser.id },
        create: { id: authUser.id, email: authUser.email, role: 'student' },
        update: {},
        select: { id: true, email: true, role: true, cohortId: true, consentGivenAt: true, analyticsConsent: true },
      });
      res.status(200).json(profile);
    } catch (err) {
      console.error('[auth] failed to sync user profile', err);
      res.status(500).json({ error: 'Failed to sync user profile' });
    }
  });

  router.post('/api/auth/consent', auth, async (req: AuthenticatedRequest, res: Response) => {
    const authUser = req.authUser!;
    const granted = (req.body as Record<string, unknown> | null)?.['granted'];

    if (!isBoolean(granted)) {
      res.status(400).json({ error: 'Invalid request body: expected a boolean "granted"' });
      return;
    }

    try {
      const updated = await db.user.update({
        where: { id: authUser.id },
        data: { consentGivenAt: new Date(), analyticsConsent: granted },
        select: { consentGivenAt: true, analyticsConsent: true },
      });
      res.status(200).json(updated);
    } catch (err) {
      console.error('[auth] failed to record consent', err);
      res.status(500).json({ error: 'Failed to record consent' });
    }
  });

  router.post('/api/auth/link-anonymous', auth, async (req: AuthenticatedRequest, res: Response) => {
    const authUser = req.authUser!;
    const anonymousId = (req.body as Record<string, unknown> | null)?.['anonymousId'];

    if (!isString(anonymousId) || anonymousId.length === 0) {
      res.status(400).json({ error: 'Invalid request body: expected a non-empty anonymousId' });
      return;
    }

    if (anonymousId === authUser.id) {
      res.status(200).json({ migratedSessions: 0, migratedEvents: 0 });
      return;
    }

    try {
      const [sessions, events] = await Promise.all([
        db.session.updateMany({ where: { userId: anonymousId }, data: { userId: authUser.id } }),
        db.event.updateMany({ where: { userId: anonymousId }, data: { userId: authUser.id } }),
      ]);
      res.status(200).json({ migratedSessions: sessions.count, migratedEvents: events.count });
    } catch (err) {
      console.error('[auth] failed to link anonymous account', err);
      res.status(500).json({ error: 'Failed to link anonymous account' });
    }
  });

  router.post('/api/auth/delete-data', auth, async (req: AuthenticatedRequest, res: Response) => {
    const authUser = req.authUser!;

    try {
      await db.$executeRaw`SELECT anonymise_user(${authUser.id}::uuid)`;
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('[auth] failed to delete user data', err);
      res.status(500).json({ error: 'Failed to delete user data' });
    }
  });

  return router;
}
