---
title: Onboarding
type: screen
route: /onboarding
status: active
updated: 2026-10-15
related: [home.md, ../design/audits/2026-10-11-onboarding.md]
sources: [components/onboarding/FirstFire.tsx, app/onboarding/index.tsx, app/onboarding/presentation.tsx, app/onboarding/village-setup.tsx, app/onboarding/training-level.tsx, app/onboarding/first-session.tsx, components/settings/CloudRestoreLink.tsx, constants/onboarding.ts]
---

# Onboarding

## What this page group is for

The first launch: four screens that take a new hero from the icon to a first session, or a
returning hero from the icon back to their village. No account, no permission request, no
payment. The measured cost of the flow and its open findings are in
[the 11 October audit](../design/audits/2026-10-11-onboarding.md), with before and after
captures: 5 screens and 5 taps from install to the first rep, no keyboard.

## Pages in this flow

| Step | Route | What it asks | Way out |
|---|---|---|---|
| 1 | `/onboarding/presentation` | Nothing. One sentence, one button, and "Retrouver mon héros" | Forward, or restore |
| 2 | `/onboarding/village-setup` | The village name, 3 to 20 characters. It arrives drawn from `VILLAGE_NAMES`, so the keyboard is a choice | Forward, back |
| 3 | `/onboarding/training-level` | "Tu en es où ?": "Je commence ou je reprends" or "Je m'entraîne déjà", with one safety line that opens the safety page | Forward, back, or "Passer" |
| 4 | `/onboarding/first-session` | Whether to do the first quest now | "Commencer" or "Plus tard" |

`/onboarding` itself only redirects to the presentation. Steps 2 to 4 show a four-dot progress
indicator; the presentation does not. The avatar is no longer chosen here: it has no gameplay and
lives in Settings.

## What each answer does

- **Village name**: saved by `setVillageName`, editable in Settings ("Nom du village").
- **Starting point** (step 3): saved by `preferences.setTrainingLevel`, edited in Settings
  ("Point de départ"). It sets where a quest never played starts, by the one rule in
  [progression.md](../gameplay/progression.md#where-a-quest-starts), which quests are offered
  (`getEligibleQuestIds`), and whether the warm-up may jump (`startsGently`,
  `db/preferences.ts`: a beginner, and anyone for their first three sessions). For the dose, no
  answer is treated like the gentler one while the journal holds fewer than three sessions
  (`isStartingOut`).
- **Finishing**: step 3 writes `hasFinishedOnboarding` *before* step 4 opens. The first-session
  offer is an offer, never a gate: skipping it, leaving it or crashing in it lands in the app.

## The first session

Step 4 offers the on-ramp quest, named once in `constants/onboarding.ts`
(`FIRST_QUEST_TITLE`, "The Squire's Awakening": two rounds of five movements, no equipment).
The step names its movements, rounds and minutes on a plate, all read from the quest as loaded.
"Commencer" starts it through `loadConfiguredQuest`, the loader Home uses, and goes straight to
`/session`, which opens on the warm-up's 10 s wait. "Plus tard" goes to Home, whose day-one card
(`db/homeOffer.ts`, kind `first_day`) offers the same quest again until a first session exists.
If the seed quest cannot be loaded the button becomes the way home.

## Coming back to a hero

"Retrouver mon héros" sits on the first screen on purpose: a restore replaces the name and the
level the next screens would ask for. It opens one choice, "Où est ton héros ?":

- **A backup file** (`useBackup().runImport`): the system file picker, then, for an encrypted
  backup, its password or its 12 words (accents optional), then an offer to keep that password
  for the next backups. Lands on Home.
- **The cloud** (`CloudRestoreLink`): Nextcloud, a WebDAV server or a synced folder. Connecting
  and giving the backup password is all it asks; the sync that follows finds the other device
  ahead and `SyncPrompt` offers its version. A server with nothing on it is refused and
  disconnected again.

A phone with a system backup (Google's, Seedvault) may bring the database back by itself; a
phone without one has only these two ways.

## What comes after, and when

- The reminder offer is a line on Home that appears once a first session exists. Android's
  notification permission is asked from Settings, never during onboarding.
- Location is asked when a first outing starts.
- "Mon héros à l'abri" (the backup nudge) waits for five sessions.
- The full safety page is in Settings, "S'entraîner en sécurité".

## Visual rules

- Full-bleed art on steps 1, 3 and 4, with a top and a bottom ink gradient so copy and buttons
  stay readable. Step 4's art is the quest's own cover, which the victory screen shows again.
- Step 2 is a plate ([`FirstFire`](../../components/onboarding/FirstFire.tsx)): while the name
  is valid an ink veil lifts off the hamlet, a few embers leave its chimney once, and the name is
  set on the painting in a Récitatif. It never gates the button. See the design system,
  "Panels of story".
- One filled button per screen, at the bottom; the secondary way out is a text link under it.
- The four steps fit 360x640 dp at a 130 % font scale without losing a control, and step 2 keeps
  its field and button above a soft keyboard. Step 3 pins its safety line and button under a
  scroll view and keeps "Passer" in the top row. The chosen answer is outlined, not filled.
