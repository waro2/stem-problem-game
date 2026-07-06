/**
 * PATCH /api/users/me — update the authenticated user's display name
 * Source: GDD §8.2 (Server Architecture)
 *
 * Requires a valid Supabase Bearer token. The userId is taken from the
 * verified JWT, so a user can only update their own profile.
 */

import { Router, type Response } from 'express';
import type { UserRole } from '../game/types';
import { isString } from './validators';
import { requireAuth, type AuthenticatedRequest } from './authMiddleware';

const MAX_NAME_LENGTH = 80;

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export interface UserDatabase {
  user: {
    update: (args: {
      where: { id: string };
      data: { name: string };
      select: { id: true; email: true; name: true; role: true };
    }) => Promise<{ id: string; email: string; name: string | null; role: UserRole }>;
  };
}

export function createUsersRouter(db: UserDatabase, jwtSecret: string): Router {
  const router = Router();
  const auth = requireAuth(jwtSecret);

  router.patch('/api/users/me', auth, async (req: AuthenticatedRequest, res: Response) => {
    const authUser = req.authUser!;
    const body = req.body as Record<string, unknown> | null;
    const rawName = body?.['name'];

    if (!isString(rawName)) {
      res.status(400).json({ error: 'Invalid request body: expected a string "name"' });
      return;
    }

    const name = rawName.trim();

    if (name.length === 0) {
      res.status(400).json({ error: 'name cannot be empty' });
      return;
    }

    if (name.length > MAX_NAME_LENGTH) {
      res.status(400).json({ error: `name cannot exceed ${MAX_NAME_LENGTH} characters` });
      return;
    }

    try {
      const updated = await db.user.update({
        where: { id: authUser.id },
        data: { name },
        select: { id: true, email: true, name: true, role: true },
      });
      res.status(200).json(updated);
    } catch (err) {
      console.error('[users] failed to update user name', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  return router;
}
