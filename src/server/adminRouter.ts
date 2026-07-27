/**
 * adminRouter.ts
 * Destination : src/server/adminRouter.ts
 *
 * Routes réservées aux admin :
 *   GET    /api/admin/users
 *   PATCH  /api/admin/users/:id
 *   DELETE /api/admin/users/:id
 *   GET    /api/admin/cohorts
 *   POST   /api/admin/cohorts
 *   DELETE /api/admin/cohorts/:id
 */

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth } from './authMiddleware';
import type { AuthenticatedRequest } from './authMiddleware';
import type { PrismaClient, UserRole } from '@prisma/client';

export function createAdminRouter(db: PrismaClient, jwtSecret: string) {
  const router = Router();
  const auth = requireAuth(jwtSecret);

  // ── Middleware : vérifie que l'utilisateur connecté est admin ─────────────
  const requireAdmin = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await db.user.findUnique({
        where: { id: req.authUser!.id },
        select: { role: true },
      });
      if (!user || user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
      next();
    } catch {
      res.status(500).json({ error: 'Admin check failed' });
    }
  };

  // ── Utilisateurs ─────────────────────────────────────────────────────────

  /** Liste tous les utilisateurs non supprimés avec leur cohorte. */
  router.get(
    '/api/admin/users',
    auth,
    requireAdmin,
    async (_req, res) => {
      const users = await db.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          cohortId: true,
          cohort: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { email: 'asc' },
      });
      res.json(users);
    },
  );

  /** Met à jour le rôle et/ou la cohorte d'un utilisateur. */
  router.patch(
    '/api/admin/users/:id',
    auth,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      const id = req.params['id'];
      if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
      const { role, cohortId } = req.body as {
        role?: UserRole;
        cohortId?: string | null;
      };

      const validRoles: UserRole[] = ['student', 'instructor', 'researcher', 'admin'];
      if (role !== undefined && !validRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }

      const updated = await db.user.update({
        where: { id },
        data: {
          ...(role !== undefined && { role }),
          // cohortId peut être null pour désaffecter
          ...(cohortId !== undefined && { cohortId: cohortId || null }),
        },
        select: { id: true, email: true, name: true, role: true, cohortId: true },
      });
      res.json(updated);
    },
  );

  /** Soft-delete un utilisateur (remplit deletedAt). */
  router.delete(
    '/api/admin/users/:id',
    auth,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      const id = req.params['id'];
      if (!id) { res.status(400).json({ error: 'Missing id' }); return; }

      // Protection : impossible de se supprimer soi-même
      if (id === req.authUser!.id) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
      }

      await db.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      res.json({ success: true });
    },
  );

  // ── Cohortes ─────────────────────────────────────────────────────────────

  /** Liste toutes les cohortes avec le nombre de membres. */
  router.get(
    '/api/admin/cohorts',
    auth,
    requireAdmin,
    async (_req, res) => {
      const cohorts = await db.cohort.findMany({
        include: {
          _count: { select: { members: true } },
        },
        orderBy: { name: 'asc' },
      });
      res.json(cohorts);
    },
  );

  /** Crée une nouvelle cohorte. */
  router.post(
    '/api/admin/cohorts',
    auth,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      const { name, instructorId, leaderboardEnabled } = req.body as {
        name?: string;
        instructorId?: string;
        leaderboardEnabled?: boolean;
      };

      if (!name?.trim()) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const cohort = await db.cohort.create({
        data: {
          name: name.trim(),
          instructorId: instructorId ?? req.authUser!.id,
          leaderboardEnabled: leaderboardEnabled ?? true,
        },
      });
      res.json(cohort);
    },
  );

  /** Supprime une cohorte (désaffecte d'abord ses membres). */
  router.delete(
    '/api/admin/cohorts/:id',
    auth,
    requireAdmin,
    async (req, res) => {
      const id = req.params['id'];
      if (!id) { res.status(400).json({ error: 'Missing id' }); return; }

      // Désaffecter les membres avant suppression pour éviter la contrainte FK
      await db.user.updateMany({
        where: { cohortId: id },
        data: { cohortId: null },
      });

      await db.cohort.delete({ where: { id } });
      res.json({ success: true });
    },
  );

  return router;
}
