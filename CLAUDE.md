# STEM Problem Game — Project Context for Claude

## What this project is
An educational STEM puzzle game where students solve problems by activating formulas.
The core mechanic: a formula becomes **activatable** when exactly one of its variables is unknown.
Activating it reveals that variable. Cascading activations lead from hypotheses H to conclusions C.

## Mathematical model (from GDD §3)
- **T = (V, F)** — Theory: V = set of variables, F = set of formulas
- **P = (T, H, C)** — Problem instance: H = initial known variables, C = target variables
- **State vector**: binary vector `identifiedVars ⊆ V` (1 = known, 0 = unknown)
- **Formula matrix**: binary matrix M[f][v] = 1 if formula f involves variable v
- **Activation rule**: formula f is activatable iff `|V_f \ identifiedVars| === 1`
- **Win condition**: `C ⊆ identifiedVars`

## Key files to know
| File | Purpose |
|------|---------|
| `src/game/types.ts` | All domain types (Variable, Formula, Problem, GameState) |
| `src/game/engine.ts` | Pure game logic: activatable detection, activation, win-check |
| `src/game/store.ts` | Zustand store — immutable state transitions |
| `src/api/events.ts` | Event schema & ingestion client |
| `src/db/schema.sql` | PostgreSQL schema for problems + analytics |
| `src/db/schema.prisma` | Prisma ORM schema |

## Coding conventions
- **Pure functions only** in `src/game/engine.ts` — no side effects, no imports from React
- **Immutable state** — always spread state, never mutate in place
- **Event-driven analytics** — every meaningful action calls `emitEvent()` from `src/api/events.ts`
- **Bilingual** — all user-facing strings go through `src/i18n/` (fr + en)
- TypeScript strict mode enabled — no `any`
- Tests live next to source files as `*.test.ts`

## Domain vocabulary
| EN | FR | Meaning |
|----|-----|---------|
| Variable | Variable | A symbolic quantity in a problem |
| Formula | Formule | A relationship linking a subset of variables |
| Hypothesis | Hypothèse | A variable known at game start (H) |
| Conclusion | Conclusion | A target variable to identify (C) |
| Identified | Identifiée | A variable whose value is known (state = 1) |
| Activatable | Activable | A formula with exactly 1 unknown variable |
| Activation | Activation | The act of applying a formula to reveal its unknown |
| Cascade | Cascade | Chain of activations triggered after one activation |

## Score formula (GDD §6.2)
```
score = S_MAX - (steps * S_STEP) - (hints * S_HINT) + timeBonus
S_MAX = 1000, S_STEP = 20, S_HINT = 50
timeBonus = Math.max(0, 200 - elapsedSeconds * 2)
```

## Hint tiers (GDD §6.3)
- Tier 1 (−50 pts): highlight an activatable formula
- Tier 2 (−80 pts): reveal which variable it will identify
- Tier 3 (−120 pts): auto-activate one step

## Analytics events to emit (GDD §8.1)
- `session_start` — on problem load
- `formula_activated` — on each activation
- `hint_used` — on hint request
- `problem_completed` — on win or stuck

## Common Claude tasks in this project
- "Add a new problem domain X" → add JSON to `public/problems/`, update `Domain` union type
- "Implement the hint system" → see `src/game/engine.ts` + `src/components/HintPanel.tsx`
- "Add a new analytics metric" → add event type in `src/api/events.ts`, add aggregation in `src/db/`
- "Write tests for activation logic" → `src/game/engine.test.ts`
