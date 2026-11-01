# Contrat S-night (amendé par env, gelé le 01/11)

Baseline mesurée (`loupe_night.py report baseline`) : échoue aux critères 2 (0,37 contre 0,60) et 4 (écart R-B des champs 13,4 contre 9,2 au plus). Les critères 3, 5, 7, 9 et 10 passent déjà et servent de gardes : la nuit ne doit pas reculer sur eux, ils ne prouvent pas le progrès.

Chaque critère vaut oui ou non. Un seul non fait échouer le tour. Le chef mesure les seuils marqués « baseline » avant le tour 1 et écrit les chiffres ici. Un critère chiffré qui passe déjà sur la baseline est resserré à mi-chemin entre la baseline et 1.

**Préalable** : `night-values` et les mesures de masque sont écrites et commitées avant le tour 1, puis leur diff reste vide. L'implémenteur ne touche pas à sa propre mesure. Les barres système (y < 130 et y > 2340) sont toujours exclues.

**Masque sol** : le crop moins toutes les boîtes du dump. **Masque champ** : losanges des tuiles `layer=field` moins les autres sprites. **Pré voisin** : tuiles à 1 ou 2 cases, sans sprite ni chemin. **Route** : liste gelée dans la carte.

1. **Valeurs gardées** : rang de Spearman jour contre nuit sur la grille floutée au 1/8, sur p06 et p12, en excluant les boîtes `layer=building` et les sources de lumière (marge de 2 tuiles), d'au moins 0,987 (baseline 0,974, resserré à mi-chemin de 1).
2. **Sol vivant** : sur le masque sol de `sol-sud`, la médiane de l'écart-type par blocs de 16 px vaut de nuit au moins 60 % du jour.
3. **Pas d'aplat violet** : teinte HSV de la couleur médiane du masque sol de `sol-sud` entre 205° et 240° (`#2E3552` vaut 228°).
4. **Les champs ne brillent pas** : sur `champs-nord` et `champs-est`, le rapport L champ / L pré de nuit vaut au plus 1,10 fois celui du jour, et l'écart R-B champ moins pré de nuit vaut au plus 60 % de celui du jour.
5. **Pas de grilles sombres** : sur le masque champ, la part de pixels sous L=25 de nuit ne dépasse pas celle du jour de plus de 10 points. Test à l'aveugle : à la taille du téléphone et sans le dump, le juge nomme la culture de 3 parcelles tirées par le chef, 3 sur 3.
6. **Les chemins ne brillent pas** : double mesure du 4, avec 1,02 au lieu de 1,10 (baseline 1,037, resserré), sur les 15 tuiles de `tuiles.json` contre leurs voisines de pré.
7. **Ombres froides** : sur le masque sol de `sol-sud` et le pré de `champs-nord`, les 10 % de pixels les plus sombres ont B > R, B > G et une luminance médiane d'au moins 30. Dans le diff, aucun multiply noir, et les ombres de `ombres.ts` restent mêlées à `#2E3552`.
8. **La nuit reste un étalonnage** (règle 5) : aucun appel FLUX, les fichiers de nuit dérivent des fichiers de jour par `nuit_alentours.py`, une seule taille d'image par famille.
9. **La nuit reste la nuit** : la luminance médiane du masque sol de `sol-sud` vaut de nuit entre 25 % et 55 % du jour (bornes à confirmer sur la baseline).
10. **Le cœur reste le plus lumineux** (règle 4) : boîte des sprites `layer=building` sur la miniature 1/8, barres exclues : sa moyenne et son écart-type dépassent ceux de toute fenêtre de même taille qui la recouvre à moins de 25 %, sur p06-nuit et p12-nuit.
11. **KEEP** : l'étalonnage change tous les pixels du sol, donc `fenetres`, `feu` et `villageois` passent par le diff seulement sur les pixels des sprites. Sinon A/B, et perdre fait échouer le tour. Pas d'écran cible de nuit : la question A/B porte sur les piliers, et le canari vient de l'écran cible de jour choisi passé par la courbe de nuit.
12. **Lueurs** : non touchables, non comptées, statiques en mouvement réduit.
