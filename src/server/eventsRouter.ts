/**
 * POST /api/events — Analytics event ingestion
 * Source: GDD §8.1 (Event Schema), §8.2 (Server Architecture)
 *
 * Accepts a batch of GameEvent objects (the shape sent by the client's
 * EventQueue in src/api/events.ts: `{ events: GameEvent[] }`) and appends
 * them to the `events` table (src/db/schema.prisma — append-only log).
 */

import { Router, type Request, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import type { GameEvent } from '../api/events';
import { parseEventBatch } from './validateEvent';
import { RateLimiter, EVENTS_PER_MINUTE_LIMIT, ONE_MINUTE_MS } from './rateLimiter';

/** Minimal slice of PrismaClient this route needs — keeps it easy to mock in tests. */
export interface EventWriter {
  event: {
    createMany: (args: { data: Prisma.EventCreateManyInput[] }) => Promise<{ count: number }>;
  };
}

export function createEventsRouter(db: EventWriter): Router {
  const router = Router();
  const rateLimiter = new RateLimiter(EVENTS_PER_MINUTE_LIMIT, ONE_MINUTE_MS);

  router.post('/api/events', async (req: Request, res: Response) => {
    const events = parseEventBatch(req.body);
    if (!events) {
      res.status(400).json({ error: 'Invalid request body: expected { events: GameEvent[] }' });
      return;
    }

    if (events.length === 0) {
      res.status(202).json({ accepted: 0 });
      return;
    }

    const countsByUser = new Map<string, number>();
    for (const event of events) {
      countsByUser.set(event.userId, (countsByUser.get(event.userId) ?? 0) + 1);
    }

    const now = Date.now();
    for (const [userId, count] of countsByUser) {
      if (rateLimiter.wouldExceed(userId, count, now)) {
        res.status(429).json({ error: `Rate limit exceeded: max ${EVENTS_PER_MINUTE_LIMIT} events/minute per user` });
        return;
      }
    }
    for (const [userId, count] of countsByUser) {
      rateLimiter.consume(userId, count, now);
    }

    try {
      const { count } = await db.event.createMany({ data: events.map(toEventRow) });
      res.status(202).json({ accepted: count });
    } catch (err) {
      console.error('[events] failed to persist batch', err);
      res.status(500).json({ error: 'Failed to persist events' });
    }
  });

  return router;
}

function toEventRow(event: GameEvent): Prisma.EventCreateManyInput {
  return {
    userId: event.userId,
    problemId: event.problemId,
    eventType: event.type,
    payload: event as unknown as Prisma.InputJsonValue,
    platform: event.type === 'session_start' ? event.platform : null,
    receivedAt: event.timestamp,
  };
}
