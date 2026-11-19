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

13. **Combination rule for modifiers:** all offsets add onto the baseline in pipeline order (mic, player, room, service, band); then context limits clamp (the room's reverb ceilings, the wedge cap on vocal gain reduction); then the musical limit clamps last and is reported as a warning. Reason: one rule everywhere, and the provenance trail reads in the same order.
14. **Rounding:** Hz to the nearest 5, dB and ratios to the nearest 0.5, ms to whole numbers, seconds to 0.1. Reason: a volunteer cannot set 137 Hz.
15. **Added a `synthBass` role.** The brief's role list omits it, but its subwoofer and ensemble rules name it.
16. **Musical limits are keyed by profile, not role,** with vocal low cut limits by voice range. Where no explicit limit is listed, the limit is the setting's usable range. Reason: electronic drums as a stereo pair and as separate outputs need different limits.
17. **DCA members (assumed, brackets were unfilled).** Low End: kick, bass guitar, synth bass, cajon, and the kick output of an electronic kit. Energy: snare, toms, hi-hat, overheads, electric guitar, and electronic drums (the stereo pair, or its snare, toms and cymbals outputs). A stereo electronic kit is in Drums and Energy but not Low End, because riding Low End would lift the cymbals too.
18. **Group buses only for two or more channels.** A group of one does nothing its own fader cannot do. Wish order: vocals, drums, guitars, keys. On a console with mono buses, vocals and guitars take a mono group; drums and keys need a linked pair or fall back to their DCA.
19. **Bus priority in the adapters:** monitor mixes, send effects, stream mix, subwoofer bus, then group buses. The brief fixed monitors, effects, groups; stream and sub were placed between because they are needed for the service to work at all.
20. **Monitor mix assignment is a starting guess.** With fewer mixes than musicians: lead vocal, harmony vocals, keys, then everyone else shares the last mix. Monitor mixes are mono on the X32.
21. **No gate on snare or vocals by default.** The conservative option; a snare gate is offered only under "if you hear".
22. **Console facts not in the manuals are UNVERIFIED with no value,** not filled from memory: X32 low cut range, gate and compressor ranges and exact on-screen labels, X32 ratio steps, X32 solo-in-place, whether a mute cuts pre-fader sends, the default send tap on both consoles, WING low cut range, how to feed a sub on the WING. The sheet flags the affected steps "check on your console" and does not clamp to ranges it does not know.
23. **The X32 manual on Behringer's site is the 75-page "preliminary" manual for the full-size X32.** It does not mention the Compact, Producer or Rack.
24. **Main bus limiter is an FX insert on both consoles** (Precision Limiter), because neither manual documents a built-in main limiter. It takes an FX slot after the de-esser.
25. **Initial state:** the band starts empty and an "Example lineup (placeholder names)" template is seeded. No real names are ever committed.
26. **Sass, print:** the print stylesheet lives in `src/_print.scss`. One sheet section per page; the "if you hear" appendix starts a new page.
27. **State is saved on every change, synchronously.** An earlier version saved on a later tick and lost a change made just before a reload.
28. **Troubleshooter:** trees are typed data with conditions and text tokens; console control names come only from profile facts. During a service, rehearsal-only checks are skipped and rehearsal-only fixes are replaced by a safe alternative or an "after the service" note. Frequencies and amounts in the trees are typical starting values written for the trees, not taken from the knowledge base.
