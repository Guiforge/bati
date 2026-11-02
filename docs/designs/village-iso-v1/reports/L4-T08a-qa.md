# L4-T08a (qa) : lisière de décor autour de l'îlot, sur émulateur

Build : `.perf` neuf depuis l'arbre non commité (base 7ef9c7ae, tour 2 de L4-T08a), BUILD SUCCESSFUL, Gradle arrêté, `install -r` OK. Pas de série de perf.
Preuves : `docs/designs/village-iso-v1/evidence/L4-T08a/` : `village-haut`, `palier1/3/6/12`, `tap-lisiere`, `tap-lisiere2`, `tap-batiment` (chacune en `-brut.png` et `-recadre.png`, recadrage sous la barre de débogage : y=264 en mode Village, y=960 en carte seule), `repos-gfx.txt`, `build.log`.

## Verdicts
1. Onglet Village, haut au repos : OK avec réserve (le titre est sur le dégradé, la lisière n'y arrive qu'à peine).
2. Paliers 1, 3, 6, 12 : OK (s'éteint vers le bord, recule) ; réserve sur « devant un bâtiment à tort » : aucun cas vu, vérifié à l'oeil seulement.
3. Tap lisière sans effet, tap bâtiment ouvre la fiche : OK.
4. Repos : OK, 0 image en 10 s.

## Détails
**1.** `village-haut-*` (palier 1 du héros, 0 image sur 10 s après 28 s). La lisière entoure l'îlot : arbres, bosquets et rochers, de plus en plus pâles vers les bords, sur le ciel dégradé, y compris à gauche et à droite de l'îlot et jusqu'au haut du héros. Mais **le titre et le blason ne reposent pas franchement sur de la lisière** : leurs zones (y 760 à 920 en affichage) ne contiennent que quelques pièces très pâles (rochers et arbres à environ 20 à 30 % d'opacité, y 740 à 830, à droite du titre et dans le bas de l'îlot), et le côté gauche du blason est sur le ciel/dégradé uni, plus sombre. À trancher par le chef : lisière plus dense sous l'îlot ou plus bas au palier 1. Titre et blason restent parfaitement lisibles.
**2.** Carte seule, après tap du palier puis « Cadrer » :
- palier 1 (3 terrains) : ~20 pièces autour d'un îlot minuscule, rochers surtout, opacité nette près de l'îlot, pâle au loin ;
- palier 3 (10 terrains) : lisière un peu plus serrée, l'îlot a repris la place d'une partie des pièces ;
- palier 6 (16 terrains) : lisière nombreuse autour, arbres et bosquets, très pâle vers les bords du cadrage ;
- palier 12 (21 terrains) : lisière réduite à une couronne fine de petits arbres et rochers très pâles, à bord d'îlot (au plus 4 cases).
La lisière s'éteint bien vers le bord à chaque palier, et recule quand l'îlot grandit (palier 12 : couronne mince ; palier 1 : pièces à plusieurs cases du bord). Je n'ai vu aucune pièce de lisière dessinée devant un bâtiment (pas de tronc ni de rocher qui masque un toit) aux quatre paliers ; contrôle visuel à la taille de la capture, pas de zoom maximal.
**3.** Mode Village (la fiche ne s'ouvre pas en carte seule) : tap à (192,822) sur un arbre de lisière à gauche de l'îlot : rien ne se passe (`tap-lisiere-*`, l'écran est celui du repos ; un second tap en (720,1250), `tap-lisiere2-*`, pris en mode Village mais non relu, n'est pas utilisé comme preuve). Tap à (264,745) sur le moulin : fiche Windmill (« Rises with your shoulders ») ouverte (`tap-batiment-*`).
**4.** 28 s sans toucher, `gfxinfo reset`, 10 s : `Total frames rendered: 0`, Janky 0.

## Non vérifié
Zoom maximal (pas de pincement), mémoire (Native Heap, perf suspendue), plus d'un tap de lisière, écran compact.
