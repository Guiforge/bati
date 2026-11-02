# L4-T07b (qa) : reflets de l'eau sur émulateur

Build : `.perf` neuf, BUILD SUCCESSFUL (`evidence/L4-T07b/build.log`), `install -r` OK. Pas de série de perf.
Preuves : `evidence/L4-T07b/` : `1-debut`, `2-milieu`, `3-fin`, `4-repos` (images extraites d'un film de 22 s, recadrées sur la zone du canal), `5-palier8-vague.png`, `repos-gfx.txt`. Le film brut reste dans le scratchpad.

## Verdicts
1. Des traits clairs glissent le long du canal pendant une vague : **KO** (aucun trait visible).
2. Sans dépasser du canal, sous les ponts et pièces : **non vérifiable** (rien à voir).
3. À la fin, plus de trait, 0 image en 10 s après 20 s : OK (0 image, 0 janky).

## Détails
**1.** Palier 12 (canal le long du bord haut gauche, avec ponts), `dev-iso` rouvert à froid, film de 22 s à 30 i/s. La vague dure environ 15 s, avec des rafales d'environ 4,5 s des ailes du moulin. J'ai comparé les images de la vague entre elles et à l'image de repos, sur toute la zone de la carte en excluant la boîte du moulin et de ses ailes : écart nul à un seuil de 8/255 par pixel entre deux images de la vague (cinq paires dont les images 60/75, 150/165, 300/315 de la vague) ; à 2/255 un écart constant d'environ 10 600 pixels apparaît, identique de 1,2 s à 10 s et dû à la quantification du film (il disparaît à 14 s quand le film se fige), donc pas un mouvement. Les images 1, 2 (début et milieu) et 4 (repos) sont indiscernables à l'oeil hors ailes. Même résultat au palier 8 (`5-palier8-vague.png`, deux captures à 3 s d'écart : seule la boîte du moulin diffère, x 235-381, y 545-691). Les nœuds `iso-reflet-*` n'ont pas d'accessibilité (pointerEvents none), je n'ai donc pas pu les compter.
Cause probable, non vérifiée : dans `IsoCarteDemo.tsx` (~595-605), les `Reflet` sont montés avant les `vues`, qui contiennent les pièces d'eau ; l'image d'une pièce d'eau est opaque sur sa case (commentaire ligne 14), donc le trait, un `Animated.View` de 2 px à opacité max 0,55, serait dessiné dessous et caché. Une hypothèse à vérifier côté ingénierie en le montant après les pièces d'eau et avant les bâtiments, ou en vérifiant que `sol[gy][gx] === "eau"` est vrai à ces paliers. Aucun code touché.
**3.** 20 s sans toucher, `gfxinfo reset`, 10 s : `Total frames rendered: 0`, Janky 0 (`repos-gfx.txt`).

## Non vérifié
Le coût en image pendant la vague (perf suspendue) ; les autres paliers que 8 et 12.

## Tour 3

Build : `.perf` neuf (BUILD SUCCESSFUL, `evidence/L4-T07b/t3/build.log`), `install -r` OK. Preuves : `evidence/L4-T07b/t3/` : `1-debut`, `2-milieu`, `3-fin`, `4-repos`, chacune en `-brut.png` (zone carte 1080x700), `-zoom.png` (canal agrandi x3, au plus proche) et `-ecart.png` (écart à l'image de repos, multiplié par 4, ce qui rend les traits de 2 px visibles) ; `repos-gfx.txt`. Même protocole : palier 12, film de 22 s à 30 i/s.

Verdicts : traits visibles OK ; restent dans le canal OK ; sous les ponts et pièces OK avec une réserve ; fin sans trait et 0 image au repos OK.

- **Traits visibles : OK.** Hors boîte du moulin, il y a maintenant des écarts (5 à 68 pixels au seuil 20/255) entre les images de la vague et l'image de repos ; au tour 2 il n'y en avait aucun. Ils reviennent en rafales de 4,5 s sur le cycle de 5 s (0 écart à 4,0 à 5,0 s, 9,0 à 10,0 s, 14,0 s). Sur `2-milieu-ecart.png`, une dizaine de petits traits clairs en tirets, tous alignés sur la diagonale du canal (le long du bord haut gauche), en nombre et à des positions différentes d'une image à l'autre (phases décalées). Les traits de 2 px se voient aussi dans `2-milieu-zoom.png` comme de courts traits pâles dans les cases du canal.
- **Ne dépassent pas du canal : OK.** Sur les trois images d'écart (début, milieu, fin), aucun pixel hors de la ligne du canal en dehors de la boîte du moulin (boîte englobante des écarts hors moulin : x 135 à 570, y 145 à 364 en repère de la zone, soit la longueur du canal visible, 4 à 5 cases de large au plus).
- **Sous les ponts et pièces : OK avec une réserve.** Les traits sont absents au droit de la planche de pont à gauche du moulin sur les images d'écart (le pont les recouvre) ; mais le pont et ses cases voisines touchent la boîte du moulin, que j'ai masquée dans le calcul (ailes en mouvement), donc je ne peux pas séparer proprement un trait masqué par le pont d'un trait masqué par mon calcul. À regarder sur le téléphone si la finesse compte.
- **Fin et repos : OK.** `4-repos` (image figée à 14,6 s) : 0 écart ; `3-fin` (13 s) n'a plus que de rares tirets proches de leur fin de course ; film figé après 14,6 s. 20 s sans toucher, `gfxinfo reset`, 10 s : `Total frames rendered: 0`, Janky 0.

Non vérifié : le coût en images (perf suspendue) ; les autres paliers.
