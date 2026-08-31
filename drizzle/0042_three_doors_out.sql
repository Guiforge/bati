-- One quest per way out, so an expedition has a door.
--
-- 0041 seeded the three movements; nothing could reach them. A quest is what the app already
-- knows how to start, configure and save, and `db/questConfig.ts` already stores a target per
-- slot that the hero edits before leaving — which is the "choose your duration" of
-- docs/designs/expeditions.md without a line of new machinery. The design doc imagined a
-- synthetic quest assembled in memory; the mechanism was already on the shelf.
--
-- One round, one movement, no rest taken: `restSeconds` still has to sit in its archetype's
-- band, and `metabolic` is the honest one — continuous effort, low rest. There is no
-- `expedition` archetype because an archetype describes the *shape* of a session (how long the
-- rests are, how the targets are drawn), and on that axis an outing is metabolic.
--
-- The seeded targets are 10 to 20 minutes, which is not a statement about how far anyone should
-- walk. `content-invariants` holds every seeded quest to an 8-to-25-minute design window, and
-- the hero's own duration lives in their quest config, which is theirs and is not content. A
-- two-hour walk is one edit away and changes nothing here.
--
-- `AND e.creator = 'Admin'` on every read: `quest_exercises` is filled by looking an exercise up
-- by name, and since 0035 that name can belong to a hero. Rule 2 of the two-population model.

INSERT INTO `quests` (
        `enTitle`, `frTitle`, `enDescription`, `frDescription`,
        `author`, `rounds`, `restSeconds`, `archetype`, `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'The Warden''s Round',
        'La Ronde du Veilleur',
        'The walls hold because someone walks them. Go out at a pace you could talk at, and come back having seen the ground.',
        'Les murs tiennent parce que quelqu''un les longe. Sortez à une allure où vous pourriez parler, et rentrez en ayant vu le terrain.',
        'Admin', 1, 30, 'metabolic',
        'assets/images/quests/wardens_round.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 0, 'time', 600, 1200, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Warden''s Walk' AND e.`creator` = 'Admin'
WHERE q.`enTitle` = 'The Warden''s Round';
--> statement-breakpoint
INSERT INTO `quests` (
        `enTitle`, `frTitle`, `enDescription`, `frDescription`,
        `author`, `rounds`, `restSeconds`, `archetype`, `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'Word Must Travel',
        'La Parole Doit Passer',
        'Something has to reach the next village before dark, and it is you. Hold a pace you can arrive at, not the one you can leave at.',
        'Quelque chose doit atteindre le village voisin avant la nuit, et c''est vous. Tenez une allure à laquelle vous pouvez arriver, pas celle à laquelle vous pouvez partir.',
        'Admin', 1, 30, 'metabolic',
        'assets/images/quests/word_must_travel.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 0, 'time', 600, 1200, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Messenger''s Run' AND e.`creator` = 'Admin'
WHERE q.`enTitle` = 'Word Must Travel';
--> statement-breakpoint
INSERT INTO `quests` (
        `enTitle`, `frTitle`, `enDescription`, `frDescription`,
        `author`, `rounds`, `restSeconds`, `archetype`, `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'The Long Reach',
        'La Longue Portée',
        'A mount covers in an hour what a walker covers in four. Take one out and find where the map stops being a rumour.',
        'Une monture couvre en une heure ce qu''un marcheur couvre en quatre. Sortez-en une et allez voir où la carte cesse d''être une rumeur.',
        'Admin', 1, 30, 'metabolic',
        'assets/images/quests/long_reach.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 0, 'time', 600, 1200, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Outrider''s Ride' AND e.`creator` = 'Admin'
WHERE q.`enTitle` = 'The Long Reach';
