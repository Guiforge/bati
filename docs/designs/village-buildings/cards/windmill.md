# Carte : Moulin (windmill)

**Statut : finale, à relire par theo et mara (section 9.1).** Remplace le brouillon de la prep : plus d'orage, plus de nuage. Rien de l'aspect actuel n'est gardé, seule l'emprise reste.

**Chiffres** : mesurés sur un croquis noir projeté à la main (trait de 8 px, ailes à 45°), sans Blender. G-GROW et G-ID restent à passer sur le vrai rendu. Si un chiffre de hauteur tombe sous la limite au rendu, baisser l'échelle des ailes d'abord.

**Repères** :
- Grille x, y de 0 à 2, (2,2) devant. `px = 448 + 192 (x - y)`, `py = 1280 - 96,67 (4 - x - y) - 235 z`. Rayon `r` à l'écran : `r x 271,5` px.
- Canevas `building2x2` : **896 x 1344 px**, ancre (448, 1280).
- **5 px de canevas = 1 dp à l'écran**, au zoom de capture 0,6 sur le téléphone de test (470 px physiques pour 896, densité 420 : vérifié sur les captures E1). 10 dp = 50 px, 14 dp = 70 px, 16 dp = 80 px.
- **Limites de `headroom.md`** : rien au-dessus de y = 64 (`anchorMarginPx`), ailes comprises en position +. Le test `iso-spec` et ses 200 px ne lit que les anciens stades : ne pas s'y caler, un contrôle séparé mesure le sommet. Échelle maximale des ailes à pales de 0,50 : 1,21. Remplissage du mythique : 554 kpx, environ 55 % de la zone utile, au-dessus de l'hypothèse de 50 % de `headroom.md`, à cause des pales larges. Ce n'est pas une limite du canevas, à relire au rendu.

## 1. Identité
- **Famille** : muscle (épaules), rangs 1 à 10.
- **Gardien** : un meunier sans nom ni répliques.
- **Piliers** : P1 (le cristal), P2 (les ailes, le chevalier, les rubans), P3 (chaque rang bâtit le pic), P4 (les sacs sur les épaules).
- **Crochet de silhouette** : tour large et effilée, chapeau, perche de queue à droite avec une fente de ciel, ailes en X, et **un seul pic de cristal bleu qui sort du V des ailes**. Jamais de boule, jamais de nuage.
- **Accents** : blanc de farine, ocre, bleu ciel mat sur les ailes à partir de legendary, bleu froid du cristal.
- **Références, texte seulement** : moulins de La Mancha (Consuegra, Campo de Criptana), moulins-tours bretons, échafaudages de Guédelon.
- **Exclusivité du cristal** : **aucun bâtiment voisin n'a le droit d'avoir ce cristal.** La tour du mage en porte aujourd'hui un petit, en losange, visible à côté du moulin sur les écrans cibles : sa carte de la vague W2 doit le retirer (elle garde son orbe). La carrière n'a plus de géode, déjà arbitré.

## 2. Ce qui ne change à aucun stade
- Emprise 2 x 2, masque de contact, ancre. La dalle reste dans le spec (`plate()`, `_plate`) pour le test d'empreinte, **jamais envoyée à FLUX**.
- **Pas de sol dans la maquette ni dans la peinture.** `maquette_peinture.py` ajoute encore un sol olive : à retirer, fond magenta plat seul. Un sol à part, `windmill_sol`, peint une fois en contexte (recette E4).
- **Tour élargie**, d'un cran plus clair que sur les écrans cibles : fût de r 0,74 en bas (72 dp devenus 80 dp), r 0,58 en haut au legendary (52 dp devenus 63 dp).
- Socle : `cyl` (1 ; 1 ; 0,04), r 0,82, h 0,12. Fût : part de z 0,16.
- Porte `box` `[0,82 ; 1,70 ; 0,16]`, `[0,36 ; 0,06 ; 0,55]`, `darkwood`, `accroche: porte`. Marche `box` `[0,78 ; 1,72 ; 0,16]`, `[0,44 ; 0,14 ; 0,05]`.
- Perche : `seg` de (1,88 ; 0,12 ; 0,04) à **(1,52 ; 0,48 ; zc - 0,02)**, r 0,08 (haut déplacé pour garder la fente). Fente mesurée au mythique sans ailes : 29 px à y 650, 32 à 800, 93 à 950, 53 à 1050.
- Jambes de force : comme `gen_pilot_specs.py`, bout haut à r 0,78 au lieu de 0,70.
- Pierre chaude, bois. Chapeau en chaume puis tuile mate.
- **Aucune ombre d'aile peinte sur la tour.** Les ailes n'existent jamais dans la peinture de la tour. À écrire dans chaque prompt.

## 3. Échelle des stades

Partir de `windmill()` de `gen_pilot_specs.py`, avec ces valeurs. `f` = r bas, r haut, h du fût. Chapeau = base z, r, sommet z.

| Stade | f | Chapeau | Pivot ailes, échelle, `width` | Nouvel élément | Haut (y) | H | Aire | Croissance |
|---|---|---|---|---|---:|---:|---:|---|
| rough | 0,74 ; 0,64 ; 1,04 | 1,2 ; 0,78 ; 1,7, chaume | (1,4 ; 1,4 ; 1,5), 0,85, 0,30 | Tour courte de pierre brute, ailes rapiécées, perche | 565 | 627 | 241 k | |
| solid | 0,74 ; 0,62 ; 1,54 | 1,7 ; 0,82 ; 2,32, chaume | (1,49 ; 1,49 ; 2,08), 0,95, 0,30 | Tour rehaussée, ailes pleines, cabestan, tas de sacs | 417 | 775 | 327 k | +24 % H |
| grand | 0,74 ; 0,60 ; 2,0 | 2,16 ; 0,86 ; 2,88, tuile | (1,54 ; 1,54 ; 2,59), 1,05, 0,30 | Galerie, four, cheminée qui fume | 279 | 913 | 417 k | +18 % H |
| legendary | 0,74 ; 0,58 ; 2,29 | 2,45 ; 0,90 ; 3,17, tuile | (1,55 ; 1,55 ; 2,88), 1,12, 0,50 | Immenses ailes bleu ciel, girouette | 170 | 1022 | 506 k | +12 % H |
| mythic | comme legendary | comme legendary | même pivot, **1,18**, 0,50 | **Pic de cristal**, rubans de vent, ailes plus grandes | 67 | 1125 | 554 k | +10,1 % H |

Le passage au mythique est juste au seuil de 10 %. S'il tombe en dessous au rendu, baisser l'échelle du legendary à 1,10.

**Pièces par stade** (s'ajoutent) :
- **solid** : cabestan `cyl` (1,82 ; 0,18 ; 0,04), r 0,16, h 0,12, deux barres comme aujourd'hui. Sacs : `cone` (0,32 ; 1,84 ; 0,04) r 0,14 à 0,10 h 0,16, `cone` (0,32 ; 1,84 ; 0,2) r 0,10 à 0,05 h 0,14, `cone` (0,54 ; 1,82 ; 0,04) r 0,10 à 0,06 h 0,14.
- **grand** : galerie `cyl` (1 ; 1 ; 1,40), r **0,86**, h 0,05. Garde-corps : 16 poteaux à r 0,83 de z 1,45 à 1,67, main courante à z 1,65, sans le poteau 14 ni les tronçons 13 et 14 (la perche passe). Four `box` `[0,04 ; 1,28 ; 0,04]`, `[0,38 ; 0,38 ; 0,36]`. Cheminée `cyl` (0,16 ; 1,5 ; 0,4), r 0,12, h 0,85, `accroche: cheminee`. Gueule `box` `[0,16 ; 1,64 ; 0,1]`, `[0,14 ; 0,04 ; 0,14]`, `amber`.
- **legendary** : mât court `cyl` (1 ; 1 ; 3,15), r 0,04, h 0,25. Girouette-flèche : le code `k >= 3` de `gen_pilot_specs.py`, à **z 3,30** (queue `box` à z 3,20). Le mât à fanion et le fanion en `box` du brouillon sont retirés, ainsi que la bannière et le blason en `box` : la marque de clan est un sprite (ci-dessous).
- **mythic, le pic, un seul** :
  - Collier `cyl` (1 ; 1 ; 3,05), r 0,11, h 0,22, `iron`.
  - Bas du pic `cone` (1 ; 1 ; 3,22), r 0,15 à 0,25, h 0,30, `crystal`.
  - Pic `cone` (1 ; 1 ; 3,52), r 0,25 à 0, h 0,80, `crystal`.
  - Sommet z 4,32, y 72. **Hauteur 1,10, soit 35 % de la tour avec chapeau (3,17) et 48 % du fût.** Exigé : un quart. Le plus large : 27 dp.
  - Pas d'éclats latéraux (la direction A en avait deux : retirés, c'est « un seul »).
  - Matériau `crystal` du spec : `{"tones": ["#6F9FC0", "#6F9FC0", "#3A5F86"]}`, à ajouter aussi dans `DAY` de `maquette_peinture.py`. Deux valeurs, mat. Prompt : bleu froid, brut, irrégulier, **mat, sans facette brillante, sans reflet**, jamais une gemme taillée.
- **Repères** (`_marker`) : gardien `cyl` (0,66 ; 1,78 ; 0,04), r 0,08, h 0,33 ; gag `cyl` (1,72 ; 1,72 ; 0,04), r 0,28, h 0,01.

**Les rubans de vent** : épais, effilés, ils s'enroulent autour de la tour. **Une couche à part, jamais peints dans la tour, car les ailes tournent devant.** Deux sprites peints dans le canevas `building2x2`, décalage (0, 0), générés par deux specs `windmill_rubans_avant.json` et `windmill_rubans_arriere.json` :

```python
# deux rubans, jamais reliés, jamais un cercle ; rf(z) = fût du mythique
for ph, z0, z1, tours in ((200, .40, 2.30, 1.25), (20, .75, 2.42, 1.0)):
    # t de 0 à 1 en 40 pas ; z = z0 + (z1 - z0) t ; a = ph + 360 tours t
    # rho = rf(z) + .12 + .06 sin(pi t)
    # x = 1 + rho (cos a * .7071 - sin a * .7071) ; y = 1 + rho (cos a * .7071 + sin a * .7071)
    # chaque pas : G.cone(point, r, r_suivant, longueur, "ruban", axis=direction)
    # r = .095 sin(pi t)**.7 + .005
```

- Un pas va dans `avant` si `x + y > 2`, sinon dans `arriere`.
- Épaisseur au plus large : r 0,095, **soit 52 px, 10,3 dp sans le trait**. Fin en pointe aux deux bouts. Matériau `ruban`, bleu pâle `#BCD6E4`, ombre `#7FA3BC`.
- Couche `arriere` : `layer: "behind"`. Couche `avant` : **entre la tour et les ailes**, un `layer: "sousAiles"` qui n'existe pas (voir Moteur).
- Mouvement : glissement de 6 px en code, 6 s. Mouvement réduit : immobile. Aire environ 105 kpx, surtout sur la tour.

**Ailes** : canevas `sails`, 768 x 768, feuilles `length` 1,25, `hub` 0,09. Six feuilles :

| Rangs | Feuille | Contenu |
|---|---|---|
| 1, 2 | `sails_rough` | rapiécées, `width` 0,30 |
| 3, 4 | `sails_solid` | pleines |
| 5 | `sails_grand` | grandes |
| 6 | `sails_grand_chevalier` | grandes + chevalier |
| 7 | `sails_legendary_chevalier` | bleu ciel + chevalier, `width` 0,50 |
| 8, 9, 10 | `sails_legendary` | bleu ciel, même feuille à l'échelle 1,18 au r10 |

Les rubans ne sont **pas** dans les feuilles d'ailes. Nuit du mythique : la même feuille, gradée, avec une teinte bleue par script, sans FLUX.

| Stade | Marque de clan, sprite | Gardien | Lumières (`fromRank`) | Boucle |
|---|---|---|---|---|
| rough | aucune | un sac sur une épaule | `fenetre` (582, 945), 1 | ailes |
| solid | `fanion` | idem, adossé à la porte | idem | ailes |
| grand | `banniere` | **un sac sur chaque épaule** | + `fire` four (181, 1028), 5 | ailes, fumée |
| legendary | `blasonSculpte` | deux sacs plus gros que lui | idem | ailes, fumée |
| mythic | `blasonLumineux` : le même sprite, lueur en code | idem, regarde le pic | + `crystal` (448, 217), 10 | ailes, fumée, rubans |

- `clanMark` : **(254, 859)**, face gauche de la tour, sous la pale à 45°. Tailles du moteur : 13 x 10, 10 x 16, 11 x 18 dp à l'écran.
- `gag.slot` : **(448, 1185)**, centre d'un sprite de 150 x 110 px. `guardian.at` : **(233, 1129)**.

**Mythic** :
- **Élément dominant** : le pic de cristal.
- **Couche magique** : les rubans le jour et la nuit, ailes et pic qui luisent en bleu la nuit (lueur en code, teinte par script). Le pic reste mat de jour.
- **Finale** : le pique-nique sur la galerie.

## 4. Table des rangs
Un marqueur et un tap par rang. Tailles en dp à l'écran, boîte en px du canevas, décalage depuis l'ancre (448, 1280). XOR = part de la silhouette qui change (seuil 1,5 %).

| Rang | Nouveau | Sprite | Taille | Boîte (x, y) | Décalage | XOR |
|---|---|---|---|---|---|---:|
| 1 | Stade rough | `rough.jour`, `sails_rough` | 122 x 125 | | | |
| 2 | Teaser : cabestan sur cales et pierres taillées, au pied de la perche | `teaser_r2` | 22 x 16 | 677-787, 1014-1094 | +284, -226 | 1,7 % |
| 2 | Gag : le chevalier fixe le moulin | `gag_r2` | 30 x 22 | slot | | |
| 3 | Stade solid | `solid.jour`, `sails_solid`, `fanion` | | | | |
| 4 | Teaser : base du four et briques | `teaser_r4` | 26 x 22 | 123-253, 958-1068 | -260, -267 | 2,0 % |
| 4 | Gag : il charge | `gag_r4` | 30 x 22 | slot | | |
| 5 | Stade grand | `grand.jour`, `sails_grand`, `banniere` | | | | |
| 6 | Teaser : mât sur le chapeau, toile bleue roulée | `teaser_r6` | 18 x 32 | 403-493, 250-410 | 0, -950 | 2,3 % |
| 6 | Gag : il tourne, accroché à une aile. Le cheval attend | `sails_grand_chevalier`, `gag_r6` | 16 chacun | slot, feuille | | |
| 7 | Stade legendary. Le chevalier reste coincé sur les ailes neuves | `legendary.jour`, `sails_legendary_chevalier`, `blasonSculpte` | | | | |
| 8 | Teaser : petite chèvre de levage sur le chapeau, éclat de cristal brut en écharpe | `teaser_r8` | 24 x 28 | 388-508, 200-340 | 0, -1010 | 1,7 % |
| 8 | Gag : il partage son pain avec le meunier | `sails_legendary`, `gag_r8` | 20 x 16 | centre (305, 1135) | | |
| 9 | Teaser : le plus grand échafaudage, le pic à moitié monté | `teaser_r9` | 36 x 48 | 358-538, 190-430 | 0, -970 | 3,1 % avec l'âne |
| 9 | Ajout gardé au mythique : un âne seul, avec son paquetage | `addon_ane` | 18 x 18 | 703-793, 1025-1115 | +300, -210 | |
| 10 | Stade mythic + finale | `mythic.jour`, `sails_legendary` à 1,18, `rubans_avant`, `rubans_arriere`, `gag_r10`, `blasonLumineux` | gag 34 x 22, lance 40 | voir 5 | | |

Le r9 n'a pas de nouveau temps de gag : le r8 reste.

## 5. Le gag : le chevalier et les géants [PD, Don Quichotte, 1605]
Rangé selon le catalogue.
- **r2** : un chevalier maigre sur un cheval maigre fixe le moulin, lance dressée.
- **r4** : il charge, de trois quarts vers la tour, lance à l'horizontale, jamais vers une personne. Poussière.
- **r6** : il pend à une aile par la ceinture et tourne avec elle, peint dans la feuille. Le cheval attend dans l'emplacement. Il est sur le tiers extérieur de la pale **en haut à droite au repos**, pieds vers le bout, 80 px à l'écran, soit 76 px sur la feuille `grand` et 71 px sur la feuille `legendary`.
- **r7** : pas de nouveau temps, il est toujours coincé, les ailes neuves autour de lui.
- **r8** : assis, casque cabossé à côté de lui, il tend son pain au meunier. Sprite du chevalier seul, posé à droite du gardien, centre (305, 1135). Le cheval sort du gag.
- **r10, finale** : lui et son écuyer pique-niquent **sur la galerie**, jambes pendantes au-dessus du garde-corps, nappe qui déborde. Sa lance est devenue le mât de la galerie, avec un simple ruban. Bas du sprite à (448, 885), 170 x 290 px, centre (448, 740). Au repos en X, c'est dans le V bas des ailes (235 px de demi-largeur à cette hauteur) : ça se lit. En rotation, les pales passent devant.

**Repli** (aucun `[wink]` ici, c'est au cas où G-WINK ou G-GAG échoue) : au r6, sa lance plantée dans l'aile tourne seule et lui regarde en l'air. Sans sprite d'aile à peindre avec une figure.

## 6. Gag de chantier
Le même à chaque changement de stade : un nuage de farine blanchit deux ouvriers, 4 images. L'échafaudage `chantier` est un seul sprite, mis à l'échelle en code, un tiers du bâtiment au plus.

## 7. Le mythic en une phrase
« Mon moulin a planté un pic de cristal dans son chapeau, et le vent s'enroule autour de la tour. »

## 8. Clins d'œil
- **Source** : Don Quichotte, domaine public. Aucun `[wink]` à approuver.
- **Jamais dessiné** : le dessin de Picasso, toute version de film ou de dessin animé, aucun texte ni nom.
- Tomber de l'aile donne des étoiles, jamais une blessure.

## 9. Rien ne disparaît

| Stade | La peinture contient | Teaser fini | Retiré des données |
|---|---|---|---|
| rough | socle, fût, chapeau, perche, jambes de force, porte, fenêtre | | |
| solid | tout + tour rehaussée de pierre, cabestan, sacs | `teaser_r2` : cabestan monté, pierres dans la tour | `teaser_r2` |
| grand | tout + galerie, four, cheminée, tuile | `teaser_r4` : le four | `teaser_r4` |
| legendary | tout + mât court, girouette. Ailes bleues : la toile du teaser | `teaser_r6` | `teaser_r6` |
| mythic | tout + collier, pic, âne | `teaser_r8` et `teaser_r9` : le pic | `teaser_r9`, `addon_ane` |

`teaser_r8` part au r9 (`untilRank: 9`), remplacé par le plus grand. La marque de clan reste un sprite, à la même place, sa forme change. Seul l'emplacement du gag change de contenu, et la feuille à chevalier est traitée comme lui.

## 10. Lisibilité
- **Ajouts** : âne 18 dp. **Teasers** : le plus petit 16 dp de haut. Tous au bord de la silhouette ou dans le V des ailes.
- **Rubans** : 10,3 dp au plus large.
- **Figures** : 2 au plus. r2, r4 : chevalier + cheval. r6, r7 : chevalier + cheval. r8 : chevalier + meunier. r10 : chevalier + écuyer. Chantier : 2 ouvriers. Toutes à 14 dp ou plus.
- **Surcouches** : au r9, teaser + âne + gag = 3, environ 12 % de la silhouette. Au r10, rubans + gag = 2, environ 22 %, dont l'essentiel sur la tour. Sous 25 %.
- **Échafaudage** : 8,5 % du legendary au r9.
- **Contact au sol** : pied de perche, four, sacs, teasers r2 et r4 (1,78 ; 0,30) et (0,23 ; 1,58), âne (1,93 ; 0,37), gag : tout dans le losange.
- **Canevas** : pic à y 72, ailes en + à y 78 (mesure de la prep, à reprendre), bords x 10 et 886 en +. Tout tient. Rubans dans l'empreinte, vérifié.

## 11. Coût estimé

| Poste | Sprites |
|---|---|
| Peintures de stade | 5 |
| Feuilles d'ailes | 6 |
| Rubans | 2 |
| Teasers | 5 |
| Âne | 1 |
| Gags | 5 |
| Marques de clan | 3 |
| Gardien (un sac, deux sacs, gros sacs) | 3 |
| Échafaudage | 1 |
| Chantier, images dessinées (24 au plus) | 4 |
| Sol de l'emplacement | 1 |
| Sprites de nuit seule | 0 |
| **Total** | **36** |

**36 x 2 essais x 0,07 $ = 5,04 $**, plus l'écran cible refait (2 variantes, 0,14 $) : **5,18 $**. `cibles_e1.py` compte 0,075 $ par image en 2x2, et le registre réserve 0,10 $ : prévoir 7,20 $ de réservation. Peinture neuve par stade, FLUX 3 Image, stade précédent en référence, finition (b).

## Moteur : ce qui manque
Ce que `buildingData.ts` et `BatimentMoteur.tsx` ne savent pas encore dire. Données ou code, avec test, à faire avant l'intégration.
1. **Couche sous les ailes** : aujourd'hui `front` passe devant les ailes (`couches`). Ajouter `layer: "sousAiles"`, pour `rubans_avant` et `gag_r10`.
2. **Ailes par rang** : `ailesDe()` lit par stade. Il faut une table rang vers feuille, pour le chevalier des r6 et r7.
3. **`GagBeat.at?`** : un temps de gag peut sortir de l'emplacement (r8, r10).
4. **Gardien par stade** : `guardian.sprite` est unique, il en faut trois.
5. **Sprites réels** : `IMAGES` est vide et les pièces sont des aplats en dp de carte. La taille en px du canevas doit venir du sprite ou des données.

## Questions
1. La fente de ciel avec l'âne et le teaser r2 : mesurée à vide. À regarder au rendu.
2. Le pain tendu au meunier (r8) se lit-il avec deux sprites séparés ? G-GAG dira. Sinon, le meunier est peint dans `gag_r8`, et il faudra masquer le gardien à ce rang.
