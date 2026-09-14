-- "Five marches" became "Cinq marches", and a French reader climbs five stairs.
--
-- A march in the English is a leg of a journey, and The Squire's Path counts its five steps with
-- the word. The French took the other sense of `marche`, the one in a staircase, which reads as
-- nothing at all on a campaign card. `étape` is the word the rest of the adventure already uses
-- ("Étape 1 sur 5"), so the description now counts in the same unit as the card under it.
--
-- The English stays: "march" is the register the campaign is written in, and it is not wrong.
--
-- `author = 'Admin'` scopes it to the seeded row, the same key 0048 used to write this text.
UPDATE `adventures` SET
    `frDescription` = 'Tout héros commence par porter le bouclier des autres. Cinq étapes pour gagner le droit de lever une lame : sans barre, sans poids, sans excuse.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin';
