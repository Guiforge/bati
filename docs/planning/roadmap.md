---
title: Roadmap
type: planning
status: active
updated: 2026-08-24
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
- **No network requests**, and this one is enforced rather than promised: `app.json` lists
  `android.permission.INTERNET` and `ACCESS_NETWORK_STATE` under `blockedPermissions`, so the
  release manifest ships without them and a stray `fetch` fails at runtime rather than at review.
  The Data Safety form says "no data collected, no data shared", and every feature below is scoped
  so that stays true. Lifting the guardrail therefore costs a manifest change as well as a
  paragraph on this page — which is the correct price, and why every network item in §4 and §5 is
  ranked where it is.
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

**Play is live on the internal track** (v1.12.0, versionCode 11200 — `grep '"version"'
package.json` and `grep versionCode app.json`; this line sat at 1.7.4/10704 for five releases),
uploaded by the `play` job of `release.yml` behind the `play-internal` GitHub Environment. The
listing, both locales, the feature graphic, the privacy policy and the signing story are all done.
What is left is a calendar, not a keyboard — the 14-day closed test is running.

- **P1 — Promotion out of `internal` is manual, and nothing in the repo does it.**
  `release.yml:230` pins `fastlane supply --track internal`; no closed, open or production track
  appears anywhere in the workflow. Reaching testers beyond the internal list means opening the
  Play Console and promoting by hand. Automating it is one more `supply` call with a `--track` and
  a rollout fraction — cheap, and deliberately not done: a gate nobody can forget to open is a
  gate that opens on a bad tag.

- **P1 — Screenshots must be regenerated after §2.** They must show the UI that ships, not the
  one before the device pass. Play caps them at **8 per device type** and rejects the ninth with
  a generic `PERMISSION_DENIED`; see `fastlane/metadata/README.md`.
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

- **P1 — The suite tests `db/` and leaves the screens bare.** 64 test files
  (`ls __tests__/*.test.*`) against 137 sources (`find app components src db hooks -name "*.ts*"`)
  reads healthy; the distribution does not. **9** of them render anything
  (`ls __tests__/*.tsx`), against 29 files under `app/` and 57 components
  (`find components src -name "*.tsx"`). So the pure functions — streaks, boss
  damage, muscle balance, oaths — are covered several times over, and the screens the hero actually
  touches are covered by a global percentage that AGENTS.md already warns cannot be trusted: dead
  code counts as covered, and a flow test that checks the next screen appeared passes while the
  data underneath is wrong. The deliverable is the shape `audit.md` used and then earned its own
  deletion: a dated page listing where a regression would ship green today, the missing tests
  written against *state*, and the page removed once its findings are gone.
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

A fifth pass, on 2026-08-16, read two apps that share Bati's constraints instead of competing with
its genre: [Streak](https://github.com/InlitX/streak) (habit tracker) and
[GymMane](https://github.com/InlitX/GymMane) (gym logger), both Flutter, both GPLv3 on F-Droid,
both offline-first with no account. They arrived at the same guardrails from a different starting
point, which is what makes their *refusals* worth as much as their features — and one of their
loudest selling points, "no INTERNET permission", turned out to be something Bati already ships.

What the scans refused, and what they found already shipped, are at the end of this section. Both
cost as much thought as the takes, and by the third pass they outnumbered the features.

| # | Item | Impact | Effort | Prio | From |
| --- | --- | --- | --- | --- | --- |
| 4.1 | ~~Export / import of the history~~ — **shipped** | High | M | ✅ | |
| 4.2 | Local training reminders, no Firebase | High | M | **P1** | |
| 4.21 | ~~Backups that write themselves to a chosen folder~~ — **shipped** | High | S | ✅ | Streak |
| 4.3 | Immersive session: exercise art **and** audio | High | M | **P1** | Zombies, Run! |
| 4.4 | ~~The variation ladder becomes visible~~ — **shipped as *paths*** | High | S | ✅ | calisthenics review |
| 4.22 | ~~An exercise catalogue — the screen 4.4 needs~~ — **shipped** | High | S–M | ✅ | GymMane |
| 4.5 | ~~The feeling feeds the prescription~~ — **shipped** | Med-high | S | ✅ | Freeletics |
| 4.6 | Boss battle refonte | High | M–L | **P1** | |
| 4.7 | FR review of the exercise content | Med-high | S | **P1** | |
| 4.8 | Stats refonte | Med-high | M | **P1** | |
| 4.9 | Animated exercise demonstrations | High | L | P2 | Madbarz |
| 4.10 | A skill as an oath — "my first pull-up" | High | M | P2 | calisthenics review |
| 4.11 | Widget refonte | Medium | M | P2 | |
| 4.12 | Health Connect, read and write — *incl. Withings & Garmin* | Med-high | M | P2 | Spix |
| 4.13 | Building tiers, and tiers per building | Medium | M | P2 | |
| 4.23 | Rename the village from Settings | Medium | S | P2 | |
| 4.14 | Exercise art review | Medium | M | P2 | |
| 4.24 | Translations open to contributors | Medium | S | P2 | Streak |
| 4.15 | Villagers arrive from the journal (collection) | Medium | M | P2 | Pokémon Sleep |
| 4.16 | Swapping one exercise inside a quest | Med-high | S–M | P2 | Madbarz |
| 4.17 | Micro-animations, incl. resource gain | Low | S each | P3 | |
| 4.25 | A result card that can be shared as an image | Low | S–M | P3 | Streak |
| 4.18 | Multi-device sync — reconciliation only | Medium | XL | P3 | |
| 4.19 | GPS / outdoor quests | Low | L | P3 | |
| 4.20 | `fallow` in the toolchain | Dev-only | S | P3 | |

Desktop is a distribution question, not a feature — it lives in §1.

The rows are sorted by rank, not by number: **the number is an identifier, the Prio column is the
rank.** 4.21–4.25 arrived after the first twenty and sit where they belong, because renumbering
twenty rows would break every reference to them in §1, §5 and §6 and buy nothing.

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

**No "close the app" button on the restart screen, and the reason is measured.** React Native's
`BackHandler.exitApp()` is a `finish()` on the activity, not a process kill — verified on a
Fairphone 6, the pid is unchanged after the activity ends. Reopening would therefore resume the
same JS context with the SQLite handle already closed, which is worse than a force-quit. A button
that works needs either `expo-updates` (`reloadAsync()` rebuilds the module graph in-process, and
would remove the restart entirely) or a native `System.exit(0)`. Neither is worth a dependency or
a native module for an operation performed twice in an app's life, so the screen keeps its
instruction. Revisit if a user ever reports being stuck on it.

What is deliberately not solved: a process killed *between* the two renames leaves the database
absent and the data in a `.bak` no code reads. Closing that means reconciling at module load in
`db/client.ts`, before `openDatabaseSync` recreates an empty file — cheap, and worth doing only if
a real report ever needs it.

It remains the prerequisite for 4.18 *and* for desktop (§1): a file the user can move is 80% of
sync, without a server. 4.21 takes the last of the transport — the same snapshot, written without
being asked — so what is still missing for those two is reconciliation, and only that.

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

### 4.21 Backups that write themselves — and the whole answer to "sync with Drive / Dropbox / …"

Shipped, and the estimate held: no new dependency, no manifest change, no migration. Four things
worth keeping, because no commit message says them.

**The blocking unknown had already been answered upstream.** This page asked whether `Directory`
takes a *persistable* URI permission, and planned a `StorageAccessFramework` fallback in case it
does not. It does, and it takes it for us: expo-file-system 57's `FilePickerContract.kt:48` calls
`contentResolver.takePersistableUriPermission()` on the result of `ACTION_OPEN_DOCUMENT_TREE`. The
whole fallback branch was deleted before it was written. Reading the dependency's own source cost
ten minutes and removed a day.

**The trigger forced an import edge the wrong way round.** `ensureMigrations()` is the one writer
both entry points share, so the snapshot belongs inside it — but `db/backup.ts` imported
`sqlString` *from* `db/migrate.ts`, which made `migrate → backup` a cycle. `sqlString` now lives in
`db/sql.ts`, a module that imports nothing and therefore cannot take part in a cycle at all. The
same predicate answers "has this migration run yet?" for the runner and for the backup gate
(`isPending`), so the two cannot drift into backing up on every launch, or on none.

**A failed unattended write turns the feature off.** `reportError` goes to a dev console this app
does not ship, so it is not a report a hero can see; the Settings row falling back to "Off" is.
The cost is that a transient failure — a full card, a folder unmounted — buys a trip to Settings.
That is a `ponytail:` note in `src/autoBackup.ts` with the retry counter as its upgrade path.

**A Storage Access Framework tree does not hand back filenames.** Its children arrive as
*document* URIs whose entire document id is one percent-encoded segment —
`…/document/primary%3ADocuments%2Fbati-export-v3-2026-08-15.db`. `File.name` is `Paths.basename`,
which only recovers a filename from that when `new URL()` parses the `content://` scheme, and
React Native's `URL` is a partial polyfill that need not. Anything matching on `name` therefore
matches nothing on a device while staying green against a fake filesystem built from plain paths.
Match on the decoded `uri`. This is the "a mock counts as a hit" trap in AGENTS.md wearing a new
hat, and the test that caught it is the only one in the file built from the shape a device
actually produces.

**The privacy policy was load-bearing and said the wrong thing.** `docs/legal/privacy.md` promised
"nothing is exported automatically and nothing is scheduled" in both languages — true until this
shipped. It is a published legal document behind a store listing, so the feature is not done until
that sentence is. Worth a grep before any feature that writes a file, opens a socket, or reads a
sensor.

**It is also the complete answer to "sync via Google Drive, Dropbox, GitHub or WebDAV".** Drive,
Dropbox, Nextcloud, OneDrive and Syncthing all publish an Android `DocumentsProvider`, so they
appear *inside the folder picker the app already opens*. One SAF integration covers every one of
them: no OAuth, no SDK per vendor, no credentials at rest, no network request, no guardrail spent —
and the app never learns which provider was chosen, which is the point. This is Obsidian's model,
and it is why the backends that do not work this way are refused rather than ranked (see 4.18).

### 4.3 The session becomes a mission — art, and the narrative out loud

Ranked by how much of the workout it occupies: **the session screen is where a user spends 40
minutes**, so it outranks the boss battle, which is felt once at the end.

The art half was the original scope. The audio half comes from *Zombies, Run!*, whose entire
product is one idea worth stealing: **the story arrives during the effort, not around it.** Bati
has the fiction (`db/adventures-narrative.ts`), and it delivers it in
`components/adventures/NarrativeModal.tsx` — a modal, i.e. exactly the moment the hero is not
training. The audio plumbing now exists in the small: `expo-audio` is back for the session
countdown beeps (`src/sounds.ts`), with its config plugin stripped of everything that got the
first attempt thrown out — no microphone, no foreground media service, no androidx.media3. It
plays a bundled clip on demand and nothing more; narration is still a project, not a switch.
The first attempt was removed in 1.8.1 because the sound map was entirely `null` and the switch
drove a foreground media service for silence (F-Droid MR !45076, finding 5).

**The lazy version costs no assets:** `expo-speech` is on-device TTS, both locales for free, zero
bytes in the APK, and it reads the narrative that is already written. Recorded voice-over is the
upgrade, and it is a content project with a 64 MB APK (§3) already under watch — do the free
version first and find out whether narration during a set is welcome or annoying before paying
for it. Same for ambience between sets. What must not be copied is the chase mechanic: it exists
to make you run faster, and telling a hero to rush a push-up is an injury.

### 4.4 The ladder becomes visible — shipped, as *paths*

`drizzle/0022_progression_ladder.sql` wired the variation ladder as data, and it is genuinely
good content: Towel Door Row → Table Row → Inverted Row → Scapular Pull-Up → Chin-Up → **Pull-ups**
is the canonical route to a first pull-up with no rung missing. Push runs Wall Push-Up → Push-ups
→ {Diamond, Dip, Pike Push-Up → **Handstand Push-Up**}; core runs Dead Bug → Hollow Body Hold →
**L-Sit**. (This entry used to name *Iron Grip Pull-up* and *Dragon Push-up*, which `0023` deleted.)

**Shipped**, and the diagnosis moved twice on the way. The full account is
[`docs/gameplay/paths.md`](../gameplay/paths.md); what the roadmap needs to remember:

**The defect was not visibility.** The ladder was already on four surfaces — the exercise screen,
the oath card, the journal nudge, the victory screen. What it lacked was a **name**. Every other
system here carries one (a quest title, *hameau → capitale éternelle*, *Spark → Eternal*); the
ladder alone spoke in coordinates, and "rung 3 of 6" is not something a hero can want or tell
anyone about. It is now a **path**, named after the movement it ends on — twelve of them, in
`db/paths.ts`, keyed by summit. That is content, not machinery: no new system, which matters
because §5 of the dossier warns that *more* gamification stops helping past a point.

**Three defects made it worse than silent, and they went in first.** The threshold counted *rows*,
and a three-round quest writes three in one evening — so a single workout handed over the next
variation, which is the "program hopping before progressing" the research calls beginner mistake
number one. There was no recency window at all, so three clean sets from last spring still read as
owned. And `ProgressionCard` tested the ladder branch ahead of the difficulty nudge, so a hero
self-reporting "too hard" five sessions running was answered with "here is your next rung" —
**the app pushed up on someone asking to come down.** Amplifying that signal on Home before fixing
it would have been worse than leaving it quiet.

**What the twelve summits showed was nothing.** The path strip was nested inside the next-rung
card, which only renders when a harder variation exists — so L-Sit, Pull-ups, Handstand Push-Up
and nine others, the movements a hero opens out of *ambition*, displayed no ladder at all.

**"What it came from" ships as a tap, not a row.** The rung named is the one the journal says the
hero stands on, which is a better answer than the direct prerequisite: on the Pull-ups page that
would be Chin-Up, which someone who cannot do a pull-up cannot do either.

**Home leads with the climb.** `exercise_pr` measures a rep record, so a beginner swearing
"Pull-ups × 15" read **0/15 for months** on the most visible card in the app while the climb
underneath moved every three sessions. The strip replaces the gold bar — one card, one gauge — and
hands back to the counter the day the first rep lands.

**Climbing a whole path reaches the village trophy shelf**, beside the defeated bosses, for no XP
and no points: §5 warns that extrinsic rewards erode the intrinsic kind unless the reward *is* the
progress. It uses a monotonic measure — *did this ever happen* — so the current rung can fall
while the trophy cannot, which is the rule the research demands about never punishing an absence.

**What was refused.** A "Your paths" card on the Journal: Home carries the one being climbed and
the shelf keeps the ones finished, so a passive report adds a fourth telling of the same thing and
walks straight back into the wall of unlit movements this roadmap has now declined twice.

**What the re-audit turned up and this work did *not* fix** — worth their own entries: rep targets
take no history at all (template midpoint × {0.75, 1, 1.25}); hold targets use an all-time max
clamped back inside the template's window, so the 60–75 % rule stops applying to exactly the
strong heroes it is for; there is no per-movement frequency notion anywhere, so nothing notices a
movement going untrained; and regression-on-form-breakdown has no input channel, since the only
self-report is the three-value session feedback. Above all, §5 is blunt that the first predictor
of D30 retention is **a completed first action on day one**, and a day-one hero here still lands
on an undifferentiated quest gallery — `trainingLevel` from onboarding has exactly one effect,
hiding `advanced` quests from a `beginner`. That is the next large piece, not another ladder
surface.

### 4.22 An exercise catalogue — 4.4 has nowhere to land

4.4 says "one line on the exercise screen". There is an exercise screen — `app/exercises/[id].tsx`
— and **nothing in front of it**: no `app/exercises/index.tsx`, so the only route to a movement is
through a quest that happens to contain it. A hero who wants to know what Bati knows about rows
cannot ask.

*GymMane* answers this with a tappable body map over 360 exercises. The map is the expensive half
and it goes to §6; the list is the cheap half and it is what 4.4 and 4.10 both need. Every field
the screen would filter on already exists: `exercises.pattern` (`0020`), `muscleToResource`,
`prerequisiteExerciseId` (`0022`), and the personal records that say how close a rung is. It is one
route, one query and the filter chips that `app/(tabs)/quests/index.tsx` already demonstrates.

Ranked immediately after 4.4 because the two are one piece of work seen twice: the ladder is
invisible partly because the screen that would show it is only reachable by accident.

**Shipped** as `app/exercises/index.tsx`, reached from the Dumbbell icon in the Quests header —
no sixth tab. Search on the localized name, and a filter rail grouped by ladder / pattern /
muscle / equipment, lifted verbatim out of `app/(tabs)/quests/index.tsx` into
`components/common/FilterRail.tsx` so both galleries hoist active chips the same way. Rows on a
ladder carry a "leads to X" caption, which is 4.4 seen from the list: `prerequisiteExerciseId`
now rides on `listExercises()`, so the whole ladder is one pass over a promise-cached list and
the screen costs zero queries on a warm cache. The row itself is
`components/exercises/ExerciseRow.tsx`, shared with the quest editor's picker sheet, and the
facets are `constants/exerciseFilters.ts` — a pure function both screens filter through, which
is what finally killed the picker's private `language === "fr"` ternary.

What was refused: a difficulty badge and a per-row progress bar. The row's job is *find the
movement*; where the hero stands on it belongs to the detail screen, and a wall of unlit bars is
exactly what the dedicated skill-tree screen was dropped for.

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
cheap shape worth copying, because they answer "am I on track this week" without a chart. The
second shape, and the only thing both offline apps of the fifth scan agree on, is the **GitHub-style
year grid**: Streak and GymMane each lead with one, and Bati already renders the month
(`components/journal/MonthlyCalendarCard.tsx`). Widening that component to a year is the cheapest
thing in this refonte and the one that makes a rest day look like part of a pattern rather than a
hole.

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

### 4.23 Rename the village — the shortest item on this page

`grep -rn setVillageName app components src hooks` returns exactly one caller:
`app/onboarding/village-setup.tsx:45`. The name is typed in the first two minutes of the app's life
and is then permanent for the life of the install, while the avatar chosen on the same screen *is*
editable in Settings — the asymmetry is an oversight, not a decision.

Everything needed exists and is reused as-is: the store action, the persistence
(`db/preferences.ts:55-59`, which already reads *and* writes), the length bounds, and the i18n keys
under `onboarding.village_name_*`. What is missing is a field in `app/settings.tsx` next to the
avatar picker. It buys no training, which is why it is P2 and not higher; it costs an afternoon,
which is why it should not sit here for a year.

### 4.24 Translations — the door is closed and the lock is already fitted

Two locales ship. A third costs one file, and the gate for it already exists:
`__tests__/i18n-keys.test.ts` fails on a missing key and on an empty string, in both directions.
What is missing is a page saying so — where the strings live, that `npm test` is the review, and the
one thing a translator cannot discover on their own:

**Exercise labels are not in `locales/`.** They sit in the database and are corrected by migration
(`0029_fr_tutoiement`, `0030_fr_exercise_casing` are the precedent), so a new locale ships with a
fully translated interface wrapped around English exercise content until a migration follows. That
is a real ceiling on what a contributor can deliver alone, and pretending otherwise wastes their
evening — 4.7's FR pass runs into the same wall from the other side.

**No translation platform yet.** [Weblate](https://weblate.org/) is the named upgrade — hosted free
for libre projects, which is how Streak runs its ten languages — and its trigger is a second
contributor or a third locale. Standing up a translation service for two locales and one translator
is infrastructure looking for a user.

### 4.25 A shareable result card

`components/session/VictoryView.tsx:220` shares `Share.share({ message })` — text. Streak renders
the same information as an image card, which is the only acquisition mechanic available to an app
with no feed, no account and no server.

It stays P3 because the north star demotes it honestly: **a share card makes nobody train more.** It
also costs a dependency (`react-native-view-shot`, nothing installed captures a view today), which
is the difference between this and everything else in the P3 band.

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

### 4.18 Multi-device sync — what is left once 4.21 takes the transport

4.1 moved the file by hand and 4.21 moves it unattended, into a folder that may well be a cloud
provider's. What neither does is **reconcile**: two devices trained on in the same week produce two
snapshots, and the newer one silently wins. That — a conflict rule, not a transport — is all 4.18
has ever been, and it is XL because "merge two SQLite histories" is a real problem: sessions can
be unioned by id, but the village, the streak, the boss's remaining HP and the oath's progress are
all *derived*, so the honest merge is "union the history, recompute everything downstream".

Stays P3 until someone reports the divergence. The ceiling remains **last write wins on a file the
hero chose**, which is what desktop (§1) and 4.21 both already assume.

**The backends that are refused, and why they are refusals rather than low-priority rows** — every
one of them buys the same file 4.21 already writes, for a cost 4.21 does not pay:

| Asked for | What it actually costs |
| --- | --- |
| Google Drive, Dropbox, OneDrive, Nextcloud | Nothing to build. They publish an Android `DocumentsProvider` and appear inside 4.21's folder picker. A per-vendor SDK would buy an OAuth flow, a client secret in the APK, and a Firebase-shaped F-Droid problem, in exchange for a file the picker already hands over. |
| WebDAV, or the GitHub API as a store | The app's **first network request**, plus credentials at rest, plus `INTERNET` back in the manifest, plus a Data Safety form and a privacy policy that stop saying "no". A self-hosted Nextcloud reached through its Android client costs none of that — same server, through the picker. |
| Wifi / Bluetooth device-to-device, "like Joplin or Obsidian" | Worth naming precisely, because the comparison points the other way: Obsidian's default is a synced *folder*, and Syncthing — the LAN tool people actually mean — is a separate app that syncs the folder 4.21 writes to, for free. A discovery protocol inside Bati is a native RN module, the same bill §5 prices for "live session", to reimplement something already installed on the devices that want it. |

### 4.19–4.20 The rest

GPS (4.19) means a runtime location permission and a Data Safety answer that stops being "no",
for outdoor quests nobody has asked for — the cost is not the code. `fallow`
(<https://github.com/fallow-rs/fallow>, 4.20) is already leaving caches in `.fallow/`; the open
question is whether it replaces `npm run deadcode` in CI or merely runs beside it, and a second dead
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
missing, and 4.5 shipped it — the feeling now moves an adventure's level one rung.

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
| Importing from Hevy, Strong, FitNotes, Loop Habit, Habitica (GymMane, Streak) | Both apps import from their rivals cheaply because a rival's row *is* their row: a loaded set, or a ticked box. Bati's row is a session attached to a quest, and the XP, the boss damage, the village and the streak are all derived from it. An imported line arrives with no quest, so nothing downstream can read it — the importer's real job would be inventing the quest it came from. Import from *Bati* is 4.1 and works. |
| BMI, body-fat and macro calculators (GymMane) | The §6 body-image guardrail, unchanged, and §4's calorie row already argues it. 1RM and plate-loading are simply not bodyweight questions. |
| Icon packs, light and custom themes (Streak) | Dark-only is a guardrail, not an unset default — the whole art direction assumes it. |
| PIN / fingerprint app lock (Streak) | **Parked, not refused.** `expo-local-authentication` is cheap and the pattern is standard, but the app holds no secret and no identity: a training journal is not a vault, and a lock in front of it mostly costs the hero four seconds before every session. Reopen if someone asks — a habit tracker with day notes and photos has a better case for it than Bati does. |
| Hero-authored exercises (GymMane, 360+ built in, plus custom with photo and video) | **Shipped 2026-08**, after a user asked for it by name. The refusal read: *no art, no muscle mapping, no pattern and no XP weight, so it breaks the village, the boss and the estimate at once*. Three of the four were wrong against the code — XP is duration-only (`db/xp.ts`), the estimate reads a `secondsPerRep` with a `NOT NULL DEFAULT 3`, and `exercises.pattern` was already nullable with the comment *"Null only for user-authored content"*. The fourth was right, and is why the editor offers the bundled art or a photo. What the refusal missed entirely is what made it urgent: the unique index on `enName` was global, so a hero-authored name a later migration also seeded would have bricked the app on that device. See [`../architecture/exercise-ownership.md`](../architecture/exercise-ownership.md). Substitution (4.16) is still the smaller answer for "dips instead of push-ups". |

**Confirmations, which are also findings.** *Zombies, Run!* collects supplies on a run and spends
them upgrading a base, which is Bati's village with the serial numbers filed off — the design
holds up against the best-known instance of it. Streaks and badges (Spix) are the flame and
`db/achievements.ts`. Multi-week goal programmes (Madbarz's 2–12 week plans, its Muscle Up
programme) are adventures — the gap there is content, not mechanics, which is the same conclusion
§5 reached from a different direction. *Ring Fit Adventure*'s elemental weaknesses are
`weaknessMuscle`/`resistanceMuscle`, shipped and displayed (see 4.6). And *The Walk* advances its
story on daily consistency rather than performance, which is what adventures already do.

The fifth scan added three more, all of which look like gaps in a comparison table and are not.
Streak's **vacation mode** — pause a habit without losing the streak — is `db/streaks.ts` keeping
the flame lit on recent training, so there is nothing to pause. Its **focus timer with Pomodoro and
ambient sound** is `hooks/useSessionTimer.ts` plus `hooks/useSound.ts` and the rest screens between
sets. And GymMane's headline claim, **"no internet permission"**, is `app.json`'s
`blockedPermissions` — now stated in the guardrails at the top of this page, where it should have
been all along.

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
- **A tappable body map** — GymMane's front/back silhouette, where touching a muscle lists the
  movements that train it. Bati has the data half (`muscleToResource`, and every exercise carries
  its muscle); what it lacks is the artwork and the hit regions, which is an illustration project
  with the same 64 MB APK watching (§3). Depends on 4.22 shipping first: a map with no catalogue
  behind it navigates to nothing.
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
  once, after the effort, and it shipped — and since 4.5 its answer moves the level an adventure
  proposes. If it ever grows a per-set form, this decision applies again.
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
