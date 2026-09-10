---
title: UX audit protocol
type: design
status: active
updated: 2026-09-10
related: [ui-checklist.md, design-system.md, ../product/writing.md]
---

# UX audit protocol

> `tsc`, biome, jest and Maestro all pass on a screen nobody would want to use twice. Nothing in
> this repo can tell whether a screen is *good*. Only someone looking at it can, so the audit is
> built around producing pictures cheaply and then handing them to people who disagree.

---

## 1. Capture

```bash
npx expo run:android          # once: the debug build the seeding needs
npx expo start --dev-client   # Metro, in another terminal
npm run audit:shots           # ~36 seeded screens + 12 first-launch screens -> .audit/en/
npm run audit:shots -- fr     # the same app in French
```

Two flows, because they need two different apps:

| Flow | What it photographs | Why it cannot be merged |
|---|---|---|
| [`.maestro/audit.yaml`](../../.maestro/audit.yaml) | A hero with three years of history: home, oath, adventures, quests, catalogue, editor, village, journal, session, victory, boss, recap, settings | A seeded hero can never show an empty journal |
| [`.maestro/audit-fresh.yaml`](../../.maestro/audit-fresh.yaml) | Onboarding step by step, then every tab on day one | A fresh install can never show a maxed village |

Both are deliberately not tests: nothing is asserted, every step that can be skipped is
`optional`, and a drifting step yields a wrong picture rather than a red run. `AUDIT=1` makes
[`scripts/screenshots.sh`](../../scripts/screenshots.sh) keep whatever it managed to capture, so
one unreachable screen never costs the other thirty-five. The shots land in `.audit/`, which is
gitignored: they are evidence for one audit, not an asset.

**Not covered yet** (no testIDs on their entry rows, low audit value): `/xp`, `/safety`,
`/privacy`, `/credits`. Add them the day one of them is the problem.

**The phone has to be in a state where Maestro can run.** Two things on this /e/OS device stop it
dead, and both look like a broken flow rather than a broken phone:

- `dumpsys netpolicy | grep "Restricted networking"` reporting `true` cuts the network of every
  fresh install. Maestro reinstalls its driver on every run, so its uid is new and born blocked,
  and it gives up about 140 ms later with `DeviceServerDiedException ... Command failed (tcp:N):
  closed`. A background loop lifting the policy (`service call netpolicy 1 i32 <uid> i32 0`) can
  win that race only if it polls faster than the driver starts; turning restricted networking off
  is the fix, the loop is the workaround.
- A run that dies before its first screenshot leaves nothing to look at. That is what
  `Collected 0 shots` means, and it is a device problem every time so far, never a flow problem.

**The dev client photographs itself.** Seeding needs the dev screen, the dev screen is behind
`__DEV__`, so an audit runs on a debug build and the dev-client comes with it: a translucent
"Tools" gear that lands exactly where this app puts its own top-right controls, and a menu that
opens over the app when the shake gesture fires. It ate the pause button twice and put a gear on
top of a card a persona then reported as the app's own. Its preference is rewritten from defaults
on every launch, so a file written behind its back does not hold, and `pm clear` resets the toggle
a person sets by hand. Live with it: tell the personas to ignore the gear, and take the paused
overlay by hand if that screen is what an audit is about.

## 2. Judgement, by people who disagree

One subagent per persona, each given the same shots and the same rulebook
([`ui-checklist.md`](ui-checklist.md), [`design-system.md`](design-system.md),
[`../product/writing.md`](../product/writing.md), [`../../PRODUCT.md`](../../PRODUCT.md)), each
told to argue for its own user and nobody else's. They are adversarial on purpose: a screen that
satisfies all four is rare, and the conflicts are the interesting output.

| Persona | Reads every screen as | Kills a screen for |
|---|---|---|
| **The stranger** | Someone who has never lifted and has never played an RPG | Vocabulary that assumes either. A first screen that explains the world instead of the first action |
| **The hurried lifter** | Phone in one hand, between two sets, forty seconds | Anything that costs a scroll, a second tap, or a moment of reading to log the set |
| **The player** | Someone who came for the game | A reward that does not land, a boss that does not feel dangerous, progress announced in a number instead of shown |
| **The regular** | Trains daily, opens the journal to see themself getting stronger | Progress that cannot be found, a record that is not called out, a week that looks like every other week |
| **The scout** | *Not a user.* Reads the best sport apps in the world and comes back with what they do here | Nothing. It proposes, it does not veto |

The scout runs once per audit, not per screen: it looks outward (Strava, Hevy, Whoop, Zwift,
Duolingo's streak, Habitica's game loop) and reports the specific mechanic worth stealing and the
reason it works, not a mood board. Its findings enter the ledger as proposals like any other.

Each persona returns findings in one shape, and nothing else:

```
[shot] 09-quest-detail
[severity] blocker | friction | polish
[claim] one sentence, about what the user cannot do or cannot see
[evidence] what in the picture says so
[fix] the smallest change that would answer it — or "needs a redesign"
```

`blocker` means someone stops using the app. `friction` means they do it anyway and like it less.
`polish` means it is merely worse than it could be. A persona that finds ten blockers has not
been adversarial, it has been theatrical: rank and cut.

## 3. The ledger

Findings merge into one dated page, `docs/design/audits/<date>.md`, deduplicated across personas
and sorted by severity. A finding that two personas raise for opposite reasons stays as one entry
with both readings, because that is a design decision and not a bug.

Three outcomes, decided once, in writing:

- **Bug** — the screen already intends the right thing and fails at it. Straight to a fix, no
  mockup. The GPS map card and the missing history badges are this.
- **Fix** — the intent is right, the execution costs one small change. Do it, recapture that one
  screen, done.
- **Redesign** — the screen is answering the wrong question. Goes to §4.

## 4. Redesign: the app is the mockup

No HTML mockups. A Tamagui screen redrawn in HTML is a second source of truth that lies about
spacing, fonts and the dark palette, and it has to be built twice. The capture pipeline already
renders the real thing in minutes, so a redesign is a branch:

```bash
git switch -c redesign/<screen>
# build it
npm run audit:shots           # the same flow, the real screen
```

Then the same personas judge **before and after side by side**, and answer one question each:
*is this better for me, and what did it cost me?* A redesign that improves one persona and hurts
another is not accepted, it is reworked or explicitly traded with a line in the ledger saying who
paid.

Acceptance is a diff of pictures plus that verdict. Only then does it merge.

## 5. Copy is its own pass

French that sounds translated is invisible in a screenshot audit: the persona reads the layout,
not the sentence. Copy gets its own pass over `locales/fr.json` and `locales/en.json` directly,
against [`../product/writing.md`](../product/writing.md), whose rules are half machine-checked
(`__tests__/locale-style.test.ts`) and half not. The unchecked half is the one that makes a
sentence sound like a person wrote it.

## Related

- [ui-checklist.md](ui-checklist.md) — the merge gate every finding is measured against
- [../product/writing.md](../product/writing.md) — how a sentence is built here
- [../../.maestro/README.md](../../.maestro/README.md) — the device caveats every flow inherits
