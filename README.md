# Worship Mix Assistant

A web app for volunteer sound mixers. Enter this week's band, the room and the console; get a starting mix as a step-by-step setup sheet for the Behringer X32 or WING Compact, plus a troubleshooter by symptom.

No backend, no accounts, no AI calls at runtime. Everything is computed by a rules engine over a typed knowledge base, and saved only in this browser.

Read `CLAUDE.md` for the design decisions and `docs/DECISIONS.md` for the choices made while building.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Dev server on http://localhost:4200 |
| `npm test -- --watch=false` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run e2e` | Playwright end-to-end tests and screenshots (tablet and phone) |
| `npm run e2e:offline` | Builds for production and checks the app works with the network off |
| `npm run build` | Production build into `dist/` |
| `npm run print:plan` | The fixture band's mix plan as text |
| `npm run print:sheet` | The fixture band's X32 sheet as text (`npm run print:sheet -- wing` for the WING Compact) |
| `npm run docs` | Regenerates `docs/console-sources.md`, `docs/knowledge-review.md`, `docs/troubleshooting-review.md` and re-checks every manual quote |

## What to review by hand

- `docs/knowledge-review.md`: every audio value, modifier and limit, with the ten least certain at the top.
- `docs/console-sources.md`: every console fact with its manual page and quote, and the UNVERIFIED list to check on the real consoles.
- `docs/troubleshooting-review.md`: every troubleshooting tree in plain language.

## Manuals

`docs/manuals/` is gitignored. Put the X32 and WING series user manual PDFs there (from the product pages on behringer.com) as `x32-user-manual.pdf` and `wing-series-user-manual.pdf` so `npm run docs` can re-check quotes.
