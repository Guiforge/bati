# Porte de l'étape 3, boucle 2

01/11/2026. Même grille que la boucle 1. 6 sprites FLUX 3 Image, référence : l'ancre seule. 0,42 $.

## Ce qui change depuis la boucle 1

- L'arbre de l'étape 0 n'est plus en référence. Le prompt dit « troncs et racines posés sur le fond magenta, ni herbe, ni terre, ni socle de quelque forme que ce soit ».
- Bordure demandée presque noire, sans feuillus.
- Placement : devant le village, une masse garde 130 dp entre son pied et tout ce que le village occupe. Taille au hasard fixe de 0,75 à 1,25. Jamais de miroir, qui mettrait la lumière à droite.

## Mesures (`mesures.json`)

Trait extérieur à S, brut puis porté : feuillus 1 → 6, mélangée 2 → 6, bouleaux 2 → 5, dense 1 → 6, mur de conifères 4 → 5, crête 1 → 6. Tous dans la fourchette de 4 à 6.

## Notes

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| Même main | 2 | Traits de 5 à 6 px, lumière de gauche, ombre froide. Les feuilles tampons ont presque disparu. |
| Des masses | 1 | Masses variées, mais au palier 12 le bas de l'écran reste un tapis régulier de la même tache. |
| Bordure qui ferme | 1 | Le mur de conifères ferme les coins, mais il reste moins sombre que demandé. |
| Les règles | 0 | 3 sprites sur 6 gardent un socle (losange d'herbe sous les bouleaux et la masse dense, dalle de pierre sous la crête). Au palier 12, ces losanges dessinent des marches en haut de l'écran. |
| Composite | 2 | Le village n'est plus caché à aucun palier, la forêt le cadre dès le palier 1. |

**Total 6/10, un 0 : la porte ne passe pas.**

Pour la boucle 3 (la dernière) :
1. **Socles** : les 3 sprites fautifs sont redemandés avec une autre formule (« découpés comme un autocollant, sous les troncs le magenta pur »). Un contrôle automatique mesure la part opaque des 10 % du bas de chaque sprite : un socle remplit la largeur, des troncs non. Un sprite qui échoue n'est pas posé, et une masse propre prend sa place.
2. **Tapis** : le pas passe de 56 à 72 dp, avec plus de types de masse sur la même zone ; la forêt se lit en groupes, pas en papier peint.
