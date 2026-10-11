---
title: Onboarding re-audit (O-01)
type: design
status: active
updated: 2026-10-11
related: [../audit-protocol.md, 2026-09-10-stranger.md, ../../screens/onboarding.md]
---

# Onboarding re-audit (O-01)

What a new hero lives through on v2.10.0, from the launcher icon to the Home of the day after.
Measured on a release build (`assembleRelease -PbatiLocalId=.audit`, x86_64) on the `bati-bench`
AVD forced to 360x640 dp (`wm size 1080x1920`, `wm density 480`), fresh install each run:
French at 100 %, French at 130 %, English at 100 %, then the phone-change journey (backup file
opened with the 12 words). Judged by the six personas of the `audit-personas-bati` skill and
against the "absolus / surtout pas" list of the onboarding brief.

Captures are in [`2026-10-11-onboarding/`](2026-10-11-onboarding/) (half size, webp). They are
the "before" pictures for every fix below.

**Not verified here**, and marked ❓ where it matters: the layout under a real soft keyboard (the
AVD has a hardware keyboard, Gboard shows a floating toolbar), TalkBack, a real Nextcloud restore
(only the sheet was opened), and Google's automatic restore on a Play phone.

---

## The numbers

| Measure | Value |
|---|---|
| **Install to first rep** | **5 screens, 6 taps + the village name on the keyboard (3 letters minimum)**. 5 taps if the level is skipped |
| What the first rep is | A jumping jack in the warm-up, after a 10 s wait whose countdown and GO button are below the fold |
| Install to first rep *of the quest* (wall push-up) | Same, plus 2 min 10 s of warm-up or 1 tap on "Passer l'échauffement", plus a 10 s countdown |
| Screens before the first-session offer | 3: presentation, village name, level |
| Keyboard | Yes, once, mandatory: the village name. No skip, no suggested name |
| Game words met before the first rep | 8: aventure, héros, village, légende, écuyer, étape, quête, épreuve. The personas' budget is 1 ("épreuve") |
| Sport words met before the first rep | échauffement, reps, jumping jack, chat-vache, pont fessier, dead bug. Each has a picture and a sentence |
| Notification request | No system dialog anywhere in the journey. One line on Home right after the first victory ("Bati te rappelle tes jours ?"). Correct moment |
| GPS request | None in the journey |
| Safety | One 12 px line on the level screen. The full screen is the 4th row from the bottom of Settings, five swipes down at 360x640. In session, "Garde 1 à 2 répétitions en réserve" under every rep target |
| Phone change, backup file + 12 words | 5 taps + the 12 words, lands on Home, the three questions are skipped |

Not timed with a stopwatch. Tapping through without reading, the warm-up is on screen in well
under 30 s.

## What holds

Keep these, they are the reason nothing here says "redesign":

- No account, no paywall, no permission dialog between the icon and the victory.
- Home on day one offers the first session back, with its minutes and one "Commencer"
  ([130-home-jour1](2026-10-11-onboarding/130-home-jour1.webp)). The 10/09 blocker is fixed.
- The day after, Home offers a ready session in one tap
  ([14-home-lendemain](2026-10-11-onboarding/14-home-lendemain.webp)).
- The first victory pays: XP, level bar, six buildings started, records, a first achievement
  ([10](2026-10-11-onboarding/10-victoire.webp), [11](2026-10-11-onboarding/11-victoire-village.webp),
  [12](2026-10-11-onboarding/12-victoire-marques.webp)).
- The restore link is on the first screen, opens a file with the 12 words typed without accents,
  and never asks the village name or the level again.
- Onboarding is marked finished before the first-session offer, so "Plus tard" and a crash both
  land in the app.

## Findings

Severity follows the brief: **blocker** = a hero can get stuck or leave, or an "absolu" is missing
on the way to the first rep; **friction** = they go on, grumbling or hesitating; **idea** = it
would work better, nobody suffers today. Task codes: P-05 (Home on day one), E-04 ("Ce qui te fait
venir"), A-05 (four screens without a keyboard). `O-01.x` are new tasks proposed by this audit;
they are not in the roadmap yet.

### Blockers

**B1. At 130 %, the level screen loses "Passer" and half of its button.**
[130-04-niveau](2026-10-11-onboarding/130-04-niveau.webp). On 360x640 the screen is exactly full
at 100 % (the subtitle touches the first choice,
[04-niveau](2026-10-11-onboarding/04-niveau.webp)); at 130 % "Passer" is below the screen with
nothing to scroll, and "Commencer l'aventure" sits under the gesture bar. The hero is not stuck
(picking a level still works) but the only screen that promises to be optional has lost its exit.
`app/onboarding/training-level.tsx` is a fixed column with no scroll view.
Fix: put the column in a `ScrollView` and take the safety line out of it (see F7).
Raised by Martine. → **A-05**.

**B2. "Modifiable plus tard" is not true.**
The level screen says the answer can be changed later. Settings has no such row (checked on the
device, row by row), and `preferences.setTrainingLevel` has one caller, the onboarding screen.
A hero who answered "Débutant" has the advanced quests filtered out
(`getEligibleQuestIds`) with no way back but a reinstall.
Fix: a "Niveau" row in Settings next to "Matériel", or drop the sentence. The row is the one that
keeps the brief's "tout est modifiable plus tard".
Raised by Martine and Yann. → **O-01.a**.

**B3. The level answer does not set the dose, and the same quest has two doses depending on the
door.**
Onboarding's "Commencer" starts the first quest at `Difficulty.Easy`, hard-coded, whatever was
answered: 8 wall push-ups ([08-exercice](2026-10-11-onboarding/08-exercice.webp)). Home's "Premier
jour" card starts the same quest at Medium, the `loadConfiguredQuest` default: 10. Observed on the
device with "Débutant" chosen both times. So a beginner who taps "Plus tard" gets the harder
session, a "Confirmé" who taps "Commencer" gets the easier one, and the day after everyone goes
from 8 to 10 (+25 %) because the door changed, not because a rule said so. This is the "second
door goes through the first door's handler" rule of `AGENTS.md`, broken once more.
Fix: one start path (`useStartQuest`) for both doors, and one written rule from level to starting
difficulty (beginner and skipped: Easy; regular: Medium; advanced: Medium, never Hard on day one).
Raised by Sophie, confirmed by Maël ("the question changes nothing I can see"). → **O-01.b**,
before P-05 since P-05 redraws that Home card.

### Friction

**F1. The only mandatory step needs a keyboard.** The village name: three letters minimum, no
skip, no suggestion ([02](2026-10-11-onboarding/02-village-vide.webp),
[03](2026-10-11-onboarding/03-village-saisi.webp)). It is the one step of the four that cannot be
skipped, and it is the one with typing. Settings already has "Nom du village".
Fix: prefill a drawn name (the hamlet has one, the hero may change it) so the button is live on
arrival. ❓ Layout under a real keyboard not seen. Kevin. → **A-05**.

**F2. Three screens in a row end on "Commencer l'aventure".** Presentation, village and level.
The second and third do not start anything, and both show it greyed first. Raised on 10/09
("the app has stalled"), still there. Fix: "Continuer" on steps 2 and 3. Kevin. → **A-05**.

**F3. The first warm-up card hides its own wait.**
[06-echauffement](2026-10-11-onboarding/06-echauffement.webp). "Commencer" lands on the 10 s wait
before the first movement ("PRÉPARE-TOI · 1/4", `PREP_SECONDS`), but on 360x640 its countdown and
its GO button are below the fold, inside the scrolling block. What stays visible is "30s", the
dose, and "encore 2:09", a total that counts the wait in: the screen reads as a movement already
running. (This finding first said the timer *was* running; the persona review corrected it.) For
Martine the first movement asked of an operated knee is a jump. "Ne plus me le proposer" is on
the card and removes it for good, but nothing chose a gentler opening for her. At 130 % the
instruction leaves the screen after a line and a half
([130-06](2026-10-11-onboarding/130-06-echauffement.webp)).
Fix: P6 below. Kevin, Martine, Sophie. → **O-01.c**.

**F4. The first-session offer still does not name its four movements.**
[05-premiere-etape](2026-10-11-onboarding/05-premiere-etape.webp). Asked on 10/09. The subtitle
sits on the clouds, the brightest part of the picture, and is the hardest text of the flow to
read. Fix: the four names in the empty band, on a plate. Kevin, Martine. → **A-05**.

**F5. Right after the first victory, Home asks the hero to go shopping.**
[13-home-apres-seance](2026-10-11-onboarding/13-home-apres-seance.webp): "Choisis ta prochaine
quête", "Choisir une quête". Rule 4 of `db/homeOffer.ts` skips a quest done today and nothing else
qualifies, so the card falls to the gallery. The day after it is fine. The hero's best moment ends
on the emptiest state of the card.
Fix: after a session today, say so and show tomorrow ("Fait pour aujourd'hui. Demain : …").
Maël, Kevin. → **P-05**.

**F6. The reminder offer opens Settings at the top and is spent by the tap.** The line appears at
the right moment, then `ReminderCard` calls `dismissOffer()` and pushes `/settings`: the hero
lands on "AVATAR", the RAPPEL section is two screens down, and the offer never comes back.
Fix: land on the section. Kevin. → **O-01.d**.

**F7. The safety line says "vous" on a screen that says "tu", at 12 px.** "Entraînez-vous dans
vos limites…" under "Quel est ton niveau ?". `safety.*` is on the allowlist of
`docs/product/writing.md`, so no test is wrong; the screen is. It is also the text that pushes the
level screen off a small display (B1).
Fix: a `tu` sentence written for this screen, one line, linking to the full safety page.
Martine, Sophie. → **E-04** if the question is redrawn, else with B1.

**F8. Eight game words before the first rep.** "Écuyer" and "étape" carry the first-session
offer, "légende" the village name, and the level screen offers "Régulier" and "Confirmé" with no
line saying what either means (10/09, still there). Fix: one plain line per level ("Débutant : je
commence ou je reprends"); "Ta première séance" for the title. Kevin, Martine.
→ **E-04**.

**F9. A restored hero arrives without a word.** The journey works
([r1](2026-10-11-onboarding/r1-ou-est-ton-heros.webp),
[r3](2026-10-11-onboarding/r3-douze-mots-saisis.webp),
[r4](2026-10-11-onboarding/r4-garder-le-mot-de-passe.webp)) and then drops the hero on Home with
no "Kerbati est de retour": Home does not show the village name, so a young hero cannot tell a
restore from a fresh install. Around it: the answers to "Où est ton héros ?" are "J'ai déjà une
sauvegarde" and "Retrouver mon héros sur mon cloud", which do not answer "where"; the 12 words go
in a one-line field that shows the last four; the next dialog says the backup "opened with its
password" after it opened with the words; the cloud sheet is titled "Où synchroniser"
([r5](2026-10-11-onboarding/r5-cloud.webp)).
Fix: a toast naming the village and the session count on arrival; "Dans un fichier" / "Sur mon
cloud"; a multiline field. Yann. → **O-01.e**.

**F10. Backup files cannot be told apart in the system picker.**
[r2-selecteur](2026-10-11-onboarding/r2-selecteur.webp). `bati-export-<id>-v3-<date>.batb` is cut
to "bati-export-c…" in the grid, three times. Fix: date first, `bati-2026-10-11-<id>.batb`.
Yann. → **O-01.e**.

**F11. Two durations for one session on the victory screen.** "Temps total 1:59" and "Séance la
plus longue 2 min 21 s", same screen, same session
([130-victoire](2026-10-11-onboarding/130-victoire.webp); the session had its warm-up skipped). On
the first run both read 4:12. Cause, traced in the persona review: the victory screen freezes
the duration when it opens, `saveSession` recomputes it later, and under 120 s the save waits for
the answer to "C'était court", so the journal counts the seconds spent reading a question.
Fix: P12 below. → **O-01.f**.

**F12. No way back on steps 2 to 4.** No arrow, the top-left corner is empty (10/09, still there).
❓ The system back gesture was not tested. → **A-05**.

**F13. "Retrouver mon héros" is not a button for a screen reader.** The node is
`clickable="false"` with no role (`presentation.tsx`, a `Text` with `onPress`). The skip on the
level screen has `accessibilityRole="button"`; this one does not. → with **O-01.e**.

### Ideas

- **I1. A first wow inside the first minute.** Today the first reward is the victory, four to
  eight minutes in. Naming the village could light its campfire on the picture behind the field.
  Maël. → A-05.
- **I2. One real question instead of a level.** "Tu viens pour quoi ?" answers what the level
  question tries to, in words nobody has to rank themselves by. Sophie, Martine. → E-04.
- **I3. The countdown before the first exercise reads "10" under "10 reps"**
  ([07-decompte](2026-10-11-onboarding/07-decompte.webp) shows the 8-rep version). A unit, or a
  ring, would tell them apart.
- **I4. "Plafond relevé. Le prochain sera plus haut."** is the first sentence a villager says to
  a hero who has never seen a ceiling. A first-victory line of its own.
- **I5. Large-font polish**: "Chevauché / e de l'Éclai…" breaks mid-word on Home, "Trop / facile"
  wraps in its chip, "Jeter" hides half under "Garder" on the short-session screen
  ([130-seance-courte](2026-10-11-onboarding/130-seance-courte.webp)), "Comment marche le
  chiffrement" is cut at the bottom of the 12-words sheet
  ([r0](2026-10-11-onboarding/r0-mots-notes.webp)).

### Set aside, with the reason

- **Warm-up pictures in three drawing styles** (flat grey jumping jack, glowing cat-cow, dark dead
  bug). True, and it is the brief's "pas de rupture de style", but it belongs to the exercise art
  redraw already under way, not to onboarding.
- **"Mon héros à l'abri" only appears after five sessions**, so an F-Droid hero with no system
  backup can lose four. The threshold is deliberate (`PROTECT_AFTER_SESSIONS`), the loss is small,
  and Kevin's rule forbids one more card on day one. The privacy policy already says which system
  backups carry the database. Revisit if a tester loses a hero.
- **Day two offers the same quest again.** A ready session beats a clever one; B3 is the part of
  this that matters.
- **A black frame between the countdown and the first exercise**, seen once in a capture at
  130 %. ❓ One frame, not reproduced, not chased.
- **Language after a restore.** The restored hero came back in English, but French had been forced
  per app for the test and was never chosen in Settings. An artefact of the method.

## Against the brief

| Absolu | State |
|---|---|
| A first wow in under 60 s | ⚠️ The first reward is the victory (I1) |
| First rep as early as possible | ⚠️ 5 screens, 6 taps and a keyboard (F1, F2) |
| One simple goal question | ❌ Not asked. → E-04 (I2) |
| An honest starting level | ❌ Asked, then not used for the dose (B3), not editable (B2) |
| Learn by playing | ✅ The session teaches itself, apart from its first card (F3) |
| Everything skippable and editable later | ⚠️ Name is not skippable (F1), level is not editable (B2), skip lost at 130 % (B1) |
| Permissions at the right time | ✅ |
| Visible progress | ✅ Four dots, though the first screen has none |
| A reward at the end | ✅ |
| Free is clear | ✅ No paid surface exists. Nothing says so either, and nothing needs to |
| No account, simple restore | ✅ with F9, F10 |
| A Home that knows what to offer tomorrow | ✅ tomorrow, ⚠️ tonight (F5) |

| Surtout pas | State |
|---|---|
| Long questionnaire | ✅ 2 questions |
| Paywall before the first victory | ✅ |
| Mandatory account | ✅ |
| Tutorial wall | ✅ |
| Permission burst | ✅ |
| Guilt | ✅ None met. "C'était court" offers to keep or drop a short session without blame |
| Jargon | ⚠️ F8 |
| Fake promises | ✅ |
| Mandatory weight or height | ✅ |
| Keyboard for nothing | ⚠️ F1 |
| Style break | ⚠️ Warm-up art, set aside above |
| Empty Home afterwards | ⚠️ F5 |

## Personas

| Persona | Verdict | What blocks | Proposed fix |
|---|---|---|---|
| 🏋️ Sophie | ❌ | No written rule from level to dose; two doors, two doses (B3) | One start path, one rule (O-01.b) |
| 🌱 Martine | ❌ | "Passer" off screen at 130 % (B1); a jump first, countdown and GO below the fold (F3); "modifiable" is not (B2) | P3, P6, P2 |
| 🧮 Yann | ⚠️ | Two durations on one screen (F11); silent restore, unreadable file names (F9, F10) | Trace F11; name the hero on arrival; date first |
| 🥾 Erwan | ∅ | The journey asks nothing of GPS and shows the three outings on day one | |
| 🛋️ Kevin | ⚠️ | Keyboard, six taps, three identical buttons, a wait that reads as a running movement (F1, F2, F3) | P4, P5, P6 |
| 🎲 Maël | ⚠️ | No wow before the victory (I1); Home after the win says "choisis" (F5); the level question has no visible effect (B3) | P-05, O-01.b |

Red lines touched: none. No data lost, nothing paid, nothing leaves the phone unsaid, nothing
punishes.

Verdict: **passes with corrections.** Three blockers, none of which stops a hero at 100 % on an
ordinary phone.

The one that counts most: **B3.** It is the only finding where the app does something to a body
that no rule decided, and P-05 is about to redraw the card that causes half of it.

## Since 10 September

| Stranger's finding (10/09) | Today |
|---|---|
| Home forgot the first session | Fixed |
| "I already have a backup" on an app installed a minute ago | Fixed: "Retrouver mon héros", then the choice |
| Level labels explain nothing, "Regular" is ambiguous | Still there (F8) |
| The same button sentence on consecutive screens | Still there, now on three (F2) |
| The first session will not name its movements | Still there (F4) |
| No way back in onboarding | Still there (F12) |

## Proposed tasks

| Code | What | Findings |
|---|---|---|
| A-05 | Four screens without a keyboard, relabelled, scrollable, with the movements named | B1, F1, F2, F4, F12, I1 |
| E-04 | One question, plain words, a `tu` safety line | F7, F8, I2 |
| P-05 | Home the evening of the first victory | F5 |
| O-01.a | A "Niveau" row in Settings | B2 |
| O-01.b | One door to the first quest, one rule from level to difficulty | B3 |
| O-01.c | First warm-up: countdown and GO visible, full instruction, no impact for a beginner | F3 |
| O-01.d | The reminder offer lands on its section | F6 |
| O-01.e | Restore: say who came back, name the choices, readable files, a real button | F9, F10, F13 |
| O-01.f | One end stamp for the victory screen and the journal | F11 |

## Agreed fixes

Twelve fixes, P1 to P12, one or more per finding. Nothing is coded. They were put to the six
personas, each played by a reviewer reading the code, and rewritten until none had a required
change left: three rounds. Round 1 returned five "to correct" and no agreement; it also showed
that F3 and F11 above were misread, and that three of the proposed fixes would have broken
something (a migration overwriting a synced answer, a backup rename that stopped the pruning of
old copies, a duration fix that kept the wrong figure). Final verdicts: Sophie, Martine, Yann,
Kevin and Maël accept the fixes as written; Erwan is not concerned, no fix touches an outing.
Kevin, Maël and Erwan judged round 2; the round 3 edits were the two changes Sophie and Yann
still required, one of them raised by Kevin's reviewer.

Still estimates, to be settled by the captures of P3: every height at 130 %. From memory, not
tested: `secureTextEntry` with `multiline` (P11).

### Net effect on the journey

| | Today | After |
|---|---|---|
| Screens before the first rep | 5 | 5 |
| Taps | 6 (5 if skipped) | 5 (4 if skipped) |
| Keyboard | mandatory | never needed |
| Choices on the question screen | 3, one of them without effect | 2, both with an effect |
| First warm-up card | 10 s wait whose countdown and GO are below the fold | same 10 s wait, countdown and GO visible |
| First movement for a beginner | a jumping jack | a movement without impact |

### P1. One rule from the answer to the dose, on every door (B3)

**The question has two answers, not three.** `trainingLevel` has one reader
(`getEligibleQuestIds`) and it only looks at `beginner`; "Régulier" and "Confirmé" do the same
thing today and would under any honest rule (Sophie: never Hard by default). So the screen offers
"Je commence ou je reprends" (stored `beginner`) and "Je m'entraîne déjà" (stored `regular`). A
stored `advanced` is read as `regular`; nothing is migrated.

**The rule**, written in `docs/gameplay/progression.md` and coded once:

```
difficulty a quest starts at =
     the level the hero picks on the quest screen for this start
  ?? the saved config of this quest
  ?? the difficulty of the hero's last session of this quest (journal, completed_sessions)
  ?? startingDifficulty(trainingLevel):  beginner -> Easy, no answer -> Easy, regular -> Medium
```

- Hard is never a first default. It is reached by the hero's choice on the quest screen; inside
  an adventure, by the existing feedback suggestion (`suggestDifficultyFromSessions`, 3 sessions
  out of 5), which only adventures read, and a quest lived at Hard reopens at Hard through the
  journal line. `progression.md` says exactly that and nothing more.
- Inside an adventure, the level the adventure proposes (`?level=` in the route) goes in front of
  the cascade, as today; `startingDifficulty` only replaces its hard-coded `medium` base for a
  hero with no session. `progression.md` says so.
- The gallery reads the last difficulty per quest in one grouped query, not one per card.
- **Every door reads it**: `loadConfiguredQuest` (Home, onboarding), the quest screen's default
  (`quests/[id].tsx:203`), the previews (`db/preview.ts`, `trainingLevel` read once in
  `previewQuests` and passed down), and the adventures' `defaultDifficulty`
  (`adventures/[id].tsx:297`, `adventures/index.tsx:431`).
- Onboarding's "Commencer" uses the same loader as Home's day-one card and keeps
  `router.replace`, so Back from the session does not return to the offer.
- **Outings are out of the rule**: they stay Medium at their four existing sites. One unit test:
  a beginner's outing is Medium.
- **Existing heroes, no migration.** The journal line protects what they have lived: a quest they
  already played restarts at the difficulty they last played it at, on any device (sessions sync,
  quest configs do not). What changes: for a hero who answered "Débutant" or never answered, a
  quest *never played* now opens at Easy instead of Medium. That is the rule doing its job, it is
  one tap to change on the quest screen, and the changelog says it in one line.
- Tests: the rule table as a unit test; the Maestro onboarding flow reads the first quest's
  target after entering by "Commencer", by "Plus tard" then Home, and by an adventure step, and
  the three must be equal. `golden-hero` may move: read the list before regenerating.


### P2. The answer is editable in Settings (B2)

A row next to "Matériel", labelled **"Point de départ"** ("niveau" is the hero's XP level in the
glossary, and Home already shows "Niveau 1"), with the same two choices and the same wording as
onboarding. One line under it says what it changes: "Règle les quêtes proposées et la dose des
quêtes que tu n'as jamais faites." It never touches saved configs, history or records. The
onboarding screen's title becomes "Tu en es où ?" and its sentence "Tu pourras changer dans les
Réglages." `docs/product/glossary.md` gets the entry.


### P3. Every onboarding screen fits at 130 % (B1)

- On the question screen, "Passer" moves to the top right of the header (text button, 48 dp
  target). The two choices go in a `ScrollView`; the safety line and the filled button are pinned
  under it, above the gesture bar. Choice rows use a minimum height, not `height={56}`.
- **Pass criterion, for the four onboarding screens and for the warm-up wait card**: at 360x640,
  at 100 % and at 130 %, nothing is cut, and the primary button, the way out ("Passer", "Plus
  tard") and, where there is one, the safety line and the countdown are visible without
  scrolling. One before/after capture per screen and per scale.


### P4. No keyboard on the way in (F1)

The village name arrives prefilled with a name drawn from one list of about twenty, the same in
every language (place names are not translated; no list exists today, it is written once). The
button is live on arrival; tapping the field edits it as today; the name stays editable in
Settings. No "another name" link.


### P5. Buttons say what they do (F2, F12)

Steps 2 and 3 end on "Continuer", under a new key. `onboarding.finish` stays on step 4's fallback
button (the way home when the quest cannot load), which must not say "Continuer". Steps 2 and 3
get the shared `ScreenBackButton`; step 4 has none ("Plus tard" is its exit).

### P6. The first warm-up card shows its wait (F3, corrected)

- No new wait and no change to its length: the 10 s (`PREP_SECONDS`, sourced) and the "GO on tap"
  setting stay as they are.
- The countdown and GO come out of the scrolling block and are visible without scrolling
  (criterion of P3). The instruction scrolls under them, in full. The picture keeps its size;
  `PrepView`'s `compact` layout (a 64 px thumbnail) is used only if the criterion cannot be met
  otherwise.
- "encore X:XX" does not count down during the wait.
- The dose label ("30 s", "15 s par côté") stays.
- The RAMP order is not touched. For a hero whose answer is "Je commence ou je reprends" or who
  gave none, every movement of the `RAISE` and `POTENTIATE` groups (Jumping Jack, High Knees, Star
  Jump, Skater Hop, Mountain Climber, Jump Squat), as one exported constant, is added to the
  `unavailable` set in `loadWarmupContext` (`stores/session.ts`), so the quest screen's preview
  and the session read the same list. Removing only two names would not do: `take()` moves to the
  next name of the group, and `NO_IMPACT` is only reached when the group is empty. No new
  exercise, no picture, no migration.
- Test: for a beginner, the first step of `buildWarmup` is in `NO_IMPACT` for `sessionCount` 0
  to 5.



### P7. Plain words and a `tu` safety line (F7, F8)

- The two choices are sentences a non-player understands (P1). No "Régulier", no "Confirmé".
- Step 4's title is "Ta première séance" (the key is shared with Home's day-one card, so both
  doors say the same); "écuyer" leaves the subtitle; "légende" leaves the village subtitle.
- The safety line is a new `onboarding.*` key in `tu`, 14 px, with a 48 dp target that opens
  "S'entraîner en sécurité": "Écoute ton corps. Douleur, blessure, grossesse ou souci de santé :
  parles-en d'abord à un médecin." `safety.onboarding_line` is deleted if nothing else reads it.

### P8. The first session names its movements (F4)

Step 4 shows, on an ink plate in the empty band, the four movement names, the rounds and the
minutes of the quest **as loaded by P1's loader** (`quest.rounds`, `estimateQuestSeconds`, the
function Home uses): no literal figure. The subtitle moves onto the plate. Held to P3's criterion.


### P9. Home the evening of a session (F5, inside P-05)

When a session was done today and nothing else qualifies, the stage says "Fait pour aujourd'hui."
and "Ta prochaine séance : <quête>, <minutes>". No date, no "demain".

- The quest named comes from `decideHomeOffer`'s own cascade with the "not done today" guard
  lifted, not from a second rule. A test asserts the quest named in the evening is the one offered
  the next day.
- In this state the stage has no filled button. "Choisir une quête" stays as a text link for the
  hero who wants more.
- An outing that counts as a session (`countsAsSession`, `OUTING_COUNTS_AFTER_SECONDS`) counts as
  "done today". With no quest to name (a hero who only
  does outings), the first sentence stands alone.
- No notification is added. If the reminder reads this new state, it says the same thing.


### P10. The reminder offer lands where it points (F6)

The line opens Settings scrolled to RAPPEL (Settings has no anchor today, one is added). The
offer is still spent by the tap.

### P11. Restore says who came back (F9, F10, F13)

- After a restore that brought data (not when a merge reports `merged: false`): a toast
  "<Village> est de retour : N séances." N comes from the journal's own count.
- "Où est ton héros ?" answers "Dans un fichier" / "Sur mon cloud".
- The secret field stays masked by default with its eye and `autoCorrect={false}`; it becomes
  multiline only while the eye is open, and "Terminé" still submits.
- The follow-up dialog says "ouverte avec ses 12 mots" when that is what happened.
- New exports are named `bati-<date>-<id>-v3.batb`. The picker does not filter by name, so old
  files still import. The three places in `src/backupFiles.ts` that read an export's name
  (`snapshotUri` for the 5-copy pruning, `sealedCopiesIn` for a phone that lost its key, and the
  sweep of the previous export in `writeSnapshotNow`, `startsWith(EXPORT_PREFIX)` at :206)
  recognise both forms, with one test per form in each. The sweep keeps its prefix test and adds
  the new form: it also clears `bati-export-plain.tmp.db`, the draft a crash can leave. The sweep
  is not widened to `bati-`, which would take `bati-sync-out.batb`. `nameIsId` in
  `src/deviceSync.ts` is an identity check on sync files and is not touched.



### P12. One duration on the victory screen (F11, traced)

Cause: `VictoryView` freezes the duration when it opens; `saveSession` recomputes it with its own
`Date.now()`; under 120 s the save waits for the answer to "C'était court", so the journal counted
the seconds spent reading a question. Fix: stamp the end once, when the session becomes
`finished` (both transitions, in the same `set` as the `totalPausedTime` correction), keep it in
`SavedSessionState` (the session snapshot is cleared at `finished` today, so this does not yet
survive a kill on "C'était court", which loses the short session as before), and have both
`recordedDurationSeconds()` and `saveSession` read that instant. Test:
a session under 120 s, kept after a delay, has the same duration on the victory screen and in the
journal.


### Not fixed here

Ideas I1 to I5 and the "set aside" list of the audit stay as they are.

## Built, replayed and re-audited (same day)

The twelve fixes are coded, with one addition: the "first fire" on the naming screen, which
answers idea I1 and the brief's first absolute. Replayed from a fresh install on a release build
at 360x640, at font scale 1.0 and 1.3, with a real soft keyboard this time; the `after-*`
captures sit beside the "before" ones.

| | Before | After |
|---|---|---|
| Install to first rep | 5 screens, 6 taps and the keyboard | 5 screens, 5 taps, no keyboard (4 taps with "Passer") |
| First movement of a hero who is starting | a jumping jack | a glute bridge ([after-05](2026-10-11-onboarding/after-05-attente-debutant.webp)) |
| First quest, "I'm starting or coming back" | 8 wall push-ups by onboarding, 10 by Home | 8 by both doors, and the adventure opens at Easy ([after-17](2026-10-11-onboarding/after-17-aventure-facile.webp)) |
| First quest, "I already train" | same as above | 10 ([after-07](2026-10-11-onboarding/after-07-exercice-10-reps.webp)) |
| A short session kept after a 30 s wait | 1:59 and 2 min 21 s | 1:42 and 1 min 42 s |
| Home the evening of a session | "Choisis ta prochaine quête" | "Fait pour aujourd'hui." and the quest Home offers the next day ([after-13](2026-10-11-onboarding/after-13-home-soir.webp), [after-14](2026-10-11-onboarding/after-14-home-lendemain.webp)) |
| First reward before any rep | none | the hamlet lights up and takes the hero's name ([arrival](2026-10-11-onboarding/after-02a-village-arrivee.webp), [lit](2026-10-11-onboarding/after-02b-village-feu.webp)) |
| 130 % | "Passer" off screen | five screens whole ([question](2026-10-11-onboarding/after-130-03-question.webp)) |

**Where the build departs from the text above**, each accepted by the persona it concerns:

- P6: the wait card uses the thumbnail layout, since the full picture pushed the movement's name,
  dose and instruction under the fold; and "Bear Crawl" joined the beginner's list, because with
  Squat and Lunge still out of reach it was what `NO_IMPACT` opened day one on.
- P7: the safety line lost its first sentence and the progress dots moved into the top row, so
  the second answer is whole at 130 %. The chosen answer is outlined, not filled: one filled
  button per screen.
- P2: the Settings row carries its answer in the note under it; a value on the right truncated.
- P4: the naming screen is a plate (title on ink, the hamlet in a band, the field under it), and
  with the keyboard open its two sentences fold away so "Continuer" stays above the keys.
- P9: the reminder reuses the "left longest" sentence for the new state.
- P11: the secret field was already visible by default, on purpose; it is multiline while it is.
- P12: the end stamp is in `SavedSessionState`, but the snapshot is cleared at `finished`.
- The first-session screen uses the quest's own cover, the one the victory shows again.

**Found by the review before the pull request**, and fixed: a hero with no answer is read as
starting only while their journal holds fewer than five sessions (`isStartingOut`), so the update
changes neither the dose nor the warm-up of a hero who was here before the question; a quest the
hero wrote starts as written; the merge notice has the same single reader as the restore notice;
the safety line is an actionable control for a screen reader; `main-journey.yaml` asserts the
evening Home. So the "existing heroes" note of P1 now only concerns a hero who answered
"Débutant".

**Verdicts on the built app.** Sophie, Martine, Yann, Kevin and Maël accept it; Erwan is not
concerned. Sophie's only required change in this round was the bear crawl. The art director
signed the first fire on the third reading, after a screen recording showed the veil lifting, the
caption was kept on one line under the window for a 20-character name, and a render test held
the `lit`/`name` contract.

**Restore, replayed on the built app.** From a fresh install: "Retrouver mon héros", "Dans un
fichier", the file, and Home says "Pierrefeu est de retour : 1 séance."
([choice](2026-10-11-onboarding/after-r1-ou-est-ton-heros.webp),
[arrival](2026-10-11-onboarding/after-r3-de-retour.webp)): 3 taps. An encrypted backup adds its
12 words, typed without accents in a field that now shows all of them
([words](2026-10-11-onboarding/after-r6-douze-mots.webp)), and the next dialog says it opened
"avec ses 12 mots" ([dialog](2026-10-11-onboarding/after-r7-ouverte-avec-ses-mots.webp)). A hero
already restored restores again from Settings, "Restaurer une sauvegarde", behind a confirmation
that names what is replaced
([confirmation](2026-10-11-onboarding/after-r4-restaurer-depuis-reglages.webp)): 3 taps too. The
replay found the toast shown twice (two readers took the notice before either had deleted it);
`takeRestoreNotice` now serves one reader, with a test. Two backups of the same day still read
alike in the picker's grid, told apart by their time
([picker](2026-10-11-onboarding/after-r5-deux-fichiers.webp)); under the keyboard "Ouvrir" is
half covered and the keyboard's own key submits; the keyboard still offers suggestions on the 12
words.

**Verified before the pull request**, on the same emulator:

- Reduced motion (system animations off): the naming screen's first frame is its last, lit, the
  name set, no ember ([capture](2026-10-11-onboarding/after-02r-mouvement-reduit.webp)).
- The accessibility tree of the three screens: every control is a button with its label, the
  chosen answer is exposed as selected, "Retrouver mon héros" is 312x48 dp. The safety line was
  not exposed as actionable; it is now.
- A backup named the old way (`bati-export-<id>-v3-<date>.db`) restores from a fresh install.
- English, Spanish and German on the four screens and the wait card, German also at 130 %
  ([question](2026-10-11-onboarding/after-130-03-question-de.webp)): its safety line was
  shortened by one line so the second answer is whole. An editor's pass on the three languages
  found nothing blocking and a handful of wordings, applied.
- Maestro, run against the release build: `app-launch`, `main-journey`, `adventure-journey`,
  `journal-after-session`, `session-interruptions`, `explore-tabs` pass. `main-journey` now
  asserts the evening Home, and `adventure-journey` scrolls to the step rows, which start under
  the fold on a 640 dp screen.

**Still not verified**: TalkBack itself (the tree was read, nobody listened), a restore from the
cloud, an outing, and the three-door comparison as a Maestro flow (it is a jest test and a
manual replay). One thing met on the way and left alone: Gradle's bundle task did not see a
change limited to `locales/*.json` and reported itself up to date.
