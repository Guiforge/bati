---
title: Session Details
type: screen
route: /journal/[id]
status: active
updated: 2026-09-16
related: [journal.md, session.md, ../gameplay/statistics-progress.md, ../gameplay/boss-fights.md]
sources: ["app/(tabs)/journal/[id].tsx", components/journal/QuestLog.tsx, components/journal/KillReport.tsx, db/journal.ts]
---

# Session Details (`/journal/[id]`)

One route, two pages: the **quest log** for any session, and the **kill report** when the session
is the one that felled a boss (the last step of a finished boss campaign). The history row and the
Bosses felled page open the same page for the same kill.

Both follow the Journal's design (see [journal.md](journal.md)), from the design project "Journal
Bati", option 3b drawn on the 3c colours. Neither starts anything: every button opens the quest or
the adventure, and the hero starts it there.

## The quest log

1. **The painting** of the quest, fading into the ground, with the title and "Yesterday at 11:58 ·
   Hard · 3 rounds · 10 min".
2. **A record fell**, when one did: the one raised panel of the page, with the value, what it
   beat, and the number that beats it next time (`getFallenRecords`). On a first attempt it says
   "A first record", since nothing fell.
3. **Where it sits**: this run's place among every run of the quest, by reps, or among every
   outing, by ground, with all the runs drawn as bars (`getQuestStanding`), the best with its date,
   and, below the best, how far under it this run is. Absent on a first run.
4. **What it moved**: the XP (with the level bar, on the latest session only, since the level is
   today's), the reps sent to the village (with the hold rule, "holds at 1 per 3 s", when the
   session had a hold), the muscle whose thirty-day share moved most
   (`getMuscleShift`), and the rung its movements are climbing (`getSessionRung`). Once that rung is earned and it
   forks, the line names the other movements it opens too, in the exercise page's words ("The same
   rung also leads to Pike Push-Up, Diamond Push-Up."). An outing says
   what ground pays for instead.
5. **The rounds**, one line per movement: the sets in order, the target, gold when every set cleared
   it and a quiet number for the set that missed. Each line opens the movement. An outing shows its
   trace, moving time, climb and pace instead, and opens the map.
6. Notes, then "Take this quest again".

## The kill report

1. **The defeated painting**, "Felled · September 15, 2026", the boss, and "An adventure of 4
   quests, over 9 days".
2. **Its health**, drawn at zero.
3. **The last blow**: the movement, its value and round, and the health it took. Read from the
   damage log, which records every hit with its session and movement; the round is recorded since
   `0061`. A hit logged before that names the movement without its set, and the campaign's own
   closing blow (`finishBossFight`) is named as the end of the campaign.
4. **What hurt it**: damage per movement over the whole campaign, with the note that weak spots
   and critical hits change what a rep is worth.
5. **What it left**, then "Face it again".

`getKillReport` scopes the damage log to the campaign run the session belongs to, because a rematch
reuses the same fight row.
