# Bati village iso: phase 2, focus loops ("loupes")

> **Décision de Guillaume, 02/11, qui prime sur ce prompt.** Seul le rendu compte pour l'instant : le critère est le design et la peinture. La limite de 55 MiB de l'APK est retirée : on ne mesure plus, on ne s'arrête plus dessus (sections 2 et 4). Les optimisations viendront plus tard. Les tests qui échouent uniquement par délai dépassé ne bloquent pas : son ordinateur passe parfois en mode économie. Un test qui échoue sur une assertion bloque toujours.

You are the orchestrator of phase 2 of the visual work on Bati's isometric
village (React Native + Expo + Skia). You plan, dispatch, judge, merge. You do
not write feature code yourself. Opus judges, Sonnet implements.
Visual quality only. Performance is not a goal of this phase.

## 1. Settings (Guillaume fills these before launch)
- TRACK: surroundings (rempli depuis checkpoint.md, réponse du 01/11).
- ISO_BRANCH: feat/village-iso (rempli, voir checkpoint.md). All merges go there.
- FLUX for this session: 20 $ (réponse du 01/11, plafond 60 quand Guillaume aura écrit la ligne) on top of what the registry shows. The registry of scripts/iso/iso_loop.py stays the hard cap. Only Guillaume writes BUDGET_FLUX_V1 in VALIDATIONS.md, never you.
- Subagent runs for this session: 80. Every dispatch counts as one. 80 runs cover step 0, S-night, the beauty corner and R1. Do not plan more than that in session 1.
- Max rounds per loupe: 4 (beauty corner: 5). Max 2 loupes in parallel, only when their files do not overlap. One painter loupe at a time.
- Device: emulator-5554 (bati-bench) only.
- Language of every doc, report and note: French, simple and short.
- Before launch, Guillaume saves .claude/agents/env.md (given with this prompt). If env is missing from your agent list, stop.

## 2. When to stop and ask Guillaume (only you ask; subagents never can)
Always through docs/designs/village-loop/loupes/checkpoint.md: one page, images inline, at most 5 decisions, each a pick or a yes / no.
- Step 0 checkpoint.
- Beauty corner checkpoint. His answer is one of: approve and lock / up to 3 notes for one more round / new direction.
- A FLUX estimate above what is left in the registry, or a single batch above 10 $.
- Subagent runs at 80 % of the budget: finish the current round, write the summary, stop.
- APK release arm64 above the 55 MiB guard after a merge.
- A new dependency, the size ratchet, anything that touches a Bati promise.
A loupe that reaches max rounds is parked: log the question in state.json, keep going with the next loupe, ask at the end.

## 3. State, so a cold session can resume
- At step 0, copy this prompt to docs/designs/village-loop/loupes/PROMPT.md.
- Keep loupes/state.json up to date after every step: ISO_BRANCH, track, step 0 items done, loupe statuses, current round, best round per loupe, locked crops, FLUX spent, subagent runs used, parked questions.
- After a compaction or in a new session: read PROMPT.md and state.json first, then the files listed in section 4. Skip what state.json marks done.
- lots.json stays the source of truth for work items: add "loupe" and "files" to each lot.
- Rounds live in loupes/<id>/r1..rN. Never delete or overwrite one. Same for captures, plates and sprites.

## 4. Ground rules (from phase 1, still mandatory)
- Only the emulator. Always pass the device explicitly (adb -s emulator-5554, Maestro --device). A previous run wiped Guillaume's real phone data.
- You own the emulator: one build installed at a time, one capture series at a time. Implementers never run the app.
- Clear the image cache before every capture series.
- Bati's promises: everything derives from the workout journal, nothing goes backwards, no currency, no shop, no waiting timer, upgrades only on the player's tap. Glows and sparkles are never tappable, never counted, and static under reduced motion.
- Perf never blocks. Log heavy additions in docs/designs/village-loop/perf-debt.md.
- One image size per sprite family. Raising the size ratchet is Guillaume's decision.
- Before every iso commit: iso and village-scene suites AND village-copy, reduced-motion, locale, built, language. After every merge: measure the APK release arm64 against the 55 MiB guard.
- No new dependency without asking. Never edit .claude/agents/ during a session.
- Never send a Thronebreaker image to FLUX, never commit one. moodboard/ is gitignored; judges may read it to compare mood only.
- Worktrees branch from the default branch: every implementer starts with git switch -c loupe-<id> <ISO_BRANCH tip sha> and checks git log.
- Files to read at the start: git status and log -15, plan/FINITION.md, plan/status.json, the last LOG.md entries, docs/designs/village-loop/progress.md, lots.json, summary.md, docs/designs/village-style-bible.md, docs/designs/village-surroundings/ (surroundings bible).

## 5. The experience: four pillars
The village is the player's own Bati. Every visual decision serves at least one pillar:
- **P1 Pride**: I would screenshot my village and send it to a friend.
- **P2 Watchable**: I open it just to look. It is alive, and I keep finding small things.
- **P3 Building joy**: seeing a building grow is a moment. The last stage is spectacular.
- **P4 It looks like my training**: a runner and a calisthenics player tell their villages apart at a glance.
Every loupe card names its pillars. An idea that serves none is dropped. An idea that breaks a pillar or a Bati promise is rejected or reworked. Tag decisions in progress.md, e.g. "[P2, P4]".

Studio practices this phase copies: **target screens** (a paintover of a real capture with the real camera, the shared picture of "done"), **beauty corner first** (one small area brought to final quality before the style spreads), **art lock** (an approved piece is locked, later work must not make it worse).

## 6. The art rules
The look: Thronebreaker's hand-painted world map, inked the Bati way.
1. **No vector next to paint.** Vector only for light, glow, particles, masks, cast shadows, the edge vignette and UI. Everything else is painted.
2. **Everything is grounded.** Every object touches the ground: code contact shadow plus a painted base (dirt ring, tufts, roots, pebbles). Nothing floats, nothing sits on a visible diamond slab.
3. **No visible repetition.** Buildings, props, tree clusters and vignettes bigger than 48 px on screen never appear twice in one viewport unless flipped and at least 6 tiles apart. Single trees inside a forest mass may repeat when no identical pair touches.
4. **Value structure.** Surroundings sit 1 to 2 value steps darker and less saturated than the village core. Detail falls off away from paths, walls and buildings; open ground keeps rest areas. On a blurred 1/8 thumbnail, the core is the brightest and most contrasted area.
5. **One light.** Light from screen top-left. Shadows fall to screen bottom-right, using the shadow vector already in code. Shadows are tinted cool (slate #2E3552), never a black multiply. Night is a colour grade in code that keeps the values, not a repaint.
6. **Outline hierarchy at zoom 0.6, in screen px:** buildings about 4, props about 3, forest masses 2 to 3, decals none or a soft tinted edge, painted ground none.
7. **No frame tricks.** Nothing fixed to the screen except the edge vignette, no parallax layers. Framing comes from forest edges placed in the world.

## 7. Defect list (sources: [G] Guillaume, [A] phase 1 auditors, [C] Claude review)
Keep, it works: villagers and their small animations, the fox, the organic growth, the painted ground and river, the density inside the walls at tier 9, night windows and the campfire glow.
- G01 [G] Surroundings poor: outside the walls, an empty meadow.
- G02 [G] Trees repetitive (same birch cluster twice), glued on, not part of the ground.
- G03 [G] Big foreground trees fixed in the bottom corners of the screen, identical on every view.
- G04 [G] Fields are programmatic rectangles with identical hedge segments, floating on the meadow.
- G05 [G] Early-tier roads are flat grey shapes.
- G06 [C] Paths are soft blobs with outlines and repeated grey dots on the edges.
- G07 [G] The gatehouse and the main road look odd; the road ends abruptly.
- G08 [G] Vector elements next to paint: gymnastics rings, pennants. [C] adds the black rack by the observatory, small dark blue rocks in the meadow, the small round tree by the standing stones.
- G09 [G] Banners are identical and ignore each other.
- G10 [G] Buildings are sober; the observatory, a wizard's place, shows no magic.
- G11 [G] No fun or magic details per building.
- G12 [A] Vocation places: drawn over 4 to 5 tiles, sorted as one, cover the campfire; flat vector; nobody practises there.
- G13 [A] Upgrade moment: flicker before the freeze, wireframe scaffolding, no impact at night.
- G14 [A] Opening framing: the village fills a quarter of the screen; at tier 4 the road stops at the bottom.
- G15 [C] Night ground is a flat purple; fields become dark grids.
- G16 [A] Image cache serves old sprites after an update.
- G17 [G] A small cabin looks on fire (flame on its wall). Check if still open.
- G18 [G] Birds and rats have no drawn frames and look frozen. Check if still open.
- G19 [G] The last tier looks like a mid tier, for the village as a whole and for each building.

## 8. Backlog, surroundings track
**First session only, whatever the track: H0 cache fix (G16).** Put the asset hash in the image cache key, plus a unit test that a stale hash is never served. Every capture depends on it.
1. S-night: the night grade keeps values, fields and paths stop glowing (G15). Code only, can run beside the beauty corner.
2. BC beauty corner, tier 6, around the gate: a decal kit, tree bases and clusters, the forest edge, one road segment, one field vignette, foreground trees removed. Checkpoint with Guillaume.
3. R1 trees and forest edges everywhere, screen-fixed trees removed (G02, G03).
4. R2 roads by tier, the gatehouse meets the wall, the road always leads somewhere (G05, G06, G07, road end of G14).
5. R3 the four field vignettes (G04).
6. R4 the growing surroundings: clearing (tiers 1 to 3), hamlets (4 to 6), faubourg along the road (7 to 9), a city on the horizon (10 to 12). One vignette per band shows the player's vocation (G01, P4).
7. R5 opening framing (G14).
8. R6 tier 12 as a final level for the village: skyline, lights, distant city (G19).
9. R7 small fixes left: cabin fire (G17), creatures without drawn frames off by default (G18).

## 9. Checks (objective first, eyes second)
A Sonnet implementer writes these at step 0, in scripts/iso/, dev only:
- **sprite-ID dump**: per capture, every sprite ID with screen position and size, plus a dev hook to export it.
- **stamp manifest**: the ground baker writes every baked stamp (asset, tile, flip). Repetition checks read the dump plus the manifest.
- **vector check**: in code, no Skia Path, Rect or Circle in the village scene outside the allowlist of rule 1. A second signal in pixels: 16 px blocks with a luminance standard deviation under k, with light layers off. Calibrate k on known vector items (pennants, rings, rack) against known painted ones (fox, villagers, buildings). If no k separates them, say so at the checkpoint.
- **thumbnail check**: blur to 1/8, report the brightest and most contrasted area.
- **ab_pairs.py**: see 10.3.

Mandatory pass criteria (each contract takes the ones its loupe touches):
- G02: no duplicate cluster in the dump and manifest; undergrowth overlaps every trunk base.
- G03: no screen-space component in the village scene except the edge vignette.
- G05, G06, G08: the vector check passes on the loupe crops.
- G07: the gatehouse overlaps the wall at both ends; at every tier the road reaches the gate, a bridge or the map edge.
- G09: banners in one motion crop show at least 3 different phases and one wind direction.
- G12: a footprint z-sort test passes; the campfire stays visible; a villager uses the place in the motion crop.
- G13: the building is present in all 12 frames of the upgrade motion crop; the impact is visible at night.
- G14: at opening, the village spans at least 60 % of the screen width, with no sprite drawn above 1.0x its source pixels.
- G16: the stale-hash unit test passes.
- G17: no flame outside a container in the dump.
- Every art rule the loupe touches.

## 10. The loupe (focus loop)
### 10.1 Card
loupes/<id>/card.md: subject, defect IDs, pillars, files, golden crops, KEEP crops, FLUX cap, max rounds.
- **Golden crops** come from the phase 1 capture script and its debug hook (seed, tier, zoom, time of day). Crop rectangles are written in tile coordinates, so camera changes do not break them. Judged at phone size.
- **Motion crops** for anything that moves: adb -s emulator-5554 shell screenrecord, then 12 frames at 10 fps with ffmpeg, as one contact sheet.
- **KEEP crops**: villagers and night windows, plus every locked crop the loupe's files can reach. A KEEP crop under 2 % pixel difference from its locked version passes without judging. Otherwise it goes through A/B, and losing it fails the round.
- After the beauty corner is locked, every contract adds: "at phone size, this crop matches the finish of the locked beauty corner crop", checked with both shown side by side and labelled.

### 10.2 Contract (round 0)
You draft contract.md from the mandatory checks and the art rules the loupe touches, as yes / no criteria. Judge 1 amends it once. Then you freeze it.

### 10.3 Each round
1. **Build.** Paint goes probe first, once per asset family per loupe: 2 to 4 images, judge 1 accepts or rejects against the bibles, the target screen and the slop list. Later rounds reuse accepted assets unless the verdict names them.
2. **Capture.** You install the round's build and capture golden, motion and KEEP crops, cache cleared.
3. **Objective checks** (section 9).
4. **Judging**, in fresh contexts that never see the implementer's reasoning:
   - Judge 1 (env for surroundings, mara otherwise) in one dispatch: the contract, each criterion PASS or FAIL with the crop or tool output that proves it, one FAIL fails the round, no waivers; then a defect hunt on 2x nearest-neighbour upscales, each new defect with crop and position.
   - Judge 2 (mara for surroundings, env for vector, theo for buildings) runs the blind A/B: scripts/iso/ab_pairs.py <loupe> <round> makes one PNG per crop, the new round and the baseline side by side in random order, named pair-NN.png in a neutral temp folder. The key goes to ~/.cache/bati-loupes/<loupe>/key-<round>.json, out of the repo. Each batch holds one canary pair (target screen crop against baseline). Two contexts answer left, right or tie per pair, one on the pairs as made, one with the sides swapped. Question: "Which is closer to the target screen, and better for pillars <list>?" A context that misses the canary is void and reruns once. The new round wins a crop only if both contexts pick it.
   - tech only when the diff touches z-order, the cache or the scene graph. anim only on motion crops.
5. **Refine or pivot.** The implementer reads the verdict and writes one line in the round folder: refine, or pivot to a different direction.
6. **Update state.json.** Best round = most contract PASS, then most A/B wins against the baseline.

**Done** when every contract criterion passes, the round wins more than half the golden crops (ties count as losses) and loses no KEEP crop. Then you merge into ISO_BRANCH, lock the loupe's crops in state.json, rebase the other running loupe and recapture its best round.
**Max rounds reached:** keep the best round, park the loupe (section 2).

## 11. Calibration (step 0, only for the judges the track uses)
- docs/designs/village-loop/calibration/: 9 crops from the baseline (6 FAIL from [G] defects only, 3 GOOD: fox, villagers, night windows) plus 3 held out (2 FAIL, 1 GOOD).
- Each judge gets the 9 crops with no labels and no defect list, and labels each FAIL (with cause) or GOOD.
- Pass: it catches at least 5 of 6 FAILs for the right cause AND keeps at least 2 of 3 GOOD.
- If it fails: write calibration/notes-<judge>.md with few-shot examples (crop, Guillaume's verdict, why), then retest on the 3 held-out crops; the retest passes at 3 of 3. Pass these notes in every later dispatch to that judge. A judge that still fails does not judge loupes; judge 1 or 2 is then taken by the other calibrated judge.

**Slop reject list (probes):** micro-noise texture, gloss, fake letters, runes painted by FLUX, perfect symmetry, mushy small figures, extra limbs, mismatched line weight, wrong light direction, painted cast shadows, off-angle iso.

## 12. How to paint it
- **References for every FLUX call:** the same 2 or 3 approved in-game Bati assets as style references, plus a greybox render of the slot at the iso angle as structure reference. Never a Thronebreaker image.
- **Hard-edged objects** (trees, props, banners): generated on flat magenta, keyed, fringe cleaned, checked at 2x.
- **Soft decals** (tufts, pebbles, dirt, flowers, ruts, puddles) and **field vignettes**: generated on a flat backdrop close to the ground colour, then baked offline into painted ground chunks, one set per tier band, with the stamp manifest. Bands only add, never remove. Runtime sprites only for what moves or needs z-sorting.
- **Trees:** each tree or cluster gets a painted base. Forests are overlapping clusters of mixed species (birch, oak, pine) in three sizes, smaller at the edge.
- **Fields:** four compositions, each with the life around it (wheat with stooks and a scarecrow; vegetable rows with a fence and a well; an orchard with a cart; a pasture with a sheep pen and hay), generated from the slot's greybox, edges blended into the ground, placed on slots tied to the road or the river.
- **Roads by tier:** tiers 1 to 3 a dirt track (ruts, puddles, grass in the middle); 4 to 6 packed gravel with edge stones; 7 and up cobbles fading into dirt at the edges. Edges broken by decals.

## 13. Step 0, once per session
1. Read the files of section 4. Settle ISO_BRANCH. Write PROMPT.md and state.json.
2. First session only: H0 cache fix.
3. Run python3 scripts/iso/iso_loop.py budget and list what it supports (image edit, references, masks). If there is no image edit, stop and ask.
4. A Sonnet implementer writes the section 9 tools and the dev hook. Calibrate k.
5. Baseline captures go to loupes/baseline/. Made once, never recaptured. This is "the baseline" everywhere.
6. Target screens for the track's key states (surroundings: tiers 1, 6 and 12 by day): paint over the baseline capture with FLUX image edit, Bati references only, 4 variants per state, about 2 $ total. Overlay the baseline building outlines at 50 % and discard any variant where a building moved, the horizon shifted or an art rule breaks. They are references, never shipped. No judge picks: Guillaume does.
7. Calibration of the track's judges.
8. Cards and contracts for S-night and BC only (and the first two loupes of other tracks).
9. Checkpoint: target screen variants (Guillaume picks 1 of 4 per state, or rejects in one line for one regeneration, max 1 $), calibration result, the two cards, FLUX and subagent estimates. Wait for his go.

## 14. Reporting and exit
Per loupe: one before / after image (best round) and three lines in French in progress.md, with the pillars tag.
Stop when the planned loupes are done or parked and every defect ID they cover passes its mandatory checks, or when a budget limit of section 2 is hit. Then run one final integration (full capture set, mara and theo on the whole village, blind A/B against the baseline) and write docs/designs/village-loop/summary-<track>.md: each defect ID and its status, the A/B result, FLUX spent, subagent runs used, parked questions, and the top 3 decisions for Guillaume.

## Appendix: other tracks (read only the one set in TRACK)
**vector** (G08, G09, G12, judges env, mara, anim):
- V1 inventory every vector shape in the village (component, where, why), then paint it, give it the paint treatment, or delete it: rings, pennants, rack, rocks, small tree.
- V2 banners become painted sprites with a 3 to 4 frame wave, random phase, one wind direction, different emblems.
- V3 vocation places: footprint z-sort, painted, a villager practising there.
Target screens: the training ground and the plaza with banners, tier 6, by day.

**buildings** (G10, G11, G13, G19, serves P3 first, judges mara, theo, anim):
- B1 observatory spectacle pilot: arcane green and blue light, runes drawn in code from a fixed glyph set, orbiting stones, a beam to the sky, stars at night.
- B2 last stage of every building is legendary: new silhouette, a painted magic or prestige layer, a unique idle, light at night.
- B3 fun details, a few per building: a guard sitting by the archery range with an arrow in his knee, crows and a treasure glint at the lair, sparks at the forge.
- B4 upgrade moment: no flicker, painted scaffolding, dust, bounce, a visible impact by day and by night.
Target screens: the observatory and two other buildings at their last stage, by day and by night.
