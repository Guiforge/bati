-- Boss HP, re-derived from the content instead of remembered from 2026.
--
-- `0017` set every pool by hand at "~92 % of the campaign's total expected damage", measured
-- against the damage formula of the day — which included a crit that fired on 30 % of *every* set,
-- because the old rule only asked that the target be met and `adjustedReps` starts at the target.
-- Expected damage was therefore nominal x 1.3, and the pools were sized for it.
--
-- Two things happened since. The quests were rebalanced (0019-0024 renamed, re-patterned and
-- re-tuned them) and nothing re-checked the pools; and crit now has to be *earned*, so a hero who
-- never presses `+` deals nominal damage and nothing more. Measured against today's content, every
-- one of the six bosses outlived its own campaign at every difficulty -- no `defeatedAt`, no
-- victory variant, no village banner, ever.
--
-- The new values are `round(0.9 x the campaign's nominal rep-equivalent total at medium)`: the
-- boss dies nine tenths of the way through its last step for a hero who exactly meets every
-- target, and earlier for one who pushes. One rule, applied to all six, and
-- `__tests__/content-invariants.test.ts` now re-checks it at all three difficulties on every run,
-- so this cannot silently rot a second time. `getOrCreateBossFight` scales these by
-- USER_LEVEL_MULTIPLIER, so they are stated at medium and mean the same fight everywhere.

UPDATE `adventures` SET `bossTotalHp` = 278 WHERE `enTitle` = 'The Golem';--> statement-breakpoint
UPDATE `adventures` SET `bossTotalHp` = 425 WHERE `enTitle` = 'The Monk''s Enlightenment';--> statement-breakpoint
UPDATE `adventures` SET `bossTotalHp` = 770 WHERE `enTitle` = 'The Guardian''s Oath';--> statement-breakpoint
UPDATE `adventures` SET `bossTotalHp` = 764 WHERE `enTitle` = 'The Iron Lord''s Conquest';--> statement-breakpoint
UPDATE `adventures` SET `bossTotalHp` = 821 WHERE `enTitle` = 'The Scout''s Trial';--> statement-breakpoint
UPDATE `adventures` SET `bossTotalHp` = 1115 WHERE `enTitle` = 'The Ranger''s Journey';--> statement-breakpoint

-- Fights already in progress keep their *position* in the fight, not their absolute HP: rescaling
-- both ends by the same ratio means a hero who had the boss at 40 % still has it at 40 %. This is
-- also why it does not need to know which difficulty the fight was created at -- the ratio is the
-- same at all three. Defeated fights are left alone, so a win stays won.
UPDATE `boss_fights`
SET `currentHp` = MAX(
        0,
        CAST(
            ROUND(
                `currentHp` * 1.0 * (
                    SELECT ad.`bossTotalHp` FROM `adventures` ad
                    WHERE ad.`id` = `boss_fights`.`adventureId`
                ) / `totalHp`
            ) AS INTEGER
        )
    ),
    `totalHp` = MAX(
        1,
        (
            SELECT ad.`bossTotalHp` FROM `adventures` ad
            WHERE ad.`id` = `boss_fights`.`adventureId`
        )
    ),
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `defeatedAt` IS NULL
    AND `totalHp` > 0
    AND (
        SELECT ad.`bossTotalHp` FROM `adventures` ad
        WHERE ad.`id` = `boss_fights`.`adventureId`
    ) IS NOT NULL;--> statement-breakpoint

-- `0025` gave five paintings to six adventures and got the split wrong: The Lumber Route is
-- kind='route' and never creates a fight, so its titan was dead data, while The Golem -- an actual
-- boss -- had no portrait and fell back to its campaign cover, the exact defect 0025 was written to
-- fix. The monster's name is now read from this path too (`bosses.<key>.name`), so a missing
-- portrait costs the boss its name as well as its face.
--
-- The Golem shares stone_golem with The Guardian's Oath, the way The Ranger's Journey already
-- shares forest_titan. It is the campaign that most obviously wants its own painting.
UPDATE `adventures` SET `bossImagePath` = 'assets/images/bosses/stone_golem.jpg'
  WHERE `enTitle` = 'The Golem';--> statement-breakpoint
UPDATE `adventures` SET `bossImagePath` = NULL
  WHERE `enTitle` = 'The Lumber Route';
