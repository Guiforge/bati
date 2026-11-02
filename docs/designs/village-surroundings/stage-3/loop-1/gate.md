# Porte de l'étape 3, boucle 1

01/11/2026. 6 sprites FLUX 3 Image demandés : 4 masses (feuillus, mélangée, bouleaux, dense) et 2 pièces de bordure (mur de conifères, crête rocheuse). 0,42 $ : 6 appels facturés, mais « mélangée » n'est jamais revenue (5 images). Le registre signale un écart entre solde et coûts (22,52 contre 23,16 $), c'est le solde qui a du retard.

Références : l'arbre de l'étape 0 (`f3_t3_trait5`) et l'ancre jour. Pose : `foret.py pose 1`, masses placées tous les 56 dp au hasard fixe dans la forêt du masque de chaque palier, débord de 25 dp sur le pré, jamais à moins de 40 dp du village, d'un chemin ou de l'eau.

## Grille de l'étape 3

Le pipeline ne la chiffre pas. Seuil : aucun 0, total ≥ 8/10.
1. Même main que les bâtiments : trait de 4 à 6 px posé, palette, lumière de gauche, ombre ardoise.
2. Des masses, pas des sucettes : silhouettes groupées, variées, sans répétition visible.
3. Une bordure sombre qui ferme la carte, aux paliers 1, 6 et 12.
4. Les règles : la lisière recule, les clairières de la route et de la rivière restent, l'étoile est cassée, ni socle en losange ni feuilles tampons.
5. Le composite : le village reste la vedette, rien ne le cache.

## Mesures

Trait extérieur à l'échelle S : feuillus 6, bouleaux 7, dense 6, mur de conifères 8, crête 4 (portée de 4 à 4 par dilatation). Masses posées au palier 12 : 251, plus 681 pièces de bordure.

## Notes

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| Même main | 1 | Lumière de gauche et ombre froide justes, mais deux traits hors de la fourchette (7 et 8 px). |
| Des masses | 1 | Ce sont bien des masses, mais la même tache revient tous les 56 dp : un papier peint. |
| Bordure qui ferme | 1 | La bordure est posée, mais ses pièces sont claires et ouvertes, pas un mur sombre. |
| Les règles | 0 | Socle de gazon en losange sous 4 sprites sur 5, feuilles tampons sur les couronnes : les deux défauts de l'étape 0 sont revenus. |
| Composite | 0 | Au palier 12, la forêt du bas recouvre l'antre du dragon et le bas du village : une masse posée sous l'île monte de toute sa hauteur sur l'écran. |

**Total 3/10 : la porte ne passe pas.**

Les deux pires lignes pour la boucle 2 :
1. **Socles et feuilles tampons** : ils viennent de la référence, l'arbre de l'étape 0, qui a les deux défauts. La boucle 2 envoie l'ancre seule et dit en clair « les troncs posent sur le fond, rien dessous ». « Mélangée » est redemandée.
2. **La forêt de devant cache le village** : une masse placée sous le village (plus bas à l'écran) doit laisser entre son pied et le village au moins sa hauteur. Le placement le vérifie colonne par colonne. Il ajoute aussi un miroir et une taille au hasard, pour casser la répétition.
