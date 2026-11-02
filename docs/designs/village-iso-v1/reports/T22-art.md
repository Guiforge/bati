# T22-art : pièces peintes de rue et de ruisseau (partie images)

Statut proposé : bloqué à moitié. Planches prêtes pour `rue_terre` (tentative 2) et `ruisseau` (tentative 1), mais le plafond de la sonde Klein est atteint (4,956 $ sur 5 $) : le ruisseau doit être repeint (des pontons sont apparus sur des pièces sans pont), et les rangs « pierres » et « pavée » ne sont pas peints.
Auteur : artist
Tour de revue : 1

## Fait
- `scripts/iso/iso_loop.py`, nouvelle section « T22: ground tiles » et 4 commandes : `ground-guide`, `ground-candidates`, `ground-cut`, `ground-sheet`. Aucun autre fichier du dépôt n'est touché. L'audit gelé est intact (sha256 `4beebf08…` et `3677fc4e…` revérifiés), `test_audit.py` PASS.
- Une case de rue ou d'eau est un losange plat, donc l'image 1 n'est pas un blockout Blender (les blockouts appartiennent à `blender`) : c'est un **guide de couleurs** dessiné en Python avec la palette de l'app (`isoPre`, `isoChemin`, `isoEauVive`, `isoTerre`, `isoTerreSombre`), sans encre. Il est rangé dans `~/.cache/bati-art-loop/iso/sol/<feuille>/guide.png`.
- On peint **4 pièces par image** (Klein, 1024², 0,009 $). Les 3 candidats d'une feuille donnent les 3 variantes. Une famille compte 16 formes, soit 4 feuilles : `rue_terre1..4`, `ruisseau1..4`.
- Découpe : clé mesurée sur l'original, puis recalage de chaque losange (Klein les peint 1,03 à 1,31 fois trop grands et décalés : on prend la rangée la plus large, on met à l'échelle et on recentre). L'alpha est ensuite **géométrique**, tiré du guide :
  - rue : le cœur de la bande est opaque, les côtés fondent jusqu'à 0 sur 0,10 case **à l'intérieur** du bord. On ne garde ni l'herbe peinte ni le trait d'encre que Klein met au bord de la bande ;
  - ruisseau : l'eau et la berge sont opaques, l'herbe au-delà de la berge fond sur 0,10 case ;
  - à chaque bord ouvert, la surface (terre ou eau) fond jusqu'à 0 sur 0,10 case. **Aucune berge ni trait n'est posé sur un bord ouvert.**
- L'audit (A) tourne par pièce, posée dans un cadre `decor1x1`, avec le guide comme blockout (`L.RENDERS` pointé le temps de l'appel sur `sol/<feuille>/renders/`, l'audit lui-même n'est pas modifié).

## Tentatives (une seule chose changée à chaque fois)
| famille | tentative | changement | résultat |
| --- | --- | --- | --- |
| rue_terre | a1 | 16 pièces sur 2048², 3 candidats (0,042 $) | échec : Klein ignore la grille et dessine 28 dalles en 4 × 7, avec un socle épais. Inutilisable, pas de planche |
| rue_terre | a2 | 4 pièces sur 1024² au lieu de 16 sur 2048² (4 feuilles, 0,108 $) | bonne topologie, losanges à recaler. Audit A : 48 sur 48 ne ratent que `palette` (sol coloré, structurel, item 9 non bloquant depuis le 30/10) |
| ruisseau | a1 | même méthode que rue_terre a2 (4 feuilles, 0,108 $) | l'eau va jusqu'aux bords ouverts sans berge, mais Klein met un ponton ou une passerelle sur 8 pièces sans pont : la phrase du pont était dans le prompt de chaque feuille. Audit A : tout rate `ink`, `ink_step`, `light` (structurel, comme les pièces d'eau de L6-T01), et souvent `palette` |
| ruisseau | a2 (prêt, **non lancé**) | phrase du pont seulement sur la feuille qui a des ponts (`ruisseau4`) | il faut 3 feuilles × 0,027 $ = 0,081 $ ; reste 0,044 $ dans la sonde |

Le détail par pièce est dans `~/.cache/bati-art-loop/iso/sol/<feuille>/w5gpa<n>_audit.json` (avec `shift` [dx, dy, échelle] et `diamond_iou`).

## Planches (contenu du POC : guides, références de style, pièces sur l'herbe de la carte, recadrages ×2, morceau de carte à 100 % et à 30 %)
- `~/.cache/bati-art-loop/iso/sol/rue_terre/w5gpa2_sheet0.png` à `sheet5.png`
- `~/.cache/bati-art-loop/iso/sol/ruisseau/w5gpa1_sheet0.png` à `sheet5.png` (à montrer en sachant qu'elle sera repeinte, à cause des pontons)

Le morceau de carte (`sheet4`) mêle les 3 candidats par hachage de case sur une sous-couche plate. Couleur de la sous-couche = médiane peinte : terre `#8B683F` (presque `isoChemin` `#8E6B3E`), eau `#2F537B` (plus sombre que `isoEauVive` `#2A6BB5`).

Ce que je vois, sans en juger (le regard neuf jugera) :
- rue : les variantes n'ont pas toutes la même teinte (une case orangée, une rosée, une olive), donc on voit le damier d'une case à l'autre. Sur 2 ou 3 pièces, une touffe d'herbe ou un bout de trait reste au bord ;
- eau : aux coutures, une bande douce, plus claire ou plus sombre, mais aucun trait noir. Les berges changent d'un candidat à l'autre (pavés ou terre).

## Coût FLUX (champ `cost`)
0,042 + 0,027 + 7 × 0,027 = **0,258 $**. V1 : 5,605 → 5,863 $ (plafond 40 $, alerte à 10 $). Sonde `klein_prod_real` : 4,698 → 4,956 $ **sur 5 $**. Solde BFL : 3216,6 crédits.

## Douteux ou non fait
- **Plafond Klein** : la suite (ruisseau a2, 0,081 $ ; rangs pierres et pavée, 2 × 0,108 $ ; une marge pour les tours suivants) demande que le chef ou Guillaume relève `PROBE_CAPS["klein_prod_real"]` (5 $ aujourd'hui). Je ne l'ai pas changé : c'est une décision de budget.
- **ISO_STYLE** demande « thick black ink outlines », alors que T22 veut des rues sans trait. Je n'ai pas modifié le bloc (règle). La découpe retire le trait des côtés de la bande, mais il reste un peu d'encre sur les cailloux et les touffes. Pour faire mieux, il faudrait une ligne dans DECISIONS qui permette un bloc de style sans encre de contour pour les pièces de sol.
- Rangs `rue_pierres` et `rue_pavee` : guides prêts, rien de peint. D'ici là, le code peut poser `terre` sur les trois rangs, ou garder le tracé SVG pour les rangs 1 et 2.
- Aucun `accept`. Rien n'est dans `assets/`. Le chemin d'acceptation des pièces de sol (`ground-accept` : webp et provenance) n'est pas écrit, je l'écris au feu vert.
- Cascade : pas repeinte (« gardée »). Son bord à curb de pierre ne se raccorde pas en style au nouveau ruisseau.
- Le nombre de nœuds Image aux paliers 1 et 12 se compte dans le code (engineer). Estimation sur la grille actuelle : 93 cases de rue et 1 pont, 19 cases d'eau, la cascade en plus. Donc une Image par case, soit environ 114 au palier 12, et 48 images distinctes par famille.

## Pour la suite (iso-engineer : la pose)

**Clés produites à l'acceptation** (même règle que `clePiece`, famille = dossier) :
- rues : `rue/<rang>_<forme>_<v>.nuit.webp`, avec rang dans `terre` | `pierres` | `pavee` (classe 0, 1, 2 de `rues.ts`) et v dans `a` | `b` | `c` (candidats c0, c1, c2) ;
- ruisseau : `eau/ruisseau_<forme>_<v>.nuit.webp` et `eau/ruisseau_pont_<ns|oe>_<v>.nuit.webp`.
- Le préfixe sans variante (`rue/terre_ns_`) permet de garder la logique de `varianteDecor` (hachage de case, tri, modulo).

**Formes** : les lettres sont les bords **ouverts**, dans l'ordre `n s o e`, avec les mêmes noms que `pieceEau` : n = -gy, s = +gy, o = -gx, e = +gx. Un bord est ouvert quand la case voisine de ce côté est de la même famille (rue ou pont pour les rues, eau, pont ou cascade pour l'eau).
- Rues, 16 formes : `n s o e` (cul-de-sac, la bande s'arrête arrondie au centre : c'est aussi le **sentier de porte**), `ns` (droit selon gy), `oe` (droit selon gx), `no ne so se` (virages), `nso nse noe soe` (T), `nsoe` (carrefour), `plein` (toute la case couverte, pour la **place** : à poser sur les cases de `PLACE`).
- Ruisseau, 16 formes : `n s o e` (bouts, l'eau finit en rond au centre de la case), `ns oe`, `no ne so se`, `nso nse noe soe`, `pont_ns` (eau selon gy, tablier selon gx), `pont_oe` (eau selon gx, tablier selon gy). Pas de `nsoe`.
- **Aucun miroir** : chaque direction a son image. Ne pas utiliser `miroir` pour ces pièces (la lumière vient d'en haut à gauche).

**Géométrie de l'image** : 384 × 256 px à S = 384. Le losange de la case occupe les 192 px du bas :
- sommet haut (192, 64) = coin (gx, gy) ;
- sommet droit (384, 160) = (gx+1, gy) ;
- sommet bas (192, 256) = (gx+1, gy+1) ;
- sommet gauche (0, 160) = (gx, gy+1).

Les 64 px du haut laissent la place aux touffes et aux garde-corps du pont. Pour poser une pièce : coin (gx, gy) à l'écran = `ecranXY([gx, gy])`, image en (x - 192·k, y - 64·k), k = échelle de la carte (COTE / 384). Le canevas n'existe pas dans `isoSpec.json` (`canvases`) : à ajouter, par exemple `sol1x1 {w 384, h 256, footprint [1,1], anchor footprintBottom}`, l'ancre étant le sommet bas (192, 256).

**Sous-couche obligatoire** (sinon la couture revient) : chaque pièce fond jusqu'à 0 sur 0,10 case avant ses bords ouverts. L'app dessine donc d'abord, sous les pièces, une bande plate de la couleur de la surface, tracée de centre à centre des cases liées :
- rues : sans les nœuds décalés ni la courbure de `rues.ts` (sinon elle dépasse de la pièce), sans encre, sans les petits traits, d'une largeur = largeur peinte - 0,20 case. Largeurs peintes : terre 0,46, pierres 0,60, pavée 0,74 (au lieu de 0,5, 0,72 et 0,94). Les sous-couches font donc 0,26, 0,40 et 0,54 case ;
- eau : bande de 0,56 case.

Couleurs mesurées sur les peintures (à mettre en jetons dans `rawColors.ts`) : terre `#8B683F` (on peut garder `isoChemin`) ; eau `#2F537B` (plus sombre qu'`isoEauVive`, qui ferait une bande claire à chaque couture). La place : le blob `PLACE` actuel, en sous-couche plate, sans son contour d'encre.

**Repli** : une forme sans image → le tracé SVG actuel sans `ruePaveJoint`, sans les pointillés et sans l'encre (demande de T22).

**Mémoire** : une pièce est une image partagée entre toutes les cases de même forme, rang et variante. Au plus 48 images par famille, 384 × 256 RGBA = 384 Ko décodée à pleine taille.

---

# Mise à jour 2 (feu vert du chef, 30/10) : ruisseau repeint, rangs pierres et pavée, `ground-accept`

Statut proposé : prêt pour revue (planches). Rien n'est accepté.

## Fait
- Le plafond `klein_prod_real` passe à 6 $ (chef, DECISIONS du 30/10). C'est le chef qui a fait ce changement, pas moi.
- Rues sans encre (Guillaume, DECISIONS du 30/10) : `SOL_STYLE_RUE` remplace `ISO_STYLE` dans le prompt des feuilles de rue (style BD, aplats, aucun trait d'encre sur le sol ni autour). Le ruisseau garde `ISO_STYLE`. `rue_terre` a2 a été peinte avant cette décision : elle n'est pas repeinte.
- Ruisseau, tentative 2, une seule chose changée : la phrase de la passerelle n'est plus que dans le prompt de `ruisseau4` (la feuille des ponts).
- `rue_pierres` et `rue_pavee`, tentative 1 : même méthode que `rue_terre` a2, avec `SOL_STYLE_RUE`. Largeurs peintes : 0,60 et 0,74 case.
- `ground-accept <famille> <tentative> [<nom> --human "<raison>"] [--review <fichier:verdict[:items]>] [--only c0,c2]` est écrit dans `iso_loop.py`, mais pas lancé. Il fait tout ou rien : chaque pièce est vérifiée avant que la première soit écrite. Il écrit `assets/images/village/iso/pieces/<rue_terre|rue_pierres|rue_pavee|eau_ruisseau>_<forme>_<a|b|c>.webp` et son `.json` (`canvas` `sol1x1`, `size` [384, 256], `anchor` [192, 256], `openEdges`, masque de tap), puis la provenance par `flux.record` : sidecar du candidat, feuille et case du guide, découpe, recalage, `edited: false`, et selon le cas `accepted_by`, `human_override` et `review`. Comme `accept`, il refuse une pièce qui rate l'audit (A) sans nom et sans raison. Vérifié : `ground-accept rue_pierres 1` s'arrête sur `w5gpa1_c0_n failed audit (A)`, et ni `assets/` ni `scripts/provenance.json` ne bougent.

## Audit (A), 48 pièces par famille (16 formes × 3 candidats)
| famille | tentative | échecs | IoU du losange (min / médiane) |
| --- | --- | --- | --- |
| rue_terre | a2 | 48 × `palette` seul | 0,60 / 0,80 environ |
| rue_pierres | a1 | 48 × `palette` seul | 0,62 / 0,84 |
| rue_pavee | a1 | 32 × `ink ink_step palette light`, 11 ajoutent `residual`, 2 `detail`, 2 `halo`, 1 `holes` | 0,65 / 0,89 |
| ruisseau | a2 | toutes ratent `ink ink_step light`, presque toutes `palette` ; et `residual` 23, `holes` 6, `halo` 3 | 0,67 / 0,92 |

`ink` et `light` ratent par construction (pièces de sol, et rues sans encre par décision) ; `palette` aussi (sol coloré, l'item 9 n'est pas bloquant depuis le 30/10). Accepter demandera donc `--human` avec une raison, comme pour les pièces d'eau de L6-T01. Détail : `~/.cache/bati-art-loop/iso/sol/<feuille>/w5gpa<n>_audit.json`.

## Planches (contenu du POC, recadrages compris)
- rue_terre a2 : `~/.cache/bati-art-loop/iso/sol/rue_terre/w5gpa2_sheet0.png` à `sheet5.png`
- rue_pierres a1 : `~/.cache/bati-art-loop/iso/sol/rue_pierres/w5gpa1_sheet0.png` à `sheet5.png`
- rue_pavee a1 : `~/.cache/bati-art-loop/iso/sol/rue_pavee/w5gpa1_sheet0.png` à `sheet5.png`
- ruisseau a2 : `~/.cache/bati-art-loop/iso/sol/ruisseau/w5gpa2_sheet0.png` à `sheet5.png` (remplace a1)

`sheet0` : les guides et les références de style. `sheet1` à `sheet3` : un candidat par page, ses 16 pièces sur l'herbe de la carte et des recadrages ×2. `sheet4` et `sheet5` : le morceau de carte qui mêle les variantes, à 100 % et à 30 %.

Médiane peinte, à proposer comme couleur de la sous-couche : terre `#8B683F`, pierres `#977244`, pavée `#A59387`, eau `#2F537B` (a1) puis `#2B5485` (a2).

Ce que je vois sans en juger : le ruisseau a2 n'a plus de ponton hors des deux pièces de pont. Les berges varient d'une variante à l'autre (pavés ou terre). Les rues pierres ont des variantes très différentes (pavage complet, ou terre bordée de pierres), donc un damier se voit sur le morceau de carte. La pavée garde des joints sombres entre les dalles.

## Coût FLUX
Mise à jour 2 : 12 feuilles × 0,027 = 0,324 $. **Total T22 : 0,582 $.** V1 : 5,605 → 6,187 $ (plafond 40 $, prochaine alerte à 10 $). Sonde `klein_prod_real` : 5,28 $ sur 6 $.

## Pour la suite
- Revue neuve des 4 planches (REVUE-PROMPT), puis `ground-accept` par famille sur feu vert. On peut retirer une variante avec `--only`.
- Si le regard neuf refuse `rue_terre` a2 pour son encre, il reste une tentative 3 (0,108 $) avec `SOL_STYLE_RUE`.
- Le reste du « Pour la suite » de la première partie (clés, géométrie, sous-couche, repli) ne change pas. Clés eau : `eau/ruisseau_<forme>_<v>` ; fichiers : `pieces/eau_ruisseau_<forme>_<v>.webp`.

---

# Tour 2 : 4 textures de nuit sans couture (terre, pierres, pavés, eau)

Statut proposé : prêt pour revue (planches de mosaïques). Rien n'est accepté et rien n'est dans `assets/`. Pas de `ground-accept`.

## Méthode
- Une texture est peinte une fois par Klein en 1024² (0,009 $). L'image 1 est un aplat de la couleur visée : terre `#76603F`, pierres `#857256`, pavés `#8A8576`, eau `#2E4A63`, c'est-à-dire les tons du sol de l'île désaturés pour la nuit. Le prompt nomme les parties (terre battue avec quelques cailloux ; petits pavés ronds de grès, une trentaine sur la largeur ; grandes dalles irrégulières, environ huit sur la largeur ; eau calme vue de dessus, gris-bleu ardoise, rides douces dont la plus claire est gris-bleu). Le style est le bloc `TEX_STYLE` : BD, aplats, couleur seule, aucun trait d'encre.
- Raccord : le tableau est décalé de moitié, ses bords se retrouvent en croix au milieu, et on couvre cette croix. Trois passes, une seule chose changée à chaque fois :
  1. croix verte repeinte par Klein (0,108 $) : Klein y peint de la mousse, et la croix verte se voit sur les 12 textures. Rejeté (gardé dans `<motif>/croix-a1/`) ;
  2. sans FLUX, couture recousue par « quilting » (bande prise ailleurs, coupée sur le chemin de moindre écart) : pas de croix, mais des répétitions à un quart de période (terre) et des marches dans les rides (eau). Gardé dans `<motif>/quilt-a1/` ;
  3. croix remplie de la couleur visée puis repeinte par Klein (0,108 $) : bon résultat pour pierres et pavés, où Klein reprend les pierres sur la croix. Pour terre et eau, Klein laisse la croix plate (gardé dans `<motif>/croix2-a1/`). Pour ces deux textures douces, on recouvre sans FLUX : la colonne du milieu par le tableau décalé seulement en hauteur, la ligne du milieu par le tableau décalé seulement en largeur, le centre par le tableau lui-même, avec des masques larges et doux. Chaque couche cache la couture que laisse la précédente, et les bords restent ceux du tableau décalé, donc la texture boucle.
- Retenu : **pierres et pavés = passe 3 (Klein)**, sauf pierres c1, dont la reprise a dépassé le délai de FLUX : elle reste en quilting. **Terre et eau = recouvrement en trois couches (sans FLUX).**
- Sorties par candidat : `<motif>/w5gpa1_c<i>.256.png` (demandé), `.512.png` et `.1024.png`, dans `~/.cache/bati-art-loop/iso/textures/`.
- Le code est dans `scripts/iso/iso_loop.py`, avec les commandes `texture-candidates`, `texture-seam <m> <a> [passe]`, `texture-quilt`, `texture-blend`, `texture-measure` et `texture-sheet`. L'audit gelé n'a pas changé (sha256 `4beebf08…` et `3677fc4e…`), `test_audit.py` PASS.

## Mesures (`<motif>/w5gpa1_mesures.json`)
`wrap` = saut moyen de couleur à travers le bord qui boucle, divisé par le saut moyen entre deux pixels voisins à l'intérieur. Repères : 1,0 sur du bruit, 255 sur un dégradé. La colonne `brut` donne la même mesure sur la peinture d'origine. Aucun pixel quasi blanc (`white_share` 0) dans les 12 textures.

| motif | c0 wrap (brut) | c1 wrap (brut) | c2 wrap (brut) | moyenne c0 / c1 / c2 (cible) | saturation |
| --- | --- | --- | --- | --- | --- |
| terre | 1,16 (3,22) | 1,12 (3,07) | 1,17 (1,93) | `#867356` / `#887457` / `#877559` (`#76603F`) | 0,34 à 0,36 |
| pierres | 1,37 (2,31) | 1,27 (1,29), quilting | 0,73 (2,96) | `#73634E` / `#776550` / `#6B5C4C` (`#857256`) | 0,29 à 0,34 |
| pavés | 1,44 (5,50) | 2,58 (2,66) | 3,72 (2,93) | `#80786D` / `#817A6E` / `#847D70` (`#8A8576`) | 0,14 à 0,15 |
| eau | 0,70 (4,31) | 0,58 (3,78) | 0,62 (4,99) | `#475965` / `#455560` / `#485861` (`#2E4A63`) | 0,26 à 0,29 |

Le `wrap` élevé de pavés c1 et c2 ne vient pas d'une couture : le bord qui boucle est le milieu du tableau d'origine, et un joint de dalle droit tombe dessus (2,66 et 2,93 sur le brut au même endroit). À vérifier à l'œil sur la vue « décalé de moitié ». L'eau est plus claire et plus grise que sa cible (gris-bleu ardoise, pas de bleu vif). La terre est un peu plus claire que sa cible.

## Planches (pour le relecteur neuf), `~/.cache/bati-art-loop/iso/textures/<motif>/`
- `w5gpa1_planche0.png`, `planche2.png`, `planche4.png` : candidats c0, c1, c2. Chaque page montre la texture 256 px à ×2, la même décalée de moitié (une couture y ferait une croix au centre), la **mosaïque 3 × 3** à 100 %, et la mosaïque écrasée 2:1 comme sur la carte.
- `w5gpa1_planche1.png`, `planche3.png`, `planche5.png` : le même candidat posé sur l'aperçu des tracés de l'ingénieur (`scratchpad/apercu.png`). La couleur de chaque aplat est remplacée par la texture répétée depuis (0, 0), comme le ferait un `Pattern` en `userSpaceOnUse`, et les bords fondus sont gardés.
- Pour les 4 motifs : `terre`, `pierres`, `paves`, `eau`.

## Coût FLUX
Tour 2 : 12 peintures + 12 reprises de la passe 1 + 12 reprises de la passe 3 (une a dépassé le délai, mais elle est facturée) = **0,324 $**. Total T22 : 0,906 $. V1 : 6,511 $ sur 40 $. Sonde `klein_prod_real` : 5,604 $ sur 6 $ (il reste 0,396 $).

## Pour iso-engineer (pose, après le feu vert de la revue)
- Taille de répétition conseillée : **`width` 192, `height` 96** unités de carte (4 cases, écrasé 2:1 pour le sol iso), avec l'image de 256 px étirée dedans. À 256 × 256 unités, comme l'écrit `motifs.ts`, une répétition couvre 5,3 cases et les pierres deviennent énormes. À 48 unités (1 case), elles font 1 à 2 dp et se perdent.
- Au zoom maximum, 256 texels sur 192 dp se voient flous. La version `.512.png` est là si qa le constate (même texture, deux fois plus de pixels).
- Noms des motifs : `terre`, `pierres`, `paves`, `eau` (ceux de `motifs.ts`). Le nom du fichier à l'acceptation reste à décider avec toi : je propose `assets/images/village/iso/motifs/<motif>.nuit.webp`. `ground-accept` ne sert pas ici (il sert aux pièces du tour 1). Un `texture-accept` est à écrire au feu vert.

## Douteux ou non fait
- La copie ombrée (découpe d'ombre) devra assombrir la texture ou en prendre une deuxième. Je n'ai pas fait de version « ombre ».
- Pierres c0 et c2 : en mosaïque, on voit encore des bandes de cailloux plus petits là où était la croix. Eau : les rides se doublent un peu dans les zones de mélange. Le regard neuf en jugera.

## Tour 2, acceptation (chef, DECISIONS du 30/10, « T22 textures »)
- La revue neuve (`reviews/T22.md`) fait échouer les 12 textures sur l'encre (items 3, 24 et 30). Le chef passe outre, puisque Guillaume a retiré l'encre des routes. Elle relève aussi des coutures sur pierres_c0, pierres_c1, paves_c1 et paves_c2. Le chef retient **terre_c0, pierres_c2, paves_c0 et eau_c1**.
- Nouvelle commande `texture-accept <motif> <tentative> <cN> [--by <nom>] [--review <fichier:verdict:items>]` dans `scripts/iso/iso_loop.py`. Elle écrit seulement le WebP 256 px (q90, sans fichier `.json` à côté) sous `assets/images/village/iso/motifs/<motif>.nuit.webp`, qui suit `nomImage` avec `motifs` comme famille. La provenance passe par `flux.record` : sidecar de la peinture, sidecar de la reprise Klein s'il y en a une, méthode de raccord, mesures, `edited: false`, `accepted_by`, et `review` (fail, items 3, 24, 30).
- Acceptés :
  - `assets/images/village/iso/motifs/terre.nuit.webp` (4,2 Ko)
  - `assets/images/village/iso/motifs/pierres.nuit.webp` (21,3 Ko)
  - `assets/images/village/iso/motifs/paves.nuit.webp` (10,9 Ko)
  - `assets/images/village/iso/motifs/eau.nuit.webp` (5,6 Ko)

  Tous en 256 × 256 RGB. Leurs 4 entrées sont dans `scripts/provenance.json`.
- Pour la pose, je redis la taille de répétition conseillée : `width` 192, `height` 96 unités de carte.
