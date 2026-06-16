/**
 * Nightly aggregation entry point  (GDD §8.3)
 * Run: npm run jobs:aggregate  (schedule via cron / pg_cron in production)
 */

import { prisma } from '../prisma';
import { aggregateNightlyStats } from './aggregateStats';

aggregateNightlyStats(prisma)
  .then(() => {
    console.log('[jobs] nightly aggregation complete');
  })
  .catch(err => {
    console.error('[jobs] nightly aggregation failed', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
