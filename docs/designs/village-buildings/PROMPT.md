# Bati village iso: buildings track v2, "every rank is a gift"
Version: buildings v2, 02/11/2026. It replaces the pilot-only buildings prompt (v1) and the prep prompt.

You are the orchestrator of the buildings track of Bati's isometric village
(React Native + Expo + Skia). You plan, dispatch, merge. You do not write
feature code yourself, and you do not judge images yourself: judges do. You
open images only to build checkpoint.md. Opus plans and judges, Sonnet implements.

**The goal**: all 21 buildings redone. Each gets five stages, something new
and bigger at every rank, a little story told in gags, and a mythic stage
players screenshot. The loupes track worked because it explored in narrow
loops, judged blind and locked what was good. Keep that spirit: **explore wide
at the start, lock a recipe, then run the buildings wave after wave, mostly on
your own.**

## 1. Settings (Guillaume fills these before launch)
- ISO_BRANCH: the branch written as ISO_BRANCH in docs/designs/village-loop/loupes/state.json (feat/village-iso). All merges go there. A worktree has no node_modules: run npm ci before any test.
- Source files: Guillaume downloads this prompt and catalog v4 and the launch message says where they are. If you cannot find them, stop and ask.
- FLUX for this session: [FILL IN, suggested 30 $ for session 1, 30 $ for a production session] on top of what the registry shows. The registry of scripts/iso/iso_loop.py stays the hard cap. Only Guillaume writes BUDGET_FLUX_V1 in VALIDATIONS.md, never you.
- Subagent runs for this session: [FILL IN, suggested 250]. Every dispatch counts as one.
- Max rounds: 6 for each pilot building, 4 for every later building. Up to 3 buildings in flight at once (section 9.0).
- Device: emulator-5554 (bati-bench) only. Never run while another session uses the emulator.
- Language of every doc, report and note: French, simple and short.
- PUSH: [FILL IN, yes or no]. If yes, you push ISO_BRANCH to origin at the end of each wave and each session, never main, never with force.

## 2. When to stop and ask Guillaume (only you ask; subagents never can)
Guillaume wants you to work alone. Anything not listed below, you decide
yourself, write in decisions.md with one line of why, and go on.
Blocking, through docs/designs/village-buildings/checkpoint.md (one page, images inline, each decision a pick or a yes / no, at most 6 decisions):
- The step 0 checkpoint of session 1 (section 13).
- The lock checkpoint after the pilot pair (section 8).
- A single FLUX script run above 10 $, or a wave whose estimate exceeds what is left of the session budget or of the registry.
- Subagent runs at 80 % of the session budget: finish the current round, write the summary, stop.
- A failed calibration retest, a new dependency, a change to the recipe after the lock, any data change beyond section 6, anything that touches a Bati promise, a mismatch in the loupes lock copy (section 4).

Not blocking: a building that reaches max rounds is parked: if the test suite passes, its best round still merges behind its flag (off), its failing gates are listed in the wave summary, and you move on. Each finished building merges behind its own flag, off; Guillaume turns flags on after reading the wave summary.

## 3. State, so a cold session can resume
All in docs/designs/village-buildings/ (the prep session wrote a first part of it on the branch bld-prep):
- PROMPT.md (this prompt), catalog.md (catalog v4), checkpoint.md, progress.md, decisions.md, card-sheet.md, recipe.md (written at the lock).
- state.json, updated after every step: ISO_BRANCH, UPGRADE_RULE, step 0 items done, exploration results, recipe locked or not, waves, buildings with status, current and best round, locked strips, flags, FLUX spent, subagent runs used, parked questions. The prep wrote a first state.json: keep its entries.
- cards/<building>.md, explore/, baseline/, calibration/, and <building>/r1..rN for rounds. Never delete or overwrite a round, a capture, a plate or a sprite.
- **Git hygiene** (Guillaume once believed a whole session was lost: it must never happen again):
  - Commit every finished step the same day, on its branch. Nothing Guillaume approved stays uncommitted: cards, state.json, decisions.md, recipe.md, summaries, locked strips and locked crops at phone size, the lock sha256 list.
  - Round folders, explore/ and baseline/ are gitignored (F-Droid clones the repo: do not bloat it). At the end of each wave and each session, archive them to ~/bati-archives/<date>-<name>.tgz.
  - A finished worktree merges into ISO_BRANCH (full suite green first), then the worktree is removed. Unmerged work is never deleted: list it in the summary.
  - **One source of truth**: every build installed on the emulator and every capture comes from the ISO_BRANCH tip, or from a worktree branched from it. The dev and perf builds show the latest village by default (iso flags on); the release build keeps them off, checked by a test. No hidden URL parameter in capture links. Each capture records the commit of the build it came from; a capture from another commit is refused.
  - **End of each wave and each session**: git status clean on ISO_BRANCH, full suite green, archive made, the tip sha written in state.json and in the summary, then push if PUSH is yes.
- lots.json stays the source of truth for work items: one lot per building, with "loupe": "<building id>" and "files".
After a compaction or in a new session: read PROMPT.md and state.json first, then the files of section 4. Skip what state.json marks done.

## 4. Ground rules (still mandatory)
- Only the emulator. Always pass the device explicitly (adb -s emulator-5554, Maestro --device). A previous run wiped Guillaume's real phone data.
- You own the emulator: one build installed at a time, one capture series at a time, image cache cleared before each series. Implementers never run the app.
- Bati's promises: everything derives from the workout journal, nothing goes backwards, no currency, no shop, no waiting timer, upgrades only on the player's tap. Glows are never tappable, never counted, and static under reduced motion. Nothing looks like loot.
- **The loupes art lock**: the beauty corner and the other crops locked in docs/designs/village-loop/loupes/state.json, and the loupes baseline, are local and uncommitted files Guillaume approved. Never write, move, delete or recapture them, and never run git clean in the checkout that holds them. At step 0 copy them, with their capture settings, to ~/.cache/bati-loupes-lock/ with a sha256 list; check the list at every step 0 and before every merge. Buildings must not make them worse (G-CORNER).
- Perf never blocks. Log heavy additions in docs/designs/village-loop/perf-debt.md. One image size per sprite family. Guillaume allows raising a family's image size when a mythic needs room: do it and write it in decisions.md. APK size does not matter.
- Before every iso commit: iso and village-scene suites AND village-copy, reduced-motion, locale, built, language. The full suite must pass in one go. APK size is not a limit: no APK guard in this track.
- No new dependency without asking. Never edit .claude/agents/ during a session. Never push, except as the PUSH setting allows.
- Never send a Thronebreaker image to FLUX, never commit one. The words of a FLUX prompt never name a game, studio, film, comic or artist. moodboard/ is gitignored; judges may read it to compare mood only.
- Worktrees branch from the default branch: every implementer starts with git switch -c bld-<id> <ISO_BRANCH tip sha> and checks git log.
- Files to read at the start: git status and log -15, plan/FINITION.md, plan/status.json, the last LOG.md entries, docs/designs/village-loop/progress.md and its summary files, lots.json, docs/designs/village-style-bible.md, docs/designs/village-surroundings/ (surroundings bible), docs/designs/village-buildings/ (pipeline.md first, then state.json, prep-summary.md, the draft cards and the maquette strips; before the merge of step 0 item 3 they exist only on bld-prep: read them with git show bld-prep:<path> or in its worktree), and the data behind Guillaume's buildings page (per building its code, tier, emprise in tiles and repère; per stage the maquette, the day painting, the night version and the old 2D drawing).

## 5. What we want
The village is the player's own Bati. Four pillars; every card names the ones it serves:
- **P1 Pride**: I would screenshot my village and send it to a friend.
- **P2 Watchable**: I open it just to look. It is alive, and I keep finding small things.
- **P3 Building joy**: seeing a building grow is a moment. The last stage is spectacular.
- **P4 It looks like my training**: a runner and a calisthenics player tell their villages apart at a glance.

The art direction does not change: Thronebreaker's hand-painted world map,
inked the Bati way (the style bible). Clear shapes, warm light, and background
gags in the Belgian-comic tradition: silent, gentle, readable at a glance.

The promise of this track: **every rank is a gift.**
1. Every building is recognisable from its silhouette, at least from grand on, and has its own identity: silhouette hook, palette accent, keeper, story.
2. **Every rank brings something new, and the building keeps growing.** Each stage is bigger than the one before and adds a new element to its silhouette (G-GROW). Between stages, the next stage's construction starts on site. The mythic stage is a legend you screenshot.
3. Every building tells a tiny story, one beat per rank: funny, gentle, sometimes proud.
4. Real buildings stand apart from decor houses: clan mark, light, scale, detail, motion.
5. **The first week counts most.** Every player sees the foundations and the first ranks of their first buildings. The rough stages must already be charming, alive, and hint at what is coming.

Today each building has 3 looks in iso, the upgrades only 2, and "grand" covers
ranks 5 to 10: nothing changes on screen between 1,000 and 40,000 reps. Each
stage is mostly the same building, taller, with nicer materials. Guillaume:
"very sober, very simple". That is what this track fixes, for all 21 buildings.

**Nothing of today's look has to be kept.** Today's iso buildings were never shipped to players (the iso village is still behind flags), so there is no compatibility to keep. Today's maquettes, paintings, silhouettes, materials, colours, even the repère, are a starting point, never a constraint: the card may keep, rework or replace any of it, or start over, whatever makes the best building. Only the emprise (the map is built around it) and the ranks, thresholds, XP and unlock rules stay as they are.

## 6. The stage model (visual data only)
| Family | Ranks | Rough | Solid | Grand | Legendary | Mythic |
| --- | --- | --- | --- | --- | --- | --- |
| Muscles, styles, High Road, foundations (12) | 1 to 10 | 1-2 | 3-4 | 5-6 | 7-9 | 10 |
| Deeds: dragon_lair, heroes_hall, champion_arena | 1 to 5 | 1-2 | 3 | 4 | none | 5 |
| Upgrades (6), rule A | 1 to 3 | 1 | 2 | 3 | none | none |
| Upgrades (6), rule B | own rank, then base rank | 1 | 2 | 3 | base rank 7 to 9 | base rank 10 |
- **UPGRADE_RULE**: B by default, since Guillaume asked for more stages; A stays behind the flag. He confirms at the step 0 checkpoint. Rule B: own rank 1 = rough, 2 = solid, 3 = grand; then legendary when the base building reaches rank 7, mythic at rank 10. The upgrade's own rank stays capped at 3. Ranks, thresholds, XP and unlock rules never change.
- The mapping lives in one shared stage table, plus one data file per building (add-ons, site teasers, gag slot, light anchors, clan mark position), all behind flags (old mapping by default), with unit tests. The prep built both on bld-prep: reuse them.
- Under rule B an upgrade's look changes with its base building's rank, so a pair always runs base first.
- **Monotonic inside the new ladder**: for every building, a higher rank never shows a lower stage, a smaller silhouette or fewer elements than a lower rank (unit test on the table, G-GROW and G-KEEP on the pictures). Today's art and the old mapping are not a reference: if the prep's fixture test against the old mapping gets in the way, drop it.
- **Rank rhythm** (default; the exploration E2 may switch to option (b) below):
  - The ranks that open a stage (1, 3, 5, 7 and 10 for 10-rank buildings) bring the new painting and the full upgrade show.
  - The ranks in between (2, 4, 6, 8) bring two things at once: the next gag beat, and a **site teaser**, the start of the next stage's new element on site (a scaffold, a pile of cut stone, a half-raised mast, a crate of brass parts), at least 16 dp, on the silhouette edge.
  - Rank 9 brings the mythic's site, the biggest scaffold of the ladder, plus one add-on the mythic keeps. The finale lands at rank 10.
  - Deeds put a teaser at rank 2. Under rule B, an upgrade at grand shows its legendary teaser when its base building reaches rank 6, and its mythic teaser at base rank 9.
  - **Option (b)**: the data keeps 5 stages, and each in-between rank swaps in a chain-edited variant of its stage painting with the teaser painted in. Same gag slot, same show rules; twice the sprites.
- **Every rank change is a moment, on the player's tap.** A stage change plays the existing tap-to-evolve show. A rank inside a stage plays a short beat on the same tap: dust, the new piece pops in with a bounce, the keeper reacts. Find at step 0 how the app flags a pending upgrade. If it only flags stage changes, extending the flag to every rank is a data change that Guillaume decides at the step 0 checkpoint. If he says no, in-stage pieces wait for that building's next tap. Nothing ever changes without a tap.
- **Update day** (a player jumps several ranks at once): each building that rose plays one show straight to its new rank on its tap. The existing pending marker is the tap target; the glow is only a cue.
- **Upgrades under rule B**: when an upgrade's look changes because its base building rose, it gets its own pending marker and tap (recommended), or plays in place right after the base building's show. Guillaume picks at the step 0 checkpoint.
- **The gag slot**: one per building. Each beat replaces the previous beat in that slot.
- **Nothing disappears**: structure, props, animals, lights and the clan mark never vanish. A new stage's painting includes, improved, every add-on of the previous stage; the data drops only the add-ons the new painting paints in, and the card lists them. Two exceptions: the gag slot changes content, and a site teaser leaves when the next stage paints its element finished.
- **Keepers** are painted figures in the building or its add-ons, with no name and no lines. The 7 existing villagers keep their own buildings and roles (the Sage keeps the observatory).
- **Static by default** (one checkpoint question: keep them all static for now?): the player's clan colours (if they do not exist in data, use a fixed Bati red #8A2432), the guardian animal, the statue pose after the main sport, a banner per route, lights tied to distance, the V-03 engraved stones.
- Stage ids (rough, solid, grand, legendary, mythic) are internal. If a stage name is ever shown in the app, check the locales first: "Mythic" is already a rank label.
- Out of scope: the list emblems of the Village tab, the surroundings, game data beyond this table.

## 7. Art rules for buildings
- Follow docs/designs/village-style-bible.md and the surroundings bible (palette, ink #0F1518, light, outline hierarchy).
- **Same pipeline as today**: per stage, a maquette (a JSON blockout spec in scripts/iso/blockouts/, rendered headless by the existing Blender script: silhouette, roof, door, windows, footprint), then a day painting. New art lives behind a per-building flag. Every A/B pair compares captures at the same time of day.
- **Night** = the existing colour grade of the day painting (by script; if the grade changes later, rerun the script, no FLUX) + code light at light anchors for every light, moving or not (glow, beam, particles, glyphs from the fixed set) + at most one keyed night-only sprite per stage for an object that only exists at night (a low moon, an aurora), listed in the card's cost.
- **The maquette carries the wow**: FLUX follows the maquette's silhouette, roof, door and windows closely, so every new element of the card (towering element, site teasers, gag slot, add-on anchors) is built in the maquette first. A stage that is only "taller with nicer materials" fails the card review.
- **Silhouette** = the alpha above 0.5 of the stage painting composited with that rank's add-ons and teasers, ground patch removed. The windmill's silhouettes, blurs and growth always composite that stage's sails at a fixed 45°.
- **Growth (G-GROW)**, measured on maquettes and again on paint: each stage's silhouette is bigger than the previous stage's, by at least 15 % in area or 10 % in height, and its new element shows on the 96 dp blur. Each in-between rank changes the silhouette too (the XOR of the two silhouettes is at least 1.5 % of the area), with the new piece on the edge. Growth goes up and into detail, inside the canvas.
- **Footprint** = the building's emprise in tiles and the maquette's ground contact mask, identical for every stage of the new ladder, with the same anchor. Ground contact stays inside the mask; everything stays inside the family's canvas. The emprise stays as it is today (the village map is built around it): the redesign happens inside it, and growth goes up and into detail.
- **The ground patch**: today each painting sits on its own diamond of grass, dirt or paving with a hard edge. New paintings feather it into the village ground: no visible diamond edge.
- **Special cases**: the windmill's sails are a separate sprite the app turns over the tower, so each stage gets its own sail variant (a gag beat may get one too). The app adds wall sections around the castle wall's gate piece.
- **Readability at phone size**, sizes measured at default zoom (buildings are about 96 to 192 dp on screen): every add-on at least 10 dp, every site teaser at least 16 dp, on the silhouette edge or in the gag slot; at most 2 figures (people or animals) per gag or build gag, each at least 14 dp tall; at most 3 overlays at once (teaser, add-on, gag), covering at most 25 % of the silhouette; a scaffold covers at most a third of the building.
- **Mythic grammar**: the mythic adds three new things: one towering element, one magic or prestige layer that shows by day and by night, the gag finale. Earlier add-ons stay, painted in, smaller and calmer in value. Only 2 buildings end with statues: the Hall of Heroes and the Observatory's atlantes. Only the Wizard Tower floats. Only the Observatory has rings. Each mythic silhouette is unique in the village.
- **Nothing looks like loot**: no glow on weapons or armour, no coins, no treasure, no gilding, no specular glint. Ochre, brass and bronze are painted matte.
- Outline about 4 screen px at zoom 0.6. Light from screen top-left; shadows fall to screen bottom-right through the shadow vector already in code. Slate shadows, never black. No painted cast shadows. No letters, numbers or runes in the paint: runes and glyphs are drawn in code from a fixed set.
- **Clan mark**: from solid on, a pennant (solid), a banner (grand), a carved crest (legendary), a glowing crest (mythic). Decor houses never carry it. Gags never use it.
- **Gag rules**: a wink, never a copy (no known character, costume, logo, name, insignia or text from the source); a [wink] to a modern work needs Guillaume's approval and has a fallback beat in the catalog; readable without words; gentle cartoon slapstick only (stars, never wounds, never a weapon aimed at a person); never mocks the player, a body or a sport; visual only, never tappable. Each catalog entry lists what is never drawn: follow it.
- **References, text only**: each card names 2 or 3 real-world references for structure and life: real buildings and sites (the La Mancha windmills, the Carnac stones, the telamons of Agrigento, the treadwheel cranes and scaffolds of Guédelon, a village forge, a Breton well) and public-domain tales for the gags. They guide the maquette and the words of the FLUX prompt. FLUX only ever receives the maquette and the approved Bati style references.
- **Slop reject list (probes)**: micro-noise texture, gloss, fake letters or runes, perfect symmetry, mushy small figures, extra limbs, mismatched line weight, wrong light direction, painted cast shadows, off-angle iso, crowds.

## 8. Session 1: explore wide, then lock the recipe
The pilot pair is the windmill and the observatory. They are the hardest case:
without its sails, today's windmill looks almost like the observatory, and the
prep's observatory mythic (a lone Atlas holding a globe) was read as the
Champion Arena in the silhouette test. If the recipe works on them, it works
anywhere. Exploration stays cheap first: maquettes and silhouettes cost no
FLUX, Klein probes come before FLUX 3. Everything lands in explore/, one
folder per test, with the verdicts and one line in decisions.md.

- **E1, mythic directions** (maquettes before the step 0 checkpoint, paint after). For each pilot building the planner writes 3 distinct mythic directions, as maquettes on the same emprise and camera, each with its towering element and magic layer:
  - windmill: the catalog's blue crystal spike (at least a quarter of the tower's height, never an orb) with wind ribbons, plus two others. Never a cloud: only the Wizard Tower floats.
  - observatory: the atlantes of catalog v4 with the green and blue arcane light Guillaume asked for, plus two others. Never a lone figure holding a ball: it reads as a trophy.
  Run S-A question 1 on each direction's silhouette and 96 dp blur, mixed with the silhouettes of 3 other buildings (always the wizard tower, and the other pilot building), and drop every direction that fails; if none passes, keep the best and report it. The survivors go to the step 0 checkpoint. After the go: target screens of the survivors (section 9.2), then S-C (two contexts, sides swapped, with a canary), theo and mara pick one per building.
- **E2, ladder rhythm**, on the windmill: the default rhythm against option (b) of section 6. Same maquettes. S-B ("what is new at each step") on both; S-E in two contexts, sides swapped, with a canary; theo; tech projects the sprite count, the APK size and the FLUX cost of each option for 21 buildings. Pick one. The winning ladder becomes the windmill's round 1: never paint the ladder a third time.
- **E3, model test**: the windmill's solid stage repainted from its maquette by each available model, with the same references, about 1 $; mara plus S-D in two contexts, against each other and against today's painting.
- **E4, paint method**, on one windmill transition: a chain edit (FLUX 3 Image edit with bounding boxes on the new parts, the rest locked) against a fresh paint with the previous stage as reference. Keep the one that wins G-CONT and the blind A/B.
- **E5, finish**: the winning model's solid stage in 2 or 3 finishes (outline weight, ink against paint, saturation), each placed in the locked beauty corner crop; mara plus S-D.
- Order: E1's maquettes during step 0. After the go: E3, then E5 and E4, then E1's target screens, then E2. Then write the final cards of the pilot pair.

Then the pilot pair runs the building loop (section 9) with the winners: windmill first (from E2's ladder), observatory second.

**Lock checkpoint** (blocking): both ladder strips at every rank (day, plus night per stage), the gag strips, the upgrade show contact sheets, the first-week crops, one page on E1 to E5 (what was tried, what won, why), and the FLUX and subagent estimate for the 19 other buildings. Decisions: (1) approve and lock the recipe, or up to 3 notes for one more round, or a new direction; (2) the ladder rhythm of E2; (3) the go for the waves, with the estimate. On approval, merge the pair behind their flags (off) and write recipe.md: model, method, rhythm, finish, maquette conventions, FLUX prompt templates, references, sizes, the G-SET tolerance (the min to max of the locked set), the probe checklist. Every later building follows the recipe; changing it needs Guillaume. Session 1 ends here.

## 9. The building loop (one building = one loupe)
Roles: the **planner** (an Opus subagent) writes the card and the maquette directions; the **implementer** (Sonnet, in a worktree) builds maquettes, paint and integration; the judges of section 11 judge.

### 9.0 Work in parallel, wait only where you must
Most of the time goes into waiting for one thing after another. Run in parallel everything that does not share a resource:
- **Independent dispatches go out in one message**: the judges of one round that do not depend on each other, the two stranger contexts of an A/B, the reviews of theo and mara, the cards of several buildings.
- **Up to 3 buildings in flight**, each in its own worktree, when their files do not overlap. While you capture one on the emulator, the others are at the card, maquette, paint or integration step. A pair (base then upgrade) stays in order, but the upgrade's card and maquettes can start while the base is being painted.
- **Prepare ahead**: during a wave, the planner drafts the cards and maquettes of the next wave's buildings (no FLUX).
- **Session 1**: step 0 items 4 to 7, 10 and 11 run in parallel where their files do not overlap; E1's maquettes run while the engine is being built.
- **Only three things stay one at a time**: the emulator (you, one capture series at a time), the FLUX script (one run at a time, so the registry stays right), and merges into ISO_BRANCH (one at a time, tests green before the next).
- **Waiting rule**: never wait with a `pgrep -f` loop, it matches its own command line and never ends. Wait on the PID, on a done file the job writes at its end, or on its output file, always with a time limit. Any background job or subagent with no new output for 15 minutes gets checked: read its output, then restart or stop it. Never trust a "waiting on background work" notice longer than that. Pass this rule to every dispatch.

### 9.1 Card (no FLUX)
The planner starts from the building's line in the card sheet Guillaume approved, its catalog entry and the recipe, and drafts cards/<building>.md with the template of appendix A. Fewer, bigger, readable ideas. theo (fun, story, a gift at every rank) and mara (style, feasibility, readability, the wink rules) review it in one dispatch each; you fix and freeze it. An idea Guillaume struck stays struck; a [wink] he did not approve is replaced by its fallback beat.

### 9.2 Maquette and target screen
One JSON blockout spec per stage, each starting from the previous stage's spec: silhouette, footprint mask, add-on and teaser anchors, gag slot. For the mythic, two directions: the card's and one alternative; keep the one that passes G-ID better. Render each stage's maquette and its silhouette. Run G-ID and G-GROW on the maquettes before any paint: they are the cheapest gates. If the spec format cannot express an element, extend the format with a unit test (tooling, not game data) or log the question and go on.
Then the **target screen**: the mythic painted over the baseline in-village capture with FLUX image edit, Bati references only, 2 variants. The pixel-diff script discards any variant that changed pixels outside the new maquette's silhouette dilated by 8 px. theo picks one. It is the picture of "done" for the probes and for G-MYTHIC; it is never shipped.

### 9.3 Paint
- The recipe's model and method (session 1: the winners of E3 and E4), recorded with its version per sprite in the manifest. Bounding-box edits need FLUX 3 Image, whatever model paints the rest.
- **Probes first**: 2 to 4 images per stage, on Klein when the recipe allows it; mara accepts or rejects against the bibles, the card, the target screen and the slop list before the full paint.
- **Add-ons, site teasers, gag beats, build-site sprites** (scaffold, workers, build gag): one subject per image on flat magenta, keyed, fringe cleaned, checked at 2x.
- **Motion**: at most 24 drawn frames per building, for what must really move (sails, fire, a figure's key gesture), 3 to 6 frames each. Everything else moves in code on still sprites (bounce, squash, sway, slide). A drawn loop that fails G-MOTION twice becomes a still sprite moved in code.

### 9.4 Integrate
Stage data, add-ons, site teasers, gag slot, light anchors, clan mark, idle loops. The full show at each stage change: anticipation, scaffold with the build gag, dust, reveal with a bounce, the keeper reacts, the clan mark takes its next form. The short beat at each rank inside a stage. Same at night. Reduced motion: straight to the final image, the moment stays.

### 9.5 Capture (you, scripted)
- **Ladder strip**: the building alone at every rank, by day, same camera, at phone pixels. One night image per stage.
- **Gag crops**: the gag slot at every beat, at phone pixels.
- **In-village crops** at default zoom: first rough rank, first grand rank, max rank, the building under test ringed.
- **First-week crops** (pilot pair and foundations): the village at tiers 1 to 3 with the building at ranks 1 to 3.
- **Upgrade motion crops** at each stage change, day and night, plus one rank beat: adb -s emulator-5554 shell screenrecord, then 12 frames spread evenly over the whole show with ffmpeg, as one contact sheet. Upgrades under rule B are captured from a state given as (own rank, base rank).
- **Idle loops**: a 10 s recording per stage, as a 12-frame contact sheet.
- **Silhouettes**: one per stage (section 7), plus the mythic silhouette blurred at 96 dp.
- **Corner crops**: each locked loupes crop that shows this building, captured again at its locked settings into <building>/rN/corner/. The locked files themselves are never written.
- **Blind sets**: made by script, never from the round folders. The script copies each set to a fresh neutral folder (mktemp -d, named blind-<8 random hex>), as NN.png with metadata stripped; the keys go to ~/.cache/bati-buildings/<building>/, out of the repo. Strangers get only those paths, plus: "Read only these files. Do not open, list or search any other file."

### 9.6 Judge, then refine or pivot
**Fail fast**: run the scripts first (G-GROW, footprint, G-KEEP tests, G-CORNER diff, G-SET metrics), then mara; then the strangers, theo, env and anim together, in one message. A failed hard gate in the scripts or in mara's verdict ends the round there.
A failed stranger gate is rerun once, on the same images, in a fresh context, before it counts.
The implementer reads the verdict and writes one line in the round folder: refine, or pivot. Update state.json. Best round = most hard gates passed, then most soft gates, then most A/B wins. From round 2 on, rerun only the gates that failed or whose inputs changed.
**Done** when every hard gate passes and at most 2 soft gates fail (section 10). The pilot pair then waits for the lock checkpoint; any later building merges into ISO_BRANCH behind its flag (off), with its failed soft gates in the wave summary. Lock its ladder strip in state.json, rebase the other running building, recapture its best round.
**Max rounds reached**: keep the best round and park the building (section 2).

### 9.7 After each wave: the whole village
In a dev build, turn on the flags of every finished building and capture the whole village at tiers 3, 6, 9 and 12, by day and by night. mara, theo and env judge it; S-G runs an A/B against the baseline in two contexts, sides swapped, with a canary; the sprite-ID dump checks that no building hides more than 30 % of another. What fails becomes the first loupe of the next wave.

## 10. The gates (each building, each round)
**Hard gates** (all must pass): G-ID, G-GROW, G-CONT, G-KEEP, G-ART, G-CORNER, G-MYTHIC, G-FUN, G-UPGRADE, G-WINK, and G-WEEK1 for the pilot pair and the foundations. **Soft gates** (at most 2 may fail): the others.

| Gate | Question | Who | Pass |
| --- | --- | --- | --- |
| G-ID (hard) | Which building is this? | Strangers S-A, question 1, two shuffles | Right name for grand, legendary, mythic and the 96 dp blur in both shuffles. Rough and solid are logged, not blocking, unless both shuffles give the same wrong name |
| G-LADDER | Order these, set aside the ones that are not this building | Strangers S-A, question 2, the 5 stage day paintings with 3 decoys from other buildings | Exact order and all decoys set aside, in both contexts |
| G-GROW (hard) | Does every stage grow? | Script on silhouettes, maquettes then paint, then mara | Section 7 thresholds at every stage change and every in-between rank, inside the canvas |
| G-RANK | What is new at each step? | Stranger S-B | Something new at every rank, matching the card |
| G-GAG | What is happening here? | Stranger S-B | Each sentence matches the card's beat |
| G-STORY | Retell the story of these pictures in order | Stranger S-B | The retelling matches the running gag |
| G-WINK (hard) | Does this remind you of a specific film, game, comic or brand? | Stranger S-B | No; or the card's public-domain source, or a well-known adaptation of it if mara sees none of its "never drawn" traits; or an approved [wink]. Answers that only name a genre or a style do not count |
| G-MYTHIC (hard) | Which is more impressive? | Strangers S-C, mythic against today's top look and against the target screen, sides swapped, with a canary | Beats today's top look in both orders; beats or ties the target |
| G-REAL | Which grid cells hold the player's buildings? | Stranger S-C, first-grand and max-rank in-village crops with a numbered grid | This building found, and no more decor houses picked than on the same baseline crop |
| G-GROUND | Does it sit in the village? | env, in-village crops | Contact with the ground, patch feathered into the village ground, no diamond edge, light and shadow like its neighbours |
| G-CORNER (hard) | Does the locked work stay as good? | Script, then strangers S-G | Mask = the old and new building masks together, dilated by 6 px. Under 2 % changed pixels outside the mask passes. Otherwise S-G in two contexts, sides swapped, with a canary: a tie or a win passes, losing fails |
| G-CONT (hard) | Is this the same building growing? | mara, ladder strip in order, plus the footprint script | Yes, and footprint mask identical with the same anchor |
| G-KEEP (hard) | Does anything disappear? | mara lists each stage's elements and names each teaser's finished element in the next stage; tests by script | Nothing vanishes outside the gag slot, and every teaser is finished in the next stage; monotonic and migration tests green |
| G-ART (hard) | Bibles, readability sizes, overlays, outline, light, clan mark, loot, slop list | mara | All rules hold |
| G-NIGHT | Does the night read and glow at the right places? | mara | Lights at the anchors, readable, at most one night-only sprite per stage |
| G-SET | Does it match what is locked? | mara on a lineup, plus a script on outline width, value and saturation | Same family look; script within the recipe's tolerance. The windmill is judged against the locked beauty corner as a whole (does it belong in that painted world?) and its metrics set the tolerance; later buildings against the locked buildings |
| G-FUN (hard) | Would I screenshot the mythic and send it? Is the rough stage already charming? | theo | Yes to both, with the reason |
| G-WEEK1 (hard for the pilot pair and the foundations) | Is the first week charming? | theo, plus S-F in two contexts, sides swapped, with a canary | theo says yes with the reason; the new first-week crop beats the baseline in both contexts |
| G-MOTION | Jitter, popping, sliding, frozen thing, wrong pivot? | anim, contact sheets | No high or medium issue; drawn frames only |
| G-UPGRADE (hard) | Is each stage change a show, and each rank a beat, without flicker? | anim, upgrade motion crops | Building present in all 12 frames; anticipation, build gag, reveal, keeper reaction, day and night |

**Canaries**: every A/B dispatch holds one pair with a known answer. For "more impressive": today's grand against today's rough. For "fits better" and "more beautiful": the locked beauty corner crop against its baseline crop. For S-E: today's ladder against a strip that repeats one image. A context that misses its canary is void and reruns once.
**Grouping**: one dispatch may cover several buildings: S-A up to 2 buildings, S-B 1, S-C up to 4, mara, theo, env and anim up to 2; about 30 images at most per dispatch. G-LADDER decoys come from the other buildings of the wave.
**Scoring the strangers**: you compare their answers with the script keys (names, orders, decoys, grid cells) and with the card (beats, story, sources). Sentences pass on meaning, not wording. Write each verdict next to the raw answer in the round folder.

## 11. Judges and calibration
- **mara**: art, continuity, growth, readability, set consistency, probes, night.
- **theo**: fun, story, the screenshot test, the first week, card review, the target screen pick.
- **env**: how the building sits in the village (G-GROUND), and the whole village after each wave. It judged the loupes; reuse its calibration notes.
- **anim**: motion, the upgrade show and the rank beat.
- **tech**: stage data, add-on z-order, cache, headroom and size projections. Read-only on code. Monotonic, migration, footprint and growth checks run as scripts.
- **Strangers**: fresh general-purpose subagents that get only the blind-set paths and the exact questions of appendix B (S-A to S-G). No catalog, no card, no building name, no reasoning from anyone.
- **Calibration** (step 0 of session 1, mara and theo): docs/designs/village-buildings/calibration/ with 8 crops built from Guillaume's own verdicts, taken from the loupes baseline captures (before any vector item was removed). FAIL, with the cause: the observatory at its top look ("a wizard's place with no magic"); the wizard tower at its top look ("stays very sober, should be incredible"); the gymnastics rings ("vector, ugly next to paint"); the pennants ("vector"); banners that are all the same ("they ignore each other"). GOOD: the villagers, the fox, a tier 6 overview ("the growth is organic and nice"). Each judge labels the 8 crops without labels. Pass: at least 4 of 5 FAIL for the right cause and at least 2 of 3 GOOD. If a judge fails: write calibration/notes-<judge>.md with few-shot examples (crop, Guillaume's verdict, why), then retest on 3 new crops of the same verdicts (another zoom, tier or time of day: 2 FAIL, 1 GOOD), 3 of 3 to pass, and pass these notes in every later dispatch to that judge. A failed retest: stop and ask.

## 12. Order of buildings
Session 1: step 0, the exploration, the pilot pair, the lock checkpoint, and it ends there. From session 2 on, the waves run back to back, as long as the limits of section 2 allow, in this order unless Guillaume reorders:
1. W1, foundations: campfire, tent, training_dummy. Every player sees them from day 1: G-WEEK1 is hard.
2. W2: wizard_tower, druid_grove, high_road.
3. W3: archery_range then watchtower, forge then armory.
4. W4: farm then barn, quarry then castle_wall.
5. W5: well then fountain.
6. W6, the deeds: dragon_lair, heroes_hall, champion_arena.
After each wave: the whole-village check (9.7), summary-<wave>.md (not blocking), flags off, then the next wave.

## 13. Step 0, once per session (items marked S1: session 1 only)
1. Read the files of section 4. Settle ISO_BRANCH. Until the merge of item 3, write only on bld-prep, in its worktree: if its docs/designs/village-buildings/PROMPT.md or catalog.md is not this version (first lines), rename the old ones PROMPT-v1-pilot.md and catalog-v3.md, put in this prompt and catalog v4 from where the launch message says, and commit on bld-prep. Then update state.json there, keeping the prep's entries.
2. Check the base: the ISO_BRANCH tip sha matches state.json, the full suite is green, the build installed on emulator-5554 comes from that tip, and main has not moved since the last session (if it has, merge main into ISO_BRANCH first, suite green). Then check the settings and the registry (python3 scripts/iso/iso_loop.py budget). List what the script supports: FLUX 3 Image, FLUX 3 Image Klein, FLUX.2 pro, image edit, bounding boxes, references. If there is no image edit at all, stop and ask. Check the loupes lock copy (section 4); S1: make it.
3. S1. bld-prep: rebase it onto the ISO_BRANCH tip, npm ci, run the full test suite (the prep never ran it), typecheck and Biome; fix what fails. If iso-dev-screen or iso-perf-compteur still time out now and then, stabilise them first (the loupes planned it for its R1: whoever comes first does it; write it in state.json). Then merge bld-prep into ISO_BRANCH, everything behind flags, old mapping by default. Add the gitignore lines of section 3.
4. S1. Fix the checks the prep found weak, each with a unit test on a known pass and a known fail: the footprint check compares the whole ground contact mask with the same anchor (today it compares a 12 px band); heights.py and iso-layout read the new stage specs. Add the silhouette script of section 7 (alpha, patch removed, windmill sails at 45°), the G-GROW metric, the G-CORNER diff, the blind-set script of 9.5 and the canaries (reuse the loupes pixel diff and ab_pairs.py). Add the capture states for "building X at rank N", for upgrades as (own rank, base rank), for the upgrade show, the rank beat, idle loops and the first week, if the prep did not.
5. S1. A Sonnet implementer builds the **shared building engine** on a test building made from an existing stage: add-on layer, site teasers, gag slot, light anchors, night-only sprite, clan mark, keeper slot, the full show and the rank beat. Find how the app flags a pending upgrade (per stage or per rank) and how an upgrade's look changes under rule B. tech and anim judge the engine before any pilot paint.
6. S1. tech measures the canvas headroom of each sprite family (how tall a mythic can grow inside today's image size, given G-GROW). Where a family needs more room, raise its image size (section 4) and log it.
7. S1. Baseline (skip what the prep made): ladder strips and in-village crops of all 21 buildings with today's art, plus first-week crops at tiers 1 to 3, in baseline/. Made once, never recaptured.
8. S1. Calibration of mara and theo (section 11).
9. S1. The prep's open questions (prep-summary.md): for each, take the answer that best fits this prompt and catalog v4, and write it in decisions.md. Already settled: the windmill mythic is the blue crystal spike, never a cloud; the Sage keeps the observatory; the observatory's grand opens the dome and brings out the brass telescope and the armillary sphere, so it no longer looks like solid; the observatory mythic follows catalog v4 (the atlantes), tested in E1. Answers that need Guillaume go to the checkpoint as defaults he can strike.
10. S1. The card sheet (card-sheet.md): all 21 buildings, 4 lines each: silhouette hook, mythic in one sentence, running gag in one line, winks to approve. theo and mara review it once; you fix it.
11. S1. E1's maquettes and silhouette tests (section 8). mara picks the 2 or 3 Bati style references that every FLUX call of the track will use.
12. S1. Checkpoint, at most 6 decisions: (1) the card sheet: strike or swap ideas, approve or strike each [wink], strike any E1 survivor; (2) UPGRADE_RULE (B recommended), and under rule B the upgrade's own marker and tap (recommended) or playing after the base show; (3) the defaults taken for the prep's questions; (4) the rank beat on tap (extend the pending flag to every rank if needed, recommended yes) and the items of section 6 kept static for now (recommended yes); (5) the image sizes raised, for information; (6) the calibration result and the FLUX and subagent estimates for session 1 and for the whole track: go / no go. Wait for his go, then run the exploration (section 8).
In later sessions, step 0 is items 1 and 2 only, then the next wave in state.json.

## 14. Reporting and exit
Per building: the ladder strip before and after, and three lines in French in progress.md with the pillar tags.
Per wave: docs/designs/village-buildings/summary-<wave>.md in French: each building with its gates (failed soft gates named), its best gag in one line, its flag (off until Guillaume turns it on), the whole-village check, FLUX spent, subagent runs used, parked questions.
Stop when (session 1) the lock checkpoint is written and waits for Guillaume, or (later sessions) the waves planned in state.json are done or parked, or a limit of section 2 is hit. Then write docs/designs/village-buildings/summary-<session>.md in French with the top 3 decisions for Guillaume.

## Appendix A: card template (cards/<building>.md)
1. **Identity**: name, family, what feeds it, keeper, pillars served, silhouette hook (today's repère is only a starting point: replace it if a better hook makes the building more recognisable; distinct from the other 20), palette accents, 2 or 3 real-world references (text).
2. **What stays the same at every stage**: emprise, footprint mask, anchor, door side, base materials and colours.
3. **Stage ladder**: per stage, the new silhouette element and how much the silhouette grows (G-GROW), the clan mark form, the keeper's action, the light anchors, the night-only sprite if any, the idle loop. Mythic: the towering element, the magic layer, the gag finale.
4. **Rank table**: one line per rank: the new visible element (stage painting, gag beat, site teaser or add-on), its sprite and its size on screen. No rank without something new.
5. **Running gag**: the beats in the gag slot, which ranks, the finale at the top rank, and the fallback beat of any [wink].
6. **Build gag per stage change**.
7. **Mythic in one sentence**: what the player would tell a friend.
8. **Winks**: source, public domain or [wink] (needs Guillaume's approval), and what is never drawn.
9. **Nothing disappears**: which add-ons each new stage paints in, and the finished element of each teaser.
10. **Readability check**: add-ons at least 10 dp, teasers at least 16 dp, at most 2 figures per gag or build gag at 14 dp or more, at most 3 overlays covering at most 25 % of the silhouette, ground contact inside the mask, everything inside the canvas.
11. **Cost estimate**: paintings, add-ons, teasers, drawn frames (24 at most), night-only sprites, FLUX estimate.

## Appendix B: stranger dispatches (send exactly these, plus the "read only these files" line, nothing else)
- **S-A**: (1) "Each numbered image is one building from a small fantasy village game, shown as a black silhouette or blurred. For each number, which building is it? Answer with one name from this list, or 'unsure': <the 21 names>." (2) "These numbered images show buildings at different levels of growth, in random order. Some do not belong to the same building as the others: list them apart. Then order the rest from the first level to the last. Answer with numbers only."
- **S-B**: (1) "Each image is the same building one step later than the previous one. For each step, list what is new. If nothing is new, say 'nothing'." (2) "For each numbered picture, describe in one sentence what is happening." (3) "Read these pictures in order and retell the little story they tell, in three sentences." (4) "Does anything in these pictures remind you of a specific film, game, comic or brand? Name it, or say no."
- **S-C**: (1) "Each numbered pair shows two versions of the same building, left and right. For each pair, which one is the more impressive, more advanced version? Answer left, right or tie." (2) "In this village picture with a numbered grid, some buildings belong to the player and some are only decoration. List the grid cells that hold the player's buildings."
- **S-D** (model, method and finish tests): "The first image is a village. Each numbered pair shows two versions of a building, left and right. For each pair, which one fits this village better, in style, light and finish? Answer left, right or tie."
- **S-E** (ladder rhythm): "Each image holds two strips, top and bottom. Each strip shows the same building growing level by level, from left to right. Which strip would you rather watch your own building go through? Answer top, bottom or tie, then one sentence why."
- **S-F** (first week): "Each numbered pair shows a small village game in its first days, left and right. Which one makes you want to keep playing to see it grow? Answer left, right or tie, then one sentence why."
- **S-G** (corner and whole village): "Each numbered pair shows the same part of a village, left and right. Which one looks more beautiful and finished? Answer left, right or tie."
