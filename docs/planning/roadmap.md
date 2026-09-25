---
title: Roadmap
type: planning
status: active
updated: 2026-09-23
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
- **Two network destinations, both off by default, and nothing uploaded.** This guardrail was "no network requests at
  all" until expeditions landed, and it was enforced by `blockedPermissions`: `INTERNET` was not in
  the manifest, so a stray `fetch` failed at runtime rather than at review. A route drawn on a map
  needs the map, so `INTERNET` is now in the build and `tiles.openfreemap.org` is the first of the
  two hosts the app talks to. The second is `api.github.com`, asked once a day about a newer
  version by [`src/updateCheck.ts`](../../src/updateCheck.ts) and off until a hero switches it on,
  because a copy installed from an APK has no store to tell it. What replaces the manifest is
  narrower and says the same thing:
  [`.biome/plugins/noJsNetwork.grit`](../../.biome/plugins/noJsNetwork.grit) rejects `fetch`,
  `XMLHttpRequest`, `WebSocket`, `EventSource` and `sendBeacon` anywhere in the app but that one
  module; MapLibre fetches natively, and no other JavaScript here opens a socket at all.
  `ACCESS_NETWORK_STATE` stays blocked. **Nothing is ever sent up**: no session, no trace, no
  identifier. A *third* host is still the guardrail, and it now costs a second name in that
  plugin's filter, a rewrite of the front page and a new section in the policy, in the same
  commit, which is why every network item in §4 and §5 is ranked where it is.
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

**Play is live on the internal track** (v2.5.3, versionCode 20503, `grep '"version"'
package.json` and `grep versionCode app.json`; this line sat at 1.12.0/11200 while the app
reached 2.5), uploaded by the `play` job of `release.yml` behind the `play-internal` GitHub
Environment. The v2.5.3 run passed both jobs, `apk` and `play` (`gh run view` on the tag's
`release.yml` run). The listing in four locales (`ls fastlane/metadata/android`: de-DE, en-US,
es-ES, fr-FR), the feature graphic, the privacy policy and the signing story are all done. What is
left is a person in the Play Console, not a keyboard.

- **P1 — Promotion out of `internal` is manual, and nothing in the repo does it.**
  `release.yml:282` pins `fastlane supply --track internal`; no closed, open or production track
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
  `react-native-web` ships, `npm run web` exists, and `metro.config.js:14` already resolves
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

  Two passes have been on a device since, and neither was this one. #109 (2026-09-16) profiled
  Home, the Village and the session's timed screens on a Fairphone 6 and fixed what it measured:
  a clock holding the JS thread, a swipe that pressed, embers committing the shadow tree every
  frame. That was frame time. `a700f75e` (2026-09-20) walked twelve routes at five window sizes
  for layout, contrast and tap targets, and put floors under the last two. Neither read the
  screens for the class of bug that opened this pass, a wrong-language string or a word wrapped
  mid-syllable, and with four locales since #100 there are twice as many languages to read them
  in.
- **P2 — Legibility in bright ambient light.** `PRODUCT.md` requires it explicitly ("variable gym
  lighting"), and a dark-only app tests badly for it indoors. The contrast floor
  (`__tests__/color-contrast.test.ts`) is the half a machine can hold; the other half is a real
  screen outdoors, which `a700f75e` left open in writing.
- **P2 — Cross-screen backlog**: unify card/control primitives across the legacy screens and
  `src/ui`; re-establish one-primary-action hierarchy on Home and the Quest/Adventure detail
  screens; then small-label readability in Journal/Session/Quest cards, onboarding/settings
  motion alignment, and chip overload.

**Method.** One scope unit per PR — one screen, or one shared component family — with rationale,
impacted files, before/after screenshots, checklist pass, and `npm run check` + `npm test` green.
Severity order P0 → P1 → P2 → P3; never polish before P0/P1 are gone.

## 3. Debt with a deadline

Not tidiness. Each line is a gate that does not close, or a risk with a date on it.

- **P1 — The suite tests `db/` and leaves the screens bare.** 163 test files
  (`ls __tests__/*.test.*`) against 206 sources (`find app components src db hooks -name "*.ts*"`)
  reads healthy; the distribution does not. **48** of them render anything
  (`ls __tests__/*.tsx`, up from 9 on 2026-08-24), against 37 screens under `app/`
  (`find app -name "*.tsx"`) and 80 components (`find components src -name "*.tsx"`), and `app/`
  is held to 15% of lines (`coverageThreshold` in `package.json`). So the pure
  functions — streaks, boss damage, muscle balance, oaths — are covered several times over, and
  the screens the hero actually
  touches are covered by a global percentage that AGENTS.md already warns cannot be trusted: dead
  code counts as covered, and a flow test that checks the next screen appeared passes while the
  data underneath is wrong. The deliverable is the shape `audit.md` used and then earned its own
  deletion: a dated page listing where a regression would ship green today, the missing tests
  written against *state*, and the page removed once its findings are gone.
- **P2 — The 8 Maestro flows never run in CI, and they do not assert state.**
  `session-interruptions.yaml` performed two boss-damage bugs and passed, because it only checked
  that the UI came back. They are worth "the app does not crash on this path", nothing more. Since
  2026-09-13 they pass 8/8 locally, in about six minutes on two emulators
  ([../../.maestro/README.md](../../.maestro/README.md), "Fast local runs"), and are run by hand
  before a release. Deliberately not a CI job: the behaviours they used to be the only check on
  (the two-minute session guard, the quit and restart confirmations, swearing an oath) are now
  component tests.
- **P3 — The APK is 53.2 MiB** (`gh release view v2.5.3 --json assets`: 55 792 525 bytes), under
  the 55 MiB budget that `release.yml` fails a release on. It was measured and cut since this line
  said nobody had looked; where the megabytes go is
  [../architecture/performance.md](../architecture/performance.md) § Binary size. What is left is
  the ratchet's own rule: lower `MAX_MB` after a release that measures under it, never raise it.
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
| 4.2 | Local training reminders, no Firebase | High | M | **P1** | |
| 4.26 | One-sided holds are timed as one side, and journaled wrong | Med-high | S–M | **P1** | |
| 4.3 | Immersive session: exercise art **and** audio | High | M | **P1** | Zombies, Run! |
| 4.6 | Boss battle refonte | High | M–L | **P1** | |
| 4.24 | Translations open to contributors, now that four locales ship | Med-high | S | **P1** | Streak |
| 4.8 | Stats refonte | Med-high | M | **P1** | |
| 4.9 | Animated exercise demonstrations | High | L | P2 | Madbarz |
| 4.10 | A skill as an oath — "my first pull-up" | High | M | P2 | calisthenics review |
| 4.12 | Wearables: a BLE heart-rate strap, then Health Connect both ways | Med-high | L | P2 | Spix |
| 4.30 | Village refonte: a reason to open it | Medium | L | P2 | |
| 4.11 | Widget refonte | Medium | M | P2 | |
| 4.13 | Building tiers, and tiers per building | Medium | M | P2 | |
| 4.15 | Villagers arrive from the journal (collection) | Medium | M | P2 | Pokémon Sleep |
| 4.27 | Stretching, yoga and meditation sessions | Medium | M | P2 | |
| 4.14 | Two exercise poses left to paint | Low | S | P2 | |
| 4.17 | Micro-animations, incl. resource gain | Low | S each | P3 | |
| 4.25 | A result card that can be shared as an image | Low | S–M | P3 | Streak |
| 4.28 | Today's step count | Low | S after 4.12 | P3 | |
| 4.29 | Sleep, read from Health Connect | Low | S after 4.12 | P3 | |
| 4.18 | Multi-device sync, encrypted, phases 0 to 3 | High | L | P1 | |
| 4.20 | `fallow` in the toolchain | Dev-only | S | P3 | |

Desktop is a distribution question, not a feature — it lives in §1.

The rows are sorted by rank, not by number: **the number is an identifier, the Prio column is the
rank.** 4.21 onward arrived after the first twenty and sit where they belong, because renumbering
would break every reference in §1, §5 and §6 and buy nothing. For the same reason a shipped row's
number is never reused: 4.1, 4.4, 4.5, 4.7, 4.16, 4.19, 4.21, 4.22 and 4.23 are gone from the table,
and what they decided is under [Decisions the shipped rows left behind](#decisions-the-shipped-rows-left-behind).

### 4.2 Local reminders — the highest-return feature on this page

It is the only item here that acts on a hero who has *stopped* opening the app.

**Not through `expo-notifications`.** It was removed in `c7246643` (2026-08-03) because it arrived
carrying Firebase Cloud Messaging and twenty-odd permissions the app never exercised: 33
permissions went to 11 in a release APK. Local notifications need no FCM at all, so coming back
through that package would buy back the F-Droid stripping script for nothing. The route is a local
Expo module in Kotlin, on the model of `modules/bati-location`:

- **`AlarmManager.setWindow`, never an exact alarm.** A reminder that lands inside a quarter of an
  hour is on time, and `SCHEDULE_EXACT_ALARM` is a permission plus a Play declaration for a
  precision nobody asked for.
- **A `BOOT_COMPLETED` receiver**, because a reboot clears every alarm. `RECEIVE_BOOT_COMPLETED` is
  in `app.json`'s `blockedPermissions` today; it leaves that list and gets its justification in
  `__tests__/android-permissions.test.ts` in the same commit.
- **`POST_NOTIFICATIONS` is already declared**, by
  `modules/bati-location/android/src/main/AndroidManifest.xml` for the expedition's foreground
  notification. The runtime prompt exists; the permission list does not grow.
- **The logic is a pure function in `db/reminders.ts`** that answers "does this day ring, and
  when". The module schedules what it is told and decides nothing, so every rule below is a unit
  test rather than a device check.

**There is no schedule to plumb yet.** This page used to say the schedule data already existed
(Goals + Schedule). It does not: no training day is stored anywhere. What exists is a weekly
quota, `weeklyTarget` and `weekStartsOn` on an oath (`db/oaths.ts`), with `DEFAULT_WEEKLY_QUOTA`
(`db/streaks.ts`, 2) when no oath sets one. The feature adds one small piece of state: the days,
and an hour.

**Decided: the days say when, the quota says whether.** The hero picks days and an hour; the
week's quota decides whether a given day still needs to ring. No reminder fires:

- on a day a session is already logged;
- once the week's quota is met;
- when `getRestSuggestion()` (`db/restSuggestions.ts`) advises rest. An app that prescribes a rest
  day and then nags the hero to train through it is fighting its own coaching, the same argument
  that refused Habitica's lost HP below.

**Update notifications are no longer part of this item.** The in-app check shipped in #125 as
`src/updateCheck.ts`, opt-in and off by default, with the guardrail at the top of this page
rewritten to name its host. Play updates itself and any F-Droid client watches its index, which
leaves one free channel undocumented: nothing in the README tells a sideloader that
[Obtainium](https://github.com/ImranR98/Obtainium) can watch the GitHub releases (`grep -ri
obtainium README.md docs` finds only this page). One paragraph, whenever the README is next
touched.

### 4.26 One-sided holds are timed as one side, and the journal records a wrong time

Side Plank, Pigeon Pose, Thread the Needle and World's Greatest Stretch are done one side, then the
other. In a quest's timed slot `components/session/ActiveExerciseView.tsx` runs one countdown, so a
hero who does both sides properly runs into overtime, and the journal keeps a hold time that is
neither side's. The journal is the source of truth the whole app derives from, which is why a
wrong number there outranks every refonte below it.

The warm-up already solved it: `WarmupView` splits a movement's seconds in two when
`switchesSides()` (`constants/warmup.ts`) says so. But that is a name list, and it holds only Thread
the Needle and World's Greatest Stretch, not Side Plank or Pigeon Pose. Its own `ponytail:` note
names the trigger for the real fix: *"A second reader (a timed quest slot, the journal) is the
moment for the column."* This is the second reader. The fix is that column (a laterality flag on
`exercises`, set by a content migration scoped to `creator`), then two countdowns with a short
switch between them in the session, with the warm-up reading the same flag so the name list goes.

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
upgrade, and it is a content project with a 53 MiB APK (§3) already under watch — do the free
version first and find out whether narration during a set is welcome or annoying before paying
for it. Same for ambience between sets. What must not be copied is the chase mechanic: it exists
to make you run faster, and telling a hero to rush a push-up is an injury.

### 4.6 and 4.8 The other refontes

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
year grid**: Streak and GymMane each lead with one, and Bati already renders the month (the frieze
in `components/journal/stats/StatsView.tsx`). Widening that component to a year is the cheapest
thing in this refonte and the one that makes a rest day look like part of a pattern rather than a
hole.

### 4.9 Animated demonstrations — the one feature every rival has and Bati doesn't

*Madbarz* is video-backed on every movement; Freeletics too. Bati shows one still image. For a
bodyweight app that is not decoration: the hero is alone, with nobody to say the hips are sagging,
and a still cannot show a tempo the app itself prescribes.

Effort L because it is assets, not code: 64 exercise illustrations
(`ls assets/images/exercises/*.webp | wc -l`) out of 350 webp files in `assets/images`
(`find assets/images -name "*.webp" | wc -l`). The APK is already 53 MiB (§3), so the format
decision comes first: an animated webp of 4–6 frames per movement, or a 2-frame start/end toggle,
both far cheaper than video. The still images were redrawn in 2.0.0 (`b4d2c9e1`, #47), with a
`provenance.json` giving each one's model, reference, prompt and seed, so an animation starts from
a known frame rather than from a second redraw.

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

**Wearables** (4.12) now means two things, in this order.

**A BLE heart-rate strap first**, because it is the only version that shows the heart rate
*during* the set, which is what a hero asking for a wearable usually means. Every chest strap
speaks the standard Bluetooth Heart Rate profile (service `0x180D`), so there is no vendor SDK and
no account, just a GATT subscription. It costs a native BLE dependency (or a Kotlin module next to
`modules/bati-location`) and **two new runtime permissions**, `BLUETOOTH_SCAN` and
`BLUETOOTH_CONNECT`, the first declared `neverForLocation`. That is a guardrail cost the
permissions ratchet will ask about, and a new line in the privacy policy, even though nothing
leaves the device.

**Then Health Connect, both ways.** It is an OS API: no account, no network, no data leaving the
device. *Write* puts Bati's sessions where the hero's other apps can see them, the polite version
of "export". *Read* is where the wearable story lives: weight, heart rate and outdoor sessions that
a Withings or a Garmin already recorded, because both export into Health Connect on Android. So
"support my watch and my scale" resolves to reading from Health Connect: no OAuth, no vendor SDK,
no per-brand integration to maintain. Every route through a vendor's cloud API buys the same data
for a network dependency and a policy rewrite. Each record type is its own Health Connect
permission and its own Play declaration, so read only what a screen consumes. 4.28 and 4.29 are
two more record types on the same plumbing, which is why they are cheap after this and not before.

Two caveats: below Android 14, Health Connect is a Play-distributed app, so the whole feature
degrades to absent and must be built to do so silently; and the F-Droid build has to survive the
dependency.

The **widget** (4.11) already ships two providers (`weekly`, `flame`, `src/widget.tsx`) and is the
app's only surface on a home screen — worth a refonte, worth it *after* the app it advertises got
its own. Tiers per building (4.13) and villagers (4.15) both deepen the village, and 4.30 is where they
belong as one piece of work. The north star keeps them honest: **a village that animates better does not make anyone train more.** Villagers
are cheap if they are derived from history like everything else in the village, and a sprite
project if they are not.

If villagers happen, *Pokémon Sleep* names the mechanic that would make them pull weight:
**unpredictability and collection**. Its whole loop is "sleep, then discover what your sleep
attracted", and completionists change real habits to attract rare creatures. The offline
translation is direct — a villager *arrives* because of what the journal shows, which villager is
a weighted roll, and the roster is a collection screen. Same derived-from-history rule as
everything in the village, plus the one thing the village lacks: a reason to look at it the
morning after training. That version is worth building; villagers as static scenery are not.

**Art** (4.14) is two poses, not a review. The 2.0.0 redraw (`b4d2c9e1`, #47) repainted all 61
illustrations and added `muscle_up`. Two gaps remain, both listed in
[../content/missing-image.md](../content/missing-image.md): `bulgarian_split_squat` still renders
the placeholder after five attempts (`constants/assetMap.ts` says why), and `table_row` kept its old
art, a straight-legged row that since `0053` draws the *harder* version of the bent-knee rung it
names. A wrong illustration in a training app is worse than a placeholder, which is what keeps this
at P2 despite its size.

### 4.24 Translations: the trigger this page named has been reached

Four locales ship since #100 (`ls locales`: de, en, es, fr). `en` and `de` carry 1433 keys, `fr` and
`es` 1495; the 62 extra are the `_many` plural forms those two languages need, not drift. The
gate already exists: `__tests__/i18n-keys.test.ts` fails on a missing key and on an empty string,
across all four. German and Spanish are machine translations, reviewed adversarially and flagged as
such in Settings and on the listings, and that is what moves this item up: a wrong German exercise
instruction is the same credibility bug in a fitness app that made the French review a P1, and
this time nobody on the project reads the language.

**Weblate is due.** This page named it as the upgrade and set its trigger at "a second
contributor or a third locale". The third locale arrived, and a fourth with it. Hosted Weblate is
free for libre projects, which is how Streak runs its ten languages. The work is a project on it,
pointed at `locales/`, and a page saying where the strings live and that `npm test` is the review.

**Exercise labels are still not in `locales/`.** They sit in the database, in `frName`, `deName`
and `esName` since `0058`, and are corrected by migration (`0059` seeded German and Spanish). A
translator on Weblate can fix the interface alone and cannot fix an exercise name alone: that
takes a migration, scoped to `creator`. Say so on the contributor page, or it wastes their evening.

### 4.25 A shareable result card

`components/session/VictoryView.tsx:220` shares `Share.share({ message })` — text. Streak renders
the same information as an image card, which is the only acquisition mechanic available to an app
with no feed, no account and no server.

It stays P3 because the north star demotes it honestly: **a share card makes nobody train more.** It
also costs a dependency (`react-native-view-shot`, nothing installed captures a view today), which
is the difference between this and everything else in the P3 band.

### 4.17 Micro-animations

Two of the village's three missing animations shipped — `FlameFlicker`
(`components/village/VillageScene.tsx:184`) and `GrowthPulse` (`:232`). The **resource-gain
animation** is what is left, and it stays low by design.

### 4.18 Multi-device sync, end-to-end encrypted, over the hero's own cloud

**Phases 0 to 3 built on `feat/encrypted-sync` (2026-09-25)**, with Nextcloud as the first
transport; how it works is [`docs/architecture/backup-and-sync.md`](../architecture/backup-and-sync.md).
Left: the Dropbox connector (needs an app registered to this project), then OneDrive, then phase 4. The earlier version of this section refused
every cloud API on the belief that 4.21's folder picker already reached them. It does not: Google
Drive, OneDrive and Proton never appear in `ACTION_OPEN_DOCUMENT_TREE`, Dropbox's provider is
partial, and Nextcloud's serves a stale copy of what another device wrote (Aegis #848 and #1237,
KeePassDX's sync wiki, nextcloud/android #6883). Syncthing is the only folder transport that is
really two-way, and it costs another app and a pairing. The research behind the phases below also
read Joplin (the closest prior art: E2EE sync over the user's own cloud, no server) and
InlitX/streak (a shared-folder JSON with a naive merge and no encryption).

| Phase | What | Effort |
| --- | --- | --- |
| 0 | **Phone change at no cost.** Android's own backup (Google, Seedvault, device transfer) already carried the database because `allowBackup` was on with no rules. `plugins/withAndroidBackupRules.js` makes that explicit, keeps the SecureStore key out of it, and the privacy policy now says so. | S |
| 1 | **Encrypted backups.** A random master key encrypts every snapshot (AES-256-GCM); the key is wrapped by a password and by a recovery key, the Aegis/Signal model. The key lives in SecureStore, so unattended backups never prompt. Fingerprint unlocks nothing a new phone could use, so it guards only sensitive screens. | M |
| 2 | **Cloud connectors into an app folder.** Nextcloud/WebDAV (Login Flow v2, no registration) and Dropbox (PKCE, no secret in the APK). Google Drive last or never: brand verification, a second signing certificate for the F-Droid build, and a push towards Play Services. | L |
| 3 | **Hand-off between devices.** One file per device, only ever written by that device, so there is no lock and nobody deletes anyone else's file. The session uuids in each file are the version vector: a file whose sessions are a superset of ours is adopted, two files that each have sessions the other lacks ask the hero which to keep. An empty or missing folder is an error, never "delete everything" (Joplin #6864). | M |
| 4 | **Row-level merge.** Union the facts by uuid, recompute everything derived. Needs uuids on hero exercises, quests, adventure runs and boss damage, tombstones for deletes, and an answer for `boss_fights` being one row per adventure. Only if phase 3's choice screen actually costs someone a session. | XL |

**Joplin's lessons, kept because they are cheap to forget:** one encrypted blob per device rather
than one file per row (a fresh device never finished 13,000 items against OneDrive's throttling);
never infer a deletion from an absence; never order by device clocks (3,000 duplicates from one
skewed clock, #5738); do not count on Android background sync, sync at launch and on demand.

### 4.20 `fallow`

`fallow` (<https://github.com/fallow-rs/fallow>) is already leaving caches in `.fallow/`; the open
question is whether it replaces `npm run deadcode` in CI or merely runs beside it, and a second dead
code gate that nothing gates on is worth less than the one in §3 being made to fail.

### 4.27 Stretching, yoga and meditation

Half of it exists already. A quest slot can target time instead of reps (`questTargetTypes` in
`db/schema.ts`), XP is paid on duration alone (`db/xp.ts`), and the mobility branch from `0024`
has Pigeon Pose, Downward Dog and World's Greatest Stretch with their art. What is missing is a
session made *only* of holds that runs itself: one countdown flowing into the next without a tap
between poses, because a hero in Pigeon Pose is not reaching for the phone. It depends on 4.26:
yoga is full of one-sided poses, and a flow timed as one side would ship the bug twice.

**Meditation is the hard half**, and it is where the ranking comes from. It has no movement and no
muscle, so it feeds no village resource and no boss damage, and a session that moves nothing on
the screens that reward training reads as broken. Decide what it earns before building it; if the
answer is "only the streak", that is a fine answer, but it has to be the answer on purpose.

### 4.28 Today's step count

A daily number beside the flame. Two routes, and the cheap one comes after 4.12: Health Connect's
step records need one more read permission on plumbing that already exists. The direct route, the
phone's step-counter sensor, needs the `ACTIVITY_RECOGNITION` runtime permission, a new line for
the permissions ratchet and the policy, and a background listener to count while the app is
closed. Low impact by the north star: walking is not the training this app prescribes, and the
expeditions already cover the walk the hero chose to do.

### 4.29 Sleep, read from Health Connect

It is a read, and only a read: a phone does not measure sleep, a watch does and writes a sleep
session into Health Connect, so this is one more record type after 4.12 (`READ_SLEEP`, and its own
Play declaration). A sleep chart on its own makes nobody train more. The version worth building
feeds `getRestSuggestion()`: a short night makes the rest day it already proposes more likely, or
lowers the level it proposes, which is the app coaching with data it did not have to ask for.
Health data is also the most sensitive category the privacy policy would ever have to name; see
the privacy note under 4.21 below.

### 4.30 Village refonte: a reason to open it

The 2026-09-11 pass (#92) made the painting show what the hero built and say what rises next. It
reads well now; what it still lacks is a reason to open it on a day with no session. 4.13 (tiers)
and 4.15 (villagers arriving from the journal) are both answers to that, and they are one design
pass seen twice: do them together, under this row, rather than as two features bolted onto a scene
nobody revisits. The north star sets the ceiling: **a village that animates better does not make
anyone train more**, so every change here has to be derived from the journal, and the test is
whether it gives the hero something to look at the morning *after* training.

### Decisions the shipped rows left behind

These rows left the table when they shipped. What stays is only what no commit message says, under
the old numbers because the rest of this page still points at them.

**4.1 Export / import.**

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

It is the transport half of 4.18 and of desktop (§1). With 4.21 writing the same snapshot
unattended, what is still missing for those two is reconciliation, and only that.

**4.21 Backups that write themselves.**

**A failed unattended write turns the feature off.** `reportError` goes to a dev console this app
does not ship, so it is not a report a hero can see; the Settings row falling back to "Off" is.
The cost is that a transient failure — a full card, a folder unmounted — buys a trip to Settings.
That is a `ponytail:` note in `src/autoBackup.ts` with the retry counter as its upgrade path.

**The privacy policy was load-bearing and said the wrong thing.** `docs/legal/privacy.md` promised
"nothing is exported automatically and nothing is scheduled" in both languages — true until this
shipped. It is a published legal document behind a store listing, so the feature is not done until
that sentence is. Worth a grep before any feature that writes a file, opens a socket, or reads a
sensor.

**It was believed to be the answer to "sync via Google Drive, Dropbox or WebDAV", and is not.**
Most cloud clients never publish a folder to the picker (see 4.18 for the evidence). What 4.21 is
good at is an unattended copy on the device, or in a folder Syncthing or Nextcloud keeps in sync.

**4.4 Paths.** The full account is [`docs/gameplay/paths.md`](../gameplay/paths.md).

**What was refused.** A "Your paths" card on the Journal: Home carries the one being climbed and
the shelf keeps the ones finished, so a passive report adds a fourth telling of the same thing and
walks straight back into the wall of unlit movements this roadmap has now declined twice.

**What the re-audit turned up and this work did *not* fix** — worth their own entries: rep targets
take no history at all (template midpoint × {0.75, 1, 1.25}); hold targets use an all-time max
clamped back inside the template's window, so the 60–75 % rule stops applying to exactly the
strong heroes it is for; there is no per-movement frequency notion anywhere, so nothing notices a
movement going untrained; and regression-on-form-breakdown has no input channel, since the only
self-report is the three-value session feedback. Above all, the research dossier's §5 is blunt that the first predictor
of D30 retention is **a completed first action on day one**, and a day-one hero here still lands
on an undifferentiated quest gallery — `trainingLevel` from onboarding has exactly one effect,
hiding `advanced` quests from a `beginner`. That is the next large piece, not another ladder
surface.

**4.22 The exercise catalogue.** What was refused: a difficulty badge and a per-row progress bar.
The row's job is *find the movement*; where the hero stands on it belongs to the detail screen.

**4.16 Swapping an exercise** shipped in #25 (`swaps` in `db/questConfig.ts`, the picker in
`app/(tabs)/quests/[id].tsx`).

**A full quest editor stays out.** Bati's quests carry a title, art, a narrative and an XP
balance, so a hero-authored one is either a bare list that looks broken next to the others, or a
level editor. Substitution gives the person who wants dips instead of push-ups what they actually
wanted.

**4.19 GPS** shipped on 2026-08-31 as expeditions, at exactly the price this page had put on it: a
runtime location permission, five others beside it, `INTERNET` in the manifest and a Data Safety
answer that stops being "no". See [`../designs/gps-without-google.md`](../designs/gps-without-google.md)
and [`../designs/expeditions.md`](../designs/expeditions.md).

### Scanned and refused

The comparison that produced 4.3, 4.5, 4.9, 4.12 and the exercise swap also produced a shorter list of things
these apps do that Bati should not — and two it already does, which is the more useful half of a
scan. Written down so this does not have to happen twice.

**Already shipped, mistaken for a gap on the first pass.** The "tell me your time and your
equipment, get a session" flow every rival leads with: `app/(tabs)/quests/index.tsx` filters on
duration buckets *and* equipment chips, over quests that already print an estimate from
`estimateQuestTemplateSeconds`. And per-quest customisation: `db/questConfig.ts` persists the
level, the rounds, the rest and the per-exercise targets. What was genuinely missing in both
cases was one narrow thing, swapping a movement, and it shipped in #25 (`swaps` in
`db/questConfig.ts`, a picker on the quest screen). **Generating** a session from
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
| Camera rep counting via pose detection (Spix) | A camera permission, a model in the APK already at 53 MiB, and a Data Safety answer that stops being "no" — for a count the hero can do out loud. Accelerometer-only counting keeps the permission story but not the accuracy; parked, not refused. |
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
| Hero-authored exercises (GymMane, 360+ built in, plus custom with photo and video) | **Shipped 2026-08**, after a user asked for it by name. The refusal read: *no art, no muscle mapping, no pattern and no XP weight, so it breaks the village, the boss and the estimate at once*. Three of the four were wrong against the code — XP is duration-only (`db/xp.ts`), the estimate reads a `secondsPerRep` with a `NOT NULL DEFAULT 3`, and `exercises.pattern` was already nullable with the comment *"Null only for user-authored content"*. The fourth was right, and is why the editor offers the bundled art or a photo. What the refusal missed entirely is what made it urgent: the unique index on `enName` was global, so a hero-authored name a later migration also seeded would have bricked the app on that device. See [`../architecture/exercise-ownership.md`](../architecture/exercise-ownership.md). Substitution (shipped in #25) is still the smaller answer for "dips instead of push-ups". |

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
- **A watch app**: session controls on the wrist. Live heart rate during a set is §4.12's
  BLE strap, on the phone, and needs no watch app. This is what remains of "wearables" once
  §4.12 takes the strap and the data half: reading what a Withings scale or a
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
  with the same 53 MiB APK watching (§3). Depends on 4.22 shipping first: a map with no catalogue
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
