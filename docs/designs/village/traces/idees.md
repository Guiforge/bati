# Traces : les idées

Quinze petits détails peints, nés du journal du joueur. Ils restent pour toujours. Liste à choisir par Guillaume, à faire relire par theo et mara. Rien n'est peint ni codé.

## Ce qui vaut pour les quinze

**Peinture.** Basse, posée au sol, une valeur plus calme que les bâtiments. Lumière en haut à gauche, ombres non peintes, rien ne bouge. Ni texte, ni chiffre, ni personnage, ni enseigne, ni drapeau, ni lueur.

**Place.** Jamais sur le parvis d'un bâtiment (règle 14), jamais sur le coin verrouillé. Les noms de lieux ci-dessous suivent les bâtiments si LAYOUT les déplace. À demander à LAYOUT et GROWTH : des places que le remplissage ne recouvre à aucun palier, sinon une maison qui pousse sur une trace la ferait disparaître, donc reculer. La forge (81,8 % visible) et la carrière (83,0 %) sont déjà serrées : une trace n'y passe que derrière ou à côté, et `check` mesure.

**Quatre choix de lecture du journal**, vérifiés dans le code :

- **Des comptes, jamais des parts.** « 20 séances avant 7 h » ne redescend pas si le joueur change d'heure. « Surtout le matin » redescendrait. Aucune trace ne lit le sport dominant.
- **Pas de flamme.** `getStreakInfo` lit le serment (quota) et `pause_goal`, et `pause_goal` n'est pas dans `MERGED_PREFERENCES` : deux téléphones peuvent donner deux flammes. Une trace de flamme punirait aussi sans le dire. Le raccourci (n° 1) la remplace.
- **Pas de succès.** `unlocked_achievements` reste local et n'est pas fusionné.
- **L'heure et le jour se lisent sur la ligne de la séance** : `performedAt` plus `tzOffsetMin`, jamais le fuseau du téléphone. Un mouvement se reconnaît par `ifnull(uuid, enName)` : `exerciseId` change d'un téléphone à l'autre. L'horloge n'entre jamais : le calcul s'arrête à la dernière séance.

**Tenue face à la suppression**, trois cas, détaillés à la fin :

- **Tient** : la trace ne lit que des dates, le journal plus `deleted_sessions`. Supprimer ne change rien.
- **Exposée au seuil** : la trace lit un contenu (mètres, répétitions). Supprimer peut la faire redescendre, seulement si la séance était juste au seuil.
- **Exposée à sa meilleure** : la trace lit un maximum. Seule la suppression de la meilleure séance la touche.

---

## Palier A : les huit premières, 20 peintures

### 1. Le raccourci (marque d'usure)
- **Aspect** : une ligne de terre claire qui coupe l'herbe en diagonale, là où la rue fait un détour.
- **Place** : entre la Grand-Rue et le puits.
- **Fait** : nombre de semaines distinctes avec au moins une séance qui compte (`countsAsSession`, semaine lue sur `performedAt` + `tzOffsetMin`). Seuils : 6, 20, 52 semaines.
- **Pousse** : herbe couchée, en pointillé ; ligne continue ; sentier net aux bords tassés, avec une pierre plate au milieu.
- **Visible.**
- **Ce que le joueur voit** : deux séances ou sept dans la semaine valent pareil. Celui qui vient une fois par semaine va aussi vite que l'acharné. Une semaine vide ne retire rien et ne se voit pas.
- **Suppression** : tient.
- **Coût** : 3.

### 2. L'arbre du premier feu
- **Aspect** : un arbre seul au tronc qui s'épaissit, couronne basse, qui se détache par sa forme.
- **Place** : à côté de la tente, jamais devant elle.
- **Fait** : écart entre la première et la dernière séance du journal. Seuils : 30, 180, 730 jours.
- **Pousse** : jeune plant tuteuré ; petit arbre ; vieil arbre noueux, plus large que haut.
- **Visible.**
- **Ce que le joueur voit** : depuis combien de temps il est là, pas combien il a soulevé. Un an d'absence ne l'abîme pas : à la séance du retour, l'arbre rattrape d'un coup le temps passé. Revenir fait pousser. Ce n'est pas un minuteur : sans séance, il ne bouge pas.
- **Suppression** : tient. La fusion ne fait qu'élargir l'écart.
- **Coût** : 3.

### 3. Le sentier de la rive (marque d'usure)
- **Aspect** : un fil de terre pâle qui quitte le village et file loin dans la prairie.
- **Place** : part du pont, longe la rivière sur l'autre rive, sort vers le bord de la carte.
- **Fait** : somme de `leaguesM`, la même que `totalLeaguesM`, pour rester d'accord avec le Grand Chemin. Seuils : 20, 150, 600 km. Une sortie à pied fait 4 à 5 lieues.
- **Pousse** : court et pâle, s'efface vite ; long et net ; il va jusqu'au bord, s'élargit et prend deux ornières.
- **Visible.**
- **Ce que le joueur voit** : un village qui sort de ses murs. Le Grand Chemin dit le rang, le sentier dit le sol réellement foulé.
- **Suppression** : exposée au seuil. Une distance saisie à la main peut aussi être corrigée à la baisse.
- **Coût** : 3.

### 4. Le sol nu sous la poutre (marque d'usure)
- **Aspect** : une poutre sur deux poteaux, sous elle un ovale de terre nue dans l'herbe.
- **Place** : à côté de la carrière (les tractions nourrissent le dos, le dos nourrit la carrière).
- **Fait** : somme de `resultValue × sides` sur `completedExercises`, `resultType` en répétitions, `exercises.pattern = pull_vertical`. Seuils : 150, 1 500, 6 000 répétitions.
- **Pousse** : poutre brute, herbe tassée ; ovale nu ; ovale large et creusé, poutre pâlie au milieu à force de mains.
- **Visible.**
- **Ce que le joueur voit** : une usure précise, à un seul endroit, qu'il reconnaît comme la sienne. Un village de coureur n'a pas cette poutre.
- **Suppression** : exposée au seuil. Une série corrigée à la baisse aussi (`correctLoggedSet`).
- **Coût** : 3.

### 5. La souche qui repart
- **Aspect** : une souche comme celles du palier 1, avec un bouquet de jeunes pousses claires.
- **Place** : au bord de la forêt, du côté de la tente.
- **Fait** : nombre de retours, soit une séance qui compte, précédée d'au moins 28 jours sans séance. Seuils : 1, 3 retours. Les pauses déclarées ne changent rien : le retour reste un retour.
- **Pousse** : souche et pousses ; deux souches, dont une déjà devenue jeune arbre.
- **Cachée.** Le joueur revient après deux mois, voit une souche verdie, et finit par soupçonner le lien.
- **Ce que le joueur voit** : la seule trace que seule une absence permet de gagner, et elle ne parle que du retour. Sans retour, il n'y a pas de souche verdie, et rien ne manque : les souches ordinaires restent de simples souches.
- **Suppression** : tient avec les dates du journal et de `deleted_sessions`. **Exposée à la fusion** : une séance d'un autre téléphone arrivée au milieu de l'écart peut défaire le retour. Une séance saisie à la main (7 jours en arrière au plus) peut aussi faire passer l'écart sous 28 jours.
- **Coût** : 2.

### 6. L'aire battue (marque d'usure)
- **Aspect** : un rond de terre battue, clair et plat, comme une aire de battage.
- **Place** : à côté de la ferme (les jambes nourrissent la ferme).
- **Fait** : somme des répétitions, `pattern = squat`. Seuils : 500, 5 000.
- **Pousse** : tache tassée aux bords flous ; rond net, cerclé de petites pierres à fleur de sol.
- **Visible.**
- **Ce que le joueur voit** : un rond parfait à côté de la ferme se lit de très loin et raconte les jambes.
- **Suppression** : exposée au seuil.
- **Coût** : 2.

### 7. La clairière couchée (marque d'usure)
- **Aspect** : des ovales d'herbe couchée, plus pâle, comme là où quelqu'un s'est allongé.
- **Place** : à côté du bosquet druidique.
- **Fait** : nombre de séances avec au moins une série d'un mouvement `style = yoga`. Seuils : 6, 40.
- **Pousse** : un ovale ; une petite clairière de trois ovales, bordée de mousse.
- **Visible.**
- **Ce que le joueur voit** : le calme laisse aussi sa marque. Le yoga pèse peu en répétitions : compter des séances lui rend sa place.
- **Suppression** : exposée au seuil.
- **Coût** : 2.

### 8. Les pierres du lavoir (marque d'usure)
- **Aspect** : des pierres plates sur la berge, une par jour de la semaine, éparses pour qu'un vide ne se lise jamais comme un manque.
- **Place** : sur la berge, du côté de la ville, près du pont. Sept emplacements fixes.
- **Fait** : séances qui comptent par jour de la semaine (`performedAt` + `tzOffsetMin`). Une pierre à 8 séances ce jour-là, creusée à 40.
- **Pousse** : pierre plate ; pierre usée, au creux sombre.
- **Cachée.** « Pourquoi une seule pierre, et toujours celle-ci ? » Le joueur change de jour, et une deuxième apparaît.
- **Ce que le joueur voit** : **son jour**. Celui qui vient chaque dimanche a sa pierre en huit semaines, comme les autres. Deux joueurs n'ont pas le même lavoir.
- **Suppression** : presque tient. `deleted_sessions` donne la date sans le fuseau : une séance tardive supprimée peut changer de jour.
- **Coût** : 2 (la même pierre, à sept places).

---

## Palier B : les sept suivantes, 18 peintures

### 9. Les lacets (marque d'usure)
- **Aspect** : un zigzag de terre sur la pente, très reconnaissable de loin.
- **Place** : sur la pente de l'autre rive, vers la forêt.
- **Fait** : `max(ascentM)` sur une sortie. Seuils : 150, 400, 800 m.
- **Pousse** : un virage ; trois virages ; le zigzag entier, avec un cairn au sommet.
- **Cachée.** Le joueur sort en montagne, et le dessin apparaît.
- **Ce que le joueur voit** : le coureur des collines et celui du bord de mer n'ont pas le même village. Rien n'apparaît si le téléphone n'a jamais donné d'altitude, et rien ne le signale.
- **Suppression** : exposée à sa meilleure.
- **Coût** : 3.

### 10. Les pieux
- **Aspect** : une rangée de pieux de bois de hauteur croissante, comme un escalier.
- **Place** : à côté de la tour du sorcier.
- **Fait** : nombre de mouvements gagnés sur l'échelle des variantes (`everEarnedMovements`). Seuils : 3, 8, 15. Pas `countClimbedPaths` : ajouter un sommet par une migration, comme 0033, ferait baisser ce compte.
- **Pousse** : trois pieux ; cinq ; sept, le dernier poli au sommet.
- **Visible.**
- **Ce que le joueur voit** : la progression en habileté, pas en quantité. C'est le village de la callisthénie.
- **Suppression** : exposée à sa meilleure, si la séance était la seule à gagner ce mouvement.
- **Coût** : 3.

### 11. Les pierres levées
- **Aspect** : de petites pierres debout, à hauteur de genou, de plus en plus nombreuses, jamais gravées.
- **Place** : à côté de la salle des héros.
- **Fait** : nombre de séances avec `hasNewRecords = 1`. Seuils : 12, 40, 100. Seuils hauts car un premier essai sur un mouvement compte déjà comme record (`prevMax = 0`), donc essayer du nouveau les nourrit aussi.
- **Pousse** : une pierre ; trois ; un petit alignement de cinq.
- **Cachée.** Le joueur finit par relier une nouvelle pierre à une soirée de record.
- **Ce que le joueur voit** : les jours où il a dépassé quelque chose, quel que soit le sport.
- **Suppression** : exposée au seuil. **Aussi aux corrections** : `redecideAfterChange` peut retirer un record à une séance.
- **Coût** : 3.

### 12. Les côtes du monstre
- **Aspect** : des côtes énormes à demi enterrées, grises, envahies d'herbe, comme une vieille carcasse.
- **Place** : à côté de l'antre du dragon.
- **Fait** : nombre de boss distincts battus (`getBossBanners`). Seuils : 1, 3, 6.
- **Pousse** : trois côtes ; une cage entière ; une carcasse avec le crâne enfoncé.
- **Visible.**
- **Ce que le joueur voit** : ce qu'il a tué reste, sans briller. Ce n'est pas un trophée : c'est déjà de l'herbe.
- **Suppression** : **exposée deux fois**. Supprimer la dernière séance d'une campagne rouvre le combat et relève le boss (`reopenCampaignStep`, `refundBossDamage`). Et **`boss_fights` et `adventure_runs` ne sont pas fusionnés** : deux téléphones n'ont pas le même compte, ce qui viole la règle des deux téléphones. Le code de l'antre a déjà ce défaut. À choisir en connaissance de cause, voir les questions.
- **Coût** : 3.

### 13. Le banc de l'aube
- **Aspect** : un banc de bois bas, tourné vers le coin d'où vient la lumière, l'herbe tassée devant.
- **Place** : à côté du moulin.
- **Fait** : nombre de séances (`byHand` nul) commencées entre 4 h et 7 h, heure lue sur la ligne. Seuils : 8, 30. La borne de 7 h vient du succès `early_bird`, mais ici les sorties comptent, pour le coureur du matin.
- **Pousse** : banc ; banc patiné, terre nue devant.
- **Cachée.** Un soupçon facile à tester : une semaine de réveils tôt.
- **Ce que le joueur voit** : son heure, pas sa quantité.
- **Suppression** : exposée au seuil (`deleted_sessions` n'a pas le fuseau, donc pas l'heure).
- **Coût** : 2.

### 14. La lanterne du soir
- **Aspect** : une lanterne basse sur un piquet. Éteinte le jour. La nuit, une petite flaque ambre, plus faible que les vraies lumières du joueur.
- **Place** : à côté du puits.
- **Fait** : nombre de séances (`byHand` nul) commencées après 22 h, ou avant 4 h. Seuils : 8, 30. La borne de 22 h vient du succès `night_owl`.
- **Pousse** : un piquet et une lanterne ; deux, et une marche de pierre usée.
- **Cachée.** Elle ne se révèle vraiment que la nuit, donc à celui qui ouvre le village à cette heure-là : le même joueur.
- **Ce que le joueur voit** : celui qui s'entraîne après le travail a sa lumière. La flaque de nuit passe par le code, à confirmer avec POLISH.
- **Suppression** : exposée au seuil.
- **Coût** : 2.

### 15. La sente d'ailleurs (marque d'usure)
- **Aspect** : un petit passage de terre qui traverse une haie basse et quitte la carte.
- **Place** : à côté de la grange, loin du coin verrouillé.
- **Fait** : nombre de séances `byHand = 'session'` (les séances ailleurs). Seuils : 6, 30.
- **Pousse** : herbe couchée vers la haie ; passage net, haie écartée, marchepied de planche.
- **Visible.**
- **Ce que le joueur voit** : Bati ne voit pas la salle de sport, le club ou le tatami, et le village le sait quand même. Pour beaucoup de joueurs occasionnels, c'est la première trace.
- **Suppression** : exposée au seuil. Avec les dates de `deleted_sessions`, on ne sait pas quel type de séance a été supprimé.
- **Coût** : 2.

---

## Le joueur d'une fois par semaine

Le risque : tout ce qui compte du volume le met en retard, pour toujours. La réponse, c'est que des traces **ne s'achètent pas au volume** :

- Le raccourci et l'arbre avancent à la même vitesse pour lui et pour l'acharné. S'entraîner sept fois de plus n'y change rien.
- Le lavoir le récompense d'avoir un jour à lui.
- La souche ne vient qu'à celui qui s'est arrêté.
- La sente d'ailleurs lui donne ce que Bati n'a pas mesuré.

Son village n'est pas un village de sportif en plus petit : il a l'air **vieux et habité**. Et aucune trace absente ne se voit : rien n'indique une place vide.

| Après 18 mois, journaux inventés | Coureur (3 sorties/sem.) | Tractions (4 séances/sem.) | Une fois par semaine, un trou de 2 mois |
|---|---|---|---|
| Raccourci, arbre | Hauts | Hauts | Hauts, l'arbre au même stade |
| Sentier, lacets | Grand sentier, lacets s'il a des collines | Rien | Rien |
| Sol nu sous la poutre, pieux | Rien | Grand ovale, pieux | Rien, ou le début |
| Souche, sente d'ailleurs | Rien | Rien | Souche verdie, sente |
| Lavoir | Trois pierres | Quatre pierres | Une pierre, creusée |

---

## Suppression d'une séance

**Le problème.** Le village se calcule depuis le journal, sans mémoire. Le code le dit de lui-même : `levelFromFloors` est pur, « no history is kept ». Si le joueur supprime une séance, tout ce qu'elle apportait disparaît avec elle, et `mergePeer` applique la suppression sur l'autre téléphone. Une somme ou un maximum peut donc redescendre, contre la promesse « une trace ne recule jamais ». Une série corrigée à la baisse (`correctLoggedSet`) fait pareil.

**Ce qui existe déjà et ne demande aucune donnée nouvelle.** `deleted_sessions` garde l'uuid de chaque séance supprimée, et la fusion réunit ces listes sur les deux téléphones. L'uuid est un v7 créé à partir de `performedAt` (`uuidv7(performedAt.getTime())`), donc **on peut y relire la date**. L'ensemble « dates du journal + dates des supprimées » ne change jamais quand une séance est supprimée : elle passe d'un côté à l'autre.

**Ma proposition, sans nouvelle donnée :**

- **Les traces de dates lisent cet ensemble et tiennent** : raccourci, arbre, souche, et presque le lavoir. C'est pour cela qu'elles sont au palier A.
- **Les traces de contenu ne sont pas sauvables ainsi.** `deleted_sessions` n'a ni mètres, ni répétitions, ni type de séance, ni fuseau. **Aucune solution sans nouvelle donnée ne tient la promesse pour elles.** Le mieux possible : des seuils espacés, et préférer un maximum à une somme quand c'est juste, pour que le recul reste rare. Il reste possible.

**Les limites de la lecture par dates.** Une séance supprimée compte encore comme une date, même si elle était une erreur. La même porte sert à l'historique et au « ne pas la garder » de l'écran de victoire : une séance refusée là laisse aussi sa date. Une sortie de moins de 10 minutes non plus ne se distingue pas. Enfin, celui qui a effacé une séance pourrait ne pas vouloir qu'elle laisse une marque.

**Ce qu'aucune de ces solutions ne couvre.** La fusion : une séance arrivée d'un autre téléphone peut défaire un retour (souche). Et `boss_fights` non fusionné : les côtes du monstre.

**Questions à Guillaume** (données et règles du jeu, hors de cette piste) :

1. Une séance supprimée doit-elle garder sa date dans les traces (raccourci, arbre, souche, lavoir), y compris une séance refusée à l'écran de victoire ?
2. Pour les traces de contenu, trois choix :
   - **a. Accepter** : ce que le joueur efface lui-même, le village l'oublie, comme ses bâtiments aujourd'hui. Aucune donnée nouvelle, mais la promesse devient « rien ne recule, sauf ce que tu effaces ». C'est ma préférence : le recul vient de son geste, il est rare et silencieux.
   - **b. Garder un plus haut atteint** : une préférence synchronisée. C'est une donnée nouvelle, et la fusion devrait prendre le maximum, alors que `MERGED_PREFERENCES` prend le plus récent. La trace ne serait plus une pure fonction du journal.
   - **c. Ne garder que les traces de dates** : promesse tenue, mais adieu le sentier et la poutre, donc les trois villages différents.
3. Les côtes du monstre : accepter le désaccord entre téléphones, comme l'antre aujourd'hui, ou les écarter jusqu'à ce que les campagnes soient fusionnées ?

---

## Les cinq pour les concepts Klein

1. **Le sentier de la rive** : le village du coureur déborde de ses murs, un trait long visible à toute taille.
2. **Le sol nu sous la poutre** : l'usure à l'état pur, le village des tractions est marqué à un endroit précis.
3. **Le raccourci** : celui qui vient une fois par semaine y va aussi vite que les autres, et il change la forme de la place.
4. **La souche qui repart** : la plus douce, seule une absence la gagne et elle ne dit que le retour.
5. **L'arbre du premier feu** : au stade égal, il donne au joueur occasionnel un point fort là où il n'a ni sentier ni poutre.

Coureur : une longue ligne vers l'extérieur. Tractions : une cour usée près de la carrière. Occasionnel : un vieil arbre, une souche verte, rien d'athlétique.

**Coût total** : 38 peintures. Palier A : 20. Ces cinq seules : 14. Non vérifié : si la nuit demande sa propre peinture, le compte monte d'autant.
