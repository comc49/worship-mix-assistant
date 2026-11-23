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

## 2026-11-19: fixes approved by Brian after the phase 9 accuracy review

29. **A click never gets a monitor send when wedges are on stage** (wedges or mixed), and the plan carries a warning. The room would hear it.
30. **X32 buses are allocated by odd/even pair.** The manual (p49) sets the send tap for two buses at once, so a pair is never shared between monitor (pre-fader), effect (post-fader) and group use. Two mono groups may share a pair; the group step then says which sends to switch on and off. Whether a send is on or off by default in Sub-Group mode is UNVERIFIED, so those steps are flagged "check on your console".
31. **A stereo group on the X32 gets a "link the two buses" sub-step.** The link procedure is UNVERIFIED (seen only in a screenshot).
32. **WING Compact: input sockets are listed separately from channels,** with one step for assigning inputs to channels and a sub-step for grouping two inputs as a stereo Source (manual p39, p40). This is the one routing change the sheet asks for.
33. **The monitor section starts with every mix master down and ends with masters up and the ring-out.** With in-ears it adds "packs at minimum" and a limiter step, and uses no wedge wording.
34. **Feedback trees:** the wedge test keeps a finger on mute and re-mutes at once; the fix lowers the send with the channel muted and says which mix (nearest wedge, or all of them).
35. **Tips and mixer notes are per role, not per rating,** and every channel gets a tip. This changes decision 5: skill no longer changes coaching notes, because a note that appears only for some ratings reveals the rating of a named person on the printed sheet. The praise lines for the highest rating were removed.
36. **The value trail never prints,** even when a detail panel is open. It stays on screen, where the mixer who entered the ratings is the reader.

## 2026-11-19: second round of review fixes, approved by Brian

37. **"No sound" in a service looks at phantom power and gain** (look-only steps are safe). Changing either is still rehearsal only; in a service the tree ends in "tell the tech lead" instead.
38. **Headphone solo steps carry a solo-in-place caution** and the console's own description, and are flagged "check on your console" unless a profile verifies the console has no such mode.
39. **The troubleshooter hides symptoms the band has no instrument for,** and steps inside general trees are skipped when they name an absent instrument. An empty band shows everything. "Kick has no punch" has a cajon branch.
40. **Lowest-rated electric guitar is 4:1 with a 10 ms attack** (was 8:1 and 5 ms), limit 6:1, and every electric guitar gets the note "set the threshold on the loudest sound".
41. **Dry room:** vocal low cuts are not lowered; plate is +0.2 s (was +0.4) and its send is capped at -8 dB.
42. **Toms:** +10 Hz in the live room (was +20) and no room-noise bump, giving 80 Hz.
43. **WING Compact main limiter goes on the post-fader insert** of the main bus (manual p77).
44. **Wording:** "Q", DCA versus group bus, post-fader and pre-fader are each explained once in a section intro, which prints. "Low cut" is the only name for that filter; "feedback" only means howl; "saved lineups" is the only name for templates in the UI.
45. **Fixture placeholders are person-like** ("Player D" to "Player I") so a name is always printed next to a role in tests.

Still open from the review, by choice: the on-screen value trail still shows the reason for a player adjustment under a named channel; two named people in one role still get visibly different numbers (inherent in the design); monitor and effect-feed buses are not explicitly taken off the main mix on the sheet; several sheet steps name a setting without the full path to it; X32 ratio steps are not snapped because the list is unverified; lower-priority wording items in the troubleshooting trees.

## 2026-11-23: Knobs tab and Sound lab (asked for by Brian)

46. **Knobs tab** is a bento grid: group tabs, one tile per control, one detail panel. Its explanations are plain-language and were not part of the accuracy review.
47. **Sound lab**: a compressor and a gate/expander written to the WING manual's parameter definitions (section 11.2: ATTACK and RELEASE as the time to cover about two-thirds of the change, HOLD before release, gate RANGE, RATIO and ACCENT). It is a teaching model, not Behringer's algorithm, and the slider ranges are the lab's own because the manual gives none. The screen says so.
48. **Practice sounds are generated by code** (drum loop, uneven bass, synthetic voice, snare and kick mics with bleed): no audio files, works offline.
49. **No real-time audio code.** The loop is four seconds long, so each control change reprocesses the whole loop with the same tested functions in `src/app/core/audio` and swaps it in at the same position. The gain reduction for the whole loop is therefore known and is drawn over the waveform.
50. **Compressor presets start level-matched** (makeup gain set so the loudness equals bypass), so the first comparison is about the sound and not about which is louder.
51. **Sound lab has four processors:** compressor, gate, low cut and EQ, and dynamic EQ. They share one description shape (`lab-processors.ts`), so the screen has no per-processor code.
52. **Low cut and EQ** follow the WING EQ layout in the manual (LO CUT with 6, 12, 18 or 24 dB per octave, shelves L and H, parametric bands with GAIN, FREQ, Q), with two of the WING's four parametric bands. The picture is the EQ curve.
53. **Dynamic EQ** follows the manual's Triple DEQ definitions (Threshold, Ratio, Gain as the maximum change, Attack, Release, Above/Below; four behaviours). The detector listens only to the band's own range. The eight-step learning guide lives in `core/knowledge/dynamic-eq-lesson.ts`; the two steps the manual does not spell out (how to load it into the slot, Band Solo) are flagged "check on your console".
