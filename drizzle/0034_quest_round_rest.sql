-- Repos plus long pris à la fin d'une manche, à côté du `restSeconds` par set.
-- Nullable volontairement : NULL = « pas de repos de manche », soit exactement ce que faisaient
-- les quêtes seedées avant cette colonne. Un NOT NULL DEFAULT aurait exigé une valeur éditoriale
-- par archétype pour chacune. Seul l'éditeur de quête écrit cette colonne.
ALTER TABLE `quests` ADD `roundRestSeconds` integer;
