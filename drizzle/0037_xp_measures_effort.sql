-- L'XP mesurait l'horloge, pas le travail.
--
-- `computeSessionXp` valait `durationSeconds / 5` : le repos comptait, l'attente comptait, une app
-- en arrière-plan comptait. Un héros qui poussait le curseur de repos à son maximum de 300 s
-- gagnait plus qu'un héros qui s'entraînait, pour zéro effort. La formule lit désormais le travail
-- journalisé (`db/xp.ts`), mais le journal, lui, garde ce que l'ancienne a payé.
--
-- On ne rejoue pas l'histoire : `xpEarned` est intact pour tout le monde, et personne ne se
-- réveille rétrogradé. Sauf que `most_xp` est un record *par séance*, lu en direct par
-- `MAX(xpEarned)` sur le journal (`db/personalRecords.ts`) : sans ce passage, la séance qui a
-- exploité le bug reste le record « Most XP » à vie, affiché à celui qui a signalé le bug. C'est
-- exactement le trophée que la triche visait.
--
-- Donc : uniquement les séances aberrantes, ramenées à une barre volontairement généreuse.
--
-- La barre est `3 × rep-équivalents journalisés` — la conversion de `db/workUnits.ts`, celle des
-- dégâts de boss, et non la nouvelle formule complète. Aucune jointure sur `exercises` : le tempo
-- et la difficulté du mouvement n'entrent pas ici, ce qui évite au passage la règle des deux
-- populations (`0035`). Le facteur 3 couvre tout ce qu'une séance honnête pouvait légitimement
-- cumuler sous l'ancienne formule — un mouvement lent (`secondsPerRep` 5 contre la médiane 3) plus
-- le bonus ×1,5 de la quête du jour plafonnent vers 2,5. Une séance passée à attendre, elle, a un
-- rapport sans borne.
--
-- Une séance sans exercice ne peut pas exister (`createCompletedSession` lève), donc la sous-
-- requête ne rend jamais NULL sur une ligne que le WHERE a retenue.

UPDATE `completed_sessions`
SET `xpEarned` = MAX(
  10,
  3 * (
    SELECT SUM(
      CASE WHEN `ce`.`resultType` = 'time'
           THEN MAX(1, CAST(ROUND(`ce`.`resultValue` * 1.0 / 3) AS INTEGER))
           ELSE `ce`.`resultValue`
      END
    )
    FROM `completed_exercises` AS `ce`
    WHERE `ce`.`sessionId` = `completed_sessions`.`id`
  )
)
WHERE `xpEarned` > MAX(
  10,
  3 * (
    SELECT SUM(
      CASE WHEN `ce`.`resultType` = 'time'
           THEN MAX(1, CAST(ROUND(`ce`.`resultValue` * 1.0 / 3) AS INTEGER))
           ELSE `ce`.`resultValue`
      END
    )
    FROM `completed_exercises` AS `ce`
    WHERE `ce`.`sessionId` = `completed_sessions`.`id`
  )
);
