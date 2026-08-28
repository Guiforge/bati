-- Une séance s'appelait « 143 », et son voisin aussi.
--
-- `completed_sessions.id` est un `INTEGER PRIMARY KEY AUTOINCREMENT` : un compteur, local au
-- fichier SQLite. Deux appareils qui s'entraînent la même semaine écrivent tous les deux
-- `id = 143`. Tant que la sauvegarde est un `VACUUM INTO` du fichier entier (db/backup.ts), ça ne
-- se voit pas — restaurer, c'est remplacer. Le jour où deux journaux doivent fusionner ligne à
-- ligne, il n'existe aucune clé pour dire « cette séance-là », et quatre tables pointent déjà vers
-- cet id (completed_exercises, boss_damage_log, adventure_run_steps, resource_transactions).
-- Le coût de cette fusion grandit à chaque semaine de journal ; on pose l'identité maintenant,
-- pendant que le backfill est petit.
--
-- Trois colonnes, et rien qui change de comportement : `id` reste la clé primaire, reste ce que
-- lisent les jointures, la route journal/[id] et le départage de db/exercises.ts. On pose
-- l'identité, on ne la branche pas.
--
-- `uuid` est un v7 (db/uuid.ts) : ses 48 premiers bits sont la milliseconde unix, donc trier les
-- chaînes trie les séances. Le backfill ci-dessous le reconstruit à partir du `performedAt` de
-- chaque ligne, avec la même disposition — c'est ce qui fait qu'avant comme après cette
-- migration, `ORDER BY uuid` vaut `ORDER BY performedAt`. `(random() & 3)` plutôt qu'un
-- `abs(random()) % 4` : `abs()` déborde sur la seule valeur minimale de l'entier signé, et un
-- masque de bits ne déborde jamais.
--
-- `tzOffsetMin` est positif à l'est de Greenwich — Paris en été vaut 120, soit l'inverse de
-- `getTimezoneOffset()`. `dayKey()` calcule le jour en heure locale de l'appareil et n'a jamais
-- écrit dans quel fuseau il l'a fait ; sans cette colonne, une séance rapatriée d'un autre
-- appareil tombe sur le mauvais carré de calendrier sans que rien ne puisse le détecter.
-- `datetime(..., 'localtime')` lit la base de fuseaux de l'appareil *à l'instant de la séance*,
-- donc l'heure d'été de cette date-là, pas celle d'aujourd'hui.
--
-- `originDevice` n'est pas backfillé : rien dans cette base ne dit quel appareil a écrit une
-- ligne d'avant aujourd'hui, et NULL veut dire « inconnu », ce qui est vrai.
--
-- Les colonnes restent nullables : `ADD COLUMN NOT NULL` exigerait une valeur par défaut
-- constante, ce qu'un uuid n'est pas. La garantie est dans le type et le `$defaultFn` du schéma.
-- L'index UNIQUE tolère plusieurs NULL en SQLite, donc une ligne écrite en SQL brut — le seeder
-- de développement — ne peut pas transformer cet index en migration qui échoue pour toujours.
-- C'est la leçon de 0035, appliquée à une autre table.

ALTER TABLE `completed_sessions` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `completed_sessions` ADD `originDevice` text;--> statement-breakpoint
ALTER TABLE `completed_sessions` ADD `tzOffsetMin` integer;--> statement-breakpoint
UPDATE `completed_sessions` SET
  `uuid` =
    substr(printf('%012x', `performedAt` * 1000), 1, 8) || '-' ||
    substr(printf('%012x', `performedAt` * 1000), 9, 4) || '-7' ||
    substr(lower(hex(randomblob(2))), 1, 3) || '-' ||
    substr('89ab', (random() & 3) + 1, 1) || substr(lower(hex(randomblob(2))), 1, 3) || '-' ||
    lower(hex(randomblob(6))),
  `tzOffsetMin` =
    (strftime('%s', datetime(`performedAt`, 'unixepoch', 'localtime')) - `performedAt`) / 60;--> statement-breakpoint
CREATE UNIQUE INDEX `completed_sessions_uuid_unique` ON `completed_sessions` (`uuid`);
