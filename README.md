# STEM Problem Game

An educational puzzle game where students solve STEM problems by activating formulas.
The core mechanic: a formula becomes **activatable** when exactly one of its variables is unknown.
Activating it reveals that variable. Cascading activations lead from given hypotheses (H) to target conclusions (C).

Available in **French** and **English**. Runs as a web app (PWA), and packages as a native iOS/Android app via Capacitor.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 LTS |
| npm | 10+ (bundled with Node 20) |
| PostgreSQL | 16 (or use Docker Compose) |

---

## Installation

```bash
# 1. Clone
git clone <repo-url>
cd stem-problem-game

# 2. Environment variables
cp .env.example .env
# Edit .env — at minimum set SUPABASE_JWT_SECRET if using auth

# 3. Install dependencies
npm ci

# 4. Generate the Prisma client
npx prisma generate

# 5. Apply database migrations
npx prisma migrate dev
```

---

## Running locally

### Option A — Docker Compose (recommended, zero setup)

Starts PostgreSQL, the Express API, and the Vite dev server in one command.

```bash
docker compose up
```

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

### Option B — bare metal (two terminals)

**Terminal 1 — API server:**
```bash
npm run server:dev
```

**Terminal 2 — frontend:**
```bash
npm run dev
```

Open http://localhost:5173.

---

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server (hot-reload) |
| `npm run build` | TypeScript compile + Vite production build → `dist/` |
| `npm run server` | Express API (production mode via tsx) |
| `npm run server:dev` | Express API with file-watch restart |
| `npm run jobs:aggregate` | Run the nightly analytics aggregation job once |
| `npm run lint` | ESLint over `src/` |
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Vitest single run (CI) |
| `npm run test:ui` | Vitest browser UI |
| `npm run test:load` | Load test for `POST /api/events` |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:e2e:ui` | Playwright with interactive UI |
| `npm run db:generate` | Re-generate Prisma client after schema changes |
| `npm run db:migrate` | Create + apply a new migration |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run cap:gen-assets` | Generate `assets/icon-only.png` + `assets/splash.png` placeholders |
| `npm run cap:sync` | Build + sync web assets into iOS/Android projects |
| `npm run cap:open:ios` | Open Xcode |
| `npm run cap:open:android` | Open Android Studio |
| `npm run cap:run:ios` | Build + run on iOS simulator |
| `npm run cap:run:android` | Build + run on Android emulator |

---

## Project architecture

```
stem-problem-game/
├── public/
│   ├── problems/           # Problem JSON files (one per puzzle)
│   └── sw.js               # Service worker (PWA offline cache)
│
├── src/
│   ├── game/
│   │   ├── types.ts        # Domain types: Variable, Formula, Problem, GameState
│   │   ├── engine.ts       # Pure game logic (activation, hints, scoring, BFS)
│   │   ├── store.ts        # Zustand store — state transitions + analytics calls
│   │   ├── problemLoader.ts  # Fetch + validate problem JSON from /problems/
│   │   ├── problemSchema.ts  # Zod schema for JSON validation
│   │   ├── progression.ts  # XP, level-up, domain mastery calculation
│   │   ├── recommendation.ts # Next-problem suggestion algorithm
│   │   ├── achievements.ts   # Achievement unlock predicates
│   │   ├── replay.ts       # Deduction replay builder
│   │   ├── glossary.ts     # Per-formula concept definitions
│   │   └── help.ts         # Contextual help content
│   │
│   ├── api/
│   │   ├── events.ts       # Analytics event schema + client (emitEvent)
│   │   ├── eventDb.ts      # IndexedDB queue for offline event buffering
│   │   ├── problems.ts     # Client: fetch problem library from API
│   │   ├── library.ts      # Client: problem list + completion status
│   │   ├── recommendation.ts # Client: fetch domain stats for adaptive selection
│   │   ├── leaderboard.ts  # Client: fetch leaderboard entries
│   │   ├── instructor.ts   # Client: instructor dashboard API calls
│   │   ├── research.ts     # Client: research dashboard API calls
│   │   └── auth.ts         # Client: login / session helpers
│   │
│   ├── server/
│   │   ├── index.ts        # Express entry point
│   │   ├── app.ts          # Express app factory (routes, middleware)
│   │   ├── eventsRouter.ts # POST /api/events — ingest analytics
│   │   ├── problemsRouter.ts # GET /api/problems
│   │   ├── studentRouter.ts  # GET /api/students/:id/domain-stats
│   │   ├── leaderboardStats.ts / cohortRouter.ts / instructorRouter.ts
│   │   ├── researchRouter.ts / researchStats.ts
│   │   ├── authRouter.ts   # POST /api/auth/login
│   │   ├── authMiddleware.ts # JWT verification
│   │   ├── csrfMiddleware.ts # CSRF double-submit cookie
│   │   ├── rateLimiter.ts  # Per-IP sliding-window rate limiter
│   │   ├── validateEvent.ts # Zod validation for ingested events
│   │   ├── validateProblem.ts # Zod validation for uploaded problems
│   │   ├── instructorStats.ts / libraryStats.ts
│   │   ├── prisma.ts       # Singleton Prisma client
│   │   └── jobs/           # Nightly aggregation job
│   │
│   ├── components/         # UI building blocks
│   │   ├── VariableBoard.tsx  # Left panel — known/unknown variables
│   │   ├── FormulaBoard.tsx   # Center panel — activatable/locked formulas
│   │   ├── ProgressPanel.tsx  # Right panel — score, steps, hints
│   │   ├── GameScreen.tsx     # Desktop three-panel layout
│   │   ├── GameScreenMobile.tsx  # Mobile swipeable layout
│   │   ├── SummaryScreen.tsx  # Post-game score + replay
│   │   ├── TutorialOverlay.tsx
│   │   ├── HelpPanel.tsx
│   │   ├── HintPanel (inline in FormulaBoard)
│   │   ├── LeaderboardPanel.tsx
│   │   ├── ExplorationMode.tsx
│   │   ├── DeductionReplay.tsx
│   │   └── ConsentModal.tsx
│   │
│   ├── pages/              # Full-screen page components
│   │   ├── ProblemLibrary.tsx
│   │   ├── ConceptLibrary.tsx
│   │   ├── Achievements.tsx
│   │   ├── InstructorDashboard.tsx
│   │   ├── ResearchDashboard.tsx
│   │   ├── ProblemEditor.tsx
│   │   ├── Settings.tsx
│   │   └── Login.tsx
│   │
│   ├── auth/
│   │   ├── AuthContext.tsx  # React context — auth state, GDPR consent
│   │   └── supabaseClient.ts
│   │
│   ├── i18n/
│   │   └── strings.ts      # ALL user-facing strings (FR + EN). Never hardcode text in components.
│   │
│   ├── db/
│   │   ├── schema.sql       # Raw PostgreSQL DDL
│   │   └── schema.prisma    # Prisma ORM schema
│   │
│   ├── pwa/
│   │   └── registerServiceWorker.ts
│   │
│   ├── styles/
│   │   └── animations.css
│   │
│   ├── App.tsx             # Root component — bootstrap, routing between screens
│   └── main.tsx            # React entry point — StatusBar init, service worker
│
├── e2e/                    # Playwright end-to-end tests
│   ├── kinematics-tutorial.spec.ts
│   └── helpers/db.ts
│
├── scripts/
│   └── gen-assets.ts       # Sharp script — generates icon + splash placeholders
│
├── assets/                 # Source assets for Capacitor (replace before publishing)
│   ├── icon-only.png       # 1024×1024 app icon foreground
│   └── splash.png          # 2732×2732 launch screen
│
├── ios/                    # Xcode project (generated by `npx cap add ios`)
├── android/                # Android Studio project (generated by `npx cap add android`)
│
├── capacitor.config.ts     # Capacitor: appId, webDir, SplashScreen/StatusBar config
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
├── docker-compose.yml
└── Dockerfile
```

---

## How to add a new problem

### 1. Create the JSON file

Add a file to `public/problems/` following this schema:

```json
{
  "id": "p-<domain>-<slug>-01",
  "domain": "physics",
  "difficulty": "intermediate",
  "title": "English title",
  "title_fr": "Titre en français",
  "variables": [
    { "id": "v", "label": "velocity", "label_fr": "vitesse", "unit": "m/s", "domain": "physics" },
    { "id": "d", "label": "distance", "label_fr": "distance", "unit": "m",   "domain": "physics" },
    { "id": "t", "label": "time",     "label_fr": "temps",    "unit": "s",   "domain": "physics" }
  ],
  "formulas": [
    {
      "id": "f1",
      "expression": "d = v · t",
      "expression_fr": "d = v · t",
      "variableIds": ["d", "v", "t"],
      "conceptName": "Uniform motion",
      "conceptName_fr": "Mouvement uniforme"
    }
  ],
  "hypotheses": ["v", "t"],
  "conclusions": ["d"],
  "optimalSteps": 1,
  "solvable": true
}
```

**Field rules:**
- `id` — unique across all files, kebab-case with `-01` suffix for versioning
- `domain` — one of `"physics" | "chemistry" | "mathematics" | "biology" | "engineering"`
- `difficulty` — one of `"beginner" | "intermediate" | "advanced" | "expert"`
- `hypotheses` — variable IDs known at game start
- `conclusions` — variable IDs the player must identify to win
- `optimalSteps` — length of the shortest activation path (used for scoring)
- `solvable` — must be `true`; a problem where conclusions are unreachable must not be shipped

### 2. Verify solvability

Import the engine's validation helpers and run them against your problem before committing:

```typescript
import { validateSolvability, computeOptimalSteps } from './src/game/engine';
import problem from './public/problems/my-new-problem.json';

console.assert(validateSolvability(problem), 'Problem is not solvable');
console.log('optimalSteps:', computeOptimalSteps(problem));
```

**Activation rule:** formula `f` is activatable when exactly one of its `variableIds` is not yet identified.
Trace manually: start from `hypotheses`, find any formula with one unknown, mark that variable known, repeat until all `conclusions` are known.

### 3. Add a new domain (optional)

If adding a domain that doesn't exist yet, update the `Domain` union type in [src/game/types.ts](src/game/types.ts):

```typescript
export type Domain = 'physics' | 'chemistry' | 'mathematics' | 'biology' | 'engineering' | 'your-new-domain';
```

### 4. Add bilingual strings (optional)

If the domain needs a display name in the UI, add it to [src/i18n/strings.ts](src/i18n/strings.ts):

```typescript
domainYourNewDomain: { fr: 'Votre Domaine', en: 'Your Domain' },
```

---

## Running tests

### Unit + integration tests (Vitest)

```bash
# Single run — used in CI
npm run test:run

# Watch mode — used during development
npm run test

# Visual test browser
npm run test:ui
```

Tests live next to their source files as `*.test.ts`. The server integration tests require a running PostgreSQL instance (see `.env`). If no database is available, those tests simulate connection errors and verify the 500 response path — they still pass.

### Load test

Simulates 200 concurrent clients posting analytics events:

```bash
npm run test:load
```

Requires a running API server (`npm run server:dev`) and a seeded database.

### End-to-end tests (Playwright)

```bash
# Requires: API server running, database migrated, Vite dev server running
npm run server:dev &
npm run dev &
npm run test:e2e

# Interactive mode
npm run test:e2e:ui
```

The E2E suite (`e2e/`) drives a real browser through the full kinematics tutorial — loading the problem, activating formulas in sequence, reaching the win screen.

---

## Database

```bash
# Create or update tables from the Prisma schema
npm run db:migrate

# After editing src/db/schema.prisma, regenerate the client
npm run db:generate

# Visual browser for the database
npm run db:studio
```

The raw DDL is in [src/db/schema.sql](src/db/schema.sql) and the Prisma schema is in [src/db/schema.prisma](src/db/schema.prisma).

---

## Mobile builds (Capacitor)

The app is packaged as a native iOS/Android app via [Capacitor 8](https://capacitorjs.com/).
The `ios/` and `android/` native projects are committed to the repo.

```bash
# After changing web code, sync it into both native projects
npm run cap:sync

# Open in Xcode (requires macOS + Xcode)
npm run cap:open:ios

# Open in Android Studio
npm run cap:open:android

# Build + run directly on a connected device or simulator
npm run cap:run:ios
npm run cap:run:android
```

**First-time iOS setup** — restore CocoaPods after cloning:
```bash
cd ios/App
pod install
```

**Replacing app icons / splash screens** — edit the source files in `assets/`, then regenerate:
```bash
# Edit assets/icon-only.png (1024×1024) and assets/splash.png (2732×2732)
npx @capacitor/assets generate \
  --assetPath assets \
  --iconBackgroundColor '#2E75B6' \
  --iconBackgroundColorDark '#1a4a80' \
  --splashBackgroundColor '#2E75B6' \
  --splashBackgroundColorDark '#1a4a80'
npm run cap:sync
```

The current `assets/` files are blue placeholders generated by `npm run cap:gen-assets`. Replace them with production artwork before publishing.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Prisma) |
| `SUPABASE_JWT_SECRET` | Auth only | Secret for verifying Supabase JWTs |
| `VITE_API_URL` | Frontend | API base URL seen by the browser (default: `http://localhost:3001`) |
| `ALLOWED_ORIGINS` | Server | Comma-separated origins for CSRF protection |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | Docker only | Credentials for the Docker Compose postgres container |

Copy `.env.example` to `.env` and fill in the values.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs four jobs on every push/PR to `main`:

1. **lint** — ESLint
2. **test** — Vitest unit + load tests (PostgreSQL service container)
3. **build** — `tsc && vite build`, uploads `dist/` as an artifact
4. **e2e** — Playwright against a live server + database

On merge to `main`, two additional jobs run:

5. **migrate** — `prisma migrate deploy` against the production database (requires `DATABASE_URL` secret)
6. **deploy** — builds and pushes Docker images to GHCR (`ghcr.io/<org>/server:latest` and `frontend:latest`)

---

## Scoring formula

```
score = 1000 − (steps × 20) − (hints × 50) + timeBonus
timeBonus = max(0, 200 − elapsedSeconds × 2)
```

### Hint tiers

| Tier | Penalty | Effect |
|---|---|---|
| 1 | −50 pts | Highlight an activatable formula |
| 2 | −80 pts | Reveal which variable it will identify |
| 3 | −120 pts | Auto-activate one step |
