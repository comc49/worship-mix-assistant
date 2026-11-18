# Decisions

Append-only. Each entry: the decision, the reason, the date. Later sessions do not reopen these without asking Brian.

## 2026-11-18: from the brief

1. Rules engine over a typed knowledge base, no AI calls at runtime. Same input gives the same output, it works offline, and every rule can be read and corrected.
2. The engine produces a console-neutral MixPlan; each console adapter validates, allocates buses and FX, and clamps. One body of mixing knowledge, two translations.
3. One value per setting on the sheet, with range and reason behind a tap. A volunteer needs one number to set.
4. EQ in three tiers (low cut step, up to three optional cuts, "if you hear X, try Y"). The app has never heard the source.
5. Skill level changes dynamics, level, low cut and coaching, never tonal EQ.
6. Musical limits per role, applied before console limits.
7. Room and monitor type are inputs.
8. Angular, TypeScript strict, no backend, localStorage through one storage service.
9. Privacy: no skill label next to a name on any output; placeholder names in every committed file.

## 2026-11-18: session choices made by Brian

10. Build all phases 0 to 8 in one run with no per-phase plan stops. Brian reviews audio values and console facts afterwards. Phase 9 (accuracy review) is still a separate session.
11. Unfilled brackets use assumed defaults (listed in CLAUDE.md under "Our setup" and the fixture band). They are assumptions, not facts about the church, and are editable in the app.
12. Console manuals were downloaded from the links on Behringer's own product pages into `docs/manuals/` (gitignored).

## 2026-11-18: decisions made while building (not yet reviewed by Brian)

These were needed to proceed and are flagged for review.
