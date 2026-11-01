# Journal du POC village iso

## Phase 0, 2026-10-28

- Règles 1 et 5 : pas de `STATE.md`, branche `poc/village-iso` créée depuis `main`, commit de lancement `03457987` (les trois fichiers figés).
- Outils : gstack présent, Blender 5.1.1 en flatpak (OCIO de repli, couleurs exactes, voir `scripts/iso/blockouts/VERSIONS.md`), `magick` et `montage`.
- Clé BFL lue depuis le `.env` du dépôt principal par un lien symbolique non suivi (`.env` est ignoré par git).
- Émulateur `bati-bench` démarré avec `-gpu host -feature -Vulkan`, langue `en-US`.
- `constants/isoSpec.json` : S = 384, 271,529 px par unité, grille → Blender `(gx, -gy, z)`, marge d'ancrage 64 px.
- G0 (`scripts/iso/g0.py`), mesure au sous-pixel sur des cubes rendus sans contour : largeur 384,00 / 768,00 px, pentes ±0,5000, ancrage à 0,02 px sur chaque toile, axes (1,0) et (0,1) là où `cellToScreen` les attend, contour Freestyle visible, même hash au second rendu. Le cube 2x2 n'est rendu que sur la toile 2x2 : sur les toiles de 512 px il ne tient pas (768 px de large), et la toile du villageois teste un cube 0,5 à 2 S (même largeur).
- `test_audit.py` vert : blockout accepté (IoU 0,9997, encre 1,0) ; `sport_chest` rejeté par la silhouette (IoU 0,65, en butée) ; sans contour rejeté par l'encre (0,06) ; frange de 2 px rejetée par le halo (60,3) et le fond (1 %) ; bannière vidée rejetée par les trous (1,4 %).
- Coût : 0 $.

## Phase 1, sonde de style

Référence d'API vérifiée (docs.bfl.ai, FLUX.2 [pro] preview) : `disable_pup` existe dans la requête, `cost`, `input_mp`, `output_mp` dans la réponse du POST. `flux.py` prend `extra` et `submitted_log`, optionnels.

Consigne de Guillaume en cours de sonde : « il faut que ça respecte la DA de Bati BD belge ». Je la lis à travers les items 3 et 9, et je suis plus sévère que le regard neuf sur ces deux-là.

### forge_solid, variante historique (`#0B0F19` + `cutout.py`), tentative 1

- Coût : 0,30 $ (4 × 0,075 $, 1,15 Mpx entrée et sortie). Solde BFL relu juste après : inchangé (2300,1), le débit arrive en retard ; contre-vérification au lot suivant.
- (A) : 4 rejets. Silhouette tenue (IoU 0,953 à 0,975), encre 0,81 à 0,93. Fond 12 à 20 % et halo 123 à 136 : **mesures sans valeur sur cette variante**, l'encre noire est à moins de ΔE 60 du `#0B0F19`, tout le trait compte comme du fond. C'est la raison d'être du magenta. Emprise : c0 déborde de 23 px (pavés hors du losange).
- Ce que je vois : FLUX n'a pas peint `#0B0F19` mais un bleu marine plus clair, différent pour chaque candidat ; le remplissage de `cutout.py` l'a quand même vidé sur c0. Forme fidèle, encre épaisse, lumière d'en haut à gauche. Mais textures de pierre détaillées, lueur du feu en dégradé doux qui déborde sur le dallage : c'est un asset iso de jeu, pas l'aplat BD de Bati.
- Mon verdict, avant (B) : c0 à c3 `fail` sur l'item 3 (dégradés de lueur, rendu texturé), c0 `fail` sur l'item 2 (pavés hors emprise). Items 1, 4, 7, 8 `pass` pour les quatre. Aucun accepté de mon côté.
- (B) (`legacya1_review.json`) : les 4 ont un bloquant en échec. c0 : item 6 (points bleus autour de la flamme) ; c1 : 4, 6 ; c2 : 2 (potence ajoutée), 4 ; c3 : 3, 4, 5, 6. Il est plus indulgent que moi sur l'item 3 pour c0 à c2 ; je garde mon `fail`.
- Décision : variante historique non retenue. Mesure pour le rapport : FLUX ne tient pas le `#0B0F19` (bleu plus clair, variable), et l'encre se confond avec ce fond pour toute mesure automatique.

### forge_solid, variante magenta, tentative 1

- Changement par rapport à la variante historique : fond magenta, et bloc `ISO_STYLE` réécrit vers la BD de Bati (aplats, une ombre franche, feu en formes nettes, matière en quelques traits). Ce sont deux changements à la fois : la comparaison des variantes n'est donc pas isolée. C'est voulu, à cause de la consigne de DA arrivée entre les deux lots.
- Coût : 0,30 $. Solde 2255,1 : 0,45 $ débités selon le solde, contre 0,60 $ selon les champs `cost` ; le solde est en retard, et c'est le plus grand qui compte.
- (A) : c0 PASS (IoU 0,977, encre 0,66), c3 PASS (IoU 0,953, encre 0,78) ; c1 rejeté (fond 0,2 %, trous) ; c2 rejeté (fond 3,3 %, halo 22,9).
- Ce que je vois : le fond magenta tire toute l'image vers des tons chauds saturés. Le feu éclaire le mur droit et le toit en orange et jaune, et les quatre candidats ont un toit de chaume, alors que le blockout a un toit en bois sombre (le mot `straw thatch` de la liste de matières du style est passé partout).
- Mon verdict, avant (B) : c0 `fail` 4 (face droite plus claire que la gauche, baignée de feu) et 6 (flamme magenta restée collée au mur, recadrage @672,928) ; c3 `fail` 4 (face droite et chaume dorés par le feu) et 3 (dégradé de lueur sur le toit). c1, c2 `fail` 6. Aucun accepté de mon côté.
- (B) (`a1_review.json`) : les 4 ont un bloquant en échec, tous sur l'item 4 (le feu inverse la lumière), plus 5 et 6 pour c0 à c2, et 3 pour c1 à c3. Accord avec moi.
- Décision : tentative 2, une seule chose change, le texte du prompt : lumière du jour froide et égale venue d'en haut à gauche, chaque mur garde sa couleur, le feu reste une petite forme plate dans le foyer ; la liste générique de matières (avec `straw thatch`) sort du bloc de style.

### forge_solid, variante magenta, tentative 2

- Coût : 0,30 $. Solde 2225,1 (0,75 $ selon le solde, 0,90 $ selon `cost`, le solde reste en retard d'un lot).
- (A) : c0 PASS (IoU 0,978, encre 0,64), c1 PASS (IoU 0,984, encre 0,73) ; c2 et c3 rejetés (ombre portée magenta foncé peinte à droite : fond, halo, emprise).
- Ce que je vois : la lumière du jour a pris sur c0, face gauche crème claire, face droite en pierre sombre, feu contenu dans le foyer. Toit en bardeaux avec un reste de chaume au bord. Rendu BD encré, assez proche de Bati. c1 a de nouveau le mur droit et le dallage orangés par le feu.
- Mon verdict, avant (B) : c0 `fail` 6 (brins d'herbe au coin gauche du socle teintés magenta, recadrage maison de `a2_c0.cut.png` à 0,1020 ; petit, mais c'est une frange de la couleur de fond), `pass` 1, 2, 3, 4, 5, 7, 8, 9. c1 `fail` 4 (face droite et dallage éclairés par le feu). Aucun accepté de mon côté.
- (B) (`a2_review.json`) : les 4 ont un bloquant en échec. c0 : 3 (lueur ambre sur le pan droit du toit), 5 et 6 (herbes teintées magenta) ; c1 : 3, 4, 5, 6 ; c2, c3 : ombre portée magenta non détourée (2, 5, 6). Plus sévère que moi sur c0 (item 3), je m'aligne.
- Décision : tentative 3, une seule chose change, le texte du préambule : « The base is bare, clean-cut stone or timber right up to its inked edge. »

### forge_solid, variante magenta, tentative 3

- Coût : 0,30 $. Solde 2192,1 (1,08 $ selon le solde, 1,20 $ selon `cost`).
- (A) : c0 PASS (IoU 0,935), c2 PASS (0,979), c3 PASS (0,976, encre 0,69) ; c1 rejeté (ombre portée magenta).
- Ce que je vois : plus d'herbe au bord, socles nets. c3 est le plus proche de Bati : encre franche, aplats, feu contenu dans un foyer couvert, lumière du jour. Mais son mur droit en enduit crème, sous l'avant-toit, est plus clair que le pignon gauche en pierre (recadrage `a3_c3_walls.png`) ; la matière diffère d'une face à l'autre, ce qui brouille la lecture, mais la face droite n'est pas sombre. c3 ajoute aussi une hotte de pierre au-dessus du foyer, absente du blockout. c0 : intérieur rougeoyant qui éclaire la face droite. c2 : mur droit doré par le feu, toit de chaume.
- Mon verdict, avant (B) : c0 `fail` 4 ; c2 `fail` 3 et 4 ; c3 `fail` 4 (face droite plus claire que la gauche), `pass` 1, 3, 5, 6, 7, 8, 9, 2 de justesse (hotte ajoutée, toit et emprise conformes). Aucun accepté de mon côté. forge_solid a épuisé ses 3 tentatives en sprite séparé ; il reste le triptyque, dont le tiers central est un candidat forge_solid.
- (B) (`a3_review.json`) : les 4 ont un bloquant en échec. c0 : 4, 5 ; c1 : 5, 6 ; c2 : 3, 5 (ombre portée sur le dallage) ; c3 : 2 (hotte), 5 (ombres de l'enclume et de la cheminée). Il passe l'item 4 de c3 que j'ai refusé ; l'acceptation demande nos deux `pass`, et c3 tombe de toute façon sur 2 et 5.
- Décision : forge_solid `HUMAN` en sprite séparé.

### forge, triptyque, tentative 1

- Coût : 0,54 $ (4 × 0,135 $). Solde 2126,1, accord exact avec les champs `cost` (1,74 $ au total).
- (A) : 0 sur 12 tiers. FLUX ignore le blockout sur cette toile : bâtiments réinventés et déplacés (IoU 0,24 à 0,78, en butée), fond lavande texturé que la clé ne retire pas, ombres portées.
- Mon verdict, avant (B) : les 12 tiers `fail` 2 et 12 (géométrie et emprise hors blockout), 5 et 6 (fond et ombre). Aucun accepté.
- (B) (`forge/triptycha1_review.json`) : les 12 échouent sur 5 et 6 ; l'item 10 passe sur 9 tiers (la famille se reconnaît), mais rien ne passe (A) et (B).
- Décision : le triptyque n'est pas une méthode ici. Mesure pour le rapport.

### Porte G1-style : échouée

Aucun candidat de forge_solid ne passe (A) et (B) : 16 sprites et 4 tiers centraux. Selon le §8, la génération s'arrête : pas de recalibration, pas de gel, pas de moteur ni de production. Rapport NO-GO (critère 1) dans `REPORT.md`. Budget dépensé : 1,74 $ réels (sonde ≤ 2,00 $). Avec `PAUSE_APRES_SONDE = oui`, j'attends Guillaume avant toute suite.

## Sonde 2 (consigne de Guillaume, 2026-10-28)

« ok fais seconde sonde (on veut remove background, ça on va placer les bâtiments) ». Règles : clé verte `#00FF00` (sa bavure est froide, elle ne se lit plus comme la lumière du feu), découpe de tout ce qui sort de la silhouette de la maquette dilatée de 16 px (`clip_to`, appliquée après le recalage), 5 tentatives, 2,00 $ au plus (compteur `probe2_real`). `spill()` généralise la mesure de halo à n'importe quelle clé. `test_audit.py` vert sur les deux chaînes, magenta et vert avec découpe : la découpe ne cache aucun des défauts testés, tous situés dans la silhouette.

### forge_solid, sonde 2, tentative 1 (prompt de a3, fond vert)

- Coût : 0,30 $.
- (A) : c1 PASS (IoU 0,974, encre 0,78) ; c0, c2, c3 rejetés sur l'emprise (37 à 89 px dans la bande basse hors du losange : touffes d'herbe au pied du socle, que la découpe à 16 px laisse passer), c2 aussi sur fond et trous.
- Ce que je vois : la découpe verte est nette, sans bavure ni frange. Mais la lumière revient : sur les quatre, le feu dore le mur droit et le dallage en dégradé. c1 a perdu l'enclume (une table à la place). Ombres sous l'avant-toit.
- Mon verdict, avant (B) : c1 `fail` 3 (dégradé de lueur), 4 (face droite plus claire que la gauche), 7 (pas d'enclume lisible). c0, c3 `fail` 4. c2 `fail` 3, 4. Aucun accepté.
- (B) (`s2a1_review.json`) : les 4 en échec, sur 3, 4, 5 pour l'essentiel (lueur en dégradé, lumière inversée, ombres portées sur le socle), 6 pour trois d'entre eux (pixels parasites, frange verte sur une hotte). Il passe l'item 4 de c2, je le refuse sur 3 de toute façon.
- Décision : tentative 2, une seule chose change, la phrase de lumière du bloc de style : aplats de BD imprimée, faces gauches claires et droites sombres comme dans la maquette, le feu est une forme orange plate qui n'éclaire rien.

### forge_solid, sonde 2, tentative 2

- Coût : 0,30 $.
- (A) : c1 PASS (IoU 0,985, encre 0,85), c3 PASS (IoU 0,980, encre 0,71) ; c0 rejeté sur l'encre (0,59), c2 sur l'emprise et les trous.
- Ce que je vois : les toits passent au bois, la pierre est plus sombre et plus plate. Mais le feu éclaire encore : mur droit et dallage orangés sur les quatre, moins fort qu'avant. Sur c3, la fumée chaude près de la flamme a pris une teinte verte, et un filet vert reste sous le bord du socle.
- Mon verdict, avant (B) : c1 `fail` 3 et 4 (mur droit orangé, plus clair que le pignon). c3 `fail` 6 (voile vert à droite de la flamme, filet vert sous le socle, recadrages @672,928 et @736,1120) et 3 (lueur en dégradé sur le mur). c0, c2 `fail` 4. Aucun accepté.
- (B) (`s2a2_review.json`) : les 4 en échec. c2 et c3 passent 1 à 4 et 7 à 9, et ne tombent que sur 5 et 6 : la frange verte de la fumée près des flammes et un liseré vert au bord du socle. C'est un défaut de détourage. Il passe aussi les items 3 et 4 de c3 que j'avais refusés (lueur « locale »).
- Décision : tentative 3, une seule chose change, la description du foyer : « holding a small bed of red coals » au lieu de « full of glowing orange coals » (le mot `glowing` appelait la lueur).

### forge_solid, sonde 2, tentative 3

- Coût : 0,30 $.
- (A) : c1 PASS (IoU 0,983, encre 0,65), c2 PASS (IoU 0,979, encre 0,64) ; c0 rejeté sur le halo (ombre portée verte sombre), c3 sur trous et emprise. Les éclats flottants (fumée de c1, marmite volante de c3) sont bien effacés par la découpe à la silhouette.
- Ce que je vois : c1 est le rendu le plus BD de toute la série, encre franche, pierre plate, détourage net sans vert. Mais FLUX a ajouté un second foyer en arche contre le mur, dont la lueur dore le dallage et le mur droit. c2 : l'enclume est devenue une boîte métallique grise.
- Mon verdict, avant (B) : c1 `fail` 3 et 4 (lueur en dégradé sur le sol et le mur droit), 2 de justesse (arche ajoutée dans le volume). c2 `fail` 7 et 8 (enclume illisible, boîte d'aspect moderne), 3 (lueur). Aucun accepté.
- Décision : tentative 4, une seule chose change, encore la phrase du foyer : braises rouges et quelques petites flammes plates cernées d'encre, air clair au-dessus (vise la fumée qui prend le vert).
- (B) (`s2a3_review.json`) : les 4 en échec. c1 ne tombe que sur l'item 4 (mur droit plus clair, éclairé par le foyer en arche) ; c2 sur 6 (liseré violacé), 7 et 8 (enclume en boîte). Accord avec moi sur c1 et c2.

### forge_solid, sonde 2, tentative 4

- Coût : 0,30 $.
- (A) : 0 sur 4. c1 rejeté de peu sur le fond résiduel (0,17 % pour 0,1 %), c0 sur l'emprise, c2 et c3 sur le fond et l'encre (c2 a une fumée verdâtre, c3 un fond vert plus clair que demandé).
- Ce que je vois : c1 a enfin la lumière juste sur toute la série : pignon gauche clair, face droite à l'ombre, feu petit dans son foyer, pas de lueur sur les murs. Mais ses flammes dépassent du foyer contre le fond, et leur bord est resté vert (recadrage @672,928) ; ses joints de dallage ont des points de mousse verte.
- Mon verdict, avant (B) : c1 `fail` 6 (frange verte au bord des flammes), `pass` 1, 2, 3, 4, 5, 7, 8, 9. c0 `fail` 3 (lueur jaune sur le dallage). c2 `fail` 5, 6 (fumée verte). c3 `fail` 4 (mur droit orangé). Aucun accepté.
- Décision : tentative 5, la dernière, une seule chose change, la phrase du foyer : les flammes restent basses, sous le rebord du foyer, pour qu'aucune ne se découpe sur le fond.
- (B) (`s2a4_review.json`) : les 4 en échec. c1 : 2 (auvent sur poteaux au-dessus du foyer, je l'avais laissé passer), 5 et 6 (vert collé à la flamme) ; il valide sa lumière (4). c0, c2, c3 : lueur en dégradé, flaques de lumière sur le dallage.

### forge_solid, sonde 2, tentative 5

- Coût : 0,30 $. Sonde 2 : 1,50 $ ; total POC : 3,24 $.
- (A) : c0 PASS (IoU 0,986, encre 0,71), c2 PASS (IoU 0,985, encre 0,66) ; c1 rejeté (ombre portée verte, emprise), c3 (fond, trous).
- Ce que je vois : les flammes restent dans le foyer, plus aucune frange verte sur c0. Mais le mur droit de c0, en enduit clair, porte une lueur jaune en dégradé derrière le foyer, et il est au moins aussi clair que le pignon gauche ; une touffe d'herbe jaune pousse sur le coin du socle. c2 : mur droit et dallage orangés, voile vert au-dessus du foyer (coupé par la découpe, mais la lueur reste).
- Mon verdict, avant (B) : c0 `fail` 3 (dégradé de lueur sur le mur droit) et 4 (face droite pas plus sombre que la gauche), `pass` 1, 2, 5, 6, 7, 8, 9. c2 `fail` 3, 4. c1, c3 `fail` 5 (ombre portée). Aucun accepté.
- (B) (`s2a5_review.json`) : les 4 en échec. c0 ne tombe que sur 3 et 4, la lueur du feu sur le mur droit, accord exact avec moi ; c1 et c2 ajoutent du texte (une enseigne, une signature) ; c3 la lueur.
- Coût total contre-vérifié : 3,24 $ selon `cost`, 3,24 $ selon le solde (2300,1 → 1976,1).

### Porte G1-style, seconde sonde : échouée

Aucun candidat de forge_solid ne passe (A) et (B) en 5 tentatives. Ce que la seconde sonde a réglé : le fond (la clé verte se détoure net dès que les flammes restent dans le foyer), les éclats et ombres hors silhouette (la découpe par la maquette les efface tous), la frange (s2a5_c0 est propre au recadrage). Ce qu'elle n'a pas réglé en 9 tentatives sur les deux sondes : le feu de la forge éclaire le mur droit en dégradé. C'est le seul défaut restant de s2a5_c0, et de s2a3_c1 avant lui.

Lecture : la forge est le pire cas du lot, le seul bâtiment qui porte sa propre source de lumière. Le moulin et la tour n'en ont pas. La sonde n'a donc pas mesuré la méthode sur un bâtiment ordinaire.

## Prompt v5 (Guillaume, 2026-10-28), phase 0 refaite

« je trouve que le résultat est pas mal, j'ai fait update au prompt ». Fichiers figés v5 écrits tels que collés, commités en `ee63267b`, qui devient `COMMIT_DE_LANCEMENT` (règle 5, exception de la pause G1).

- Palette relevée à la pipette sur `tier_3` et `tier_6` (bâtiments, sans ciel), trois tons par matière dans `isoSpec.json` avec leur source ; sol de nuit dans `rawColors.ts` (`isoGrass` à `isoInk`). La pipette est approximative (boîtes posées à l'œil sur des aperçus de 800 px) : c'est noté pour le rapport.
- Lune fixe : azimut 225°, élévation 55°, `L = (−0,406 ; −0,406 ; 0,819)`.
- `iso_blockout.py` passe en Cycles, couleur composée : cinq rendus plats (ton selon n·L, ton d'ombre, lumière directe de la lune sur blanc à force π, n·L, classes), composés en Python (`isolib.compose`). Écart au prompt : des rendus séparés au lieu des passes de rendu (l'API du compositeur a changé en 5.x, un échange de matériau est du Python simple) ; le résultat demandé est le même, ombres internes comprises. Le dithering 8 bits de Cycles est coupé (il ajoutait ±1 à chaque code).
- Le trait Freestyle passe à 8 px (estimé sur `tier_6` : environ 2 px sur des maisons de 150 px, soit 10 px à notre échelle). Découvert au passage : `render.line_thickness` multiplie l'épaisseur du style de ligne, au lieu d'en être une seconde ; avant la v5, le trait réel faisait donc 4 × 4 px.
- Les blockouts exportent les polygones d'ombre portée (grille et pixels relatifs à l'ancrage) et les flaques des fenêtres.
- G0 v5 vert : géométrie inchangée, tons des faces à la valeur exacte de la palette, face éclairée d'un petit cube placé dans l'ombre d'un grand → ton d'ombre, ombre d'un poteau vers la droite de l'écran, polygone d'ombre égal au shadow catcher de Cycles à 2 px près hors du cube, même hash deux fois.
- Corrigé dans l'audit : Pillow rend a* et b* en octets signés, pas décalés de 128. `delta_e` comparait mal les couleurs de part et d'autre de a* = 0 ou b* = 0. Sans effet sur les clés magenta et verte, loin de ces zéros ; décisif pour la palette de nuit.
- Audit (A) v5 : marche d'encre (bande intérieure à 12–20 px, au-delà des 8 px du trait), palette de nuit (9 rectangles de bâtiments des paliers 1, 3, 5, 6 ; moyennes froides entre les percentiles 5 et 95 ; part chaude 0,5–15 % ; violet < 1 %), détail (ΔE au blockout ≥ 10, densité d'arêtes à l'échelle de `tier_6` dans 0,15–0,45 ; les paliers mesurent 0,20 à 0,36), sens de la lumière (matière par matière, zones éclairée et ombre de la carte des classes, érodées de 6 px).
- `test_audit.py` v5 vert : blockout accepté sur la forme et la lumière, refusé sur le détail ; découpes de `tier_3` et `tier_6` acceptées sur la palette ; `armory` (a* trop rouge), `wizard_tower` (33 % de violet), `smith_talk` (27 % de chaud), blockout réchauffé (35 % de chaud), blockout teinté de magenta (a* 18) refusés sur la palette ; `sport_chest`, sans contour, frange, bannière vidée, tons inversés refusés chacun par le contrôle attendu.
- Planche v5 : recadrages aussi sur sol de nuit, candidat posé au centre d'un sol 4×4 avec ombre portée et flaques calculées (100 % et 30 %), candidat à l'échelle d'une maison de `tier_6` à côté d'un recadrage non agrandi, références étiquetées « lumière, couleurs et trait » ou « trait seulement ».
- Prompt v5 : préambule de nuit (couleurs gardées telles quelles, lune froide à gauche, chaleur seulement aux ouvertures), `ISO_STYLE` tiré de `SCENE_STYLE` avec les quatre écarts du §4 bis expliqués dans le code. La forge ne porte plus de flamme peinte : un lit de braises orange sous le rebord du foyer, la flamme étant le sprite animé `forge_fire` (§5.7).

## Sonde v5 (≤ 2 $, compteur `probe3_real`)

### forge_solid, tentative 1, magenta (`v5`) et bleu nuit (`v5l`), mêmes graines

- Coût : 0,60 $ (2 × 4 × 0,075 $).
- FLUX a peint une lune dans le ciel sur 6 des 8 rendus (le prompt parle de clair de lune), et des ombres portées hors du socle. La découpe par la silhouette de la maquette dilatée de 16 px (`clip_to`, éprouvée en sonde 2) est donc activée pour la v5 : c'est la règle du §5.6, tout ce qui tombe hors de la silhouette appartient à l'app.
- Correction de définition du contrôle de lumière, avant tout jugement : la carte des classes gardait l'occultation dans la classe du ton, si bien que la zone « ombre » de la tuile n'était que l'ombre portée de la cheminée sur le toit (le pan visible est éclairé). Le contrôle jugeait alors la présence d'une ombre portée peinte, pas le côté de la lumière. L'occultation passe dans le canal B, et le sens de la lumière se mesure sur les faces seules. `test_audit.py` reste vert (les tons inversés sont toujours refusés). Ce n'est pas un seuil élargi : la mesure faisait autre chose que ce que le §6 décrit.
- (A) magenta : c1 PASS (IoU 0,987), c2 PASS (IoU 0,941) ; c0 refusé (fond violacé, pas magenta pur), c3 refusé (ombre portée magenta foncé, lumière inversée sur la pierre).
- (A) bleu nuit : 0 sur 4, toujours sur le fond résiduel (0,86 à 0,95) : toute la palette de nuit est à moins de ΔE 60 du `#0B0F19`. La mesure n'a pas de sens sur cette variante, comme en sonde 1.
- Ce que je vois : la DA a fait un bond. Pierre bleuie par la lune, tuiles rouge-brun, fenêtres ambrées, encre franche, faces gauches claires et faces droites sombres sur la plupart. Ce qui reste : le foyer peint toujours une grande flamme et une lueur orange en dégradé sur le mur voisin (huit rendus sur huit) ; c1 a des murs presque blancs, plus plein jour que nuit ; c2 a des pierres teintées de rose (le magenta déteint), et son foyer est devenu une table sur pieds avec un auvent.
- Choix des fonds, d'abord sur la DA : à graine égale, les rendus sur bleu nuit sont un peu plus sombres et sans rose, ceux sur magenta un peu plus clairs, avec du rose dans la pierre de c2. Mais le bleu nuit ne se détoure pas : le remplissage de `cutout.py` laisse des restes, et l'encre se confond avec le fond. Le magenta reste la méthode, à surveiller sur le rose.
- Mon verdict, avant (B) : v5 c1 `fail` 3 (lueur en dégradé sur le mur droit), 26 (reflet chaud hors des ouvertures), 9 (murs presque blancs, plein jour). v5 c2 `fail` 26 et 3 (lueur sur le mur), 9 (pierres roses), 2 (foyer sur pieds, auvent ajouté). v5 c0, c3 : refusés en (A), et 26 pour la même lueur. v5l c0 à c3 : `fail` 26 pour la lueur du foyer, 6 pour le détourage. Aucun accepté.
- (B) (`v5a1_review.json`, `v5la1_review.json`) : 8 sur 8 en échec, d'abord sur 4 et 26 (le foyer embrase le mur droit, aucune face droite obsidienne), puis 9 et 24 (lavande, rose, ou trop clair pour la nuit de `tier_6`), 25 pour les plus clairs. Accord avec moi ; il est plus sévère sur 24 et 25.
- Décision : tentative 2 pour les deux fonds, une seule chose change, le blockout : le carré de feu orange vif sur le foyer devient un petit lit de braises rouge sombre (`ember` `#A8401C`, 0,25 × 0,3), pour que FLUX n'y lise plus une lampe.

### forge_solid, tentative 2, `v5` et `v5l`

- Coût : 0,60 $. Sonde v5 : 1,20 $.
- (A) : v5 c0 PASS (IoU 0,940) ; v5 c1 refusé sur l'emprise, c2 et c3 sur la silhouette (le foyer est rebâti). v5l : 0 sur 4 (fond résiduel, sans valeur ici).
- Ce que je vois : le carré sombre n'a rien changé, FLUX rallume le foyer en four voûté et peint la même lueur en dégradé sur le mur et les dalles. La lune revient aussi (effacée par la découpe).
- Mon verdict, avant (B) : v5 c0 `fail` 26 et 3 (lueur sur le mur et les dalles), 2 (foyer rebâti en four voûté), 4 (mur droit orangé). Les sept autres : `fail` 26 pour la même lueur. Aucun accepté.
- Choix du fond, sur la DA puis le détourage : à graine égale, le bleu nuit ne donne pas une meilleure DA (même lueur, mêmes murs clairs, (B) l'a jugé « asset de jeu » sur 3 des 4) et ne se détoure pas. **Le magenta est retenu** et a droit à la 3e tentative.
- (B) (`v5a2_review.json`, `v5la2_review.json`) : 8 sur 8 en échec, toujours sur 26 et 4 (chaleur du foyer sur le mur droit et le sol), puis 24 (« trait d'asset iso », plus propre que `tier_6`) et 25 pour les plus clairs. Il note aussi des coupes nettes sans encre au bord de la silhouette sur c2 : c'est la découpe par la maquette qui tranche un toit dessiné plus haut que le blockout. Accord avec moi.
- Décision : tentative 3 (magenta seulement), une seule chose change, la formulation du foyer dans le prompt : « dull red coals with no flames, their glow staying inside the stone rim », et « the hearth's coals in dull red » dans le préambule. Le mot « orange » appelait la lumière.

### forge_solid, tentative 3, `v5`

- Coût : 0,30 $. Sonde v5 : 1,50 $ ; total POC 4,74 $. Le triptyque n'est pas lancé : sa réservation (4 × 0,20 $) dépasserait les 2,00 $ de la sonde.
- (A) : 0 sur 4, tous sur le fond. FLUX a assombri la clé pour « faire nuit » : fonds relevés à (196, 32, 184), (210, 41, 208), (239, 56, 223), et un lavande en dégradé avec une lune sur c0. Hors du ΔE 30 de la clé.
- Ce que je vois : **la lueur du foyer a enfin disparu** sur c1 et c3, braises rouge sourd sans reflet sur le mur. c2 garde un mur doré. c0 a deux cheminées.
- Mesure pour le rapport seulement (n'entre dans aucune acceptation) : une clé calée sur la couleur réelle des coins ne sauve aucun candidat ; la palette échoue sur les quatre (rose de la clé dans la pierre), c3 déborde aussi de l'emprise.
- Mon verdict, avant (B) : c0 `fail` 2 (seconde cheminée), 5, 6 ; c1 `fail` 5, 6 (fond violacé resté), 9 (rose dans la pierre) ; c2 `fail` 26, 4 (mur doré), 5, 6 ; c3 `fail` 5, 6, 9 (pierre bleu vif). Aucun accepté.
- (B) (`v5a3_review.json`) : 4 sur 4 en échec. Il voit encore une lueur sur c1 (façade rosée) et c3 (mur orange derrière le foyer) que j'avais crue partie : il est plus sévère que moi, son verdict compte. Restes magenta au détourage sur les quatre.
- Coût total contre-vérifié : 4,74 $ selon `cost`, 4,74 $ selon le solde (2300,1 → 1826,1).

### Porte G1-style, sonde v5 : échouée

Aucun candidat de forge_solid ne passe (A) et (B) : 20 rendus, 5 tentatives sur deux fonds. La planche « Style Bati » n'a pas été jugée, faute de candidat. Pas de recalibration, pas de gel. Triptyque non relancé (réservation au-delà des 2,00 $ de la sonde). Pause : en attente de Guillaume.

## Décision de Guillaume (28/10/2026) et suite

`G1-style: validé`. DA de la sonde v5 validée à l'œil sur `v5a1_c2` posé sur le sol de nuit ; le regard neuf l'avait refusée (items 2, 4, 9, 24, 26, dont la lueur du foyer). Items 4 et 26 et critère 1 amendés par Guillaume, commit `1457b461`, nouveau `COMMIT_DE_LANCEMENT`.

### Consigne 1 : détourage adaptatif (0 $)

- `measure_background` : médiane d'une bordure de 16 px de l'original signé ; clé et despill autour de cette couleur ; découpe par la silhouette conservée. `spill()` classe désormais les canaux par rapport au plus fort canal du fond mesuré (même partage que ≥ 128 pour le magenta et le vert purs ; un fond bleu nuit ou gris n'avait pas de canal ≥ 128 et faisait planter la mesure).
- Les 20 rendus de la sonde v5 refaits depuis leurs originaux (`*_audit_adaptive.json`, `*.adaptive.cut.png`). Fonds mesurés de `#A93F93` à `#F819DF` pour le magenta, `#06274E` à `#273149` pour le bleu nuit.
- (A) : **v5a1_c2 PASS**, v5a2_c0 PASS ; les 18 autres refusés. Le rose qui déteint reste refusé : les quatre rendus de a3 échouent sur la palette. Les 8 rendus sur bleu nuit échouent tous (la clé mange aussi les ombres de nuit : trous, silhouette).
- **`forge_solid` = `v5a1_c2`, accepté par Guillaume** (`"accepted_by": "Guillaume"` dans `scripts/provenance.json`), pas par le regard neuf. Clé `#F819DF`, recalage échelle 0,99, (0, 2) px.

### Consigne 2 : essai de fond sur `windmill_solid` (tentative 1, 2 + 2 candidats, 0,30 $)

- Blockouts du moulin (3 stades sans ailes, axe dirigé vers la caméra, pivot exporté) et des ailes rendus.
- Mêmes graines ; (a) magenta, (b) vert décrit comme fond de studio. Le vert s'assombrit lui aussi (`#0E8208`, `#1B9F29`), moins que le magenta ne virait au violet.
- DA d'abord : magenta c1 a 8,6 % de violet (le fond déteint), magenta c0 0,1 % ; vert : 0 et 0,1 % de violet, a* neutre (−1,5 et −0,75), quelques pierres verdies sur c0 (mousse ou débordement, à surveiller). Silhouette : vert 0,82 à 0,87, magenta 0,70 à 0,73. **Le vert à clé adaptative est retenu** pour la suite, sauf pour le bosquet.
- FLUX a peint des ailes sur 3 des 4 moulins malgré le prompt ; la découpe les tranche net.
- Correction de cohérence avant le gel : le blockout du moulin n'a que 0,35 % de pixels chauds (une petite fenêtre), sous le plancher de 0,5 % ; un sprite fidèle ne pouvait pas passer. « Avec ouvertures » suit maintenant le blockout : sous 0,5 %, c'est la règle des sans-ouverture (< 1 %).
- (A) : 0 sur 4 (résiduel, trous et emprise : les ailes tranchées et leur fond). Première mesure sur un bâtiment sans feu : la lumière et la palette passent sur le vert, le défaut est la forme (les ailes).

### Gel de l'audit

Recalibration : aucune. Le seul candidat validé (par Guillaume) passe déjà (A), il n'y a rien à laisser passer. `test_audit.py` vert. Gel : `iso_audit.py` sha256 `4beebf08…09668306`, `audit-thresholds.json` sha256 `3677fc4e…f61185bd` (valeurs complètes dans STATE).

### Budget

5,04 $ dépensés. Projection à 4 candidats par tentative pour les 8 slugs restants du cœur, deux tentatives chacun : environ 4,80 $, soit plus que les 9,50 $. **Passage à 3 candidats par tentative** (consigne 5).
