# Contrat BC (amendé par env le 01/11, gel après la réponse de Guillaume sur les routes)

Chaque critère vaut oui ou non. Un seul non fait échouer le tour. Seuils à confirmer sur la baseline avant le tour 1. Barres système exclues partout.

1. **G03** : le dump ne contient aucun sprite `screenFixed` hors vignette de bord (`plan_*` retirés). Le code n'a plus de composant fixé à l'écran dans la scène. Aucune parallaxe.
2. **G02, répétition** : `dump-check --mass-prefix arbre_` (les `tree_*` sont des bouquets et suivent la vraie règle 3), avec filtre de tuiles : seuls la couche forêt et le manifeste dans les crops dorés comptent.
3. **G02, pieds** : le sous-bois recouvre le pied de chaque tronc sur `pieds` et `lisiere`.
4. **Forêt** : sur `lisiere`, dans le dump, largeur max/min d'au moins 1,8 avec trois classes (baseline 1,2). Largeur médiane du quart le plus proche du village inférieure à celle du quart le plus loin. Bouleau, chêne et pin visibles tous les trois.
5. **G04** : au moins une vignette dans le cadre de `champ` (crop recoupé à 14,12,28,24 si la baseline n'y montre aucun champ). Aucune arête droite de plus de 2 tuiles. Aucun asset répété à l'identique, au manifeste. Au moins 2 accessoires de sa liste de vie à 3 tuiles ou moins. Un chemin visible relie la vignette à la route ou à la rivière.
6. **G05, G06** : liste de tuiles du segment gelée dans la carte, un tampon de route au manifeste sur chacune, un test jest prouve que `RuesDessinees` ne les trace pas. Sur `route` en 2x : zéro contour sombre continu, zéro suite de points gris.
7. **G07** : le châtelet chevauche le mur aux deux bouts, sans jour, sur `porte`. Route : aucune coupure d'une tuile ou plus, de la porte au bout, d'après la liste de tuiles. Un bout caché par un bouquet compte non.
8. **Règle 2** : tout objet posé dans le coin touche le sol, avec ombre de contact en code et base peinte. Aucune dalle visible.
9. **Règle 4** : boîte des sprites `layer=building` sur la miniature 1/8 : sa moyenne et son écart-type dépassent ceux de toute fenêtre de même taille qui la recouvre à moins de 25 %. L village / L alentours entre 1,10 et 1,50, saturation moyenne des alentours inférieure à celle du village.
10. **Règle 5** : ombres du coin d'ardoise (B > R, B > G sur les 10 % les plus sombres du sol), aucun multiply noir dans le diff.
11. **G01 local** : sur `route` et `coin-bas`, au moins 60 % des fenêtres de 4x4 tuiles contiennent un tampon ou un accessoire, le reste fait les zones de repos. Aucune limite de sol droite de 3 tuiles ou plus. La pointe claire de l'île vers 37,37 n'est pas laissée à nu.
12. **Une taille d'image par famille**, cliquet inchangé (à 26).
13. **Promesses** : rien ne recule d'un palier à l'autre sauf la lisière (décision du 01/11), rien de neuf n'est touchable, les bandes de palier ne font qu'ajouter.
14. **Nuit** : les nouveaux assets ont leur `.nuit.webp` par `nuit_alentours.py`, le contrat S-night reste vert sur le coin.
15. **KEEP** : `fenetres`, `villageois`, renard et feu de camp passent sous 2 % ou gagnent leur A/B.
16. **Sondes** : aucun défaut de la liste slop.
