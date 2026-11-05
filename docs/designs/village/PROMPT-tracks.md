# Bati village iso: the tracks, design first
Version: tracks v4, 04/11/2026. Replaces v3. New: the atelier (section 6), no emulator and no tests in design tracks, one trade per track, a target image for the whole village.

**Amendment of 04/11/2026 (Guillaume's pick A, docs/designs/village/atelier/checkpoint.md). It overrides sections 6, 8 and the appendices wherever they disagree.** The app does not use Skia and will not: the village stays React Native views (expo-image, react-native-svg, Reanimated).
- **There is no `buildDrawList`, `motionAt` or `paint`, no draw list and no code guard.** Wherever this prompt names them, read: the app's own components and their data. A track that changes how the scene draws changes those components, so no look can exist only in the atelier or only in the app. Rule 3 still holds: a design track changes the look, never screens, panels, buttons, navigation, game rules, saved data or the workout flow.
- **The atelier** opens the real `dev-iso` route in headless Chromium: `node scripts/atelier/atelier.js render|strip|sheet|clip|check`, documented in PIPELINE.md section 6, with its calibration numbers. Merge 1 is in; DIRECTION may start.
- **Determinism stays a rule**: no Math.random and no new clock read in the drawing code; randomness is a hash of a seed (`graine.ts`). The atelier fixes the date.
- **LIFE step 1**: the motion core is the pure functions that already exist (`horloge.ts`, `marcheurs.ts`, `gestes.ts`) and the worklets calling them, not a new layer. LIFE's flagged code stays as components and is finished there, not rebuilt. **LIFE step 3**: the upgrade moment stays a pure timing (`moment.ts`) drawn by its components; "returns draw ops" no longer applies.
- **VILLAGERS** owns the villagers' components and data (`Marcheur`, `HabitantVue`, `habitants.ts`, `marcheurs.ts`), reading LIFE's core. **PERF** works on the views; if it shows they cannot hold on a mid-range phone, Skia comes back as a question, with that number.

You are the orchestrator of one track of Bati's isometric village (React
Native + Expo + Skia). The TRACK setting says which. You plan, dispatch and
merge. Implementers write the code and judges judge the images; you may make
small edits yourself (docs, status files, a fix under about 30 lines).
Guillaume picks the art. Read sections 1 to 9, then only the appendix of your
track.

**Where we are**: the painted ground and surroundings are done (the loupes
track, with a locked beauty corner). All 21 buildings are painted in five
stages and integrated. CLEAN is done. LIFE and GAME were stopped on 04/11:
their work is merged into feat/village-iso, the unfinished parts behind flags
that are off by default, and their summaries list what is left and the known
bugs.

**Why this version**: the last tracks lost hours on the emulator. To look at
the village, a session had to boot Android, start Metro, build, navigate and
set a state, and once inside the app the agents drifted into app work:
workouts, buttons, camera, perf builds, font-scale tests. From now on the
village is designed in the atelier, a tool that draws it as images in a few
seconds from the app's own drawing code. The emulator comes back only at the
end, for GAME and PERF.

## The six rules that matter most (read them twice)
1. **No emulator in design tracks.** ATELIER (except its two calibration visits), DIRECTION, LAYOUT, GROWTH, AUDIT, POLISH, LIFE and VILLAGERS look at the village only through the atelier (section 6). They never boot an emulator, start Metro for a device, make an Android build or open the app. The emulator belongs to GAME and PERF.
2. **No tests in design tracks.** No test suite, no single test file, no Maestro, no waiting for CI, no font-scale or screen-size test. Before a merge that changes code: typecheck, and one bundle built without a device (the command in PIPELINE.md, for example `npx expo export --platform android` into scratch/; no Metro server, no emulator). If you know a change breaks a test (a renamed function, a moved file), note it in tests-debt.md and go on. Tests come back in GAME and PERF.
3. **One trade per track.** A design track changes the look: paintings, positions, the data the scene reads, and motion as images. It never touches screens, panels, buttons, navigation, game rules, saved data or the workout flow. When it sees a problem outside its trade, it writes one line in docs/designs/village/<track>/handoff.md (for GAME or PERF, with how to see it) and moves on. It never debugs it.
4. **Aim at the target.** Once DIRECTION is done, every visual choice is judged against the picked target images and the rules of docs/designs/village/direction/target.md.
5. **Time box.** When an item reaches its max estimate, stop it, write where it stands and why in progress.md, and take the next item, or ask in checkpoint.md if it blocks. Two fix rounds at most on a failed check; after that, show it to Guillaume as it is.
6. **Commit, merge and push every finished item the same day**, and keep status.json current: Guillaume follows the work on a dashboard, not by asking.

## 1. Settings (Guillaume fills these before launch; an empty setting takes its default, never ask)
- TRACK: ATELIER, DIRECTION, LAYOUT, GROWTH, AUDIT, POLISH, LIFE, VILLAGERS, GAME or PERF. The only setting with no default: if it is empty, write "TRACK manquant" in a summary and stop.
- ISO_BRANCH: feat/village-iso. Your work branch: track-<track>, in its own worktree, branched from the ISO_BRANCH tip.
- FLUX for this session: default 10 $. You may spend the smaller of this and what the registry of scripts/iso/iso_loop.py still allows. Only Guillaume writes BUDGET_FLUX_V1 in VALIDATIONS.md. When nothing more can be spent, mark every FLUX item "attend Guillaume" with the note "budget", go on with the other items, then write the summary and stop.
- Subagent runs: default 150. At 80 %, finish the current item, write the summary, stop.
- PUSH: default yes. Push your track branch and ISO_BRANCH to origin after each merged item, never main, never with force.
- EMULATOR (GAME, PERF and the two ATELIER calibration visits only): emulator-5554, Metro on 8081.
- Language of every doc, report and note: French, simple and short.
- **Models**: pass the model at each dispatch; never edit .claude/agents/. opus only to invent ideas; sonnet for judges, painters and implementers; haiku for strangers, logs and simple checks.

## 2. When to stop and ask Guillaume
He validates only:
- **Picks**: concept boards for any new look, the target images and the layout, several at once on one checkpoint page. While you wait, do everything that does not depend on the pick.
- **The end of the track**: a 5-minute look (the tier strip before and after, a few clips), not blocking.
- **Deleting unmerged work**, a new dependency (except those pre-approved in section 7), a change to game data (ranks, thresholds, XP, unlock rules; positions and paintings are not game data), anything that touches a Bati promise, a single FLUX batch above 10 $ (the session total is not a batch), any install on a physical phone.
- **Where he answers**: Guillaume writes his picks and go's in checkpoint.md under a heading "Réponse de Guillaume". An item waiting for him stays blocked until that answer exists.
Everything else: decide, write it in decisions.md with one line of why, go on. If nothing is left without his answer, write the summary, commit, push and stop; never poll.

## 3. How a track runs (Anthropic's practice for long-running agents)
- **The first session of a track is its initializer.** It reads its appendix, inspects the code it will touch, and writes docs/designs/village/<track>/features.json: first `owns: [paths]` (the folders and files the track will edit) and `shared_read_only: [paths]` (what it reads but never edits), then `items`: everything the track must deliver, each with an id, a group (its step in the appendix), a check you can show (for a design track an atelier output, for example "the forge chimney smokes: atelier clip, day and night"), an estimate in hours (min and max) and a status (section 4). If another session is live, read its features.json first (`git show origin/track-<other>:docs/designs/village/<other>/features.json`): on any overlap, split your items to avoid the shared file, or follow what section 9 says for that pair. Then start on the first item.
- **Every later session** reads this prompt, features.json, progress.md, checkpoint.md, decisions.md and git log -15, then picks the next items. One item at a time, to the end: build it, look at it as a player would (design tracks: in the atelier, at phone size; GAME and PERF: on the emulator), commit, merge, push, then the next.
- **A stopped track resumes** (LIFE and GAME, whose items are "paused"): merge origin/feat/village-iso into your track branch first (create the branch from it if it is gone), read your last summary, the audit's docs/designs/village/audit/items-<track>.json and the handoff.md files addressed to you. Keep, change or drop each paused item to fit this version and its appendix: the items you keep go back to todo (à faire); an item outside your trade goes to the handoff of the track that owns it. Rewrite your old status.json rows with this version's piste_ordre. Then go on as a later session.
- **Agents change statuses and notes in features.json, never delete an item.** A new need becomes a new item.
- **Clean handoff**: at any stop, typecheck passes and the bundle builds (rule 2), the work is committed and pushed, and progress.md says what is next.

## 4. State and the dashboard
In docs/designs/village/<track>/:
- **features.json**: the list of section 3. Its status and status.json's statut map one to one: todo = "à faire", doing = "en cours", waiting = "attend Guillaume", done = "fait", paused = "en pause", dropped = "abandonné".
- **status.json**: what Guillaume's dashboard reads, from origin/track-<track>. Update it after every finished item, commit it and push the track branch, even before a merge into ISO_BRANCH. One row per item:
  `{"id", "piste", "piste_ordre", "etape", "ordre", "statut", "debut", "fin", "heures", "restant_min", "restant_max", "reste", "avancement", "total", "note"}`
  - debut and fin are ISO times with the Paris offset; heures is the time actually spent; restant_min and restant_max your current estimate in hours; reste the same in words ("2 à 4 h"); avancement and total for an item that counts things (7 of 19 buildings); note one short French line.
  - piste and piste_ordre are fixed per track: L'atelier 4, L'image cible 5, Disposition du village 6, Alentours qui grandissent 7, Audit du village 8, Retouche de la peinture 9, La vie (animations) 10, Villageois 11, Le jeu (page Village) 12, Performance 13 (1 to 3 are the loupes, the buildings and the clean-up). etape is the item's short French name; ordre its rank inside the track; id the item's id in features.json.
- **progress.md** (one line per finished item: date, what, commit sha), **decisions.md**, **checkpoint.md**, **handoff.md**, **tests-debt.md**, **summary-<session>.md**.

## 5. Branches, merges, two sessions
- At most two sessions at once, each with its own worktree and branch, never editing the same files: features.json says what each track owns.
- **The emulator**: only one session at a time may use it (GAME and PERF never run side by side). It claims it with `mkdir ~/.cache/bati-slot-5554` and removes that folder when it stops. If the folder already exists and no live session uses it (no Metro on 8081, no emulator started by a live session), remove it and say so in progress.md. Otherwise do the work that needs no emulator, set the waiting items to "en pause" with the note "attend émulateur", commit, push and stop; never wait. Never stop a Metro or an emulator you did not start.
- Commits and pushes run no hooks on track and iso branches (`--no-verify`), never on main.
- **Merging into ISO_BRANCH**, holding ~/.cache/bati-iso-merge.lock (if the session refuses git inside flock, hold the lock from a background process, for example `flock ~/.cache/bati-iso-merge.lock sleep 300 &`, check it is taken, and run git meanwhile): git fetch, merge origin/feat/village-iso into your track branch (never rebase a branch you already pushed), typecheck and build the bundle if code changed (rule 2), then `git push origin track-<track>:feat/village-iso` (fast-forward only). Never check out feat/village-iso in your worktree. If the push is refused, fetch, merge again and retry.

## 6. The atelier: how every design track sees the village
ATELIER builds it first, in two merges. No other track starts before merge 1.
- **What it is**: the village drawn as images by the app's own drawing code, run in Node with Skia, from the same image files. The app and the atelier share three things, so what the atelier shows is what the app shows:
  - `buildDrawList(state, view)`: from a state (tier, each building's rank, stage and pending upgrade, time of day, flags, a random seed, reduced motion) and a view (screen size and pixel ratio), the ops to draw, as plain data;
  - `motionAt(op, t)`: small pure functions that read a moving op's parameters (period, amplitude, phase, path, an emitter's rate) at time t in seconds;
  - `paint(Skia, canvas, ops, images, t, matrix)`: the one drawing function. Camera and zoom are the matrix: a shared value driven by gestures in the app, plain numbers in the atelier.
- **Draw list rules**, for every track that touches it:
  - Ops are plain data: no functions, no class instances.
  - Nothing in the draw list, motionAt or paint calls Math.random or reads a clock. Randomness is a hash of the seed and the op's id; particles are stateless (each one's place is a function of t, its index and the seed). The same state and t give the same image in the app and in the atelier.
  - The functions the app runs every frame (motionAt, paint) start with 'worklet' and import nothing.
  - The list is rebuilt only when the state changes: never every frame, and not while the player pans or zooms.
  - Layer files (ground, buildings, decor, effects, creatures, villagers, night grade) are for ownership, not for drawing order. The order is: the ground; then every standing thing (buildings, quarters, decor, creatures, villagers) sorted by the depth of its foot; then what floats (smoke, motes, glows); then the night grade and the code light. A moving thing takes its depth from motionAt at t.
- **Commands** (one CLI; PIPELINE.md lists them with examples): `render` (one state, PNG at the phone's pixel size), `strip` (tiers 1 to 12 side by side, day or night), `sheet` (one building at every stage), `clip` (a few seconds of motion as frames, a contact sheet and an mp4 or gif), `check` (occlusion per building, ground anchors, the 1/8 blurred value thumbnail, image sizes against their size on screen, moving things against the motion budget, and a code guard on the draw list rules).
- **Outputs**: in docs/designs/village/<track>/scratch/atelier/, with the commit sha in the name, plus "-dirty" when the tree has uncommitted changes; look decisions use clean renders only. What someone needs after the track (the final strip before and after, the picked concepts, the audit's images) is committed in docs/designs/village/<track>/img/ as JPEG, at most 1080 px wide.
- **Rules**:
  - Every look decision is made on atelier outputs, at the phone size recorded in PIPELINE.md.
  - Before merging anything that changes the look, render the tier strip by day and by night beside the previous one; link both in progress.md.
  - When a track changes how the scene draws (a new layer, motion, a light), it changes the shared draw list, motionAt or paint, never a copy. No look may exist only in the atelier or only in the app.
  - Flags are part of the state: the atelier renders with a flag on or off, as the app would.
  - The atelier's own code (its CLI and Node renderer, not the shared draw list) belongs to no track: if a command crashes, is slow or lacks an option, any track may fix it in a small commit merged at once (time box 1 h). This never counts as an owns overlap.
  - If you think the atelier and the app differ (only the emulator can tell), write it in handoff.md for GAME with the atelier render, the state and the command. Never boot the emulator.

## 7. Ground rules
- **Devices** (every session that runs adb, Metro or an emulator: the ATELIER calibration, GAME and PERF): emulators only, always with the serial (adb -s ..., Maestro --device). Run adb devices first and never touch a serial that is not an emulator: a previous run wiped Guillaume's real phone. A physical phone only in PERF, with Guillaume present and his go, and only the side package com.guiforge.bati.perf, never the main app.
- **Game states without playing** (the same sessions): tier, ranks, stages, pending upgrades, time of day, the clock and the seed are set only through the dev states (a dev-only deep link listed in PIPELINE.md that writes game data and opens the Village tab). Never start, log or finish a workout to move the village, and never run the workout Maestro flows. To test the way from the end of a workout to the village, open the end screen through a dev state with a finished workout already written.
- **Emulator speed** (the same sessions): no Android build per change: the dev build with Metro and reload; one full build at the end of the track (PERF: the perf build). What the atelier or a script can show is checked there first; the emulator checks taps, screens and flows, with one batch of captures per step by one capture script, never for exploring. GAME never makes a perf build and never tunes the frame rate: a slow screen goes to handoff.md for PERF with how to see it.
- **One phone size** everywhere, default font scale. The accessibility pass (large font, 130 % text, screen reader) happens once, at the end of GAME, and nowhere else.
- **Release path**: the release build follows the INTEGRATION flag and shows the old 2D village until GAME's last item. Never change, move or delete the old 2D scene or the INTEGRATION flag code, and never change the release default of any flag. Dev builds, perf builds and the atelier show the iso village with the same flag defaults. Dev states write game data, the clock and the seed, never the look: no hidden parameter that swaps paintings or flags.
- **Bati's promises**: everything derives from the workout journal, nothing goes backwards, no currency, no shop, no waiting timer, upgrades only on the player's tap. Glows are never tappable, never counted, static under reduced motion. Nothing looks like loot.
- **Art locks**: the loupes locked crops (docs/designs/village-loop/loupes/state.json, copy and sha256 list in ~/.cache/bati-loupes-lock/) and every building ladder the buildings track merged. Never write them; nothing you do may make them look worse.
- **FLUX**: every call goes through scripts/iso/iso_loop.py, whose locked() helper takes the registry's own lock (budget.lock); never call FLUX outside it and never wrap it in another lock. **Only FLUX 3 Image and FLUX 3 Image Klein** (Guillaume's rule): never FLUX.2 pro or an older model, even if a script's default chose it; check the model in every call and in the manifest. Never send a Thronebreaker image to FLUX; the words of a FLUX prompt never name a game, studio, film, comic or artist. Our own atelier renders may be sent as the image to edit.
- **Dependencies**: none new without asking. Pre-approved, as devDependencies for the atelier only: canvaskit-wasm at the exact version @shopify/react-native-skia already depends on (only if it is missing), and one TypeScript runner (tsx or esbuild) if the repo has none. Also pre-approved: free CC0 3D models (Quaternius, Kenney, in ~/.cache/bati-cc0/) for creature frames, committing only the models used, with a LICENSES note.
- **Clean as you go**: drafts live in docs/designs/village/<track>/scratch/ (gitignored), archived to ~/bati-archives/<date>-<track>.tgz and emptied at the end of the track. What stays in git is code that runs, tools that are used, short docs and the img/ folders of section 6.
- **Waiting**: never wait with pgrep -f loops. Wait on a PID, a done file or an output file, always with a time limit. A job with no new output for 15 minutes gets checked, then restarted or stopped.

## 8. What we want, and the method for anything visual
The village is the player's own Bati:
- **P1 Pride**: I would screenshot my village and send it to a friend.
- **P2 Watchable**: I open it just to look. It is alive, and I keep finding small things.
- **P3 Building joy**: seeing a building grow is a moment.
- **P4 It looks like my training**.
The look: Thronebreaker's hand-painted world map, inked the Bati way (docs/designs/village-style-bible.md), medieval fantasy with a dark-fantasy edge, warm light, gentle gags. Light from the top-left, slate shadows, ink #0F1518, night as a colour grade plus code light. Dense and lived-in, never an empty map with monuments on it. Calm: a few things moving at a time, never a fairground.

The method:
1. Ideas in text (opus, a few directions), audited quickly (sonnet: theo for fun, mara for art and readability at phone size, env for ground and surroundings).
2. Cheap concepts: FLUX 3 Image Klein (about 1 cent an image), a few variations. Motion concepts as atelier clips.
3. Guillaume picks on one checkpoint page.
4. Production: FLUX 3 Image for finals and edits (about 5 cents an image). An image that fails 3 times: change the prompt or the approach, not the model.
5. Checks once, at the end of a step: the atelier's `check` first, then one message that dispatches the judges you need (mara, env, theo, anim) together.
Image errors to reject: micro-noise, gloss, fake letters or runes, perfect symmetry, mushy small figures, extra limbs, wrong light, painted cast shadows, off-angle iso, crowds, anything that reads as underwear, a still painted person.
Inside a session: independent dispatches go out in one message, up to 3 implementers at once, each in its own worktree, on files that do not overlap; prepare the next step's ideas while production runs.

## 9. Order of the tracks and exit
Done: the loupes, the buildings, CLEAN. Stopped on 04/11, resumed later in this order: LIFE and GAME.
1. **ATELIER**, alone until its merge 1.
2. **DIRECTION**, beside ATELIER's merge 2 (it needs only `render` and `strip`).
3. **LAYOUT**, once ATELIER's merge 2 is in and the target is picked. Beside it, **GROWTH** steps 1 to 3 for farms, hamlets, roads and night lights. GROWTH paints the quarters only once Guillaume has picked LAYOUT's proposal (read the picked plan and slot sizes with `git show origin/track-layout:...`).
4. **GROWTH** step 4 and after (placing and baking), once LAYOUT is merged. If GROWTH gets there first, it writes its summary and stops.
5. **AUDIT**, alone and short.
6. **POLISH**.
7. **LIFE**, then **VILLAGERS**: LIFE owns the motion core (motionAt, sway, flicker, particles, path following with pauses). VILLAGERS may start once LIFE's step 1 is merged; it owns only the villagers layer and its data, and reads the core. A change it needs in the core goes to LIFE's handoff.md, or waits until LIFE is done.
8. **GAME**, back on the emulator.
9. **PERF**, alone, last.
- **End of a design track**: the final `check`, the judges once, the tier strip before and after in img/ for Guillaume's 5-minute look, summary-<session>.md (what is done, what is parked, FLUX spent, runs used, the tip sha, the top 3 decisions for him), status.json final, archive and empty scratch/, push. No test suite.
- **End of GAME or PERF**: the same, plus what their appendix asks for tests.

---

## Appendix ATELIER: see the village in seconds (the base of everything)
Goal: a design track can work a whole day without the emulator, and trust what it sees. Target: 8 to 14 h, in two merges. ATELIER visits the emulator twice, for items 2 and 6 only, and its only app work is the dev deep link of item 2 (an exception to rule 3). Never change the old 2D scene or the INTEGRATION flag code.
1. **Map the scene** (read only, 30 min): how the Village tab turns game state into pixels: data files, image requires and their density variants, anchors, z-order, ground chunks, night grade, decor, today's villagers and creatures, camera, zoom, gestures, flags. Note LIFE's and GAME's flagged code; do not port it. One page: docs/designs/village/atelier/map.md.
2. **Dev states and the before capture** (first emulator visit): if the app has no dev states, add the smallest form: one dev-only deep link that writes tier, ranks, stages, pending upgrades, time of day, a fixed clock and a seed, and opens the Village tab. No menu screen, no new button, dev builds only, time box 1 h. No Android build if a dev client is installed: Metro and reload. Capture three states from the ISO_BRANCH tip: tier 1 by day at default zoom, tier 6 by night, tier 12 by day at max zoom-out. Stop the emulator and Metro.
3. **Split the scene** into the three shared parts of section 6, without changing what the app shows:
   - port into the draw list only what the app shows with flags at their defaults: the ground, buildings, decor, night grade, and what already moves (today's villagers and creatures). LIFE's and GAME's flagged code stays where it is, untouched; LIFE rebuilds it in the draw list later;
   - in the app, what never moves is recorded into cached pictures when the list changes; the moving ops are recorded each frame on the UI thread from the app's clock (for example `useDerivedValue(() => createPicture((c) => paint(Skia, c, movingOps, images, clock.value, matrix)))` drawn by a Picture element); gestures, camera control and taps stay in the app, around the drawing;
   - one image manifest maps each image id to its file; the app's require map is generated from it, and the atelier loads the same file the app loads at the calibration phone's density;
   - if the scene already has such a split, reuse it.
4. **The Node renderer**: `LoadSkiaWeb` (from `@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb`) and `makeOffscreenSurface` (from `@shopify/react-native-skia/lib/commonjs/headless`), then `paint` on the surface's canvas, with images decoded from the files on disk. No React renderer, no react-native stub. Check these import paths against the installed Skia version. If after 2 hours this path still fails, switch without asking to canvaskit-wasm called directly through a thin adapter for the few Skia calls `paint` uses: same draw list, same Skia, and the calibration still decides. Ask Guillaume only if that fails too.
5. **The first commands**: `render`, `strip` and `sheet` (section 6), in one CLI documented in PIPELINE.md. Speed targets: one render under 5 s, the 12-tier strip under a minute.
6. **The after capture and the comparison** (second and last emulator visit), with the dev state's fixed clock and seed:
   - the same three states from your branch tip: the app must look as before the split (mara, side by side; moving things aside, since the before capture had no fixed clock). Then one pan, one pinch and one tap on a building: a difference the split caused is fixed now; anything that already failed before goes to handoff.md for GAME. Never debug the camera, a panel or a button;
   - the same three states in the atelier against the app: pass when mara sees no difference a player would notice at phone size and the mean pixel difference, after cropping the app's bars, is under 2 %. Use the same image sampling on both sides (linear with mipmaps) instead of chasing edge differences between GPU and CPU. If it fails, fix the atelier side (image file and density, pixel ratio, colour space, sampling) in at most 2 rounds, then write the gap and its cause in PIPELINE.md and go on;
   - one smoke reading of the UI-thread frame time at tier 12 by day (10 minutes at most): from it, write a first motion budget in PIPELINE.md (how many moving ops and particles on screen at once, with a safety margin), which `check` enforces and PERF refines. Not a perf pass;
   - write the phone size, the numbers and the date in PIPELINE.md, stop the emulator and Metro, remove the slot folder.
   **Merge 1** now: the split, `render`, `strip`, `sheet`, the calibration.
7. **The other commands**: `check` (with the code guard: the draw list, motionAt and paint import nothing from react, react-native, reanimated, Skia's main entry, fs or path, and every per-frame function starts with 'worklet'; occlusion reads hooks.json when LAYOUT has made it) and `clip` (ffmpeg if `which ffmpeg` finds it, otherwise frames and a contact sheet). Checks: the 12-tier strip by day and night, the forge sheet, one clip of something that already moves with flags off (a villager walking or the windmill sails). **Merge 2.** From here on, design tracks never open the emulator.

## Appendix DIRECTION: the target image of the whole village
Goal: one picked image of the whole village at tiers 1, 6 and 12 (by day, plus tier 12 by night) that every later track aims at, so the village stops being judged piece by piece. Target: 2 to 3 h, about 2 to 4 $. Runs beside ATELIER's merge 2.
1. Render the current village in the atelier: tiers 1, 6 and 12, day, default zoom, plus tier 12 at max zoom-out and by night.
2. **Ideas in text** (opus, 3 directions) from Guillaume's wishes: every building visible and recognisable at every tier; a village that grows organically, roads and houses that organise themselves with the tier and a visible start; surroundings that tell prosperity (a lean-to, then farms, hamlets, a small market town at the top); quarters of painted houses, gardens, a market, a tavern and workshops filling the gaps between the player's buildings; dense, never an empty map with monuments on it; the dark-fantasy mood; the map may grow where room is missing; the locked beauty corner kept. Each direction gives its layout rule, where the quarters go, how the map grows, and its light. Quick audit: mara, theo, env.
3. **Paintovers**: for each direction, edits of the atelier renders with FLUX 3 Image (Klein first to explore), 2 variations per tier. These are targets, never assets: nothing is cut out of them or placed in the game.
4. **One checkpoint**: the 3 directions side by side for each tier, each with a small top-down plan. Guillaume picks one, or mixes.
5. Write docs/designs/village/direction/target.md: the picked images (in img/), about 10 short rules read from them (for example "the core stays the brightest", "from tier 6 every gap wider than 2 tiles holds a quarter", "cobbles in the core from tier 7"), and what LAYOUT, GROWTH and POLISH each take from it. The paintovers invent details the sprites cannot match: judges check the rules and the overall read, never pixel likeness.

## Appendix LAYOUT: every building in view
Goal: at every tier, every building of the player can be seen and recognised, laid out as the target shows. Each building keeps its own emprise (its footprint in tiles); what changes is where it stands. **The map may grow** when there is not enough room (Guillaume's go): reorganise first, and add tiles only where needed, since every new tile needs ground, surroundings and a new framing.
1. **Measure**: first draw a hook box per building and stage (hooks.json) from the Hook lines of the building catalog; `check` reads it. Then, with `check`, at every tier from 1 to 12, with every building at its tallest stage and at a typical stage: how much of each building is hidden, and by which one. Pass target: every building at least 85 % visible, its hook fully visible, its tap zone reachable. List the failures, worst first.
2. **Proposals**: 1 or 2 layouts that follow the target's rules, as atelier renders at tiers 3, 6 and 12 by day plus a top-down plan, each saying how many tiles the map gains, if any, and where GROWTH's quarters will go (the slots between and around the buildings, with their sizes). Guillaume picks on one checkpoint page.
3. **Apply and recompute** what depends on positions: the layout data, roads and paths, the baked ground and its stamp manifest, decor slots and fields, villager paths, depth order, tap zones, the framing at tier 12 (everything fits at max zoom-out), the organic growth by tier. Zoom limits and pan bounds per tier are scene data the camera code reads: LAYOUT edits that data, never the camera code. Nothing goes backwards for the player: a building never jumps away from where it stood when the player reaches the next tier.
   - **Objects that float** (Guillaume saw it on 04/11): props and decor seem to hover above the ground, probably because CLEAN re-cut 174 elements without recomputing their ground anchors. Every sprite's anchor must sit on the lowest opaque pixels of its painting, within 2 px at phone size: fix every failure of `check` while you recompute the decor.
4. **The locked beauty corner**: if a building inside it has to move, that is Guillaume's decision at the checkpoint, and the corner is locked again with him afterwards.
5. **Overlaps that remain** after the new layout: list them in handoff.md for GAME, which will fade the building in front while the panel is open. Never a permanent transparency.
6. Checks: occlusion and anchors pass at every tier; the tier strip by day and night beside the target; env, mara and theo once.

## Appendix GROWTH: the surroundings grow with the village
Goal: in Guillaume's words, "the surroundings show the same drawing whatever the tier". They must tell the village's prosperity, as the target shows: at the start almost nothing, a turned patch and a lean-to; then small farms; then prosperous farms, more of them, hamlets; at the top a rich countryside around the village. Steps 1 to 3 run beside LAYOUT for farms, hamlets, roads and lights; the quarters wait for Guillaume's pick of LAYOUT's proposal; step 4 waits until LAYOUT is merged into ISO_BRANCH.
1. **Audit**: list every surroundings piece (farms, fields, hamlet houses, props, roads) and the tiers where it shows, from the stamp manifest and the draw list. The atelier strip from tier 1 to 12, by day and by night: what never changes is the list to fix.
2. **The prosperity ladder**, ideas in text first, then Klein concepts, then Guillaume's pick:
   - farms: tiers 1 to 3, a turned patch and a lean-to, barely a farm; tiers 4 to 6, a small farm with a fence and a few crops; tiers 7 to 9, a prosperous farm with a barn and an orchard; tiers 10 to 12, several farms and fields all around;
   - hamlets: nothing at first, then 2 or 3 huts, then a hamlet with a well and lit windows, then a small market town at the top, never brighter or richer than the village core (value rule);
   - roads that improve with the tiers (dirt, then gravel, then cobbles fading into dirt), if they do not already;
   - by night, more lit windows as the village grows;
   - **quarters** (after LAYOUT's pick, on its slot sizes): between and around the player's buildings, painted neighbourhoods that are not buildings of the player (houses, small gardens, a market, a tavern, workshops, a little square), only there to bring life and fill the gaps. They grow with the tiers (a few houses, then streets, then a real town quarter), never hide a player building, never carry the clan mark, and stay a step calmer in value than the player's buildings. Always painted, never drawn in code, and no painted people: the villagers bring the life.
3. **Paint the pieces**: FLUX 3 Image from the picked concepts, one painting per stage of each piece. Nothing goes backwards: a piece seen at a tier stays at the next one, or is replaced in place by its richer version.
4. **Place and bake** (after LAYOUT's merge): place the pieces on the slots tied to the roads, the river and LAYOUT's quarter slots, then bake them into the ground chunks of each tier band with the stamp manifest. No visible repetition (two identical pieces never close together). Cost guide: about 5 to 10 $ for the whole track.
5. Checks: the tier strip shows the growth at a glance; on the 1/8 blurred thumbnail the village core stays the brightest; the locked corner is not worse; env, mara and theo once.

## Appendix AUDIT: one look at the whole village (short, alone, no fixing)
Goal: one ranked list of what is wrong, everywhere, before POLISH, LIFE, VILLAGERS and GAME. This track fixes nothing. Target: half a day, no FLUX.
1. **Read what exists**: each track's last summary, every handoff.md, the paused items of LIFE and GAME, tests-debt.md, docs/designs/village/polish/backlog.md, the loupes backlog still open (the road through the gate and the closed breach, the framing at tier 12, the night grade), and Guillaume's notes in checkpoint.md.
2. **Measure** with `check` at every tier.
3. **Look**: atelier renders at tiers 1, 3, 6, 9 and 12, day and night, default zoom and max zoom-out, side by side with the target; a sheet of every building at each stage; clips of what already moves.
4. **Judges once, in one message** (sonnet): env (ground and surroundings), mara (art errors and readability at phone size), theo (fun, pride, the moment of the upgrade), anim (motion); plus one haiku stranger who sees the renders cold: "what do you see, what feels wrong, what would you show a friend?"
5. **One list**: docs/designs/village/audit/audit.md, a table ranked by how much each defect hurts P1 and P2, each with its spot, its image (in img/), the track that will fix it (POLISH, LIFE, VILLAGERS, GAME or PERF) and an estimate. Merge duplicates. Then a short list "ce qui marche, on n'y touche pas".
6. **One checkpoint** for Guillaume: the top 15, the rest folded below, and one question: what to drop. After his answer, write docs/designs/village/audit/items-<track>.json for each track (items in the features.json format, status todo); each track imports its file when it starts or resumes. Never edit another track's features.json.

## Appendix POLISH: the paint fixes
Goal: fix what is still ugly, and only that, from the AUDIT list, toward the target.
1. Start from docs/designs/village/audit/items-polish.json and Guillaume's answer on the audit: no new audit. Show the concepts of any new painted piece in the first checkpoint, all at once.
2. Fix in the audit's order, with the method of section 8. The locked crops must not get worse.
3. Checks: the audit's renders again, from the same commands, side by side with the audit's (in audit/img/) and with the target.

## Appendix LIFE: the village comes alive (design only, in the atelier)
Goal: buildings and village move a little, cheaply, in the Bati style. Everything is designed and checked as atelier clips. LIFE never wires anything to a tap, a button, the camera or the game state: GAME does that. No painted people: the villagers are their own track.
0. **Resume**: read your summary of 04/11. Keep the ideas and paintings that work; the old flagged motion code is rebuilt in the draw list, then removed. The bugs you found (the skip after the tap, the Fountain's missing Evolve button, the camera) and every item about taps, buttons, camera or perf builds go to handoff.md for GAME.
1. **The motion core**, inside the draw list (motionAt, section 6): sway for flags, banners and trees from one shared time value; flicker for windows and fires (a warm glow whose opacity moves with noise; windows light up one by one at dusk); stateless particles from a few small painted sprites for smoke, steam, sparks, embers, dust and magic motes, rising and fading; rotation for sails and wheels; a shimmer for water; path following with pauses for creatures and villagers. Reduced motion: everything still. Glows never tappable. Stay under the motion budget of PIPELINE.md. Merge this step early: VILLAGERS waits for it.
2. **Per building**: a small motion file per building (motion/<building>.json) naming the effects and their anchors, measured on the final paintings (after POLISH; re-measure any building it repainted). Never edit the buildings' data files.
3. **The upgrade moment as a sequence**: a pure function of (building, from stage, to stage, t) that returns draw ops: the scaffold, a bright flash and dust, the building pops to its new size, its lights come on; a short beat for a rank inside a stage; the same at night. At the end time and after, it shows only the final building, so a skip is simply a jump to the end. Old and new pieces never show together (the old palisade beside the new wall for 1.4 s was a bug). GAME plays it on the real tap.
4. **Creatures** (they replace today's birds and rats, which look frozen): mice near the barn and the farm, cats on walls and sills, birds that cross the sky now and then and land on roofs, the dragon of the Dragon Lair asleep and breathing at its mythic stage. Each follows a path with pauses, with 2 to 4 frames flipped for direction.
   - Concept test first, Guillaume picks the style: frames painted with FLUX against frames rendered in Blender from the CC0 models with a cartoon shader and the Bati ink outline. Creatures are small (12 to 30 dp): pick what reads best at that size and stays steady from frame to frame.
5. Checks: a contact sheet and a clip of each effect and creature, by day and night; `check` on the motion budget at tiers 1, 6 and 12 (calm); anim and mara once.

## Appendix VILLAGERS: people make the village (design only, in the atelier)
Goal: villagers that show the village's prosperity and the time of day, with the existing villager animations, as the villagers layer of the draw list. Starts once LIFE's step 1 is merged; owns only the villagers layer and its data.
1. Their number grows with the tier: a few at the start, a busy little town at the top, with a cap so it never feels crowded and stays under the motion budget.
2. Day and night: by day they walk between buildings and gather at the campfire, the market and the well; at dusk they light lanterns and go home; at night only a few remain near the lights.
3. Around buildings: each building draws its own visitors (the forge, the farm, the training dummy), more as it grows, on LAYOUT's paths.
4. Variety without new animation: colour variants and small props on the existing frames, if cheap. No new walk cycles.
5. Checks: clips at tiers 1, 6 and 12, day and night; theo and mara once.

## Appendix GAME: the village at the heart of the app (emulator)
Goal: the Village tab opens on the living iso village, it is useful, and everything the design tracks made works under the player's fingers. The first track back on the emulator (section 7: devices, dev states, emulator speed, one phone size).
0. **Resume**: read your summary of 04/11 (panel C, picked by Guillaume), the audit's items-game.json and every handoff.md. Known bugs first, in this order:
   - the Fountain says "Ready to evolve" but has no Evolve button anywhere: saying "ready" without a way to claim breaks a promise;
   - after the tap, the skip never shows the final building;
   - the old palisade stays beside the new wall, if LIFE's sequence did not already fix it;
   - the camera, every place where the handoffs say the atelier and the app differ, and whatever else they list.
1. **The panel on tap**, with the existing design system: name, rank, progress to the next rank in reps, the exercises that feed it, its recent history, its next stage as a silhouette, never a timer. The pending upgrade tap plays LIFE's sequence; a skip jumps to its end. When the tapped building is partly hidden, the one in front fades softly while the panel is open.
2. **Navigation**: from a building to its exercises and to the journal, and from the end of a workout to the village (through a dev state, section 7).
3. Locales and reduced motion while building, at one phone size, behind INTEGRATION.
4. **At the end, once**: the full test suite. Fix the failures in files this track changed; the rest goes to tests-debt.md for PERF. Then Maestro flows for the main paths on the emulator (never the workout flows), then the accessibility pass (large font, 130 % text, screen reader labels).
5. Checks: theo on the flow, mara on the screens, a short recording for Guillaume.
6. The track ends with INTEGRATION still off in the release build. Turning it on is its own last item, "activer INTEGRATION", waiting for Guillaume: a short later session does it once his go is written in checkpoint.md.

## Appendix PERF: make it fast (last, alone, emulator then phone)
Goal: a smooth village on a mid-range Android phone, and a clean branch to ship.
1. Measure first, on the perf build in the emulator: frame time on the JS and UI threads, memory and texture memory, sprite and draw counts (the atelier's draw list gives them per tier), image sizes against their size on screen, time to open the Village tab, cost of particles, creatures and villagers. Refine the motion budget of PIPELINE.md.
2. Fix the 3 biggest costs first, then measure again. Usual suspects: images much larger than their size on screen, layers that never move redrawn every frame (cache them), things off screen still drawn, too many particles, animations still running when the tab is hidden.
3. Then the real phone with Guillaume: only the side package com.guiforge.bati.perf, never the main app.
4. Tests: the full suite green, tests-debt.md emptied or each line justified, CI green on feat/village-iso.
5. Report: numbers before and after, what changed, what is left in perf-debt.md.

## Amendment of 04/11, evening (tracks v4.2): lessons from games, an early probe, the traces
This section adds to the sections above and, where it says so, replaces parts of them. It comes from a review of the plan against what fantasy iso games do (Kingdom Rush, Clash of Clans, Townscaper, Thronefall, Hades) and from two picks by Guillaume on 04/11: measure early on his phone, and add a TRACES track before GAME.

### A. Order and dashboard numbers (replaces section 9's list and section 4's piste_ordre)
1. ATELIER: done. 2. DIRECTION: done.
3. **LAYOUT**, and beside it **PROBE** (short, measure only, Guillaume present).
4. **GROWTH** steps 1 to 3, beside LAYOUT once PROBE is done, within PROBE's image budget. Quarters only after Guillaume's pick of LAYOUT's proposal.
5. **GROWTH** step 4 and after, once LAYOUT is merged.
6. **AUDIT**. 7. **POLISH**. 8. **LIFE**, then **VILLAGERS**. 9. **TRACES**. 10. **GAME**. 11. **PERF**, last.
Two sessions at once at most, as before.
piste_ordre: L'atelier 4, L'image cible 5, Mesure tôt 6, Disposition du village 7, Alentours qui grandissent 8, Audit du village 9, Retouche de la peinture 10, La vie (animations) 11, Villageois 12, Traces du journal 13, Le jeu (page Village) 14, Performance 15.

### B. Scene rules, added to section 6
- **Depth for buildings of different sizes**: the depth of the foot is not enough. Each building knows what stands behind it, and a topological sort decides the drawing order (the painter's algorithm with dependencies); a moving thing is re-sorted when it changes tile. LAYOUT checks the order at every tier.
- **One light**: every standing thing (buildings, quarters, GROWTH pieces, decor, traces) casts its shadow in the same direction, from the top-left light, on the shadow layer, never painted into the sprite.
- **Juice on moments only**: flashes, bounces and particles underline a moment (an upgrade, a new trace), never decorate the screen all the time.
- **Count what you add**: every track that adds images or moving things stays within PROBE's budgets (probe.md) and says in progress.md what it adds at tier 12.

### C. Devices (section 7)
A physical phone is allowed in PERF **and in PROBE**, always with Guillaume present and his go, and only the side package com.guiforge.bati.perf.

### D. Appendix PROBE: measure early (short, measure only, Guillaume present)
Goal: know what today's village costs on Guillaume's real phone before GROWTH, LIFE, VILLAGERS and TRACES add to it. The study of 30/10 noted only 3 to 4 MB of margin under 80 MB at tier 12 (measured at lot 5, before the five-stage buildings), and on 04/11 the scene mounted 772 images and 204 SVGs at tier 12. PROBE fixes nothing. Target: 1 to 2 h. It is not a design track: like PERF, it uses the emulator and the phone (rule 1 does not apply to it). It runs beside LAYOUT, which never uses them.
1. One perf build of the ISO_BRANCH tip, side package only, through the dev states (section 7), with the tools AGENTS.md allows for perf numbers.
2. On the emulator first, as a sanity check; then on Guillaume's phone, with his go: open the Village tab at tiers 1, 6 and 12, by day and by night; 20 s of pan and pinch each; record total and graphics memory, UI- and JS-thread frame times, and the time to open the tab. If a dev state can double the moving things at tier 12, measure that too, to see the headroom.
3. Write docs/designs/village/probe/probe.md: the numbers, the memory margin against the app's limit, and three budgets for the next tracks: images added per tier band (GROWTH, TRACES), things moving at once (LIFE, VILLAGERS), particles on screen. Replace the motion budget of PIPELINE.md with the measured one.
4. If the margin is already too thin, say so plainly and propose what PERF should fix first (flatten what never moves into fewer images per tier band, do not mount what is off screen) and whether it must happen before GROWTH paints: Guillaume decides in checkpoint.md.
5. Stop the emulator and Metro, remove the slot folder, uninstall nothing from the phone without Guillaume, push.

### E. LAYOUT, added to its appendix
- **Guillaume's tier 12 plan in target.md comes first for placement.** Grow it backwards: decide what exists at each tier from 1 to 11, so the village grows outward from a small but full start (a hamlet with its square, its fire and a few houses at tier 1, the camera stepping back at each tier), and show tiers 1, 3, 6, 9 and 12 in the proposal.
- **One checkpoint page** for the layout proposal and the three questions DIRECTION left for Guillaume: how the street links the squares of his plan; the locked crops `lisiere` and `pieds` after their retreat, before they are locked again; the look of the tiers other than 12.
- **Check the check first**: nobody has reviewed ATELIER's `check` (456 lines), and only the motion budget can make it fail. Before relying on it, verify 3 cases by eye against renders (the windmill at 67 % visible at tier 12, hidden by the quarry; 2 of the 9 floating sprites at tier 6), fix it if wrong, then make occlusion, anchors and the depth order able to fail (exit code): they are your pass gates.
- **The pre-push hook fails on 7 atelier files** (DIRECTION's handoff): fix them, 30 minutes at most (atelier code, section 6).

### F. LIFE, added to its appendix
- **Anticipation**: a building with a pending upgrade shows it in the scene, calmly (its scaffold waits, a soft pulse or a few motes), readable at phone size, never a timer, never counted. The tap stays GAME's.
- **The reveal**: scaffold and dust (about 0.5 s), then the new stage pops with squash and stretch and an eased bounce, a flash and a few sparks, then its lights. Short. A skip jumps to the end.
- **Birds**: simple agents tied to a nearby roof, circling and landing now and then. No complex behaviour.

### G. AUDIT, added to its appendix
- **Silhouette test**: from each building's sheet at a quarter of phone size, the haiku stranger tells each stage from the next; every miss goes to POLISH.
- **Light test**: every standing thing's shadow falls in the same direction.

### H. Appendix TRACES: the village remembers your training
Goal: small painted details born from the player's own journal, which stay forever, so the village looks like this player's training (P4) and keeps small discoveries (P2). As in Townscaper, the big shapes stay predictable and the small details vary and reward curiosity. A design track: the six rules apply, the atelier is its eye. Target: 6 to 10 h, about 3 $.
1. **Ideas in text** (opus): 10 to 15 traces. Each says what it looks like, where it stands (beside the building it relates to, or along the road), the journal fact that earns it, how it grows (for example a cairn that gains a stone every 10 km run, a lantern on the main street for each week the flame was kept, a pull-up bar worn shiny after many pull-ups), and whether it is plain or hidden (a rule the player can guess and repeat). Quick audit: theo (fun, discovery), mara (readable at phone size), and a check against Bati's promises.
2. **Rules**: derived from the journal only, by one pure function (journal to traces), the same on two phones; once earned, a trace never leaves and never shrinks (nothing goes backwards); no currency, no number shown, no timer, never a reward to claim, never looks like loot; it never hides a player building and stays a step calmer in value than the buildings; no painted people; no fake letters or numbers.
3. **Guillaume picks** the list on one checkpoint page, with Klein concepts of the 5 favourites. His pick is his go for this derivation: it reads game data and changes none.
4. **Paint** the picked traces with FLUX 3 Image, small, one painting per growth step; place them on slots near their building or the road, within PROBE's image budget.
5. **Code**: the derivation in the village code, and dev states that can show any trace, so the atelier renders them.
6. **Checks**: an atelier render at tier 6 of three made-up journals (a runner, a pull-up lover, a casual player): the three villages must look different at a glance. theo and mara once.

### I. GAME, added to its appendix
- **The reveal** gets a short haptic and a short sound generated by scripts/generate-sounds.py (a formula, no licence), silent when the player's sound is off.
- **Before wiring the time of day**, ask Guillaume whether free players get the real time of day: in September, the "village vivant selon l'heure" was planned as a paid extra.
- **Traces**: ask Guillaume whether a tap on a trace tells its story in the panel.

### J. Not scheduled
Ambient sound layers per building (Guillaume's wish of 29/10) become an optional SOUND track after GAME, if he wants it then.

## Amendment of 05/11 (tracks v4.3): no early probe, PERF before GAME
Guillaume's decision of 05/11: first make a great village, measure later. This section replaces what amendment v4.2 says about PROBE and the order.
- **PROBE is dropped.** No track waits for docs/designs/village/probe/probe.md. GROWTH and TRACES may paint now. Every track that adds images or moving things still writes in progress.md what it adds at tier 12 (images, SVGs, moving things), so PERF knows where the weight comes from. The motion budget stays the one in PIPELINE.md until PERF measures.
- **New order**: GROWTH, AUDIT, POLISH, LIFE then VILLAGERS, TRACES, **PERF, then GAME** last.
- **PERF before GAME**: PERF measures on the perf build, fixes the 3 biggest costs and runs the real phone with Guillaume, as its appendix says. The full test suite, the Maestro flows and CI green move to the end of GAME, which comes after and changes the code again.
- piste_ordre: Mesure tôt 6 is dropped; Performance 14, Le jeu (page Village) 15.

## Amendment of 05/11 (tracks v4.4): GPT Image 2 as a second painter
Guillaume bought 20 $ of OpenAI credit. This section changes the "only FLUX 3 Image and FLUX 3 Image Klein" rule as follows; everything else in section 7 stays.
- **Allowed models**: FLUX 3 Image, FLUX 3 Image Klein, and **OpenAI GPT Image 2** (model id `gpt-image-2`), only through the OpenAI Images API. Never an older OpenAI image model (dall-e, gpt-image-1, gpt-image-1.5, chatgpt-image-latest), even if a library defaults to it: check the model in every call and in the manifest.
- **Key**: read OPENAI_API_KEY from the environment, or else from ~/.config/bati/openai.env (outside the repo, never copied into it). Never print it, write it in another file, a log, a commit or a report.
- **Budget**: OpenAI spend has its own registry, kept like FLUX's: one small wrapper (scripts/iso/openai_loop.py or a branch of iso_loop.py) that reserves and records the cost of every call under a lock, with a cap of 20 $ in total and 5 $ per session unless Guillaume writes more in VALIDATIONS.md (BUDGET_OPENAI_V1). Cost is token based: record the input and output tokens of each call and the price the response implies. A single batch above 3 $ waits for Guillaume.
- **Same rules as FLUX**: never send a Thronebreaker image; the words of a prompt never name a game, studio, film, comic or artist; our own renders, paintings and sheets may be sent as references or as the image to edit; every image goes into scripts/provenance.json with its model, prompt and inputs; no painted people.
- **What it is for**: edits that need understanding and several references at once, where FLUX struggled:
  1. **The paths**: turn the flat brown path strokes into painted dirt and cobbled paths, by editing the baked ground chunks (our own image in, same size out), tier band by tier band.
  2. **Small props and quarters pieces** made from a reference sheet of our own buildings, so the style matches.
  3. **Paintovers** for POLISH (the square as the focal point).
- **Bake-off first, in GROWTH**: before using it for production, paint the same 3 jobs with FLUX 3 Image and with GPT Image 2: one quarters house of direction A, the tree stumps, one ground chunk with its paths repainted. Show both side by side at phone size on one checkpoint page, with mara's view on style match (ink, flat colours, no gloss, no AI smoothness). Guillaume picks the painter per kind of job; write the result in PIPELINE.md. About 1 to 2 $ of OpenAI.
- **A second pair of eyes (optional)**: a GPT vision model may judge renders as an extra "stranger", text only, a few cents a call, inside the same OpenAI budget.
