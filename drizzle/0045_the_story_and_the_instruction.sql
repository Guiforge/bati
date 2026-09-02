-- A quest tells the story, a movement tells you how. On the three outings they told both, twice.
--
-- An expedition is one quest holding one movement, so its detail screen shows a quest description
-- and an exercise description within a hundred pixels of each other, and 0042 wrote the pace
-- advice into both. "Sortez à une allure où vous pourriez parler" sat above "Marchez à une allure
-- où vous pourriez tenir une conversation"; "A mount covers in an hour what a walker covers in
-- four" sat above "A mount covers four times a walker's ground in the same hour". Read once it is
-- guidance, read twice in two phrasings it reads as padding.
--
-- The movement keeps the instruction, which is where a hero looks for it and where a substitution
-- carries it. The quest keeps the story, and only the story.
--
-- Written without addressing anyone. Not a stylistic flourish: the seeded catalogue says `vous`
-- (29 of 65 movement descriptions) while the app says `tu`, because `locale-style.test.ts` reads
-- `locales/*.json` and has never been able to see a database row. Rewriting three quests into
-- `tu` would have put both registers on one screen; rewriting the catalogue is its own piece of
-- work. A description with no second person in it is correct either way, and stops these three
-- from having to pick a side before that work happens.
--
-- Only `quests` is touched, so the two-population rule for `exercises` does not apply here.

UPDATE `quests` SET
    `enDescription` = 'The walls hold because someone walks them. Every night the round falls to one more pair of boots, and the ground gets seen because of it.',
    `frDescription` = 'Les murs tiennent parce que quelqu''un les longe. Chaque nuit la ronde échoit à une paire de bottes de plus, et le terrain finit par être vu.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Warden''s Round' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `enDescription` = 'Something has to reach the next village before dark, and there is nobody else on the road tonight.',
    `frDescription` = 'Quelque chose doit atteindre le village voisin avant la nuit, et il n''y a personne d''autre sur la route ce soir.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Word Must Travel' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `enDescription` = 'The map stops being a rumour where an outrider has been. Everything past that line is hearsay from traders.',
    `frDescription` = 'La carte cesse d''être une rumeur là où un éclaireur est passé. Tout ce qui est au-delà n''est qu''un ouï-dire de marchands.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Long Reach' AND `author` = 'Admin';
