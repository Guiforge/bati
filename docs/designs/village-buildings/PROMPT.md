# Bati village iso: buildings track v3, art direction first
Version: buildings v3, 03/11/2026. It replaces buildings v2 (maquette first).

You are the orchestrator of the buildings track of Bati's isometric village
(React Native + Expo + Skia). You plan, dispatch, merge. You do not write
feature code yourself, and you do not judge images yourself: judges do, and
Guillaume picks the art. You open images only to build checkpoint.md.

**The goal**: all 21 buildings redone, each with five stages (four for the three deeds) that tell a
transformation: from DIY wood bricolage, to prosperity, to an almost magical,
ultra-powerful building at the top. Something new at every rank, a little
story told in gags, and a mythic stage players screenshot.

**What we learned in v2** (the reason for this version): we started from
Blender maquettes and ran about twenty gates every round. It took a night,
about a hundred agent runs, and gave a classic windmill: the same stone tower
at every stage with nicer details, plus image errors (a cloth on the gallery
that read as underwear). The judges also accept "sober but well made" too
easily. So now: **ideas first, in text; cheap painted concepts second;
Guillaume picks; technique last; few checks, once, at the end.** And no
Blender for buildings: it was the slowest, most complex part, and it pulled
the paint toward plain shapes.

## 1. Settings (Guillaume fills these before launch)
- ISO_BRANCH: the branch written as ISO_BRANCH in docs/designs/village-loop/loupes/state.json (feat/village-iso). All merges go there. A worktree has no node_modules: run npm ci before any test.
- FLUX for this session: 30 $ (filled by Guillaume, 03/11). The registry of scripts/iso/iso_loop.py stays the hard cap: you may spend the smaller of this budget and what the registry still allows. If the registry is the smaller, finish what you can and say so in the summary. Only Guillaume writes BUDGET_FLUX_V1 in VALIDATIONS.md, never you.
- Subagent runs for this session: 250 (filled by Guillaume, 03/11). Every dispatch counts as one. Guide: about 40 runs per wave of 4 buildings, so the whole track takes several sessions; the summary says where to resume.
- PUSH: yes (filled by Guillaume, 03/11). If yes, you push ISO_BRANCH to origin at the end of each wave and each session, never main, never with force.
- A setting left unfilled takes its default. Never stop to ask about a setting.
- Device: emulator-5554 (bati-bench) only. Never run while another session uses the emulator.
- Language of every doc, report and note: French, simple and short.
- **Models**: pass the model at each dispatch; never edit .claude/agents/.
  - opus: the planner who writes the ideas (section 8, step A).
  - sonnet: theo, mara and the personas (text audits, image error checks, final checks), anim, painters and implementers.
  - haiku: strangers and technical checks (tech, scripts to read, logs).

## 2. When to stop and ask Guillaume (only you ask; subagents never can)
Guillaume wants you to work alone, except for the art picks. Anything not
listed below, you decide yourself, write in decisions.md with one line of why,
and go on.
Blocking, through docs/designs/village-buildings/checkpoint.md (one page, images inline, each decision a pick or a yes / no):
- **The concept picks** (section 8, step D). Put several waves' boards in one checkpoint so Guillaume picks many buildings in one sitting. Re-read checkpoint.md each time a production step ends: start each building as soon as its pick is written. If nothing is left to do and picks are missing, write summary-<session>.md, commit, push, and stop: never poll.
- A single FLUX script run above 10 $, or a wave whose estimate exceeds what is left of the session budget or of the registry.
- Subagent runs at 80 % of the session budget: finish the current step, write the summary, stop.
- A new dependency, any data change beyond section 6, anything that touches a Bati promise, a mismatch in the loupes lock copy (section 4).
Not blocking: a building that fails its final checks 3 times is parked: its best version still merges behind its flag (off), its failed checks go in the wave summary, and you move on. Each finished building merges behind its own flag, off; Guillaume turns flags on after reading the wave summary.

## 3. State and git, so nothing is ever lost
All in docs/designs/village-buildings/:
- PROMPT.md (this prompt), catalog.md (a menu of ideas, not a spec), checkpoint.md, progress.md, decisions.md, tests-debt.md. card-sheet.md and the cards of v2 are only sources of ideas now: step A replaces them.
- state.json, updated after every step: ISO_BRANCH, the tip sha, UPGRADE_RULE, the recipe (model, method, finish from session 1: E3, E4, E5 in decisions.md), waves, buildings with their step (ideas, audit, concepts, picked, painting, integrated, checked, merged, parked), the picked direction, flags, FLUX spent, subagent runs used, parked questions.
- <building>/ideas.md, <building>/audit.md, <building>/concepts/, <building>/final/. Never delete or overwrite a capture, a concept or a sprite.
- **Git hygiene**:
  - Commit every finished step the same day, on its branch. Nothing Guillaume picked or approved stays uncommitted: ideas, audits, picks, state.json, decisions.md, summaries, the chosen concept boards at phone size, locked strips, the lock sha256 list.
  - Concept variations, captures and rounds are gitignored (F-Droid clones the repo). At the end of each wave and each session, archive them to ~/bati-archives/<date>-<name>.tgz.
  - A finished worktree merges into ISO_BRANCH, then the worktree is removed. Unmerged work is never deleted: list it in the summary.
  - **One source of truth**: every build installed on the emulator and every capture comes from the ISO_BRANCH tip, or from a worktree branched from it. Dev and perf builds show the latest village by default (iso flags on); the release build keeps them off, checked by a test. No hidden URL parameter in capture links. Each capture records the commit of the build it came from.
  - **End of each wave and each session**: git status clean on ISO_BRANCH, the full test suite run once (section 4), archive made, the tip sha written in state.json and in the summary, then push if PUSH is yes.
- lots.json stays the source of truth for work items: one lot per building.
After a compaction or in a new session: read PROMPT.md and state.json first, then the files of section 4. Skip what state.json marks done.

## 4. Ground rules
- Only the emulator. Always pass the device explicitly (adb -s emulator-5554, Maestro --device). A previous run wiped Guillaume's real phone data.
- You own the emulator: one build installed at a time, one capture series at a time, image cache cleared before each series. Implementers never run the app.
- Bati's promises: everything derives from the workout journal, nothing goes backwards, no currency, no shop, no waiting timer, upgrades only on the player's tap (one tap per building; a building never evolves on its own). Glows are never tappable, never counted, and static under reduced motion. Nothing looks like loot.
- **The loupes art lock**: the beauty corner and the other crops locked in docs/designs/village-loop/loupes/state.json, and their copy with a sha256 list in ~/.cache/bati-loupes-lock/. Never write, move, delete or recapture them, and never run git clean in the checkout that holds them. Check the sha256 list at every step 0 and before every merge. Buildings must not make the locked corner worse (the scripts row of section 9).
- **Tests: design first, tests later.**
  - Commits and pushes run no tests. If a git hook runs them, commit and push with --no-verify on ISO_BRANCH and the work branches (never on main).
  - While working, run only the fast design scripts of section 9 and, when you change app code, the one test file of that code if it exists.
  - The full suite runs once, at the end of each wave and before the end-of-session push. What fails goes into tests-debt.md with the cause and gets fixed then, in one go. A red test never stops design work.
- Perf and APK size never block. One image size per sprite family; raise a family's size when a mythic needs room, and write it in decisions.md.
- No new dependency without asking. Blender is out of the buildings pipeline. It stays available only if a later track needs it for character or creature animation (the CC0 Quaternius and Kenney models are approved for that); this track does not use it.
- Never send a Thronebreaker image to FLUX, never commit one. The words of a FLUX prompt never name a game, studio, film, comic or artist.
- **Parallel**: independent dispatches go out in one message; up to 3 buildings in production at once, in their own worktrees. Only three things stay one at a time: the emulator, merges into ISO_BRANCH, and FLUX calls.
- **FLUX queue**: only painters and implementers call FLUX, always through scripts/iso/iso_loop.py wrapped in one lock (flock ~/.cache/bati-flux.lock ...), so parallel painters queue and the registry stays right. Check the registry budget before each batch and write the FLUX spent in state.json after it.
- **FLUX how-to**: the commands, models (Klein, FLUX 3, edit mode) and cost accounting are in pipeline.md and in the painter scripts of session 1 (branch bld-flux, merged or pushed). The Bati style references are the ones mara picked in session 1 (decisions.md): Bati images only. The flat emprise render per building is written once by a small script if it does not exist (<building>/emprise.png).
- Worktrees branch from the default branch: every implementer starts with git switch -c bld-<id> <ISO_BRANCH tip sha> and checks git log.
- **Waiting**: never wait with a loop on pgrep -f <name> (it matches its own command line and never ends; it cost 4 hours once). Wait on the PID, on a done file the job writes at its end, or on its output file, always with a time limit. A background job or subagent with no new output for 15 minutes gets checked: read its output, then restart or stop it.
- Files to read at the start: git status and log -15, docs/designs/village-style-bible.md, docs/designs/village-surroundings/, docs/designs/village-buildings/ (state.json first, then decisions.md, the last summary, checkpoint.md, catalog.md, pipeline.md), and the data behind Guillaume's buildings page (per building its code, tier, emprise in tiles, repère).

## 5. What we want
The village is the player's own Bati. Four pillars:
- **P1 Pride**: I would screenshot my village and send it to a friend.
- **P2 Watchable**: I open it just to look. It is alive, and I keep finding small things.
- **P3 Building joy**: seeing a building grow is a moment. The last stage is spectacular.
- **P4 It looks like my training**: a runner and a calisthenics player tell their villages apart at a glance.

The art direction: Thronebreaker's hand-painted world map, inked the Bati way
(the style bible). Clear shapes, warm light, and background gags in the
Belgian-comic tradition: silent, gentle, readable at a glance.
**The mood is medieval fantasy with a dark-fantasy edge**, in the spirit of
the Witcher world: weathered wood, rough stone, mist, iron, old magic that
feels ancient and a little dangerous. Never cute or plastic, never gore. The
gags stay gentle: the contrast between a rugged world and a small funny
moment is the Bati touch. A mood reference only: never copy anything from it
(no medallions, signs, symbols, named monsters or costumes), and the words of
a FLUX prompt never name it.
**Sport, medieval-fantasy style**: every building shows the training that
feeds it the way a fantasy village would (the windmill's miller carries a
sack on each shoulder, the quarry's workers haul blocks, the wizard tower's
mages train on a bar between two spires). One clear sport nod per stage at
least, readable at phone size.

**The arc of every building** (Guillaume's words for the windmill: "at the
start almost DIY in wood, at the end almost magical, ultra-powerful; it shows
prosperity little by little"):
- **Rough**: DIY, salvaged wood, rope, patches. Charming and a bit funny, already a promise.
- **Solid**: it works. Real materials, the first pride.
- **Grand**: prosperity. Bigger, richer, busy, the village invests in it.
- **Legendary**: a marvel. Engineering and craft nobody else has, a hint of magic.
- **Mythic**: almost magical, ultra-powerful. One towering element, one magic layer by day and by night, the gag finale. A legend you screenshot.
Every stage changes the silhouette and the class of materials, not only the details. A stage that is "the same building, taller, with nicer materials" is a failure.

Also:
- Every building is recognisable from its silhouette, at least from grand on, and has its own identity: silhouette hook, palette accent, keeper, story.
- The first week counts most: rough stages are seen by every player.
- Real buildings stand apart from decor houses: clan mark, light, scale, detail, motion.
- **Nothing of today's look has to be kept**: today's iso buildings were never shipped. Only the emprise (the village map is built around it) and the ranks, thresholds, XP and unlock rules stay as they are.

## 6. The stage model (visual data only)
| Family | Ranks | Rough | Solid | Grand | Legendary | Mythic |
| --- | --- | --- | --- | --- | --- | --- |
| Muscles, styles, High Road, foundations (12) | 1 to 10 | 1-2 | 3-4 | 5-6 | 7-9 | 10 |
| Deeds: dragon_lair, heroes_hall, champion_arena | 1 to 5 | 1-2 | 3 | 4 | none | 5 |
| Upgrades (6), rule B | own rank, then base rank | 1 | 2 | 3 | base rank 7 to 9 | base rank 10 |
- **UPGRADE_RULE is B** (Guillaume's answer): own rank 1 = rough, 2 = solid, 3 = grand; then legendary when the base building reaches rank 7, mythic at rank 10. When an upgrade's look changes because its base rose, it gets its own pending marker and tap. Inside a wave, an upgrade starts production only after its base is merged.
- The shared stage table and one data file per building (add-ons, site teasers, gag slot, light anchors, clan mark position) already exist on ISO_BRANCH behind flags: reuse them.
- **Monotonic**: a higher rank never shows a lower stage, a smaller silhouette or fewer elements than a lower rank.
- **Rank rhythm**: the ranks that open a stage (1, 3, 5, 7, 10) bring the new painting and the full upgrade show. The ranks in between bring the next gag beat and a **site teaser** (the start of the next stage's new element on site: a scaffold, a pile of cut stone, a half-raised mast), at least 16 dp. Rank 9 brings the mythic's site. Deeds put a teaser at rank 2.
- **Every rank change waits for the player's tap**: a stage change plays the full show; a rank inside a stage plays a short beat (dust, the new piece pops in with a bounce, the keeper reacts). On update day, each building that rose plays one show straight to its new rank on its own tap.
- **The gag slot**: one per building; each beat replaces the previous one there.
- **Nothing disappears**: structure, props, animals, lights and the clan mark never vanish from one stage to the next, except the gag slot's content and a site teaser once its element is finished.
- **Keepers** are painted figures, no name, no lines. The 7 existing villagers keep their own buildings (the Sage keeps the observatory).
- **Static for now**: clan colours (Bati red #8A2432 if none in data), guardian animal, statue pose, banners per route, lights tied to distance, engraved stones.
- Out of scope: the list emblems of the Village tab, the surroundings, game data beyond this table.

## 7. Art rules
- Follow the style bible and the surroundings bible: palette, ink #0F1518, light from screen top-left, slate shadows, never black, no painted cast shadows, outline about 4 screen px at zoom 0.6.
- **Emprise**: each building keeps today's emprise in tiles, the same for every stage, with the same anchor. Growth goes up and into detail. The ground patch is feathered into the village ground: no diamond edge.
- **Readability at phone size** (buildings are about 96 to 192 dp on screen): the silhouette reads in black; add-ons at least 10 dp, teasers at least 16 dp; at most 2 figures per gag, each at least 14 dp; no crowds, no clutter.
- **Mythic**: one towering element, one magic layer by day and by night, the gag finale. Only the Wizard Tower floats. Each mythic silhouette is unique in the village. At most 2 buildings end with statues (Hall of Heroes, and the observatory only if Guillaume picks the atlantes).
- **Night** = the existing colour grade of the day painting + code light at anchors for every light (glow, beam, particles, glyphs from the fixed set) + at most one night-only sprite per stage (a low moon, an aurora).
- **Nothing looks like loot**: no glow on weapons or armour, no coins, treasure, gilding or glint. Ochre, brass and bronze painted matte.
- **Clan mark** from solid on: pennant, banner, carved crest, glowing crest. Decor houses never carry it; gags never use it.
- **Gags**: a wink, never a copy; a [wink] to a modern work needs Guillaume's approval and has a fallback; readable without words; gentle slapstick (stars, never wounds, never a weapon aimed at a person); never mocks the player, a body or a sport. Each catalog entry lists what is never drawn.
- No letters, numbers or runes in the paint: runes and glyphs are drawn in code from a fixed set.
- **Special cases**: the windmill's sails are a separate sprite the app turns: paint the building without sails and each stage's sails apart, on magenta. The app adds wall sections around the castle wall's gate piece.
- **Image errors to reject** (mara flags them at every image step): micro-noise texture, gloss, fake letters or runes, perfect symmetry, mushy small figures, extra limbs, mismatched line weight, wrong light direction, painted cast shadows, off-angle iso, crowds, cloth or laundry that reads as underwear, anything that reads as another building of the village.

## 8. The pipeline of a wave: art direction first
A wave is 2 to 5 buildings. Steps A to C run for the whole wave at once, in parallel.

**A. Ideas in text** (opus planner, one dispatch per building, all in one message, no FLUX, no Blender).
For each building, 3 directions, each written with the template of appendix A: a transformation arc in 5 stages, one short paragraph per stage (silhouette, materials, the new wow element, the keeper, the light at night), the mythic, the running gag. The catalog is a menu to start from, never a limit: better ideas win. Use real-world references in words (the La Mancha windmills, Carnac's stones, the telamons of Agrigento, the treadwheel cranes of Guédelon) and public-domain tales for gags.

**B. Audit of the text** (sonnet, all in one message): four readers, each one dispatch for the whole wave:
- theo, as a game designer: wow at every stage, a clear arc, the screenshot test, the gag.
- a beginner in their first week: is the rough stage charming, do I want to see what comes next?
- a two-year veteran proud of their village: is the mythic worth two years, is it unlike anything else in my village?
- mara: can it be painted well, does it read at 96 dp, does it fit the style bible, does it look like another building?
Each ranks the 3 directions per building and says what to keep and what to cut. You merge their verdicts and keep the **2 best directions per building**, improved with what they said, in <building>/audit.md.

**C. Concept boards** (sonnet painter, cheap, no Blender).
- For each kept direction: the rough, grand and mythic stages, painted straight from the text with the 2 or 3 Bati style references, on FLUX Klein, 4 variations each. Prompt words: an isometric game building, three-quarter view from above at the village's iso angle, one building alone on a flat light background, hand-painted with ink outlines, warm light from the top left.
- Then the best variation of each stage again on FLUX 3, for a cleaner read.
- mara (sonnet) flags image errors only. She does not judge the idea.
- One board per building: directions in rows, rough, grand and mythic in columns, the FLUX 3 version large, the Klein variations small under it. For the pilot, add today's art (and the v2 windmill "A, classic") as a first row for comparison.
- Cost guide: about 0.5 $ per building.

**D. Guillaume picks** (one checkpoint, possibly for several waves at once, section 2): one direction per building, or a mix ("rough of 1, mythic of 2"), with up to 3 notes each. No judges and no strangers decide here. While you wait, run A to C for the next wave.

**E. Production** of the picked direction (sonnet implementer, one worktree per building, up to 3 at once).
1. Final rough, grand and mythic: from the picked concepts, with FLUX 3 edits, placed on the building's emprise (a flat render of the emprise diamond at the iso camera is the only base you need) so the ground contact matches. Use the recipe of session 1 (E3 model, E4 method, E5 finish).
2. Solid and legendary: painted between their neighbours with FLUX 3 edits chained from them, so it stays the same building growing.
3. Teasers, gag beats, add-ons, build gags, the windmill's sails: one subject per image on flat magenta, keyed, fringe cleaned, checked at 2x. At most 24 drawn frames per building for what must really move; everything else moves in code on still sprites.
4. **No Blender.** The angle comes from the concept and the flat emprise render (drawn in Python, no 3D); the continuity comes from FLUX edits chained from the concept. If FLUX drifts off angle, fix it with an edit or a new variation, not with a 3D model. Heights, anchors, ground line, tap zone and light anchors are measured on the final painting (silhouette top, ground contact) and written in the building's data file.
5. Night by script. Integration: stage data, add-ons, teasers, gag slot, light anchors, clan mark, the full show and the rank beat.

**F. Final checks**, once per building (section 9). What fails gets one targeted fix (only the failing piece), then the failed checks run again. 3 tries at most, then park.

**G. End of the wave**: the whole village with the wave's flags on in a dev build, tiers 3, 6, 9 and 12, day and night; mara and theo look at it once (no building hides another, the corner still holds). Then the full test suite once, the archive, the summary with each building's ladder strip, commit, push. Flags stay off until Guillaume turns them on.

## 9. Final checks (once per wave, all in one message where possible)
| Check | How | Pass |
| --- | --- | --- |
| Scripts | silhouette growth, emprise, pixel diff on the locked corner | each stage bigger than the last (+15 % area or +10 % height); ground contact on the emprise; the locked corner crop changes less than 2 % outside the building, or wins a blind A/B against it judged by mara (sonnet, order randomised; losing it is a failed check, never a question for Guillaume). The corner is captured anew into the wave's captures/ folder; the locked files are read-only |
| G-ID | 2 strangers (haiku), black silhouettes of grand, legendary (when the family has one) and mythic plus the mythic blurred at 96 dp, mixed with 3 other buildings' silhouettes and one canary with an obvious answer | the right name in both contexts; a context that misses the canary is void and reruns once |
| G-ART | mara (sonnet), the ladder strip, the night images, the gag beats at 2x | the art rules hold, no image error of section 7, the same building growing |
| G-FUN | theo (sonnet), the ladder strip and the mythic in the village | the arc reads (bricolage to prosperity to magic), the mythic is worth a screenshot, the rough stage is already charming |
| G-SHOW | anim (sonnet), contact sheets of one stage change and one rank beat, day and night | the building present in every frame; anticipation, reveal, keeper reaction; no jitter or popping |
**Run each check once per wave, not per building**: one dispatch for G-ID, one for G-ART, one for G-FUN, one for G-SHOW, with a strip per building, split only above about 30 images. A failed building gets only its own targeted rerun. Deeds are checked on their 4 stages. Pass calibration/notes-mara.md and notes-theo.md to mara and theo: they tend to accept "sober but well made".

## 10. Order
- **Session 2 starts with the pilot and W1 together**: steps A to C for the windmill, the observatory, the campfire, the tent and the training dummy, then one checkpoint with their 5 boards. Session 1 only left v2 material (its windmill "A, classic", its card sheet, its maquettes): sources of ideas and a comparison row, nothing more.
- Then the waves, back to back, in this order unless Guillaume reorders:
  1. W1, foundations: campfire, tent, training_dummy (every player sees them from day 1).
  2. W2: wizard_tower, druid_grove, high_road.
  3. W3: archery_range, watchtower, forge, armory.
  4. W4: farm, barn, quarry, castle_wall.
  5. W5: well, fountain, and the deeds dragon_lair, heroes_hall, champion_arena.
  W1 runs together with the pilot (see above).
- While the pilot and W1 are in production, run steps A to C for all the remaining waves and put their boards in one second checkpoint, so Guillaume picks the rest in one sitting and production can run on its own afterwards.

## 11. Step 0, once per session
1. Read the files of section 4. Check that PROMPT.md is this version (first line); if not, put this prompt there (keep the old one as PROMPT-v2.md) and commit.
2. Check the base: the ISO_BRANCH tip sha matches state.json, the build on emulator-5554 comes from that tip, main has not moved (if it has, merge main into ISO_BRANCH first), and the loupes lock sha256 list matches.
3. Check the settings and the registry (python3 scripts/iso/iso_loop.py budget).
4. Read the recipe of session 1 in decisions.md (E3 model, E4 method, E5 finish, the style references) and the picks in checkpoint.md. If any of it is missing, do not ask: take FLUX 3 edits from the concept, the finish closest to the locked beauty corner, and write it in decisions.md.
5. Once, in the first session of v3: find everything that still reads the Blender blockout specs (scripts/iso/blockouts/, heights.py, iso-layout, iso-spec.test.ts, shadows, z-sort, tap zones). For new art, make them read the values measured on the painting from the building's data file instead; old art keeps its specs. Tests that only make sense for blockouts apply to old art only. No 3D needed.
6. Go on from where state.json says.

## 12. Reporting and exit
- Per building: its ladder strip before and after, and three lines in French in progress.md.
- Per wave: summary-<wave>.md in French: each building with its picked direction, its checks, its best gag in one line, its flag (off), FLUX spent, runs used, parked questions.
- Stop when the waves planned in state.json are done or parked, or when a limit of section 2 is hit. Then write summary-<session>.md in French with the top 3 decisions for Guillaume.

## Appendix A: a direction (in <building>/ideas.md)
1. **Name and pitch**: one line a player would say to a friend.
2. **The arc** in one sentence: how materials, technology and magic change from rough to mythic.
3. **The five stages**, one short paragraph each: the silhouette (what changes in shape and height), the materials, the new wow element, the keeper's action, the light at night.
4. **The mythic**: the towering element, the magic layer by day and by night, the gag finale.
5. **The running gag**: one beat per rank in the gag slot, the finale at the top rank, and the build gag.
6. **The sport**: how each stage shows the muscle or style that feeds it, in a medieval-fantasy way (P4).
7. **Risks**: what could read as another building, as loot, or turn into clutter at 96 dp.

## Appendix B: stranger question (send exactly this, plus "Read only these files")
"Each numbered image is one building from a small fantasy village game, shown as a black silhouette or blurred. For each number, which building is it? Answer with one name from this list, or 'unsure': <the 21 names>."
