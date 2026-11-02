# Bati buildings track: prep session (runs beside the loupes session)

Another Claude Code session is running the village loupes loop on the
emulator. You prepare the buildings track without getting in its way: only the
work that needs no emulator, no FLUX and no merge. You are an orchestrator: you
plan and dispatch, Sonnet implements, Opus plans cards and judges.
Language of every doc and note: French, simple and short.

## Hard limits (another session is running)
- Never touch the emulator, adb, Maestro, an app install, or the image cache.
- Never call FLUX or scripts/iso/iso_loop.py, never edit the FLUX registry or VALIDATIONS.md.
- Never commit to ISO_BRANCH, never merge or rebase it. Work only in a new worktree, on a branch bld-prep created from the ISO_BRANCH tip (find ISO_BRANCH with git branch --contains 0fad2396; ask if several). Commit there.
- Never edit what the loupes session owns: docs/designs/village-loop/, lots.json, perf-debt.md, the village scene code. Reading is fine.
- Never edit .claude/agents/. No new dependency without asking.
- Subagent runs: [FILL IN, suggested 40]. At 80 %, finish the current step, write the summary, stop.

## Read first
docs/designs/village-buildings/PROMPT.md (the full buildings prompt) and
docs/designs/village-buildings/catalog.md. Everything below follows their
rules; this prep only does the parts listed here.

## Steps
1. **Pipeline**: find how a stage goes from Blender maquette to day painting to night painting (the .blend files or bpy script, derived_from in the sprite manifest), and the data behind Guillaume's buildings page (code, tier, emprise, repère per building). Write docs/designs/village-buildings/pipeline.md: where things are, how to render a maquette headless, what is unclear.
2. **Data and scripts** (one Sonnet implementer, on bld-prep, behind flags, old mapping by default): the shared stage table for both upgrade rules with its monotonic and migration tests; the per-building data file format (add-ons, gag slot, light anchors, clan mark position); the scripts of step 0 item 4 of PROMPT.md that need no emulator (shuffles with decoys, A/B pairs, numbered grids, footprint check, black silhouettes and the 96 dp blur, contact sheets, G-SET metrics, pixel diff outside a mask). Unit tests green, plus typecheck and Biome.
3. **Cards** (8.1 of PROMPT.md): the planner drafts the cards of the windmill and the observatory, then campfire, tent and training_dummy; theo and mara review each draft once; you fix. Do not freeze them: Guillaume decides at the next checkpoint.
4. **Maquettes** for the windmill and the observatory: build the maquette of every new stage in Blender (the windmill's legendary and mythic, the observatory's grand, legendary and mythic, rule B), on the same emprise and camera, with the card's towering element and gag slot. Render each maquette and its black silhouette. Run the silhouette part of G-ID with two stranger contexts (appendix B of PROMPT.md). Rework the maquettes until it passes, 3 rounds at most.
5. **State**: write docs/designs/village-buildings/state.json marking what is done, so the real buildings session skips it.
6. **Summary**: docs/designs/village-buildings/prep-summary.md, in French: what is ready, the 5 draft cards to review, one maquette strip per pilot building (all stages side by side, silhouettes under), and the questions for Guillaume. Then stop.

The full buildings session starts once the loupes session is finished. It
rebases bld-prep onto ISO_BRANCH and goes on from state.json.
