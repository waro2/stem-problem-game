-- CreateEnum
CREATE TYPE "Domain" AS ENUM ('physics', 'chemistry', 'mathematics', 'biology', 'engineering');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('web', 'ios', 'android');

-- CreateEnum
CREATE TYPE "GameOutcome" AS ENUM ('win', 'stuck');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'instructor', 'researcher', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "cohortId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "consentGivenAt" TIMESTAMP(3),
    "analyticsConsent" BOOLEAN,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "scoreConfig" JSONB,
    "leaderboard_enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "domain" "Domain" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "formulas" JSONB NOT NULL,
    "hypotheses" TEXT[],
    "conclusions" TEXT[],
    "optimalSteps" INTEGER NOT NULL,
    "solvable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "platform" "Platform",
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "outcome" "GameOutcome",
    "totalSteps" INTEGER,
    "optimalSteps" INTEGER,
    "timeElapsedSeconds" DOUBLE PRECISION,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "finalScore" INTEGER,
    "stepEfficiencyRatio" DOUBLE PRECISION,
    "activationPath" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_domain_stats" (
    "userId" TEXT NOT NULL,
    "domain" "Domain" NOT NULL,
    "problemsAttempted" INTEGER NOT NULL DEFAULT 0,
    "problemsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION,
    "avgEfficiency" DOUBLE PRECISION,
    "avgHintsPerProb" DOUBLE PRECISION,
    "completionRate" DOUBLE PRECISION,
    "lastPlayedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_domain_stats_pkey" PRIMARY KEY ("userId","domain")
);

-- CreateTable
CREATE TABLE "problem_stats" (
    "problemId" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalCompletions" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION,
    "avgScore" DOUBLE PRECISION,
    "avgSteps" DOUBLE PRECISION,
    "avgTimeSeconds" DOUBLE PRECISION,
    "avgHints" DOUBLE PRECISION,
    "p50Efficiency" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_stats_pkey" PRIMARY KEY ("problemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "events_userId_idx" ON "events"("userId");

-- CreateIndex
CREATE INDEX "events_eventType_idx" ON "events"("eventType");

-- CreateIndex
CREATE INDEX "events_receivedAt_idx" ON "events"("receivedAt" DESC);

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_problemId_idx" ON "sessions"("problemId");

-- CreateIndex
CREATE INDEX "sessions_startedAt_idx" ON "sessions"("startedAt" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_stats" ADD CONSTRAINT "problem_stats_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
