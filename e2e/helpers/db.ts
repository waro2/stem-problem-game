/**
 * Thin Prisma wrapper for E2E DB assertions.
 * Requires DATABASE_URL to be set in the environment.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface StoredEventPayload {
  type: string;
  userId: string;
  problemId: string;
  timestamp: string;
  outcome?: string;
  totalSteps?: number;
  optimalSteps?: number;
  timeElapsedSeconds?: number;
  hintsUsed?: number;
  finalScore?: number;
  stepEfficiencyRatio?: number;
  activationPath?: string[];
}

export interface StoredEvent {
  id: bigint;
  userId: string;
  problemId: string;
  eventType: string;
  payload: StoredEventPayload;
  receivedAt: Date;
}

export async function findLastEvent(
  userId: string,
  problemId: string,
  eventType: string,
): Promise<StoredEvent | null> {
  const row = await prisma.event.findFirst({
    where: { userId, problemId, eventType },
    orderBy: { receivedAt: 'desc' },
    select: { id: true, userId: true, problemId: true, eventType: true, payload: true, receivedAt: true },
  });
  if (!row) return null;
  return row as unknown as StoredEvent;
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
