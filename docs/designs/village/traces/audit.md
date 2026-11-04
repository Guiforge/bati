# Audit rapide des 15 traces

04/11, sur le texte de `idees.md`, avant toute image. Theo pour le plaisir et la découverte, mara pour la lecture à taille de téléphone, un contrôle des promesses de Bati avec vérification dans le code. Personne n'a vu d'image.

| N° | Trace | Theo | Mara | Promesses |
|---|---|---|---|---|
| 1 | Raccourci | garder, mais pareil chez tous | seulement hors des pavés, sinon il disparaît dans le coeur | ok |
| 2 | Arbre du premier feu | garder | lit, seul dans la prairie | ok |
| 3 | Sentier de la rive | garder | plus fin qu'une route, interrompu au début | recule si séance supprimée |
| 4 | Sol nu sous la poutre | garder | poutre basse, sinon gibet | recule si séance supprimée ; volume à surveiller |
| 5 | Souche qui repart | garder, trop discrète ? | pousses plus grandes et vives | la fusion peut défaire un retour |
| 6 | Aire battue | à refaire : il faut une silhouette | lit, plus sombre que la place | recule si séance supprimée |
| 7 | Clairière couchée | à refaire : invisible | ne lit pas | recule si séance supprimée |
| 8 | Pierres du lavoir | à refaire : idée géniale, minuscule | ne lit pas | presque tient |
| 9 | Lacets | garder | large et clair, sinon fissure | recule si la meilleure sortie est supprimée |
| 10 | Pieux | garder | ne lit pas : palissade | recule si séance supprimée |
| 11 | Pierres levées | écarter : règle floue, butin | lit, mais menhirs déjà là | recule, aussi à la correction |
| 12 | Côtes du monstre | geler : la plus forte, mais elle recule | lit, la meilleure silhouette, risque de trophée | **échec** : boss non fusionné, deux téléphones diffèrent |
| 13 | Banc de l'aube | garder | se lit comme du mobilier | **échec santé** : récompense le réveil très tôt |
| 14 | Lanterne du soir | garder, le sourire de la liste | ne lit pas | **échec santé** : compte de 22 h à 4 h ; la lueur contredit la règle commune |
| 15 | Sente d'ailleurs | garder, première trace du joueur tranquille | se lit comme une route, haie à créer | recule si séance supprimée |

## Les cinq retenues pour les concepts

| Trace | Auteur | Theo | Mara | Changement demandé par l'audit |
|---|---|---|---|---|
| Sentier de la rive | oui | oui | oui | fin, interrompu, ornières au dernier stade |
| Sol nu sous la poutre | oui | oui | oui | basse et large, rien qui pende |
| Arbre du premier feu | oui | oui | oui | seul dans la prairie, et non à côté de la tente |
| Souche qui repart | oui | oui | non | pousses grandes et vives |
| Aire battue | non | à refaire | oui | cercle de pierres pour la silhouette, plus sombre que la place |

Trois tranchées parmi les désaccords (chef, voir `decisions.md`) : le raccourci sort (mara), la lanterne sort (santé), les côtes attendent ta réponse.

## Les deux risques des juges

- **Theo : on ne voit jamais une trace arriver.** Peinture calme, sans signal : le joueur ne fait aucun lien, donc aucune découverte. Les premiers seuils sont loin. Question à trancher (`regles.md`).
- **Mara : seuls trois signes distinguent trois joueurs à ce zoom**, une ligne qui sort, une tache de terre nue, un grand arbre. Le reste est trop petit. Ces traces doivent faire 2 à 3 fois la taille décrite.

## Ce qui a été vérifié dans le code

Vrai (avec fichier et ligne vérifiés par le relecteur) : `deleted_sessions` garde l'uuid (`db/completed.ts:541`), uuid v7 tiré de `performedAt` (`db/completed.ts:293`) ; fusion et suppression sur l'autre téléphone (`db/merge.ts:289`, `:854`) ; `pause_goal` hors de `MERGED_PREFERENCES` (`db/backup.ts:294`) ; succès locaux (`db/achievements.ts:271`) ; `boss_fights` et `adventure_runs` locaux (`db/syncTables.ts:30`) ; `totalLeaguesM` (`db/gps.ts:227`) ; `pull_vertical`, `squat`, `yoga` (`db/schema.ts:30`, `:31`, `:76`) ; `everEarnedMovements` (`db/exercises.ts:693`) ; `byHand` (`db/schema.ts:568`) ; `levelFromFloors` pur (`db/village.ts:371`).

**Trois réserves que l'auteur n'avait pas :**
- L'uuid est une copie figée : si la date d'une séance change, la date relue n'est plus la bonne. Les lignes du seed de dev n'ont pas de v7 (`db/devSeedExpedition.ts:248`).
- `totalLeaguesM` compte aussi les distances saisies à la main (`byHand='distance'`).
- **Restaurer une vieille sauvegarde** remplace toute la base (`db/backup.ts`) : même les traces de dates reculent. « Tient » ne vaut que pour une suppression normale.

Non vérifié : `countsAsSession`, `getBossBanners`, `hasNewRecords`, `correctLoggedSet`, le `style` de chaque ligne de yoga.
