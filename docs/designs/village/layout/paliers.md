# Paliers : le village grandit vers l'extérieur (L7)

Les positions ne changent jamais d'un palier à l'autre, seul ce qui se révèle change. `python3 scripts/layout/paliers.py` écrit `paliers` et `etapes` dans `constants/isoLayout.json` et peut être relancé (`--plan` n'écrit rien). Règle : un plot et 2 cases de sol autour, son chemin jusqu'au feu et 1 case autour, au palier du bâtiment ; ensuite le sol entre et autour (palier du voisin plus un), la campagne aux paliers 10 à 12 ; enfin un passage minimax depuis le feu, donc l'île est d'un seul tenant à chaque palier et ne recule jamais. Un plot n'entre jamais avant son palier. `etapes` est le même tableau : le palier où commencent les stades du bâtiment (`stadeDemo`).

| Palier | Bâtiments qui apparaissent | Ce qui s'ouvre | Cases (île) | Zoom |
|---|---|---|---|---|
| 1 | feu, tente, mannequin, salle des héros (stade brut, l'appentis), puits | le camp, sentiers étroits, la place | 144 | cadrage serré sur salle et place |
| 2 | forge, tir à l'arc, fontaine | la place s'élargit, chemin de la forge | 190 | idem |
| 3 | ferme, armurerie, carrière | berge ouest et la ferme, carrière au bord de la rivière | 272 | cadrage du bâti |
| 4 | moulin, tour du sorcier, porte, rempart (palissade) et tour de guet, champs du sud | le mur et le coin du sud, l île descend à gy 19 | voir `plan.py` | idem |
| 5 | grange, bosquet | le nord de l'autre rive | 421 | idem |
| 6 | (les stades du mur passent à la pierre au 7) | premier quartier (Q1) | voir `plan.py` | idem |
| 7 | observatoire, champs | l'ouest lointain, les champs du sud | 545 | idem |
| 8 | route haute, antre du dragon | l'est et le nord-est | 564 | idem |
| 9 | arène | le sud-ouest | 577 | idem |
| 10 à 12 | aucun nouveau bâtiment | la campagne autour, la lisière | 672 au 12 | idem |

Zoom : aucune borne n'a été éditée. Le cadrage d'ouverture (`cadrage`, `cadrageSerre`) et le plancher de zoom (cadrage entier de l'île) se calculent sur `visible` de chaque palier, donc ils suivent la nouvelle île ; vérifié sur les rendus 1, 3, 6, 9, 12 (`img/prop-t*-jour.jpg`).

## Les deux conflits, à décider par Guillaume

**(a) Maisons au palier 1.** L'amendement veut « un hameau avec sa place, son feu et quelques maisons » au palier 1, la règle 3 de `target.md` veut un palier 1 presque nu, « ni cabane, ni maison ». Le palier 1 construit ici n'a **pas de maison** : feu, tente, puits, la salle des héros en appentis, le mannequin, caisses et sacs, des sentiers étroits. Il se lit comme un campement dispersé, pas comme un hameau. Les maisons sont du travail de GROWTH.

**(b) Le départ est étiré.** Sur son plan, la tente est en [5, 8] et le mannequin en [7, 1], loin du feu en [12, 11] : au palier 1 le mannequin est seul en haut à droite, la tente à gauche (`img/prop-t1-jour.jpg`, 144 cases). Alternative mesurée pour un départ serré : tente en [8, 11] et mannequin en [13, 9] (leurs places d'avant), rendu `img/prop-t1-serre.jpg`. Elle coûte au palier 12, jour, tous stades hauts : **3 bâtiments sur 21 sous 85 %** (mannequin 28,3 %, tente 70,8 %, rempart 82,2 %) contre 1 sur 21 avec le plan avant la fusion (carrière 83,2 %, mesure ancienne : après la fusion le plan est à 0 sur 21 et la variante serrée n est pas remesurée). Une position vaut pour tous les paliers. Le plan de Guillaume reste le défaut.

## Mesures (après la fusion de `origin/track-layout`, jour)

Lignes de porte complètes de `scripts/layout/portes.sh` (`check --tier 1,3,6,9,12 --light jour`), état par défaut de l'atelier :

```
== palier 1 ==
GATE occlusion: 0 of 6 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 2 of 14 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":185,"building":6,"villager":4,"prop":8}, 0 dump entries wi
GATE props: 0 of 5 props under 50.0 % visible
GATE depth: 0 violated pairs among 14 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 0 of 6 drawn hook boxes covered (over 1.0 % of their opaque pixels)
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
== palier 3 ==
GATE occlusion: 0 of 12 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 1 of 31 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":186,"decor":2,"building":12,"prop":16,"villager":8,"animal
GATE props: 3 of 15 props under 50.0 % visible:
GATE depth: 0 violated pairs among 31 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 4 of 12 drawn hook boxes covered (over 1.0 % of their opaque pixels):
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
== palier 6 ==
GATE occlusion: 0 of 17 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 0 of 48 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":178,"villager":12,"building":18,"decor":2,"prop":28,"anima
GATE props: 5 of 28 props under 50.0 % visible:
GATE depth: 0 violated pairs among 48 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 5 of 17 drawn hook boxes covered (over 1.0 % of their opaque pixels):
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
== palier 9 ==
GATE occlusion: 0 of 21 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 0 of 57 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":180,"villager":17,"building":22,"decor":2,"prop":33,"anima
GATE props: 8 of 33 props under 50.0 % visible:
GATE depth: 0 violated pairs among 57 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 8 of 21 drawn hook boxes covered (over 1.0 % of their opaque pixels):
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
== palier 12 ==
GATE occlusion: 0 of 21 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 0 of 59 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":178,"villager":19,"building":22,"decor":2,"prop":35,"anima
GATE props: 8 of 35 props under 50.0 % visible:
GATE depth: 0 violated pairs among 59 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 8 of 21 drawn hook boxes covered (over 1.0 % of their opaque pixels):
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
GATE FAILED: occlusion 0, anchors 3, props 24, depth 0, hooks 25, tap 0, motion 0
```

Même chose avec `--query haut=1` (tous les bâtiments à leur plus haut stade) :

```
== palier 1 ==
GATE occlusion: 0 of 6 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 2 of 14 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":185,"building":6,"villager":4,"prop":8}, 0 dump entries wi
GATE props: 1 of 5 props under 50.0 % visible:
GATE depth: 0 violated pairs among 14 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 1 of 6 drawn hook boxes covered (over 1.0 % of their opaque pixels):
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
== palier 3 ==
GATE occlusion: 0 of 12 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 1 of 31 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":186,"decor":2,"prop":16,"building":12,"villager":8,"animal
GATE props: 4 of 15 props under 50.0 % visible:
GATE depth: 0 violated pairs among 31 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 6 of 12 drawn hook boxes covered (over 1.0 % of their opaque pixels):
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
== palier 6 ==
GATE occlusion: 0 of 17 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 0 of 48 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":178,"villager":12,"building":18,"decor":2,"prop":28,"anima
GATE props: 6 of 28 props under 50.0 % visible:
GATE depth: 0 violated pairs among 48 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 8 of 17 drawn hook boxes covered (over 1.0 % of their opaque pixels):
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
== palier 9 ==
GATE occlusion: 0 of 21 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 0 of 57 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":180,"villager":17,"building":22,"decor":2,"prop":33,"anima
GATE props: 8 of 33 props under 50.0 % visible:
GATE depth: 0 violated pairs among 57 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 8 of 21 drawn hook boxes covered (over 1.0 % of their opaque pixels):
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
== palier 12 ==
GATE occlusion: 0 of 21 buildings under 85.0 % visible; worst first (px = device px covered):
GATE anchors: 0 of 59 sprites more than 2 device px off (0 float above their foot); dump read, layers {"forest":178,"villager":19,"building":22,"decor":2,"prop":35,"anima
GATE props: 8 of 35 props under 50.0 % visible:
GATE depth: 0 violated pairs among 59 standing things (a is behind b by footprint, but drawn after it)
GATE hooks: 8 of 21 drawn hook boxes covered (over 1.0 % of their opaque pixels):
GATE tap: 0 buildings no tap reaches (under 400 opaque device px free of a later tappable building)
GATE FAILED: occlusion 0, anchors 3, props 27, depth 0, hooks 31, tap 0, motion 0
```

**La dernière ligne `GATE FAILED ...` de `check` est la somme des paliers lancés, pas celle du dernier.** Palier 12 seul, `haut=1` : `GATE FAILED: occlusion 0, anchors 0, props 8, depth 0, hooks 8, tap 0, motion 0`. Aucun bâtiment sous 85 % à aucun palier après la fusion ; au 12 le pire est la salle des héros à 85,6 %, la fontaine 86,5 %, la **carrière 86,7 %** (cachée par le mannequin, 2465 px). Les 83,2 % d'avant la fusion ne tiennent plus.

Palier 12, `haut=1`, les 8 accessoires sous 50 % visibles et ce qui les cache :

| Accessoire | Visible | Caché par |
|---|---|---|
| renard_1 | 0,0 % | moulin (313 px) |
| menhir_2 | 0,0 % | antre (1014 px) |
| menhir_1 | 38,3 % | tour de guet (640 px), menhir_3 (204 px) |
| sacs_de_grain_2 | 37,8 % | puits (357 px) |
| menhir_3 | 13,3 % | tour de guet (1127 px) |
| lanterne_1 | 0,0 % | forge (572 px) |
| tas_de_bois_2 | 0,7 % | forge (1351 px) |
| tas_de_bois_1 | 36,5 % | armurerie (995 px) |

Palier 12, `haut=1`, les 8 boîtes de crochet couvertes (plus de 1 % de leurs pixels) :

| Bâtiment, stade | Couvert | Par |
|---|---|---|
| heroes_hall grand | 8,1 % | feu 1729 px, forge 299 px, villageois h10 30 px |
| fountain solid | 9,0 % | étal 1086 px, pan de mur 628 px |
| quarry grand | 13,2 % | mannequin 2465 px |
| archery_range grand | 1,5 % | pan de mur 566 px, râtelier 482 px |
| campfire grand | 16,9 % | tir à l'arc 738 px |
| castle_wall solid | 6,6 % | pan de mur 359 px, route haute 5 px |
| forge grand | 1,3 % | armurerie 462 px, tonneaux 222 px, forgeron 121 px |
| champion_arena grand | 3,2 % | clôture 270 px, villageois h2 142 px |

Les ancres du palier 1 : 2 sur 12 hors de 2 px, deux figurines de la place, `villageois/farmer_face` (iso-figurine-11-12, 3,5 px) et `villageois/herbalist_face` (iso-figurine-10-11, 2,8 px), aucune ne flotte. Au palier 12 : 0 sur 59.

**Mannequin en [7, 0]** (non appliqué, `essai.py`, `img/prop-mannequin-7-0.jpg`), palier 12 seul, `haut=1` : `GATE FAILED: occlusion 0, anchors 0, props 8, depth 0, hooks 9, tap 0, motion 0`. Le seul gain est la **carrière : 96,1 %** (mannequin 717 px) contre 86,7 %. Les 8 accessoires cachés sont les mêmes, les crochets passent de 8 à 9 : la carrière tombe de 13,2 % à 2,5 % mais le bosquet (druid_grove grand) prend 1,1 % (villageois h1, 191 px).

Plans vus de dessus par bande : `img/prop-plan-t1-3.jpg`, `-t4-6`, `-t7-9`, `-t10-12`.

## Le sud et le palier 4

Le coin du sud (porte, L de mur, route, champ) arrive au **palier 4** : le rempart et les champs sont au palier 4 dans `paliers.py` (`REMPART`, `CHAMPS`, `castle_wall` et `watchtower`), l'île descend jusqu'à gy 19 dès le 4. Les stades du mur (`etapes`) commencent encore au palier 6 : palissade jusqu'au palier 6, pierre ensuite, comme le cadrage verrouillé `porte` (palier 6, palissade) le demande. Rien ne l'interdit côté données ; le crop verrouillé est inchangé en art (voir `img/prop-crops.jpg`).

## Sol, reste à faire

Rendus : `img/sol-t12-recul.jpg` (palier 12, recul maximal, `foyer=campfire&zoom=0.3`), `img/sol-t12-est.jpg`, `img/sol-t8-routehaute.jpg`.

- **Découpe carrée au pied de la route sud** (recul, palier 12) : la route peinte finit sur le bord de la tuile du terrain peint (`TERRAIN`, 1656 x 2152 dp), les masses de forêt du sud s'ouvrent juste là. Non corrigé : c'est la forêt du sud de GROWTH (G15), qui doit refermer le pied de la route, ou une repeinture de la tuile du bas.
- **Bord carré à gauche du coin** : couture entre deux tuiles du terrain peint (bandes `.t1-3` et `.t4-6` de `BANDES_TERRAIN`) : cuite dans l'image, donc GROWTH, bande F ou repeinture ; non corrigé.
- **Plaques plates sombres à l'est** : même cause, bandes cuites du terrain (polygones sombres) ; la forêt à l'est les couvre en partie. À GROWTH (forêt) ou repeinture.
- **Bruit plat en haut de la carte et bandes vides (corrigé en partie, ce que le plancher 0,43 ne fait pas)** : `cadrageComplet` ne descend plus sous le zoom où la vue tient dans la boîte du terrain peint (0,43), ce qui retire les grandes bandes vides au recul 0,3. À 0,43 le haut de la carte montre encore une bande sombre et floue de sol plat au-dessus de la forêt, le pied de la route sud finit toujours sur une découpe carrée, et une couture verticale reste à gauche du coin (`img/sol-t12-plancher.jpg`) : ce sont les bords de la boîte peinte, atteints quand on tire la caméra vers un bord, pas des défauts de zoom. Seule une repeinture ou un terrain peint plus grand les retire.
- **Route haute qui s'arrête net au palier 8** : sa sortie est (`SORTIES`, côté est de `rues.ts`) n'était pas dessinée sur le sol peint, et le terrain peint n'a pas de route à l'est. **Corrigé** dans `RuesDessinees.tsx` : la sortie est se dessine sur le sol peint (la sud reste peinte), elle part de la route haute et se divise en deux (`img/sol-t12-est.jpg`). Son ruban est vectoriel, plus fin que la route peinte du sud : une route peinte à l'est la remplacerait.
- **Polygones sombres du sud aux paliers 1 à 3** : bandes `.t1-3` du terrain ; ils cèdent au palier 4 (le coin du sud arrive au 4, voir plus haut). Il faut une repeinture, ou la forêt du sud de GROWTH qui les couvre aux paliers 1 à 3.

## Ponts

Les deux ponts ([2, 10] et [2, 2]) sont des cases `=` de `isoLayout.json` ; `pieceEau` leur donne l'image `eau/canal_pont` (clé `eau/canal_pont.nuit.webp` dans `MAQUETTES`, fichier `assets/images/village/iso/pieces/eau_canal_pont.webp`, une maquette Blender sombre, 512 x 768, ancre [256, 704]). L'échelle 1,35 est retirée : changer l'image suffit, les cases restent. La cascade du bas de la rivière est de l'eau.

## Commandes (pour une montage de GROWTH, G14)

- `python3 scripts/layout/paliers.py` : réécrit `paliers` et `etapes` ; `python3 scripts/layout/rue.py nord|ouest` : applique une rue puis relance `paliers.py`.
- `scripts/layout/rendre.sh` : paliers 1, 3, 6, 9, 12 jour, 12 nuit, recul, dans `img/prop-*.jpg`, et la ligne de porte d'occlusion de chaque palier ; `scripts/layout/une.sh NOM PALIER LUMIERE QUERY` : un seul état.
- `python3 scripts/layout/plan.py bands|slots|rue SORTIE` : plans vus de dessus.
- `python3 scripts/layout/essai.py NOM DOSSIER code=gx,gy ...` : essaie des positions sur une copie du plan (rend le palier 1, mesure le 12, restaure).
- Le sud (coin de la porte) arrive au palier 4 (voir `handoff.md`).

## La rue (L8)

Deux options, `scripts/layout/rue.py` : **nord** (défaut de la branche) : deuxième pont en [2, 2], la rue monte par gx 0 puis gx -1 vers la forêt, elle évite l'observatoire et le moulin, plan `img/prop-rue-nord-plan.jpg`, rendu `img/prop-rue-nord-t12.jpg` ; **ouest** : un seul pont en [2, 10], la rue longe le moulin et l'observatoire par gx -4, `img/prop-rue-ouest-*.jpg`. Mesure après la fusion, palier 12 seul : voir le bas de cette section. Je recommande **nord** : un pont de plus mais une rue qui monte droit vers la forêt sans passer contre le moulin ni l'observatoire, et GROWTH y trouve sa route vers le nord. L'ouest, plus court, colle la rue aux façades de deux bâtiments du joueur. Rangs : ceux de `rues.ts` (par distance au feu), jamais plus clairs que la place. Le risque d'une colonne droite est coupé par un décalage en [-1, -3].

## Les cadrages verrouillés (L10)

`img/prop-crops.jpg` : `porte`, `lisiere`, `pieds` (tuiles de `loupes/bc/card.md`, palier 6, jour) avant (`origin/track-layout`) et après (`scripts/layout/crops.sh origin/track-layout DOSSIER`, puis `montage_crops.py`). `lock_check.py` : LOCK_OK (aucun fichier du verrou touché). L'art du coin de la porte sud n'a pas bougé ; son cadrage de palier 6 a bougé un peu parce que l'ouverture suit la largeur du bâti. `lisiere` et `pieds` changent presque entièrement : leurs tuiles sont la terre nouvelle, désormais pleine de bâtiments, et les trois masses de forêt vectorielles qui s'y trouvaient ont déjà reculé (la clairière suit l'île). Il n'y a pas eu besoin de repeindre ni de régénérer `isoLisiere.json`.

### Mesure des deux rues (palier 12 seul, `haut=1`, après la fusion)

Rue nord : `occlusion 0, anchors 0, props 8, depth 0, hooks 8, tap 0, motion 0`, carrière 86,7 %, salle des héros 85,6 %. Rue ouest : `occlusion 0, anchors 0, props 8, depth 0, hooks 8, tap 0, motion 0`, carrière 86,7 %, salle des héros 85,7 %. Les deux rues sont identiques à la porte près (la rue ne change que des cases de chemin).

## L12 à L14 (05/11, deuxième passe)

- **Pont** : le jour n'atteignait pas la pièce parce que `PieceOuLisiere` lisait `ambiance` (l'ambiance des sprites, `nuit` par défaut) et non la lumière de la carte. Corrigé (`lumiere`). Crops : `img/pont-jour.jpg` (chêne miel) et `img/pont-nuit.jpg` (indigo), les deux ponts. Deux ponts : [2, 10] est le passage d'origine vers le feu et la rive ouest (ferme, moulin, observatoire), [2, 2] est celui de la rue nord vers la forêt ; les deux lisent la même pièce `eau/canal_pont`.
- **Accessoires** : placés à l'œil sur sol libre (herbe, ni eau ni route, loin des bâtiments), groupes en crop : `img/groupe-camp.jpg`, `groupe-moulin.jpg`, `groupe-ferme.jpg`, `groupe-bosquet.jpg`, `groupe-forge.jpg`. **Retirés du jeu** (aucune place libre qui ne se pose sur un autre sprite) : `caisses_2`, `sacs_de_grain_2`, `tas_de_bois_2`, `tonneaux_1` (camp, palier 1), `tonneaux_2` (forge), `outils_3` (puits, palier 5), `sieste_1` (palier 3), `charrette_2` (grange, palier 6). Les menhirs sont près du bosquet, la charrette et le grain au moulin, la ferme garde ses cinq accessoires. Le quartier Q2 est réduit à x ≤ -3 pour leur laisser la place.
- **Portes** : ancres corrigées aux paliers 1 à 4 (l'ancre des figurines `farmer_face` et `herbalist_face` était à 704, la peinture finit à 736 et 729 : `maquettes5.ts`, fichier généré, à refaire si on le régénère). Palier 7 : le rempart passait sous 85 % à cause d'un villageois debout devant la porte ; `casesDuLieu` ne donne plus de cases le long du rempart ni sous les portes (`marcheurs.ts`). Palier 12, `haut=1` : plus aucun accessoire sous 50 %, plus aucun bâtiment sous 85 %.
- **Crochets** : voir les tableaux de `portes-12-paliers.md`. Réglés : fontaine (l'étal passe en [9, 12]), bosquet, arène (clôture en [10, 18]). Restent des bâtiments permanents sur des crochets, à lister pour GAME (le bâtiment devant s'efface panneau ouvert) : feu par l'archerie, salle des héros par le feu et la forge, rempart par ses pans, carrière par le mannequin, forge par l'armurerie, archerie par un pan de mur et le râtelier. Aucune boîte n'a été changée en silence. Boîte suspecte à regarder sur `img/hooks-controle.jpg` : « marmite sur le feu » du feu, 16,9 % couverte par l'archerie ; c'est une couverture d'un bâtiment par un autre, je n'ai pas produit de crop de cette boîte et je ne la juge pas fausse.
- **Sol cuit, manifeste, champs, emplacements de décor** : vérifiés, rien d'obsolète à recalculer. Le manifeste de tampons du sol cuit (`docs/designs/village-loop/loupes/bc/r6/stamps.json`) ne contient qu'un tampon, `[25, 24]` bande `t4-6`, dans le coin sud verrouillé, sans rapport avec les bâtiments déplacés. Les 12 tuiles de terrain peint ne dépendent d'aucune position de bâtiment (aucun trou, bandes jour et nuit des 12 paliers regardées : `img/prop-strip-jour.jpg`, `prop-strip-nuit.jpg`). Les champs (`champs` dans `isoLayout.json`) n'ont pas bougé et sont au palier 4. Les emplacements de décor sont les accessoires ci-dessus. Ce qu'on ne peut pas réparer sans repeindre : les polygones sombres du sud aux paliers 1 à 3 (`img/sol-polygones-t1.jpg`), la couture verticale et le bord du terrain à 0,43 (`img/sol-couture-t12.jpg`, `sol-t12-plancher.jpg`).
- **Chemins des villageois** : `node scripts/layout/chemins.cjs` planifie 480 vagues par palier (12 jours x 40 numéros) avec le `planifierVague` de l'appli et vérifie chaque case parcourue : sur l'île, herbe, chemin ou pont, hors de tout plot et de toute section de rempart. Résultat aux 12 paliers : 0 violation (aucun pas sur l'eau, un bâtiment ou une route supprimée), les villageois marchent sur les deux rives (1770 à 10164 cases côté ouest selon le palier) et ne traversent jamais l'eau (0 pas sur un pont : chaque rive a ses métiers).
- **Plancher 0,43 et paliers** : `img/plancher-t1-t6-t12.jpg`. À 0,43 l'île entière tient en largeur aux paliers 6 et 12 (le palier 1 est petit au centre). Le jeu ne recule pas en deçà (`cadrageComplet`). L'ouverture et les bornes se calculent sur `visible` de chaque palier, et les paliers ne font que croître : rien ne recule d'un palier à l'autre (les bâtiments, les cases, les stades et les accessoires par palier ne font qu'avancer). Défaut visible au plancher : bande sombre plate en haut de la carte et découpe carrée en bas de la route sud (bords du terrain peint).
- **Le crop `porte` jusqu'au palier 6** : au palier 6 il est identique en art et en cases : les douze cases de chemin nouvelles de la fenêtre sont retenues à leur ancien palier (`RETENUES`). Seuls restent le pont ouest (1 et 2, 10, hors fenêtre) et une différence de lumière : le voile du sol (`voileVillage`) suit l'île, plus grande, et éclaircit le champ et la route de 5 niveaux de gris en moyenne (118,4 contre 123,8 sur la moitié basse du crop). Aux paliers 4 et 5 le coin est neuf (avant le plan il n'arrivait qu'au 6), donc rien à comparer. Mesure finale à cadre égal (position monde) : 12,7 % des pixels du crop diffèrent de plus de 8 niveaux, par la lumière du voile, le bas de la place (étal déplacé, fontaine) et le haut du crop ; mur, porte, route, champ et chaumières sont les mêmes. `img/porte-t6-avant-apres.jpg` (avant à gauche, après à droite).
