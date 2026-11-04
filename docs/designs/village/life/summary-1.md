# Piste LIFE, résumé de la session 1

Arrêtée par Guillaume le 04/11. Tip du code fusionné dans `feat/village-iso` : `9c5d0f3b`. Le commit de ce résumé vient juste après.

## Ce qui marche
Vu sur émulateur, jamais sur téléphone.
- La caméra revient à la vue d'avant après une évolution (27 essais sur 27). Un vrai glissé garde la vue de la main (3 sur 3).
- Mouvement des bâtiments : fichiers `components/village/iso/motion/`, halos, fumée, ailes, reflets, flamme du feu de camp. La nuit bouge aussi.
- Particules repeintes dans `assets/images/village/iso/mouvement/`.
- Souris près de la grange et de la ferme, chat sur les murs, oiseaux sur les toits de la ferme et de la forge. Anciens oiseaux, rats, corbeau et chats retirés.
- Le dragon peint de la grotte respire, au stade mythique. Pas de dragon séparé.

## Ce qui n'est pas fini
- **Le moment Contre-jour :** codé, mais éteint par son drapeau à cause des bugs ci-dessous. Guillaume ne l'a pas vu fini.
- **Le battement de rang :** la lueur et l'échange se voient, la pièce à l'encre n'a jamais été vérifiée.
- **Les drapeaux des bâtiments (U7) :** inchangés.
- **La fin de piste (K2) :** ni suite complète, ni archivage de `scratch/`. Les vidéos pour Guillaume restent dans `scratch/look/` (sha `51aa8c9d`), rien n'a été publié.
- **Les chats :** sur les murs seulement, pas sur les rebords.

## Les drapeaux
| Drapeau, dans `constants/isoPoc.ts` | Défaut |
| --- | --- |
| `MOMENT_CONTRE_JOUR` (nouveau) | éteint partout, allumé sous jest pour que les tests gardent le moment |
| `INTEGRATION` | allumé en dev et `.perf`, éteint en publié et sous jest |
| `BATIMENT_MOTEUR`, `ALENTOURS` | pareil |

**Écart avec la consigne d'arrêt :** drapeau éteint, le village n'est pas exactement celui d'avant la piste.
- Une évolution est un échange net, comme en mouvement réduit, sans glissement de caméra ni légende. L'ancien moment (carré brun, cercles plats) n'est pas remis : son code est retiré, et Guillaume voulait le remplacer.
- Mouvement et créatures n'ont pas de drapeau propre : ils sont actifs en dev et `.perf`. En publié, tout reste éteint avec `INTEGRATION`, donc le village publié ne change pas.

## Décisions ouvertes
- Voir le moment et écrire le go : c'est ce qui débloque U7.
- Le dragon : garder celui de la grotte, ou remettre un dragon séparé (dans l'historique, avant `900fa9c8`).
- Les variantes b des créatures, choisies par Mara.
- La lumière repeinte sans étoile de rayons : elle s'écarte du film choisi, qui se lisait comme une caisse de butin.
- Pour POLISH : flamme rouge du feu de camp, pièces d'or du repaire (se lisent comme de la monnaie), échafaudage peint de nuit seulement, villageoise à la fourche.
- Demandes de Theo non faites : bouton « ne plus voir », son, indice pour les créatures, plus de variété, version courte pour les petits rangs.

## FLUX et sous-agents
4,16 $ sur 15 $ : 0,18 de Klein, plafond dépassé par erreur et signalé, puis 3,98 de FLUX 3 Image. Environ 50 sous-agents sur 200, estimation.

## Bugs connus, confiés à la piste GAME
Elle les corrige à la fin, sur émulateur. Mettre `MOMENT_CONTRE_JOUR` à `true` pour les bugs 1 et 3. Pour mesurer, utiliser le `.perf` en `wm size 540x960` et `wm density 240` : le bundle de dev traite un tap avec environ 1 s de retard. Lien de visée : `bati://dev-iso?mode=pret&pret=<code>&rang=N&jouer=1&nu=1`.

1. **Après le tap, le saut ne montre jamais le bâtiment final.**
   - Reproduire : `pret=forge&rang=2`, taper une zone vide pendant le moment, lire les images à +0,1, +0,3 et +0,6 s. On voit encore la cage ou l'encre.
   - Données : `scratch/perf/hskip-run1.txt`, `hskip-run2.txt`.
   - Piste : `1b533a7f` fait partir le saut au relâché au lieu de 500 ms plus tard (attente du double tap). Ce commit est postérieur à la mesure et n'a pas été vu sur appareil. Sinon, regarder `saute` dans `IsoCroissance.tsx` et le départ retardé de son horloge.
2. **La Fontaine dit « Ready to evolve » mais n'a aucun bouton Evolve.**
   - Reproduire : héros `.perf` avec des évolutions en attente, onglet Village, toucher la Fontaine (rang 3, « Rises with the Well »). L'Observatoire et la Grange ont le bouton.
   - Piste, non prouvée : l'agent arrêté pensait le bouton sous le pli de la bulle. Sa correction, `d312ed495`, avec le test `iso-bulle-pret-fontaine`, a été écartée à la fusion car elle était en conflit avec les fichiers de GAME. Elle reste dans l'historique.
3. **L'ancienne palissade reste environ 1,4 s à côté du nouveau mur.**
   - Reproduire : `pret=castle_wall&rang=1`. La nouvelle pièce arrive vers 4,85 s, la palissade reste jusque vers 6,3 s (`scratch/perf/h-m-castle_wall-r1-jour-sheet.png`).
   - Piste : la `Sortie` de `Rempart.tsx` n'a sans doute pas suivi le départ retardé du moment.

Restes vus sur le moment : le voisin pâli sur la route et le mur se voyait en dev, pas en `.perf` ; la poussière se lit peu sur le 3x3.

## Vérifications à l'arrêt
Après les deux derniers commits de l'agent et le drapeau, seul `tsc` a tourné : il passe. Aucun test ni capture depuis, voir `tests-debt.md`. Le drapeau éteint n'a jamais été joué sur appareil. L'émulateur arrêté a pu rester en demi-résolution.
