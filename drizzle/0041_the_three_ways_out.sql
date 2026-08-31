-- Three movements that happen outside the walls.
--
-- They carry a style of their own, `expedition`, and the distinction matters more than it
-- reads. `cardio` was the obvious home until someone counted it: it already holds eight
-- movements — burpees, jumping jacks, mountain climbers, high knees, bear crawls, jump squats,
-- skater hops, star jumps — across eleven slots of six shipped quests, all of them counted
-- repetitions that have been earning boss damage and village volume since the app shipped.
-- Cardio is what leaves you breathless. An expedition is what leaves the walls, and it is the
-- one measured in ground covered rather than repetitions — see docs/designs/expeditions.md.
--
-- Named the way the rest of the catalogue is named: the movement is real, the epithet is not
-- ("Berserker Burpee", "Monk's Mountain Climber"). A bicycle does not exist in this world, so the
-- ride is a mounted scout's and the hero knows what they are really pushing.
--
-- `measure` is `time` (0039): an expedition is held, not counted, and a substitution onto one of
-- these runs in *its* unit rather than the quest slot's. `pattern` is `locomotion`, which is what
-- burpees and mountain climbers were given in 0020 — these are the honest members of that family.
--
-- **No `exercise_muscles` rows, on purpose.** An expedition converts to zero rep-equivalents
-- (db/workUnits.ts), so a walk tagged `legs` would show the journal's balance card a leg trained
-- in N sessions for a volume of nothing — visible, and false. With no muscle rows the same card
-- says something true instead: these results come from an exercise with no muscles set, so they
-- are not counted there. Distance and leagues are where this work is counted.
--
-- Art: none yet. `getExerciseAsset()` falls back to `placeholder.webp`; the paths below are the
-- names the art will take, and the inventory lives in docs/content/missing-image.md.

INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `measure`, `secondsPerRep`,
        `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'Warden''s Walk',
        'Marche du Veilleur',
        'Walk at a pace you could hold a conversation at, and keep it there. The point is the ground covered and the time on your feet, not the effort.',
        'Marchez à une allure où vous pourriez tenir une conversation, et tenez-la. Ce qui compte est le terrain parcouru et le temps passé debout, pas l''effort.',
        'Admin', 'easy', 'none', 'expedition', 'locomotion', 'time', 1,
        'assets/images/exercises/wardens_walk.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `measure`, `secondsPerRep`,
        `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'Messenger''s Run',
        'Course du Messager',
        'Run at a pace you can sustain to the end, not the one you can start with. Walk when you need to and pick it up again — the distance is what arrives, not the style.',
        'Courez à une allure que vous pouvez tenir jusqu''au bout, pas à celle avec laquelle vous pouvez partir. Marchez quand il le faut et repartez — c''est la distance qui arrive, pas la manière.',
        'Admin', 'medium', 'none', 'expedition', 'locomotion', 'time', 1,
        'assets/images/exercises/messengers_run.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `measure`, `secondsPerRep`,
        `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'Outrider''s Ride',
        'Chevauchée de l''Éclaireur',
        'Ride steadily rather than in bursts. A mount covers four times a walker''s ground in the same hour, which is the whole reason to take one.',
        'Roulez régulièrement plutôt que par à-coups. Une monture couvre quatre fois le terrain d''un marcheur dans la même heure, et c''est toute la raison d''en prendre une.',
        'Admin', 'easy', 'none', 'expedition', 'locomotion', 'time', 1,
        'assets/images/exercises/outriders_ride.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
