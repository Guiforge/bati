-- The half of the catalogue that was translated.
--
-- 0047 rewrote the sixty-five movement descriptions and left the quests alone. That is where the
-- machine-written French still lived: quests 10 to 19 (0006) and five of the eight adventures
-- (0003, 0006) were generated fantasy copy, translated word for word, sitting in the same gallery
-- as the outings and the calisthenics ladder. "forge des légendes des résilients" is not French;
-- it is "forges legends from the resilient" run through a machine. "ou tombe en essayant" is "or
-- die trying". "Ne casse pas" is "do not break", which in French is "ne cède pas". A hero reading
-- the gallery meets both voices two rows apart.
--
-- English is rewritten alongside, and not out of tidiness: the English is the source the French
-- was calqued from, so leaving it would regenerate the problem at the next translation. Same
-- reason writing.md widened the em-dash ban to English.
--
-- Four things happen here.
--
-- 1. Seventeen descriptions, quests and adventures, in both languages. The voice is the one the
--    later quests already use: a situation, its consequence, no abstract heroism. None of the
--    rewrites reintroduces the contrastive negation writing.md § 3 caps.
--
-- 2. Eleven of the forty step narratives are reshaped. The pool was 92 % two-sentence in French
--    and in English, above the three-quarters ceiling villagers.test.ts holds the villagers to,
--    and the shape was audible: statement, full stop, short order, forty times. Three of the
--    eleven also carried an em dash and three carried the "ce n'est pas X, c'est Y" figure. The
--    remaining twenty-nine are left alone; the fix is a pool that is not one shape, not a pool
--    rewritten wholesale.
--
-- 3. The same count, applied to the two pools the first draft of this migration forgot to
--    measure. Rewriting seventeen descriptions in one sitting put every one of them in the same
--    mould, and the numbers said so: quest descriptions went from 62 % two-sentence to 86 %, and
--    the eight adventure descriptions from 38 % to 100 %, all eight reading "statement. order."
--    That is the villagers' bug reproduced exactly, by the migration that quotes the villagers'
--    rule to justify itself. Six quests and three adventures are therefore written to one
--    sentence or to three.
--
--    __tests__/seed-copy-shape.test.ts now holds all three pools at the villagers' 75 %, in both
--    languages, so the next batch of copy cannot do this again quietly.
--
-- 4. Twelve French titles lose their English Title Case, under two rules that have no exceptions
--    and that between them leave the genuinely ambiguous titles alone.
--
--    A title with no leading article never capitalises past its first word. "Défi du Gantelet de
--    Fer", "Sprint à Travers les Terres d'Ombre", "Fuite de la Mine Effondrée": no article to
--    license the capitals, which is the English original showing through. Eight of those. And no
--    convention capitalises a verb or an adjective that follows its noun, article or not: "La
--    Parole Doit Passer", "Le Gant Arcanique", "L'Ascension Patiente", "La Veille des Bras
--    Tendus". Four more. Titan keeps its capital, being a name.
--
--    Untouched is the one shape French genuinely argues about: article, first noun, then a second
--    noun behind a preposition. "Le Chemin du Druide", "L'Épreuve du Colosse", "La Conquête du
--    Seigneur de Fer". Nineteen titles are built that way, they agree with each other, and the
--    "Les Trois Mousquetaires" convention is a real defence for them. Correcting some and not
--    others is the only outcome worse than leaving all of them.
--
--    No test holds any of this. Judging a French title by machine needs a proper-noun list
--    ("Titan" keeps its capital, "Gantelet" does not), and a list like that gets widened to land
--    a build, which is the failure mode AGENTS.md names everywhere else. writing.md § 6 says a
--    person still reads the copy; this is one of the things they read it for.
--
-- Also here, three things found by reading rather than by counting. The Squire's Path step 4,
-- seeded by 0048, stacked three appositions before its verb and could not be read aloud. "Ranger"
-- was the one English word left in a French title, in a game that says Éclaireur and Veilleur
-- everywhere else, so the adventure and its second step now say rôdeur. And quest 28 still said
-- "ce corps est le vôtre": the last `vous` in the database, which outlived 0029 and 0047 because
-- every scan written since looks for "votre" and none of them spells it with a circumflex.
--
-- Every row is matched on its English title and `author = 'Admin'`, the way 0048 does it: a hero
-- writes quests into the same table, and an id would eventually hit one of theirs. Nothing here
-- touches `exercises`, so seed-migration-guard.test.ts has nothing to say about it.

UPDATE `quests` SET
    `enDescription` = 'A knight holds a shield up at arm''s length all day, and the arms learn it in the end.',
    `frDescription` = 'Un chevalier tient son bouclier à bout de bras toute la journée, et les bras finissent par l''apprendre.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Knight Push' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'Forger la lame du dragon',
    `enDescription` = 'The iron is out of the fire and it will not stay hot for long. Strike while it gives, with the chest and the arms behind the hammer.',
    `frDescription` = 'Le fer sort du feu, il ne restera pas chaud longtemps. Frappe tant qu''il cède, la poitrine et les bras derrière le marteau.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Forge the Dragon Blade' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'Escalader la tour du Titan',
    `enDescription` = 'Every floor is won by the strength of the arms, and nobody has ever come back down from halfway up this tower.',
    `frDescription` = 'Chaque étage se gagne à la force des bras, et personne n''est jamais redescendu de la moitié de cette tour.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Climb the Titan''s Tower' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'Construire le bastion',
    `enDescription` = 'Stone by stone, the wall goes up. Work built crooked comes down in the end, and so does the body that built it.',
    `frDescription` = 'Pierre par pierre, le mur monte. Un ouvrage bâti de travers finit par tomber, et le corps qui l''a bâti aussi.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Build the Stronghold' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'Défi du gantelet de fer',
    `enDescription` = 'Few people come back through this door, and the ones who do stayed on their feet to the end.',
    `frDescription` = 'Peu de gens repassent cette porte, et ceux qui le font sont restés debout jusqu''au bout.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Gauntlet Challenge' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'Fuite de la mine effondrée',
    `enDescription` = 'The tunnel rumbles. Rocks come loose. You have a few minutes before the way out closes, so do not stop.',
    `frDescription` = 'Le tunnel gronde. Des pierres se détachent. Il te reste quelques minutes avant que la sortie ne se referme, alors ne t''arrête pas.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Escape the Collapsing Mine' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'Garder la porte de la forteresse',
    `enDescription` = 'The enemy charges and you are the only one at the gate. Hold as long as it takes. There is nobody behind you to take over.',
    `frDescription` = 'L''ennemi charge et il n''y a que toi à la porte. Tiens le temps qu''il faudra. Derrière toi, personne pour prendre le relais.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Guard the Fortress Gate' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'Le Gantelet arcanique',
    `enDescription` = 'The wizard draws the circle, steps back, and it all happens at the centre of the body, still, for as long as the line holds.',
    `frDescription` = 'Le sorcier trace le cercle, s''écarte, et tout se joue au centre du corps, immobile, aussi longtemps que le tracé tient.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Arcane Gauntlet' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `enDescription` = 'The trail runs under the trees and nobody runs on it. Stretch, breathe, let the hips open, that mends a warrior too.',
    `frDescription` = 'Le sentier passe sous les arbres et personne n''y court. Étire-toi, respire, laisse les hanches s''ouvrir, ça répare un guerrier aussi.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Druid''s Path' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'Sprint à travers les terres d''ombre',
    `enDescription` = 'The dark hunts you and it never tires, so run, and keep something back for the end.',
    `frDescription` = 'Les ténèbres te chassent et ne se fatiguent jamais, alors cours, et garde du souffle pour la fin.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Sprint Through the Shadowlands' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'Matin du champion',
    `enDescription` = 'The keep is still asleep. Wake the hips, the shoulders and the back, in that order, and you start the day on the right foot.',
    `frDescription` = 'Le donjon dort encore. Réveille les hanches, les épaules et le dos, dans cet ordre, et tu partiras du bon pied.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Morning of the Champion' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'La Parole doit passer',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Word Must Travel' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'La Veille des Bras tendus',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Straight-Arm Vigil' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frDescription` = 'Avant que le donjon ne s''éveille, le vieux rite : ouvrir les hanches, débloquer la colonne, se rappeler que ce corps est le tien. La journée ne commence pas avant.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Dawn Ritual' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `enDescription` = 'You are not a hero yet. You are the one who carries the shield, and today that is enough.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Squire''s Awakening' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `enDescription` = 'The march is over, the fire is lit. Undo what the road tied in knots, hips first, they carry you furthest.',
    `frDescription` = 'La marche est finie, le feu est allumé. Défais ce que la route a noué, les hanches d''abord, ce sont elles qui t''emmènent le plus loin.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Hearthside Unbinding' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `frTitle` = 'L''Ascension patiente',
    `enDescription` = 'No one is pulled to the top of the tower in a day. Hang, then hold, then lower slowly: the bar gives nothing away, and everything it does give, it keeps giving.',
    `frDescription` = 'Personne n''atteint le sommet de la tour en un jour. Suspends-toi, tiens, puis descends lentement : la barre ne cède rien, et tout ce qu''elle cède, elle te le laisse.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Patient Ascent' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `quests` SET
    `enDescription` = 'Every wall the village ever raised stands on a footing someone dug on one knee. One leg at a time, one side at a time, this is the work nobody sees and everything rests on.',
    `frDescription` = 'Chaque mur que le village a dressé repose sur une assise que quelqu''un a creusée à genoux. Une jambe après l''autre, un côté après l''autre, c''est le travail que personne ne voit et sur lequel tout tient.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Mason''s Footing' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `enDescription` = 'A stone golem has settled in the road, and it will take strength and wind to wear it down.',
    `frDescription` = 'Un golem de pierre s''est installé sur la route, et il faudra de la force et du souffle pour l''user.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Golem' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `enDescription` = 'Every trial in the keep, one after another, with the Iron Lord at the end. Nobody has made that road in one go.',
    `frDescription` = 'Toutes les épreuves du donjon, l''une après l''autre, et le Seigneur de Fer au bout. Personne n''a fait la route d''une traite.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `enDescription` = 'The monk moves slowly and arrives all the same, so breathe, hold the position, and come back tomorrow.',
    `frDescription` = 'Le moine avance lentement et arrive quand même, alors respire, tiens la position, et reviens demain.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `enDescription` = 'The kingdom is short of scouts who can hold the distance. Run, walk, set off again, and come home fit to leave again tomorrow.',
    `frDescription` = 'Le royaume manque d''éclaireurs qui tiennent la distance. Cours, marche, repars, et rentre en état de recommencer demain.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `frTitle` = 'Le Voyage du Rôdeur',
    `enDescription` = 'Leagues to cover, meetings along the way, and endurance for the only mount, on a road that never gets any shorter.',
    `frDescription` = 'Des lieues à faire, des rencontres en chemin, et l''endurance pour seule monture, sur une route qui ne raccourcit jamais.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `enDescription` = 'A gate does not fall while somebody stands behind it. The back and the brace keep that oath, one watch at a time.',
    `frDescription` = 'Une porte ne tombe pas tant que quelqu''un se tient derrière. Le dos et le gainage tiennent ce serment, une garde après l''autre.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'Something coiled in the underbrush will let you pass if your centre holds.',
    `frNarrative` = 'Quelque chose de lové dans les fourrés te laissera passer si ton centre tient.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'The shield sits right on the arm now. Before the blade there is one message to carry to the next village, due there by nightfall.',
    `frNarrative` = 'Le bouclier tient sur le bras, maintenant. Avant la lame, il reste un pli à porter jusqu''au village voisin, attendu là-bas à la tombée du jour.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'The forest edge is not far now, chop clean and breathe calm.',
    `frNarrative` = 'La lisière n''est plus loin, coupe net et respire calmement.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'Behind the first gate there is only how long you can hold still.',
    `frNarrative` = 'Derrière la première porte, il n''y a que le temps que tu tiendras sans bouger.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'The serpent squeezes slowly and waits for you to fold.',
    `frNarrative` = 'Le serpent serre lentement et attend que tu plies.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 2
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Monk''s Enlightenment' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'The wraith is made of wind. Shake it off.',
    `frNarrative` = 'Le spectre est fait de vent. Sème-le.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'Last run, the wraith is already thinning, finish it.',
    `frNarrative` = 'Dernière course, le spectre s''effiloche déjà, achève-le.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Scout''s Trial' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'The ground trembles under something heavier than you.',
    `frNarrative` = 'Le sol tremble sous quelque chose de plus lourd que toi.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Golem' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'Rangers earn their bread in the fields before they draw a bow.',
    `frNarrative` = 'Les rôdeurs gagnent leur pain aux champs avant de bander un arc.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 1
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'Last dawn, the titan is bark and moss now, and you are still walking.',
    `frNarrative` = 'Dernière aube, le titan n''est plus qu''écorce et mousse, et tu marches encore.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 6
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'You swore to hold this gate, and an oath like that is counted in nights.',
    `frNarrative` = 'Tu as juré de tenir cette porte, et un serment pareil se compte en nuits.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 0
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Guardian''s Oath' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `enNarrative` = 'The gauntlet is what is left of the ones who did not come back out.',
    `frNarrative` = 'Le gantelet est ce qui reste de ceux qui n''en sont pas ressortis.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
