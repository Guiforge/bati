# Boucle « sublime » du village : bilan

Arrêt après la 5e itération (condition 2). La cible (Mara et Théo à 8,5 ou plus sur fun, fierté et personnel, Anim sans défaut haut ou moyen, Tech sans bug visuel ni crash) n'est pas atteinte.

## Notes par itération

| Itér. | Mara (style / fun / fierté / perso) | moy. | Théo | moy. | Anim (magie / finition) | Tech (stabilité / correction) |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 4 / 3,5 / 3,5 / 2 | 3,25 | 4 / 3,5 / 5 / 2,5 | 3,75 | 4 / 5 | 8 / 6 |
| 1 | 4 / 4 / 3,5 / 2 | 3,38 | 4 / 4 / 5 / 2,5 | 3,88 | 5 / 5 | 7 / 4 |
| 2 | 4,5 / 4,5 / 3,5 / 2,5 | 3,75 | 4,5 / 5 / 5 / 3 | 4,38 | 6 / 6 | 7 / 5 |
| 3 | 6 / 4,5 / 5,5 / 2 | 4,5 | 6,5 / 5 / 6,5 / 3 | 5,25 | 5 / 5 | 6 / 4 |
| 4 | 6,5 / 5 / 6 / 5 | 5,63 | 7 / 5,5 / 7 / 5 | 6,13 | 6 / 5 | 6,5 / 4,5 |
| 5 | 7 / 5,5 / 6,5 / 5,5 | 6,13 | 7,5 / 6 / 7,5 / 6,5 | 6,88 | 6,5 / 6 | 7 / 6 |

Théo, à la fin : « J'enverrais la capture de nuit du palier 12 à un ami. »

## Avant, après (itération 0 à gauche, itération 5 à droite)

- Palier 12 de jour : [avant-apres/palier-12-jour.webp](avant-apres/palier-12-jour.webp)
- Palier 12 de nuit : [avant-apres/palier-12-nuit.webp](avant-apres/palier-12-nuit.webp)
- Planche de la montée de stade : [avant-apres/montee-de-stade.webp](avant-apres/montee-de-stade.webp)
- Vue d'ensemble, les 12 paliers, gros plans et vocations : [vue-ensemble/](vue-ensemble/)

## Ce qui a changé

- Toute la famille des bâtiments repeinte de jour avec FLUX 3 (57 stades). La nuit est fabriquée à partir du jour : un seul monde, une seule nuit pour toutes les couches.
- Nouvelle disposition autour de la salle des héros (plan de Mara), rempart peint en pans sur deux faces, antre en presqu'île, observatoire au premier plan.
- Alentours peints : sol en 12 tuiles, forêt dense jusqu'aux bords, champs peints, accessoires, souris et oiseaux peints, premier plan en parallaxe. Tout est derrière des drapeaux, éteints par défaut dans l'onglet Village.
- Lumière posée sous les sprites, flaques douces, jour chaud.
- Vie au repos sur une horloge bornée (60 s après un toucher) : bannières, fumées, moulin, oiseaux, deux histoires.
- La montée de stade est filmable et dans l'ordre : caméra qui suit, silhouette chaude, étincelles, cartouche parchemin.
- La vocation du héros se lit d'un coup d'œil (bannières, aménagements de la place).
- Outils : captures reproductibles (`loop_capture.sh`, `vue_ensemble.sh`), liens dev `peint=`, `foyer=`, `fige=1`, cache d'images vidé avant chaque série.

## FLUX dépensé

- Boucle : environ 8 $. Pipeline des alentours : environ 4,6 $.
- Registre V1 : 34,42 $ sur un plafond de 40 $ (la ligne des 100 $ n'est pas encore dans VALIDATIONS.md).

## Ce qui reste

1. Places de vocation : aujourd'hui du clipart vectoriel qui couvre le feu et le puits, fanions hors palette, et personne ne pratique. À peindre (5 aménagements, 5 bannières) avec des villageois qui pratiquent. ~1 à 2 $.
2. Montée : clignotement avant le gel (anim-40), échafaudage filaire, impact invisible de nuit. Échafaudage peint, poussière, étincelles, silhouette tirée du nouveau stade. ~0,1 $.
3. Cadrage : à l'ouverture, le village fait un quart de l'écran. Ouvrir à 1,5x sur la salle, fondre les parcelles sombres, champs en patchwork, socles fondus.
4. Vie visible au zoom d'ouverture : ombres de nuages et rais qu'on voit vraiment, ou les retirer ; eau qui bouge, pont ; cavalier peint qui passe de temps en temps.
5. Nuit de loin : lanternes sur les chemins de sortie, lune sur la rivière.
6. Bug produit : le cache d'images sert d'anciens sprites après une mise à jour.
7. Perf du sol peint (12 tuiles, ~128 Mo décodés, ~12 i/s sur l'émulateur) avant d'allumer les drapeaux. Détail dans perf-debt.md.
8. Pipeline des alentours : étapes 6 et 7, puis ton GO.

Tech, à la fin : aucun crash, les promesses tiennent (rien ne recule, montée au toucher seulement). Un bug visuel net : les objets de vocation sont dessinés sur 4 à 5 cases avec une emprise de tri d'une case, donc ils recouvrent le feu (TK5-01, correctif S). Quatre défauts mineurs : rempart visible avant l'impact, feuillage avant le fondu, route coupée au palier 4, cartouche lu 80 ms trop tôt.

## Les 3 décisions à prendre

1. **Allumer les alentours peints dans l'onglet Village.** C'est le plus gros saut visuel, mais il faut d'abord régler la perf du sol peint (tuiles plus petites ou moins de tuiles décodées). Proposition : un lot perf dédié, puis allumage.
2. **Correctif du cache d'images.** Soit une clé de cache qui contient la version de l'app, soit une purge du cache à chaque nouvelle version. La clé est plus propre, la purge plus simple.
3. **Budget FLUX.** Écrire `BUDGET_FLUX_V1: 100` dans VALIDATIONS.md pour peindre les places de vocation, les villageois qui pratiquent, l'échafaudage et le cavalier (~3 $ en tout). Sans cette ligne, il reste 5,58 $.
