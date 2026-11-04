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

Avec la fusion et ses ancres, plus aucun bâtiment n'est sous 85 % à aucun palier, même au plus haut stade : le pire est la salle des héros à 85,6 % au palier 12, puis la fontaine 86,5 %, la carrière 86,7 %. Les 83,2 % de la carrière d'avant la fusion ne tiennent plus. Au palier 12 les ancres `anchors 3` et les accessoires `props 24` restent à regarder (`check.js`), je n'y ai pas touché.

Décalage d'une case du mannequin en [7, 0] (non appliqué), `img/prop-mannequin-7-0.jpg`, palier 12 `haut=1` : `GATE occlusion: 0 of 21` et `GATE FAILED: occlusion 0, anchors 0, props 8, depth 0, hooks 9, tap 0, motion 0` ; la carrière n'est plus dans les six plus bas (tous au-dessus de 95,2 % hors salle 85,6, fontaine 86,5, tir 87,2, feu 88,0, rempart 88,4), soit plus de 95 % contre 86,7 % ; les ancres tombent de 3 à 0 et les accessoires de 24 à 8.

Plans vus de dessus par bande : `img/prop-plan-t1-3.jpg`, `-t4-6`, `-t7-9`, `-t10-12`.

## Le sud et le palier 4

Le coin du sud (porte, L de mur, route, champ) arrive au **palier 4** : le rempart et les champs sont au palier 4 dans `paliers.py` (`REMPART`, `CHAMPS`, `castle_wall` et `watchtower`), l'île descend jusqu'à gy 19 dès le 4. Les stades du mur (`etapes`) commencent encore au palier 6 : palissade jusqu'au palier 6, pierre ensuite, comme le cadrage verrouillé `porte` (palier 6, palissade) le demande. Rien ne l'interdit côté données ; le crop verrouillé est inchangé en art (voir `img/prop-crops.jpg`).

## Sol, reste à faire

Rendus : `img/sol-t12-recul.jpg` (palier 12, recul maximal, `foyer=campfire&zoom=0.3`), `img/sol-t12-est.jpg`, `img/sol-t8-routehaute.jpg`.

- **Découpe carrée au pied de la route sud** (recul, palier 12) : la route peinte finit sur le bord de la tuile du terrain peint (`TERRAIN`, 1656 x 2152 dp), les masses de forêt du sud s'ouvrent juste là. Non corrigé : c'est la forêt du sud de GROWTH (G15), qui doit refermer le pied de la route, ou une repeinture de la tuile du bas.
- **Bord carré à gauche du coin** : couture entre deux tuiles du terrain peint (bandes `.t1-3` et `.t4-6` de `BANDES_TERRAIN`) : cuite dans l'image, donc GROWTH, bande F ou repeinture ; non corrigé.
- **Plaques plates sombres à l'est** : même cause, bandes cuites du terrain (polygones sombres) ; la forêt à l'est les couvre en partie. À GROWTH (forêt) ou repeinture.
- **Bruit plat en haut de la carte et bandes vides** : le recul à 0,3 sort de la tuile de terrain peint (la boîte `TERRAIN` s'arrête à y = -836) : au sol vectoriel. Causé par l'île agrandie : le plancher de zoom du jeu est le cadrage de l'île entière, plus bas qu'avant. **Corrigé en donnée** : `cadrageComplet` (`carteDemo.ts`) ne descend plus sous le zoom où la vue tient dans le terrain peint (0,43 sur le téléphone de référence). À ce plancher, l'île entière ne tient plus en largeur au palier 12 (elle se déplace au doigt) : à Guillaume de choisir entre ce plancher et un terrain peint plus grand. Le rendu à 0,3 reste une borne de l'atelier, hors du jeu.
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

Deux options, `scripts/layout/rue.py` : **nord** (défaut de la branche) : deuxième pont en [2, 2], la rue monte par gx 0 puis gx -1 vers la forêt, elle évite l'observatoire et le moulin, plan `img/prop-rue-nord-plan.jpg`, rendu `img/prop-rue-nord-t12.jpg` ; **ouest** : un seul pont en [2, 10], la rue longe le moulin et l'observatoire par gx -4, `img/prop-rue-ouest-*.jpg`. Les deux donnent 1 bâtiment sur 21 sous 85 % (carrière 83,2 %). Je recommande **nord** : un pont de plus mais une rue qui monte droit vers la forêt sans passer contre le moulin ni l'observatoire, et GROWTH y trouve sa route vers le nord. L'ouest, plus court, colle la rue aux façades de deux bâtiments du joueur. Rangs : ceux de `rues.ts` (par distance au feu), jamais plus clairs que la place. Le risque d'une colonne droite est coupé par un décalage en [-1, -3].

## Les cadrages verrouillés (L10)

`img/prop-crops.jpg` : `porte`, `lisiere`, `pieds` (tuiles de `loupes/bc/card.md`, palier 6, jour) avant (`origin/track-layout`) et après (`scripts/layout/crops.sh origin/track-layout DOSSIER`, puis `montage_crops.py`). `lock_check.py` : LOCK_OK (aucun fichier du verrou touché). L'art du coin de la porte sud n'a pas bougé ; son cadrage de palier 6 a bougé un peu parce que l'ouverture suit la largeur du bâti. `lisiere` et `pieds` changent presque entièrement : leurs tuiles sont la terre nouvelle, désormais pleine de bâtiments, et les trois masses de forêt vectorielles qui s'y trouvaient ont déjà reculé (la clairière suit l'île). Il n'y a pas eu besoin de repeindre ni de régénérer `isoLisiere.json`.
