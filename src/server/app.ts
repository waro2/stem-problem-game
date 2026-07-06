/**
 * Express app factory  (GDD §8.2 — Server Architecture)
 */

import express, { type Express } from 'express';
import { createEventsRouter, type EventWriter } from './eventsRouter';
import { createProblemsRouter, type ProblemWriter, type ProblemLibraryDatabase } from './problemsRouter';
import { createResearchRouter, type ResearchDatabase } from './researchRouter';
import { createStudentRouter, type StudentStatsDatabase } from './studentRouter';
import { createInstructorRouter, type InstructorDatabase } from './instructorRouter';
import { createCohortRouter, type CohortLeaderboardDatabase } from './cohortRouter';
import { createAuthRouter, type AuthDatabase } from './authRouter';
import { createSessionsRouter, type SessionDatabase } from './sessionsRouter';
import { createUsersRouter, type UserDatabase } from './usersRouter';
import { requireSameOrigin } from './csrfMiddleware';

export type Database = EventWriter & ProblemWriter & ProblemLibraryDatabase & ResearchDatabase & StudentStatsDatabase & InstructorDatabase & CohortLeaderboardDatabase & AuthDatabase & SessionDatabase & UserDatabase;

/** Origins allowed to make state-changing requests (CSRF protection), comma-separated. */
const DEFAULT_ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

export interface AppConfig {
  /** Secret used to verify Supabase Auth JWTs (SUPABASE_JWT_SECRET). */
  jwtSecret: string;
  /** Origins allowed to make state-changing (non-GET) requests (ALLOWED_ORIGINS). */
  allowedOrigins?: readonly string[];
}

export function createApp(
  db: Database,
  config: AppConfig = { jwtSecret: process.env['SUPABASE_JWT_SECRET'] ?? '' }
): Express {
  const app = express();
  const allowedOrigins = config.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS;

  app.use(express.json());

  // Health check — exempt from CSRF so Railway/load-balancer probes reach it unauthenticated.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // CORS: browsers require Access-Control-Allow-Origin on cross-origin responses.
  // The frontend (port 5173) and backend (port 3001) are different origins even on
  // localhost. Without these headers the browser silently blocks every fetch response,
  // so analytics events are swallowed before reaching the server.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(requireSameOrigin(allowedOrigins));
  app.use(createEventsRouter(db));
  app.use(createProblemsRouter(db));
  app.use(createResearchRouter(db));
  app.use(createStudentRouter(db));
  app.use(createInstructorRouter(db));
  app.use(createCohortRouter(db));
  app.use(createAuthRouter(db, config.jwtSecret));
  app.use(createSessionsRouter(db, config.jwtSecret));
  app.use(createUsersRouter(db, config.jwtSecret));
  return app;
}
