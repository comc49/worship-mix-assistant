# CLAUDE.md

Context for AI-assisted work on Worship Mix Assistant. Read this, `docs/ROADMAP.md` and `docs/DECISIONS.md` before writing any code.

## Purpose

A web app for volunteer sound mixers at a church. Most are not trained engineers. They stand at the console with a tablet or phone, often 30 minutes before rehearsal, and need to be told exactly what to set and what to listen for, in plain language.

1. **Input:** this service's band (name, role, skill level, how the source reaches the console; for vocalists also voice range and mic model), plus the room, the console and the monitor setup.
2. **Output:** a recommended starting mix per channel (gain staging, low cut, EQ guidance, gate, compression, FX sends, monitor sends), then bus layout, DCA groups, mute groups, FX rack and main bus processing.
3. **Console sheets:** the same mix plan rendered as step-by-step settings for the Behringer X32 and the Behringer WING Compact, in each console's own names.
4. **Troubleshooter:** pick a symptom, get ordered checks and fixes that reference the current band and console.

## Design decisions (do not revisit without asking Brian)

- **Deterministic rules engine over a typed knowledge base. No LLM calls at runtime.** Same input, same output. Works offline.
- **Three layers, kept separate:**
  - (a) Knowledge base: typed data files in `src/app/core/knowledge`.
  - (b) Rules engine: pure TypeScript in `src/app/core/engine`. `buildMixPlan(band, room, serviceSetup)` returns a console-neutral `MixPlan`. The engine never sees a console.
  - (c) Console adapters in `src/app/core/consoles`. Each takes a `MixPlan` and a console profile, validates, allocates buses and FX slots, clamps to the console's ranges and produces a `ConsoleSheet`.
  - The UI depends on these layers. They never depend on the UI.
- **One value per setting on the sheet.** Tapping it shows the usable range, the reason and a "listen for" note. Values are typical starting values, not measurements of our rooms; the app says so once at the top of each sheet.
- **EQ in three tiers:** low cut is a fixed step; at most three conservative suggested cuts per role, shown as optional; everything else is "if you hear X, try Y".
- **Skill level changes dynamics, level, low cut and coaching notes. Never tonal EQ.**
- **Musical limits per role are applied before console limits.**
- **No backend, no accounts.** All `localStorage` access goes through one storage service. Backup and restore as JSON.
- **Privacy:** skill ratings describe real volunteers. Never show a skill label next to a name on any output screen, printout or PDF. Test fixtures and every committed file use placeholder names only.
- **Console facts are never written from memory.** Every profile fact carries its manual source or an `UNVERIFIED` flag (`docs/console-sources.md`).

## Stack

Angular 22 (standalone components, signals), TypeScript strict, SCSS. Unit tests: Vitest through `ng test`. End-to-end and screenshots: Playwright at 820x1180 (tablet) and 390x844 (phone). Static build for Vercel (`vercel.json` rewrites unknown paths to `index.html`). Mobile-first; the primary device is a tablet at the mixing desk.

## Code style

- Brian is a senior Angular developer and reads all of this code. Favor verbose, step-by-step code: named intermediate variables, early returns, no nested ternaries, no clever one-liners.
- The engine and the adapters are pure functions with no Angular imports.
- No `any`. Domain values are union types.

## Our setup (default data)

Items marked *(assumed)* were chosen as defaults on 2026-11-18 because the brief's brackets were unfilled. They are editable in the app; correct them here and in `src/app/core/knowledge/defaults.ts` when the real answer is known.

- **Room A:** warehouse. Hard parallel walls, no treatment, constant HVAC fan noise, low-mid buildup. 150 to 200 people. Loudness target: none *(assumed)*.
- **Room B:** lecture hall. Dry and thin. Loudness target: none *(assumed)*.
- **PA:** one QSC subwoofer, two FBT full-range tops. Subwoofer fed from the main mix through a crossover *(assumed)*.
- **Consoles:** Behringer X32 full size in Room A, Behringer WING Compact in Room B *(assumed)*.
- **Monitors:** wedges, 4 separate mixes *(assumed)*.
- **Separate livestream mix:** no *(assumed)*.
- Sometimes an acoustic kit or a cajon replaces the electronic drums.

## Test fixture band (placeholder names on purpose; skills, mics and voices are assumed)

- Vocalist A: lead vocal, intermediate, SM58, medium voice. Also acoustic guitar, intermediate, mono DI.
- Vocalist B: harmony vocal, beginner, SM58, high voice.
- Vocalist C: harmony vocal, advanced, SM58, low voice.
- Keys: Nord Stage 2, beginner, stereo DI.
- Pad: synth pad, intermediate, stereo DI.
- Electric guitar: intermediate, modeler direct.
- Bass: bass guitar, beginner, mono DI.
- Drums: electronic kit, intermediate, drum module stereo pair.

The fixture lives in `src/app/core/testing/fixtures.ts`.

## Folder map

```
src/app/core/model/       Domain types (band, room, service setup, MixPlan)
src/app/core/knowledge/   Mixing knowledge as typed data (profiles, modifiers, limits, rules, troubleshooting trees)
src/app/core/engine/      buildMixPlan pipeline, one file per step
src/app/core/consoles/    Console profiles, ConsoleSheet type, toX32, toWingCompact, validateForConsole
src/app/core/testing/     Fixture band and rooms
src/app/state/            Storage service (only place that touches localStorage) and the signal store
src/app/features/         Screens: setup, band, sheet, overview, soundcheck, troubleshoot, backup
src/app/shared/           Small shared UI pieces
e2e/                      Playwright tests
scripts/                  tsx scripts that print plans, sheets and review docs
docs/                     ROADMAP, DECISIONS, console-sources, review docs, screenshots
docs/manuals/             Console manuals (gitignored, never commit)
```

## Commands

- `npm start`: dev server on http://localhost:4200
- `npm test -- --watch=false`: unit tests (Vitest)
- `npm run lint`: ESLint
- `npm run e2e`: Playwright (starts the dev server itself)
- `npm run build`: production build into `dist/`
- `npm run print:plan` / `npm run print:sheet`: readable text of the fixture plan and X32 sheet
- `npm run docs`: regenerate `docs/console-sources.md`, `docs/knowledge-review.md` and `docs/troubleshooting-review.md` from the data

## Definition of done

Unit tests pass, lint passes, no `any`, Playwright screenshots of the affected screens are saved to `docs/screenshots/` and were looked at.

## Working agreement

- One roadmap phase per session. Show the plan and wait for "go" unless Brian has said otherwise for that session.
- Append every approved decision, with its reason, to `docs/DECISIONS.md`.
