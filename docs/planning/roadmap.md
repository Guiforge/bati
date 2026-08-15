---
title: Roadmap
type: planning
status: active
updated: 2026-08-14
related:
  [
    README.md,
    ../design/ui-checklist.md,
    ../product/vision.md,
    ../content/missing-image.md,
    ../raw/bodyweight-app-research.md,
  ]
---

# Roadmap

> **Only what is unfinished.** Nothing here records what shipped: git history is the register of
> what was built, and a page of ✅ rows costs attention without paying any back. The rule is easy
> to state and easy to break — this page carried a "Done" block for two days before anyone
> noticed it contradicted this paragraph.
>
> Every number below is reproducible by a command. If one looks stale, run the command rather
> than trusting the line.

## North star

Bati is a **sport app first**, with RPG motivation layered on top. Completed workout history is
the permanent source of truth; progression is derived from it, never managed as a parallel
mini-game. If a reward surface competes with starting or continuing a workout, demote it.

## Guardrails (non-negotiable)

- Dark-only product UI. One dominant primary CTA per screen.
- No thick white/off-white borders as default styling — 1px `$borderStrong`, not 3px `$color`.
- Tokens only in product screens: no hardcoded hex, no `fontWeight` above `700` (no heavier face
  is loaded — anything above it renders wrong, silently).
- i18n for every user-facing string. A raw English literal in a component is a bug, not a TODO.
- The dark-fantasy voice stays. Best practice changes the numbers, never the fiction.
- **No network requests.** The Data Safety form says "no data collected, no data shared", and
  every feature below is scoped so that stays true. A feature that needs a server needs this
  guardrail lifted first, deliberately, on this page.
- [../design/ui-checklist.md](../design/ui-checklist.md) is the merge gate for UI work.

---

## How to read the rankings

Sections 1–3 are the critical path: nothing in §4 matters if the app cannot reach a user or
loses their history. §4 is the product backlog, ranked, and it is where the loose ideas landed.

| Field | Scale |
| --- | --- |
| **Impact** | how much it moves *training happening more often*, not how nice it is |
| **Effort** | S < 1 day · M 1–3 days · L ~a week · XL multi-week |
| **Priority** | P0 blocks release or risks data · P1 next · P2 after · P3 when bored |

Effort assumes the guardrails hold. Anything needing a server is XL by definition, because the
first cost is not the code.

---

## 1. Release & distribution

**Play is live on the internal track** (v1.7.4, versionCode 10704), uploaded by the `play` job of
`release.yml` behind the `play-internal` GitHub Environment. The listing, both locales, the
feature graphic, the privacy policy and the signing story are all done. What is left is a
calendar, not a keyboard.

- **P0 — Start the 14-day closed test. This is the longest pole in the project.** A *personal*
  Play account owes Google **12 testers enrolled in closed testing for 14 continuous days**
  before production access can be requested. The chrono does not start until a release is
  promoted to the Tests fermés track *with testers enrolled*. Two weeks that cannot be
  compressed, and every day not started is a day added to the end.
- **P0 — Demote the Play service account.** `…@bati-505415.iam.gserviceaccount.com` was raised to
  admin on 2026-08-14 to debug a screenshot upload and must come back down to "test channels +
  store presence". Its JSON key also sits in `~/Téléchargements/bati-505415-*.json`, a duplicate
  of the GitHub environment secret — delete it.
- **P1 — Screenshots must be regenerated after §2.** They must show the UI that ships, not the
  one before the device pass. Play caps them at **8 per device type** and rejects the ninth with
  a generic `PERMISSION_DENIED`; see `fastlane/metadata/README.md`.
- **P2 — f-droid.org, the official catalogue.** Three of four blockers cleared (artwork CC BY-SA
  4.0, Expo AARs built from source, Firebase stripped). What remains is a decision: F-Droid signs
  with its own key, so either reproducible builds plus `AllowedAPKSigningKeys` so existing
  installs survive, or f-droid.org is a fresh install and we say so. The recipe is written and
  never run through `fdroid build` — [../fdroid.md](../fdroid.md).
- **P2 — The self-hosted F-Droid repository.** `fdroid/config.yml` committed, secrets set, and
  the publishing half of `.github/workflows/pages.yml` has never run against a real index.
- **P3 — iOS.** Apple Developer account, certificates, provisioning profiles — none of it exists,
  and none of it is code. It is the second incompressible wait after the Play closed test, so the
  only cheap move now is opening the account; everything else can follow the Android product.
- **P3 — Desktop.** Closer than it looks and worth less than it looks, in that order.
  `react-native-web` ships, `npm run web` exists, and `metro.config.js:13` already resolves
  wa-sqlite's WASM binary — the web SQLite backend was made to bundle on purpose, so the database
  story on desktop is not a blank page. The first thing to break is `index.ts:12`, which calls
  `registerWidgetTaskHandler` unconditionally for an Android-only module.

  Two distributions, and they are not the same project: a **PWA** off the existing Pages deploy
  (the showcase already goes there) is the cheap one, effort M; a **packaged app** (Tauri or
  Electron, Flathub) is effort L and buys an icon in a launcher.

  It stays P3 for a reason that no amount of code fixes: **a desktop install is a second, empty
  database.** §4.1 has shipped, so a hero can now carry their history across by hand — but that is
  transport, not sync: two devices used in the same week still diverge, and the last export wins.
  And nobody does push-ups in front of a desktop — the realistic use is reviewing history and
  planning the week, which is the least urgent half of the app.

**Decisions that outlive the work**, kept because no commit message says them:

- The release keystore is the one irreversible asset here. Lose it and the published app can
  never be updated again — its backup is not optional.
- Play App Signing uses the **exported** key (PEPK), so Play, GitHub Releases and the self-hosted
  F-Droid repo all carry the same certificate (SHA256 `F5:D8:67:6E:…`) and can update each other.
- `src/crashLog.ts` captures JS only. Native crashes need a native handler, and
  `react-native-exception-handler` is unmaintained since 2022 with no Expo config plugin, so it
  cannot be linked under CNG. Reopen only if reports point at crashes JS never sees.
- `runtimeVersion` was set **before** the first signed build. It must not move.
- The Pages workflow publishes **only** `docs/legal/` and the showcase. Pointing it at the folder
  root would put this roadmap on the open web in order to serve one policy.
- `eas init` was tried and reverted. Plain Gradle produces the signed AAB CI submits; there is no
  OTA mechanism and no need for one.

## 2. UI refonte — the closing pass

Every screen scope was implemented; none was re-audited on a device. The reason to take this
seriously is what the audit tracker recorded on 2026-07-18 before it was deleted: **per-screen
checkmarks lied for weeks**, because the shared `AppButton` primitive underneath still carried
the anti-pattern, so every screen importing it had regressed. Trust a fresh grep over any claim
that a screen is done — including the ones below.

- **P1 — Device re-audit, 9 screen scopes**: Home · Quests + Quest Details · Session · Adventures ·
  Journal + Session Details · Village · Goals + Schedule · Onboarding · Settings + Credits.
  Simulator screenshots are not enough: the two bugs that triggered the whole pass (English
  strings in a French UI, a "Treasur/y" wrap) were only ever visible on a real screen.
- **P1 — Contrast has never been measured.** The primary button passes (6.45:1). First pair to
  test: `$textSecondary #909ACB` on `$surface #101322`.
- **P1 — Touch targets ≥ 44×44.** 155 pressables in the repo
  (`grep -rEo "onPress=" app components src | wc -l`), none verified on a screen.
- **P2 — Reduced motion**: the plumbing follows the OS correctly; the behaviour has never been
  observed with the system setting on.
- **P2 — Legibility in bright ambient light.** `PRODUCT.md` requires it explicitly ("variable gym
  lighting"), and a dark-only app tests badly for it indoors.
- **P2 — Cross-screen backlog**: unify card/control primitives across the legacy screens and
  `src/ui`; re-establish one-primary-action hierarchy on Home and the Quest/Adventure detail
  screens; then small-label readability in Journal/Session/Quest cards, onboarding/settings
  motion alignment, and chip overload.

**Method.** One scope unit per PR — one screen, or one shared component family — with rationale,
impacted files, before/after screenshots, checklist pass, and `npm run check` + `npm test` green.
Severity order P0 → P1 → P2 → P3; never polish before P0/P1 are gone.

## 3. Debt with a deadline

Not tidiness. Each line is a gate that does not close, or a risk with a date on it.

- **P0 — Migrations have never been tested against a real upgraded database.** The runner exists
  and is shared by both entry points (`db/migrate.ts`), and 31 migrations have shipped
  (`ls drizzle/*.sql | wc -l`) — four of them, `0027`–`0030`, *after* the first install existed.
  Every test still starts from a fresh database. Now that testers carry real history, the failure
  mode moved from theoretical to "a stranger loses a year of workouts on update". Capture a
  device database, replay the upgrade against it, keep the fixture.
- **P1 — The knip gate does not gate.** `npm run knip` runs in CI and the report is at zero since
  2026-08-12, but the step exits 0 regardless of findings. Verify it goes red when a finding
  appears, or it is decoration.
- **P2 — The 7 Maestro flows never run in CI, and they do not assert state.**
  `session-interruptions.yaml` performed two boss-damage bugs and passed, because it only checked
  that the UI came back. They are worth "the app does not crash on this path", nothing more.
- **P2 — The APK is 64 MB** (`gh release view --json assets`, v1.7.4: 64 016 729 bytes) for an
  arm64-only, R8-minified build. Nobody has looked at where it goes. First greps:
  `assets/icon.png` is **2.6 MB** and is bundled; `assets/images` is 14 MB across 232 webp files
  whose resolutions have never been checked against the sizes actually rendered. The 4170 SVGs in
  `assets/game-icons.net.svg-foreground-white` are repo weight, not APK weight — Metro only
  bundles the ones `hooks/useGameIcon.ts` statically requires. Measure before optimising.
- **P3 — Bundle-size and performance profiling on a release build**, never in dev
  ([../architecture/performance.md](../architecture/performance.md), rule 1). Startup, memory,
  frame rate under animation.

## 4. Product backlog — ranked

Everything below is real work with a user visible on the other side. The table is the whole
argument; the paragraphs afterwards only exist where the *how* changes the ranking.

The **From** column credits a field scan run on 2026-08-14 against four apps that solve the same
problem differently: [Spix/FitTrack](https://github.com/LuckyTheCookie/FitTrack) (RN + Expo,
offline-first, no cloud — the closest cousin Bati has), [Madbarz](https://www.madbarz.com/)
(bodyweight, video-backed, community), [Freeletics](https://www.freeletics.com/fr/) (adaptive
coach) and [Zombies, Run!](https://zombiesrun.com/) (narrative-driven effort). A second pass the
same day covered the games rather than the trackers —
[Ring Fit Adventure](https://www.nintendo.com/store/products/ring-fit-adventure-switch/) (an
exercise is an attack), [Habitica](https://habitica.com/) (RPG habits, party quests) and the
territory-capture runners [Motera and Run An Empire](https://www.motera.app/zombie-run-app).

A third pass asked a plainer question — *does this app take a calisthenics beginner under its
wing?* — and produced 4.4 and 4.10 by reading the catalogue rather than a competitor. A fourth
covered the category leaders — [Duolingo](https://trophy.so/blog/duolingo-gamification-case-study)
and [Strava](https://www.strivecloud.io/blog/app-engagement-strava) for retention,
[Hevy and Strong](https://www.findyouredge.app/news/best-strength-training-apps-2026) for
tracking, [Caliber](https://askvora.com/blog/best-strength-training-apps-2026) for coaching,
[Pokémon Sleep](https://yukaichou.com/gamification-examples/top-ten-gamification-healthcare-games/)
for reward design — and added one mechanic (4.15's arrival roll), one confirmation of doctrine,
and three refusals.

What the scans refused, and what they found already shipped, are at the end of this section. Both
cost as much thought as the takes, and by the third pass they outnumbered the features.

| # | Item | Impact | Effort | Prio | From |
| --- | --- | --- | --- | --- | --- |
| 4.1 | ~~Export / import of the history~~ — **shipped** | High | M | ✅ | |
| 4.2 | Local training reminders, no Firebase | High | M | **P1** | |
| 4.3 | Immersive session: exercise art **and** audio | High | M | **P1** | Zombies, Run! |
| 4.4 | **The variation ladder becomes visible** | High | S | **P1** | calisthenics review |
| 4.5 | The feeling feeds the prescription | Med-high | S | **P1** | Freeletics |
| 4.6 | Boss battle refonte | High | M–L | **P1** | |
| 4.7 | FR review of the exercise content | Med-high | S | **P1** | |
| 4.8 | Stats refonte | Med-high | M | **P1** | |
| 4.9 | Animated exercise demonstrations | High | L | P2 | Madbarz |
| 4.10 | A skill as an oath — "my first pull-up" | High | M | P2 | calisthenics review |
| 4.11 | Widget refonte | Medium | M | P2 | |
| 4.12 | Health Connect, read and write — *incl. Withings & Garmin* | Med-high | M | P2 | Spix |
| 4.13 | Building tiers, and tiers per building | Medium | M | P2 | |
| 4.14 | Exercise art review | Medium | M | P2 | |
| 4.15 | Villagers arrive from the journal (collection) | Medium | M | P2 | Pokémon Sleep |
| 4.16 | Swapping one exercise inside a quest | Med-high | S–M | P2 | Madbarz |
| 4.17 | Micro-animations, incl. resource gain | Low | S each | P3 | |
| 4.18 | Multi-device sync | Medium | XL | P3 | |
| 4.19 | GPS / outdoor quests | Low | L | P3 | |
| 4.20 | `fallow` in the toolchain | Dev-only | S | P3 | |

Desktop is a distribution question, not a feature — it lives in §1.

### 4.1 Export / import — shipped

The lazy version was indeed the whole feature, and the estimate above held: the database is one
SQLite file, so `VACUUM INTO` writes a snapshot, the share sheet moves it, and `ATTACH` validates
it on the way back in — the migration chain is the format's version, exactly as predicted. Two
dependencies rather than the one guessed here (`expo-file-system` turned out to carry the file
picker too, so `expo-document-picker` was installed and removed).

Four things this page did not anticipate, all worth remembering:

- **A zero-byte file is a valid SQLite database.** It attaches, and `integrity_check` returns
  "ok". Identity had to move to `PRAGMA application_id`, which also settled the `SCHEMA_VERSION`
  question that "no format to version" had quietly left open.
- **`ATTACH` creates the file it cannot find**, so a staged copy that vanished is indistinguishable
  from one that was empty — both attach as a database SQLite invented on the spot. `page_count`
  catches both, read after `integrity_check` so that 0 can only mean "empty".
- **The migration chain says a migration *ran*, not that it *worked*.** A half-applied migration
  leaves the bookkeeping row without the change, so a backup can claim this build's history and
  still be missing a column. When the newest migration matches ours the tables are compared
  against the live database (`schemaMismatch`); when it is older they are exempt, because the
  runner is about to catch them up — that exemption is what the format-version choice buys.
- **`instanceof Error` is not a safe way to read an error.** Drizzle wraps the driver error and
  puts the only useful text on `cause`, and the classifier reached it through `instanceof` — which
  is false whenever the object was built in another realm. Four rejection tests were green locally
  and red on CI, on the same driver, the same SQLite and the same Node modules, because jest gives
  the test realm its own `Error`. Duck-type the shape and walk the `cause` chain; match the driver
  code (`SQLITE_NOTADB`) as well as the prose, which has changed before.
- **`File.move(…, { overwrite: true })` is not atomic**, and the first implementation shipped
  believing it was. `expo-file-system` deletes the destination *before* attempting the rename, so
  overwriting the live database removes it first and leaves nothing if the rename fails. The swap
  renames the old file aside instead, which makes that rename the safety copy and the rollback
  source at once.
- **The share sheet alone is not a backup.** On a device with nothing installed that accepts a
  `.db`, it is a dead end, so Settings also offers a folder picker
  (`Directory.pickDirectoryAsync`) writing the same snapshot to storage. That picker reports "the
  user backed out" by *throwing*, which is the one thing the file layer has to translate.
- **Restore is offered in onboarding**, not just Settings — a new phone is the case that matters
  — and it cost nothing, because `hasFinishedOnboarding` lives inside the database being restored.

What is deliberately not solved: a process killed *between* the two renames leaves the database
absent and the data in a `.bak` no code reads. Closing that means reconciling at module load in
`db/client.ts`, before `openDatabaseSync` recreates an empty file — cheap, and worth doing only if
a real report ever needs it.

It remains the prerequisite for 4.18 *and* for desktop (§1): a file the user can move is 80% of
sync, without a server. What is still missing for those is reconciliation, not transport.

### 4.2 Local reminders — the highest-return feature on this page

`expo-notifications` is no longer in `package.json`. Re-adding it is the work, and the Firebase
question is smaller than it looks: **local scheduled notifications need no FCM on Android**. FCM
is only for push from a server, which the guardrails forbid anyway. The F-Droid concern is the
transitive Firebase artefacts in the AAR, which a script already stripped once — that script
comes back with the dependency, and `fdroid/fdroiddata-recipe.yml` must stay in sync.

The schedule data already exists (Goals + Schedule). This is plumbing an existing intent to an OS
API, and it is the only item here that acts on a user who has *stopped* opening the app.

**Update notifications ride along, per channel — and mostly cost documentation, not code.**

- **Play**: the store updates the app itself. Nothing to build.
- **Self-hosted F-Droid repo (§1)**: any F-Droid client already checks the index and notifies.
  That repo *is* the update-notification feature for sideloaders — one more reason §1's P2 item
  matters.
- **GitHub Releases**: [Obtainium](https://github.com/ImranR98/Obtainium) watches a repo's
  releases and notifies on its own schedule. One paragraph in the README and the release notes
  covers this channel for free.
- **An in-app check** (the app polling the GitHub API itself) is the only version that costs a
  guardrail: it is a network request, the first one in the app. If the free channels above prove
  insufficient, it must be **opt-in, off by default, and amend the guardrail wording on this
  page** before it ships — a version check leaks an IP and a version string, which is exactly the
  kind of "nothing" that still has to be written down in a privacy policy.

### 4.3 The session becomes a mission — art, and the narrative out loud

Ranked by how much of the workout it occupies: **the session screen is where a user spends 40
minutes**, so it outranks the boss battle, which is felt once at the end.

The art half was the original scope. The audio half comes from *Zombies, Run!*, whose entire
product is one idea worth stealing: **the story arrives during the effort, not around it.** Bati
has the fiction (`db/adventures-narrative.ts`), and it delivers it in
`components/adventures/NarrativeModal.tsx` — a modal, i.e. exactly the moment the hero is not
training. The audio plumbing already exists too (`hooks/useSound.ts`, `expo-audio`, a
`soundEnabled` setting that is already respected).

**The lazy version costs no assets:** `expo-speech` is on-device TTS, both locales for free, zero
bytes in the APK, and it reads the narrative that is already written. Recorded voice-over is the
upgrade, and it is a content project with a 64 MB APK (§3) already under watch — do the free
version first and find out whether narration during a set is welcome or annoying before paying
for it. Same for ambience between sets. What must not be copied is the chase mechanic: it exists
to make you run faster, and telling a hero to rush a push-up is an injury.

### 4.4 The ladder becomes visible — the best thing in the database, and nobody can see it

`drizzle/0022_progression_ladder.sql` wired the variation ladder as data, and it is genuinely
good content: Towel Door Row → Table Row → Inverted Row → Scapular Pull-Up → Chin-Up → **Pull-ups**
→ Iron Grip Pull-up is the canonical route to a first pull-up with no rung missing. Push runs Wall
Push-Up → Push-ups → {Dragon, Diamond, Titan's Dip, Archer's Pike → **Handstand Push-Up**}; core
runs Dead Bug → Hollow Body Hold → **L-Sit**.

That migration's own comment says what was meant to happen: *"the exercise screen simply shows
what comes next and how close you are."* **It doesn't.** `grep -rn prerequisite app components`
returns one village building and nothing else. The column has been carrying a progression system
since `0022` and the hero has never been told it exists — so Bati reads as a bag of workouts when
it is in fact a ladder, and the person who wants to get better at calisthenics never finds out
that Table Row leads somewhere.

One line on the exercise screen — what this movement leads to, what it came from, how close the
journal says you are. Effort S because the data, the personal records and the ordering all exist.
**This is the single highest ratio on the page.**

### 4.5 The feeling feeds the prescription — the last link of a loop that is otherwise built

*Freeletics* sells an adaptive coach and the mechanism under the marketing is mundane: the plan
reacts to what the athlete reports. Bati collects that report already — "Comment c'était ? ·
Trop facile · Parfait · Trop dur" ships on `components/session/VictoryView.tsx`, persists through
`updateSessionFeedback`, and `analyzeDifficultyProgression` turns the last five sessions into
increase / maintain / decrease.

The link that is missing is the last one. `suggestDifficultyFromSessions` — what
`app/(tabs)/adventures/[id].tsx` actually calls to pick a level — reads `sessions.userLevel`, the
difficulty the hero *chose*. Not the feeling. So answering "too easy" five times raises nothing
by itself; it renders a recommendation card in the Journal and waits for the hero to act on it.
Two functions in one file, one of them already computing the right answer.

**This is not the per-set RIR capture that §7 closed**, and it never becomes it: the question
already exists and asks once, after the effort. If it ever grows a per-set form, the closed
decision applies again.

### 4.6–4.8 The other refontes

**Boss battle** (4.6) is the payoff the whole RPG layer is promising — and the scan changed what
this refonte is. *Ring Fit Adventure* is the reference implementation of "an exercise is an
attack", and its headline mechanic is elemental weakness: monsters take more damage from one
family of movements. **Bati already has that**, and more of it — `db/bossFights.ts` computes
damage from actual reps (time results normalised first), with `weaknessMuscle` at 1.5×,
`resistanceMuscle` at 0.5×, crits, and an enrage state; `BossPanel.tsx:135` even displays the
traits and explains the multipliers.

So 4.6 is not a mechanics problem. **The maths is richer than the screen showing it**, which is a
much cheaper brief: make the hit land. Damage arriving per set rather than per session, the
weakness bonus visible at the moment it triggers, the health bar moving while the hero moves. The
one Ring Fit idea genuinely missing is *cooldowns forcing variety* — and the movement rotation in
`docs/content/workout-best-practices.md` §3 already covers that from the training side.

**Stats** (4.8) is the sport half of "sport app first": `react-native-gifted-charts` is already
installed, so the effort is design, not integration — and *Spix*'s weekly progress rings are the
cheap shape worth copying, because they answer "am I on track this week" without a chart.

**The FR review (4.7) is the cheapest P1 on the page.** 726 keys per locale
(`wc -l locales/*.json`) plus the exercise strings that live in the database and are corrected by
migration — `0029_fr_tutoiement` and `0030_fr_exercise_casing` are the precedent, and the pattern
means a correction pass ships as one migration. Wrong French on an exercise instruction is a
credibility bug in a fitness app, and it is a read-through, not a build.

### 4.9 Animated demonstrations — the one feature every rival has and Bati doesn't

*Madbarz* is video-backed on every movement; Freeletics too. Bati shows one still image. For a
bodyweight app that is not decoration: the hero is alone, with nobody to say the hips are sagging,
and a still cannot show a tempo the app itself prescribes.

Effort L because it is **232 assets** (`find assets/images -name "*.webp" | wc -l`), not code —
and the APK is already 64 MB (§3), so the format decision comes first: an animated webp of 4–6
frames per movement, or a 2-frame start/end toggle, both far cheaper than video. Sequence it with
4.14's art review; regenerating the same 232 files twice is the waste to avoid.

### 4.10 A skill as an oath — what turns a bag of workouts into a programme

The oath system (`db/oaths.ts`) already lets the hero swear one objective and derives its progress
from the journal. What it cannot express is the objective a calisthenics athlete actually has:
**"my first pull-up"**, or a first L-Sit, or a first handstand push-up. Those are the rungs of
4.4's ladder, which means the target, the route and the measurement all exist — only the framing
is missing.

Swear one, and the app has a reason to choose: serve the quests carrying that ladder's rungs,
show the gap in the hero's own numbers, and end it with the movement itself. It is the difference
between an app that logs what you did and one that took you somewhere, and it is *the* answer to
"does Bati take a calisthenics beginner under its wing" — today the honest answer is that it
serves good sessions and never names a destination.

Effort M, and it is a P2 only because 4.4 has to exist first: an oath pointing at a ladder the
screen does not show would be a promise with no map.

### 4.11–4.15 Depth, once the loop is right

**Health Connect** (4.12) is the one interop feature that costs no guardrail: it is an OS API, no
account, no network, no data leaving the device. It puts Bati's sessions where the user's other
apps can see them, which is the polite version of "export".

**It is also the entire wearable story, and that is why it moved up.** Withings and Garmin both
export into Health Connect on Android — Withings documents the per-category toggles, Garmin
Connect feeds it too. So "support my watch and my scale" resolves to *read from Health Connect*:
no OAuth, no vendor SDK, no cloud account, no per-brand integration to maintain, and the
guardrail survives intact. Every route that goes through a vendor's cloud API buys the same data
for a network dependency and a privacy policy rewrite. Read is the interesting half here — weight,
heart rate, an outdoor session logged by the watch — and write is the courtesy half.

Two caveats: below Android 14, Health Connect is a Play-distributed app, so the whole feature
degrades to absent and must be built to do so silently; and the F-Droid build has to survive the
dependency.

The **widget** (4.11) already ships two providers (`weekly`, `flame`, `src/widget.tsx`) and is the
app's only surface on a home screen — worth a refonte, worth it *after* the app it advertises got
its own. Tiers per building (4.13) and villagers (4.15) both deepen the village, which the north
star keeps honest: **a village that animates better does not make anyone train more.** Villagers
are cheap if they are derived from history like everything else in the village, and a sprite
project if they are not.

If villagers happen, *Pokémon Sleep* names the mechanic that would make them pull weight:
**unpredictability and collection**. Its whole loop is "sleep, then discover what your sleep
attracted", and completionists change real habits to attract rare creatures. The offline
translation is direct — a villager *arrives* because of what the journal shows, which villager is
a weighted roll, and the roster is a collection screen. Same derived-from-history rule as
everything in the village, plus the one thing the village lacks: a reason to look at it the
morning after training. That version is worth building; villagers as static scenery are not.

### 4.16 Swapping an exercise — most of "custom workout" already ships

The scan's obvious gap was "every rival lets you build a workout, Bati doesn't". Half wrong:
`QuestConfig` (`db/questConfig.ts`) already persists the level, the rounds, the rest and **the
per-exercise targets**, per hero, in `user_preferences` so an override survives a content update.
Volume is editable today. What is not editable is *which movement* — `app/(tabs)/quests/[id].tsx`
renders `quest.exercises` and offers no substitution.

That remaining delta is worth more than the rest of the feature and costs less. It is the reason
a session gets abandoned rather than adapted: a rings-only movement with no rings, a wrist that
hurts today. And the pieces are in place — `exercises.pattern` (migration `0020`) gives
"same job, different movement", `prerequisiteExerciseId` gives the easier and harder rungs, and
`QuestConfig` already carries a `Record` keyed by `quest_exercises` row id whose stale keys
`applyQuestConfig` is documented to ignore. A `swaps` field alongside `targets` and one picker
sheet is the whole thing.

**A full quest editor stays out.** Bati's quests carry a title, art, a narrative and an XP
balance, so a hero-authored one is either a bare list that looks broken next to the others, or a
level editor. Substitution gives the person who wants dips instead of push-ups what they actually
wanted.

### 4.17 Micro-animations

Two of the village's three missing animations shipped — `FlameFlicker`
(`components/village/VillageScene.tsx:184`) and `GrowthPulse` (`:232`). The **resource-gain
animation** is what is left, and it stays low by design.

### 4.18 Multi-device sync — P3, and a guardrail question first

Sync needs either a server (breaks "no network requests", breaks the Data Safety form, needs a
privacy policy rewrite and an infrastructure bill) or a user-supplied cloud file via Android's
Storage Access Framework (does not break anything, and is 4.1 plus a conflict rule). Only the
second is compatible with the app as it is documented today. Do 4.1, watch whether anyone
actually asks, and treat "last write wins on a file the user chose" as the ceiling.

### 4.19–4.20 The rest

GPS (4.19) means a runtime location permission and a Data Safety answer that stops being "no",
for outdoor quests nobody has asked for — the cost is not the code. `fallow`
(<https://github.com/fallow-rs/fallow>, 4.20) is already leaving caches in `.fallow/`; the open
question is whether it replaces `npm run knip` in CI or merely runs beside it, and a second dead
code gate that nothing gates on is worth less than the one in §3 being made to fail.

### Scanned and refused

The comparison that produced 4.3, 4.5, 4.9, 4.12 and 4.16 also produced a shorter list of things
these apps do that Bati should not — and two it already does, which is the more useful half of a
scan. Written down so this does not have to happen twice.

**Already shipped, mistaken for a gap on the first pass.** The "tell me your time and your
equipment, get a session" flow every rival leads with: `app/(tabs)/quests/index.tsx` filters on
duration buckets *and* equipment chips, over quests that already print an estimate from
`estimateQuestTemplateSeconds`. And per-quest customisation: `db/questConfig.ts` persists the
level, the rounds, the rest and the per-exercise targets. What was genuinely missing in both
cases was one narrow thing — swapping a movement — which is 4.16. **Generating** a session from
scratch stays refused: Bati's quests carry art, a narrative and an XP balance, so an assembled
one arrives naked, and 27 authored quests behind two filters answer the same need.

Freeletics' adaptive coach went the same way: "ask the athlete how it went" is on the victory
screen already, in both locales, feeding `analyzeDifficultyProgression`. Only the last hop was
missing (4.5).

**Three of the first four candidates from this scan turned out to be already built.** That is the
finding, not an embarrassment: this app's problem is not a thin feature set, it is that
`prerequisiteExerciseId`, `weaknessMuscle` and `feedback` all do real work no screen advertises.
Before adding anything, grep for it — and prefer surfacing what exists (4.4, 4.6) to building what
doesn't.

| Seen in | Refused because |
| --- | --- |
| Meals & calorie tracking (Spix, Freeletics) | §6 already says it: the mechanic most likely to harm users with disordered-eating tendencies. No calorie surface is the correct default. |
| Follows, global ranking, workout points (Madbarz) | §7, and every variant needs a server plus an account. |
| Weather-adapted sessions (Freeletics) | Needs a network request. The guardrail is worth more than the feature. |
| Camera rep counting via pose detection (Spix) | A camera permission, a model in the APK already at 64 MB, and a Data Safety answer that stops being "no" — for a count the hero can do out loud. Accelerometer-only counting keeps the permission story but not the accuracy; parked, not refused. |
| Before/after transformation photos (Freeletics) | Body-image mechanic, and it makes the app a store of the most personal file a user owns. |
| Losing HP for a missed day (Habitica) | Its strongest retention mechanic and the one most hostile to this product. Bati *prescribes* rest (`db/restSuggestions.ts` nudges one after five days) and its streak deliberately survives it. Punishing a rest day would have the app fight its own coaching. |
| Party quests where a slacker damages the team (Habitica) | Needs a server and an account, §7 — and the mechanic is peer pressure, which is the failure mode of fitness apps, not a feature. |
| Territory capture, fog of war, leaderboards (Motera, Run An Empire) | GPS plus a map plus a server plus other players. Four guardrails for a mechanic that only works outdoors, for runners. |
| Weekly leagues with demotion (Duolingo, Strava) | Duolingo's own numbers are real — leagues drive its retention — and every part is wrong here: a server, matchmaking, and ranking heroes against strangers when the thesis is competing with last month. The boss's HP bar is the league. |
| Streak wager / paid streak freeze (Duolingo) | Monetised loss aversion. Bati's streak already forgives rest by design (`db/streaks.ts`); selling protection against a punishment the app chose not to inflict would be incoherent. |
| Social feed, kudos, communal validation (Strava, Hevy) | The engine of both apps, and it is a server, accounts, and moderation. §5 holds the one async, file-based variant worth examining. |

**Confirmations, which are also findings.** *Zombies, Run!* collects supplies on a run and spends
them upgrading a base, which is Bati's village with the serial numbers filed off — the design
holds up against the best-known instance of it. Streaks and badges (Spix) are the flame and
`db/achievements.ts`. Multi-week goal programmes (Madbarz's 2–12 week plans, its Muscle Up
programme) are adventures — the gap there is content, not mechanics, which is the same conclusion
§5 reached from a different direction. *Ring Fit Adventure*'s elemental weaknesses are
`weaknessMuscle`/`resistanceMuscle`, shipped and displayed (see 4.6). And *The Walk* advances its
story on daily consistency rather than performance, which is what adventures already do.

The one place Bati is ahead of the reference: **streak repair.** Duolingo sells a "freeze" and
Habitica kills your character; `db/streaks.ts` keeps the flame lit on what the hero trained
*recently*, so a rest day costs nothing and needs no consumable to protect it. There is no work
here — it is written down because it looks like a gap in every comparison table and is not one.

And the doctrine check: Strava's own headline engagement metric is **two minutes in the app per
hour of real activity**, and Strong wins its category on *fastest possible logging* — the
category leaders on both sides converge on exactly the friction rule this roadmap already
enforces (§7 killed per-set RIR over twelve taps). Every candidate feature inherits that test:
seconds of interaction buying minutes of training, never the reverse.

## 5. Open questions — decided once, reopened by new evidence

### Gating a skill branch (reopened 2026-07-30)

This was closed as "a skill-tree screen": the variation ladder is data
(`exercises.prerequisiteExerciseId`) and a hint on the exercise screen, and **gating content
behind it would show a beginner 3 quests out of 27**. That argument still holds — for the
catalogue.

[§8.6.2](../raw/bodyweight-app-research.md) of the research dossier introduces a case the
decision never considered: a hard gate on **one advanced skill branch**, not on the catalogue.
The example is concrete — the one-arm handstand branch stays locked until a freestanding
handstand of 45–60 s is logged — and the justification is safety as much as pedagogy. §8.3 is
blunt about why: straight-arm skills load tendons and ligaments far beyond what the muscles
feel, connective tissue adapts more slowly than muscle, and elbow/wrist overuse is *the*
classic failure mode of people who got strong enough for the skill before their joints were
ready. A gate there costs a beginner nothing, because a beginner was never going to see that
branch.

**Blocked on content, not on the decision.** The catalogue has no freestanding handstand, no
planche, no front lever, no tuck lever — the entire "straight-arm strength" family of §8.1 is
absent. Until that exists there is nothing to gate. Decide the principle when the content is
proposed, not before.

### Does Bati get a network? (opened 2026-08-14)

Four multiplayer ideas were raised together — **coaching, live sessions, battles, guilds** — and
they look like four features. They are one question, asked four times, and answering it once is
the only way this stays cheap. §7 closed "social / competitive / live multiplayer" for the MVP;
this is not a reversal, it is the file where the reversal would have to be argued.

**The question is not "which of the four".** It is: *does this app acquire a server, accounts and
the moderation duty that comes with them?* Today the answer is no, and that "no" is load-bearing:
it is the Data Safety form, the privacy policy, the F-Droid pitch, the absence of a bill, and the
reason the app has no login screen. Any of the four features flips it. None of them flips it
halfway.

**Ranked by what they cost, cheapest first.**

| Idea | The version that needs no server | The version that does |
| --- | --- | --- |
| **Coaching** | 4.1 export, plus a readable summary. A coach who can open your history can write you a plan. Async, no accounts, and it works with a human coach who already exists in the hero's life. | A marketplace, messaging, identity, moderation, payments. A different company. |
| **Guild** | A shared weekly quota that several people swear separately and compare by exchanging files. A group oath. | Live membership, a roster, invites, someone to kick a member. |
| **Battle** | Asynchronous: two heroes drain the same boss's HP, damage exchanged as a file, resolved when they next meet. Silly, offline, and true to `db/bossFights.ts` where damage already *is* the work done. | Ranked PvP, which is a leaderboard, which §7 and the Habitica row already refused: it punishes whoever is weaker, in an app whose whole thesis is that the hero competes with last month. |
| **Live session** | Two phones on the same wifi, discovering each other on the LAN — no cloud, no account, and it fits the one scene this feature is actually for: two people training in the same room. | Realtime presence over the internet, which is a server that must be *up*, not merely reachable. |

**What this suggests, without deciding it.** The left column is one mechanism — 4.1 — wearing four
hats, and every hat is worth trying before the right column is priced. Coaching is the strongest
of the four for this product — *Caliber* built its entire paid tier on exactly this shape, a human
coach reading the athlete's logs asynchronously, which is evidence the left column's version is a
product and not a compromise — and it is the only one of the four that makes a hero *train
better* rather than train watched; guild is the strongest for retention; live session is the most fun and the
most expensive (an RN LAN discovery module is a native project); ranked battle is the one to
refuse outright even if the network arrives.

**Reopen with evidence, not enthusiasm.** The thing that would settle it is a user asking twice
for the same one. Until then this section is a parking space with a floor plan.

## 6. Parking lot (post-MVP)

Speculative. Nothing here has an owner or acceptance criteria, and nothing moves out of this
section until it does.

- **Multiplayer, in any live form** — friend villages (read-only visits), async cooperative
  adventures, lightweight encouragement loops. Every variant needs a server and an account
  system, which is why §7 closed live multiplayer. **The four candidates raised on 2026-08-14 —
  coaching, guilds, battles, live sessions — are being examined in §5**, where the question is
  asked once instead of four times.
- **A watch app** — session controls on the wrist, live heart rate during a set. This is what
  remains of "wearables" once §4.12 takes the data half: reading what a Withings scale or a
  Garmin watch already recorded goes through Health Connect and needs no vendor anything.
  A Wear OS or Connect IQ app is a second product, in a second language, with its own store —
  parked until the phone app is finished.
  [open-wearables](https://github.com/the-momentum/open-wearables) was the candidate here; it is a
  server-side health-data platform, so it answers a question this app does not ask.
- **Automatic rep counting from the accelerometer** — Spix does it for push-ups, squats, crunches
  and jumping jacks without a camera, which is the only version compatible with the guardrails.
  Parked rather than refused: it removes a real friction (counting out loud mid-set) but it is a
  signal-processing project with a per-movement calibration, and a miscount is worse than no
  count. See the camera row in §4's refusals for the variant that is refused outright.
- **Progression depth** — cosmetic customisation, seasonal events, extended RPG meta systems.
- **Coaching intelligence** — adaptive planning, recovery/load guidance, personalisation from
  training history.
- **Advanced skill content** — the straight-arm family (planche, front lever, back lever), the
  muscle-up, and freestanding handstand work: exercises, art, hold-time ladders, prehab.
  Prerequisite for the gating question in §5, and the reason it cannot be answered yet. It is also
  the ceiling on §4.10: the ladders that exist today end at a pull-up, an L-Sit and a handstand
  push-up, which is a complete beginner-to-intermediate route and stops exactly where a
  calisthenics athlete starts naming skills.
- **ROM benchmarks** — wall shoulder flexion, squat depth, pancake width tracked like reps and
  hold times ([§11.4](../raw/bodyweight-app-research.md)). Depends on the skill content above.
- **Fat-loss / muscle-gain goal variants** — [§9](../raw/bodyweight-app-research.md) and §10
  need no separate training engine (same volume/frequency/RIR rules), so the delta is framing
  and nutrition guidance. §9.4 is a warning as much as a feature request: **do not build
  calorie counting or numeric weight goals casually** — they are the mechanics most likely to
  harm users with disordered-eating tendencies. Bati currently has no calorie surface at all,
  which is the correct default and should not be given up lightly.

**Promotion criteria** — an idea leaves this list only when the user problem is concrete and
validated, the scope is small enough to ship incrementally, the core workout loop carries no
regression risk, and the acceptance criteria are testable.

## 7. Decided — do not re-open

Each of these was proposed, considered, and closed. They are here so they stop coming back.

- **Economy loops, shops, manual building upgrades, a Treasury surface.** Rewards are XP plus a
  derived village reaction. No resources, no Gold. The Treasury screen is gone from the code —
  `grep -rn treasur app components src` is empty.
- **Per-set RIR capture.** The framing shipped ("stop with 1-2 reps left, not at failure"); the
  form did not. Twelve extra interactions a session, in an app that spent a whole roadmap
  removing friction. One optional field on an exercise's last set is the door if the data is
  ever genuinely wanted. **The session feeling on the victory screen is not that door** — it asks
  once, after the effort, and it shipped. If it ever grows a per-set form, this decision applies
  again. See §4.5 for the half of that loop still missing.
- **Finer muscle taxonomy.** `muscleToResource` maps muscles 1:1 onto the village's six
  resources, so every muscle added costs a resource, a building, a sprite and a colour. The rules
  that wanted finer muscles actually wanted **movement patterns** — `exercises.pattern`, added in
  `0020`, orthogonal to muscles and touching nothing else.
- **Complex planning/coaching flows in the top navigation**, and social / competitive / live
  multiplayer mechanics. Out of MVP scope entirely. Coaching, guilds, battles and live sessions
  were raised again on 2026-08-14 and are being examined in §5 — as one question about whether
  this app gets a network, not as four features. Ranked PvP stays closed either way.

## Related

- [README.md](README.md) — how to use this folder, now that it holds one page
- [../design/ui-checklist.md](../design/ui-checklist.md) — the UI merge gate
- [../content/missing-image.md](../content/missing-image.md) — art inventory and the generation pipeline
- [../product/vision.md](../product/vision.md) — the product this roadmap serves
