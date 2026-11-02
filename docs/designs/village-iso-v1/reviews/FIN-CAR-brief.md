# FIN-CAR : cahier des charges du bord et des alentours (regard neuf DA, 31/10)

Demande de Guillaume : « le bord du village fais plus simple et les alentours rends ça plus sympa ». Le regard neuf a regardé les captures 22, 21, 20, 07, 30 et 23 de evidence/qa-audit3/ et lu bord.ts, monde.ts, lisiere.ts. Il n'a ouvert ni Rues ni IsoCarteDemo en entier. Ses prix FLUX sont des hypothèses.

## 1. Le bord aujourd'hui (Tuile, IsoCarteDemo.tsx l. 498-546, de bas en haut)
1. **Ombre portée** (`bord.ilot` décalé de `OMBRE_ILE`, `isoSocleShadow`) : elle fait « plateau ».
2. **Reflets** (`bord.reflets`, 0,55) : ils disent « eau en bas » alors qu'il n'y a pas d'eau.
3. **Berge** en 4 Path (terre et pierre, `EPAISSEUR` 9 dp) : c'est **la couche la plus lourde**, un feston brun vif qui crée le plateau.
4. **Herbe et bosses** (`BOSSE` 24 dp) : un contour organique, mais un contour quand même.
5. **Plaques et crépuscule du bord** (`sombres`) : l'île finit plus sombre que son centre.
6. **Encre du contour**, sous la berge et en fin de tronçon.

Ce qui surcharge, dans l'ordre : la berge et son encre ; l'écart de valeur entre l'herbe de l'île et `foretSol` ; les reflets et l'ombre, qui racontent « île sur l'eau ». Dans le monde : un anneau de clairière en papier peint, des frontières horizontales au zoom mini, des arbres plats vert clair, la mer encore atteignable.

## 2. Le bord simplifié
- **On retire** : la berge (4 Path), les reflets, l'encre du contour et les traits de fin de tronçon.
- **On fond** : les bosses prennent la teinte de l'herbe du monde (l'herbe continue) ; le crépuscule s'étend vers l'extérieur jusqu'à la valeur du champ, en rampe monotone (herbe, crépuscule 1 à 3, champ, lisière, forêt) ; `foretSol` se rapproche du crépuscule de niveau 3 ; `OMBRE_ILE` devient une ombre de contact plus douce, retirée si on lit bien sans elle.
- **On garde** : les lobes, `bord.ilot` comme simple clip, les rues qui traversent la limite.
- Test de lecture : capture à zoom 0,6. Si l'œil trace encore un losange, il reste une couche de trop.

## 3. Des alentours sympas
Les contraintes : rien d'animé au repos, 64 nœuds animés, tailles 19 sur 20 (tout élément peint reprend `IMAGE` = 384), Svg 94 sur 95 (le dessin de l'app passe dans les Svg de tuile existants).
- **Contact** : herbe qui déborde, galets (Path, 0 $).
- **Proche** : chemins qui sortent des deux bouts puis bifurquent (Rues) ; champs en sillons encrés (Path au tour 1, peints au tour 2) ; haies basses (Path).
- **Moyen** : rochers (déjà là) ; bergerie, pont, moulin à eau (tuiles peintes).
- **Lointain et fond** : la lisière en bosquets et la forêt dense, repeintes.
- **Petites histoires**, peintes dans les tuiles, 0 nœud animé : renard à la lisière, charrette sur un chemin, épouvantail, pêcheur sur le pont, bivouac lointain.
- **Mer** : la retirer de la zone accessible (`COLONNE_RIVE`, `X_MER`), ce qui libère deux images.

## 4. Brief de l'image cible
> Peins le village de Bati au palier 12, la nuit, en BD franco-belge encrée, en vue isométrique plongeante. Pas d'île, pas de plateau, pas d'eau autour : le sol continue jusqu'aux bords du cadre. Le village occupe le tiers central, ses 21 bâtiments sont lisibles et le losange se devine à peine. Aucun trait de contour : l'herbe du village se prolonge en taches dans celle des champs, dans le même vert sombre. Deux chemins de terre quittent le village par la gauche et par la droite. Ils serpentent entre des champs en bandes (sillons encrés, deux verts et un ocre sombre) bordés de haies basses, puis se perdent dans la forêt. En bas, peu d'arbres : des champs, un enclos à moutons, une charrette. Une rivière sort à gauche, passe sous un pont de bois et fait tourner un moulin à eau. En haut et sur les côtés, une forêt dense en grappes d'arbres encrés, plus sombre vers le fond, rien de flou. Une lisière en bosquets de trois à cinq arbres. Nuit claire, lune haute à gauche, ombres bleu-noir neutres vers le bas à droite. Les fenêtres, la forge, le feu et les lanternes posent au sol des flaques chaudes et plates. Un bivouac orangé au loin. Palette sans violet : vert mousse sombre et vert-bleu de nuit, ocre et terre brûlée, ardoise, brique, ambre et or, bleu-noir. Le même trait épais que les bâtiments sur tout ce qui est solide, une seule teinte d'ombre par forme, ni brume ni voile.

## 5. Les tours
- **Tour 1, code seul, 0 $** : retirer la berge, les reflets et l'encre du contour ; bosses à la teinte du monde ; crépuscule étendu ; `foretSol` rapproché ; mer hors de portée ; frontières des anneaux adoucies ; chemins qui sortent ; champs et haies en Path. Aucun Svg ni taille de plus.
- **Tour 2, environ 4 $** : repeindre les tuiles du monde avec l'encre des sprites (dense, coni, mixte, bouleaux, clairière, rochers) et ajouter champ_a, champ_b, chemin, lisière_a. Même `IMAGE`, nuit cuite, aucune opacité par image. Risque : les raccords.
- **Tour 3, environ 6 $** : bergerie, pont, moulin à eau, bivouac, charrette, renard, posés par la graine.

## Décisions du chef
- Mer retirée de la zone accessible. Elle est déjà hors de vue en jeu depuis le dernier commit, et la retirer suit le « plus simple » de Guillaume.
- Tour 1 lancé après le commit des lots en attente. Les tours 2 et 3, environ 10 $, viendront après la mesure du tour 1, avec le budget FLUX montré à Guillaume.
