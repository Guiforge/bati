# Contrat BC (amendé par env le 01/11, gelé le 02/11 : routes et champs peints, écran cible p06 A)

Chaque critère vaut oui ou non. Un seul non fait échouer le tour. Seuils à confirmer sur la baseline avant le tour 1. Barres système exclues partout.

1. **G03** : le dump ne contient aucun sprite `screenFixed` hors vignette de bord (`plan_*` retirés). Le code n'a plus de composant fixé à l'écran dans la scène. Aucune parallaxe.
2. **G02, répétition** (amendé le 02/11, décision de Guillaume : la forêt peut répéter) : dans une masse de forêt, la répétition est admise. Les bouquets isolés sur le pré restent tous différents dans un même écran, jugé sur image. Peindre plus de masses reste permis, au moment de R1.
3. **G02, pieds** : le sous-bois recouvre le pied de chaque tronc sur `pieds` et `lisiere`.
4. **Forêt** : sur `lisiere`, dans le dump, largeur max/min d'au moins 1,8 avec trois classes (baseline 1,2). Largeur médiane du quart le plus proche du village inférieure à celle du quart le plus loin. Bouleau, chêne et pin visibles tous les trois.
5. **G04** : au moins une vignette dans le cadre de `champ` (crop recoupé à 14,12,28,24 si la baseline n'y montre aucun champ). Aucune arête droite de plus de 2 tuiles. Aucun asset répété à l'identique, au manifeste. Au moins 2 accessoires de sa liste de vie à 3 tuiles ou moins. Un chemin visible relie la vignette à la route ou à la rivière.
6. **G05, G06** : liste de tuiles du segment gelée dans la carte, le tampon de sol du manifeste peint la route sur chacune (amendé le 02/11 : un seul tampon, à signaler au checkpoint), un test jest prouve que `RuesDessinees` ne les trace pas. Sur `route` en 2x : zéro contour sombre continu, zéro suite de points gris.
7. **G07** : le châtelet chevauche le mur aux deux bouts, sans jour, sur `porte`. Route : aucune coupure d'une tuile ou plus, de la porte au bout, d'après la liste de tuiles. Un bout caché par un bouquet compte non.
8. **Règle 2** : tout objet posé dans le coin touche le sol, avec ombre de contact en code et base peinte. Aucune dalle visible.
9. **Règle 4** : boîte des sprites `layer=building` sur la miniature 1/8 : sa moyenne et son écart-type dépassent ceux de toute fenêtre de même taille qui la recouvre à moins de 25 %. L village / L alentours d'au moins 0,98, le niveau de l'écran A (décision de Guillaume, 02/11), à condition que le cœur reste la zone la plus claire sur la vignette floue (la règle de la fenêtre ci-dessus), saturation moyenne des alentours inférieure à celle du village.
10. **Règle 5** : ombres du coin d'ardoise (B > R, B > G sur les 10 % les plus sombres du sol), aucun multiply noir dans le diff. Décision de Guillaume, 02/11 : pas de nouveau tour pour ce critère. Un simple décalage de teinte des ombres du sol peint, sans repeindre, s'il suffit au tour 6. Sinon, exception écrite pour ce verrou, et le critère devient obligatoire dans le contrat de R1.
11. **G01 local** : sur `route` et `coin-bas`, au moins 60 % des fenêtres de 4x4 tuiles contiennent un tampon ou un accessoire, le reste fait les zones de repos. Aucune limite de sol droite de 3 tuiles ou plus. La pointe claire de l'île vers 37,37 n'est pas laissée à nu.
12. **Une taille d'image par famille**, cliquet inchangé (à 26).
13. **Promesses** : rien ne recule d'un palier à l'autre sauf la lisière (décision du 01/11), rien de neuf n'est touchable, les bandes de palier ne font qu'ajouter.
14. **Nuit** : les nouveaux assets ont leur `.nuit.webp` par `nuit_alentours.py` tel qu'il est sur la branche iso. S-night est parquée (réponse 4), donc son contrat ne s'applique pas ; la nuit du coin ne doit pas être pire que la baseline, au jugement d'env, et une teinte par essence et par culture reste lisible.
15. **KEEP** : `fenetres`, `villageois`, renard et feu de camp passent sous 2 % ou gagnent leur A/B.
16. **Sondes** : aucun défaut de la liste slop. Exception du 02/11, décision de Guillaume : les ombres peintes sous les chaumières restent, refroidies à la cuisson.
18. **Aucune croix** (02/11, demande de Guillaume) : aucun poteau nu avec traverse, dans aucun champ et à aucun palier, ni rien qui se lise comme une croix ou un symbole religieux. L'écran A en montre une dans le blé : ne pas la reprendre. Un épouvantail garde chapeau et manteau.
17. **Variété** (leçon de S-night) : sur le coin, les couleurs mesurées ne passent pas par un filtre uniforme. Bouleau, chêne, pin, blé, potager et pré gardent chacun leur teinte, au jugement d'env sur images.

## Verrou du 02/11 : exceptions écrites par décision de Guillaume

Env a rendu NOTES au dernier verdict (`r6/verdict-env.md`). Guillaume a verrouillé quand même. Valables pour ce verrou seulement, toutes obligatoires dans `../r1/contrat-entree.md` :

- **Critère 2** : deux bosquets de bouleaux jumeaux en miroir aux paliers 3 et 4.
- **Critère 3** : racine nue au bord droit du palier 6, même cause sur un bosquet des paliers 3 et 4.
- **Critère 10** : ombres du sol peint non ardoise.
- **Critère 13** : les bouquets retirés entre paliers comptent comme lisière.
- **Critère 15** : les extraits KEEP ne comptent pas comme un recul. Aucun extrait n'était verrouillé, donc la règle 10.1 ne s'appliquait pas à la lettre : 14,4 % et 14,0 % d'écart avec la baseline, 0 pixel d'écart entre deux captures du tour, mêmes pixels gagnés puis perdus en A/B.
