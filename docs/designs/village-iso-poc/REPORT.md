# Rapport du POC village iso

## 1. Verdict

**NO-GO**, lu contre `CRITERES-GO.md` : le critère 1 n'est pas rempli. Aucun candidat de `forge_solid` n'a passé à la fois l'audit (A) et le regard neuf (B) : ni en 3 tentatives sur fond magenta, ni sur la variante historique, ni sur le triptyque, ni en 5 tentatives de la seconde sonde sur fond vert. G1-style échoue, donc pas de moteur ni de production (§8, phase 1). La seconde sonde est décrite plus bas.

Ce NO-GO porte sur la méthode d'image telle que le prompt la fixe (FLUX.2 pro peint un blockout, détourage par clé magenta, 3 tentatives). Il ne dit rien de la faisabilité du moteur (tap, pan, mémoire), qui n'a pas été construit.

## 2. Les 8 critères

| # | Critère | Mesure | Seuil | Rempli | Preuve |
| --- | --- | --- | --- | --- | --- |
| 1 | Le style tient | 0 slug du cœur accepté sur 9 | 9 sur 9 et revue d'ensemble | non | `STATE.md`, `LOG.md`, `~/.cache/bati-art-loop/iso/forge_solid/*_review.json` |
| 2 | La méthode est rentable | 0 accepté en ≤ 2 tentatives | ≥ 7 sur 9 | non | `LOG.md` |
| 3 | Le coût passe à l'échelle | aucun slug accepté, coût par slug indéfini | ≤ 0,60 $ hors sonde | non (non mesurable) | `~/.cache/bati-art-loop/iso/budget.json` |
| 4 | Le tap est juste | non mesuré, moteur non construit | 100 % hors bande | non | - |
| 5 | Le pan est fluide | non mesuré | témoin + 5 points | non | - |
| 6 | Le village se repose | non mesuré | 0 image en 10 s | non | - |
| 7 | La mémoire tient | non mesuré | témoin + 60 Mo | non | - |
| 8 | Ça fait Clash | à Guillaume, sur les planches | oui | en attente | planches ci-dessous |

## 3. Coût

- Réservé à la fin : 0,00 $. Réel (somme des `cost`) : **1,74 $**. Contre-vérification par le solde BFL : 2300,1 → 2126,1 crédits, soit 1,74 $, accord exact une fois le retard du solde résorbé (le solde lu juste après un lot retarde d'un lot).
- 20 images générées : 16 sprites 2x2 à 0,075 $ (1,15 Mpx en entrée et en sortie), 4 triptyques à 0,135 $.
- Taux d'acceptation : 0 sur 16 sprites, 0 sur 12 tiers de triptyque. Taux de passage de (A) seul : 7 sur 12 en magenta, 0 sur 4 en historique (mesure non valable, voir §8), 0 sur 12 tiers.

## 4. Perf

Rien de mesuré : le moteur n'est construit qu'après G1-style. `scripts/iso/perf.sh` n'existe pas.

## 5. Planches

Toutes dans `~/.cache/bati-art-loop/iso/` (hors dépôt) :

- `forge_solid/legacya1_sheet*.png`, `a1_sheet*.png`, `a2_sheet*.png`, `a3_sheet*.png` : planches de revue ; `*_raw.png` : les 4 candidats bruts côte à côte.
- `forge/triptych_raw.png`, `forge/triptycha1_sheet*.png` : le triptyque.
- `forge_solid/a3_c3_walls.png` : le recadrage de mon `fail` sur l'item 4.
- Blockouts : `scripts/iso/blockouts/renders/forge_{rough,solid,grand}.png` (dans le dépôt).

## 6. Ce qui a raté

| Tentative | Changement | (A) | (B) et moi | Cause principale |
| --- | --- | --- | --- | --- |
| historique a1 | fond `#0B0F19` | 0/4 (mesure invalide) | 0/4 | fond bleu clair variable, points bleus résiduels, feu qui éclaire la face droite |
| magenta a1 | fond magenta, style BD resserré | 2/4 | 0/4 | le feu inverse la lumière (item 4) sur les 4, flammes magenta |
| magenta a2 | lumière du jour, feu contenu | 2/4 | 0/4 | herbes teintées magenta (6), lueur ambre sur le toit (3), ombre portée magenta (5) |
| magenta a3 | socle nu jusqu'au bord | 3/4 | 0/4 | ombres portées peintes (5), hotte ajoutée (2), lueur en dégradé (3) |
| triptyque a1 | 3 stades sur une toile | 0/12 | 0/12, tous en échec sur 5 et 6 | blockout ignoré, fond lavande texturé, ombres portées |

Pas de recalibration (elle suit un candidat validé par (B), il n'y en a pas eu) ; le code d'audit n'a donc pas été gelé. Aucune retouche. Coupé : moteur, production, revue (C), vidéo, conformément au §8.

`forge_solid` est `HUMAN` dans `STATE.md`.

## 7. Extrapolation

Avec 0 acceptation sur 16, aucune extrapolation chiffrée n'est honnête. Si la méthode tenait au taux de passage de (A) de la dernière tentative (3 sur 4) et qu'un candidat sur quatre passait (B), il faudrait environ 4 images par slug, soit 0,30 $ par slug 2x2 et une vingtaine d'euros pour 21 bâtiments à 3 stades : le coût n'est pas le problème, la tenue du style l'est. Non testé : emprises 3x3, bâtiments non bâtis, nuit, îlot 12x12.

## 8. Ce que la méthode a appris

- **Le blockout tient la géométrie, en sprite seul.** IoU de 0,93 à 0,98 sur tous les candidats 2x2, angle et emprise justes. FLUX.2 pro suit très bien une maquette rendue dans la même projection.
- **Le triptyque, non.** Sur une toile de 2688 px de large, FLUX réinvente les trois bâtiments, les déplace, et peint un fond lavande texturé. IoU de 0,24 à 0,78. Mesure pour le rapport, pas une méthode.
- **Le fond `#0B0F19` n'est pas tenu** : FLUX peint un bleu marine plus clair, différent d'une image à l'autre. Et l'encre noire est à moins de ΔE 60 de ce fond, si bien qu'aucune mesure automatique ne distingue le trait du fond. Le magenta se détoure mieux (7 passages de (A) sur 12).
- **Le magenta a un coût visible** : il déteint (herbes, ombres, murs lavande), et FLUX peint des ombres portées dans un magenta plus foncé que la clé ne retire pas. Chaque tentative a fait reculer un défaut et en a fait apparaître un autre.
- **La lumière est le défaut dominant.** Une forge a un feu, et FLUX éclaire la face droite avec, ce qui inverse la règle « faces gauches claires, faces droites sombres ». La lumière du jour décrite en toutes lettres (a2) l'a corrigé sur la moitié des candidats, pas sur tous.
- **Le style BD de Bati est à portée** : a2_c0 et a3_c3 sont encrés, en aplats, proches des références. Ce qui les a refusés, ce sont des défauts d'objet (ombres, hotte, lueur), pas de rendu.
- Le sol vectoriel et le détourage dans l'app n'ont pas été testés.

## Seconde sonde (demandée par Guillaume le 2026-10-28)

Règles changées : fond de clé vert `#00FF00`, découpe de tout ce qui sort de la silhouette de la maquette dilatée de 16 px, 5 tentatives, 2,00 $ au plus. Sprites détourés, posés par l'app.

| Tentative | Changement | (A) | (B) et moi | Cause principale |
| --- | --- | --- | --- | --- |
| s2a1 | fond vert, découpe par la maquette | 1/4 | 0/4 | le feu dore le mur droit et le dallage |
| s2a2 | aplats de BD imprimée, le feu n'éclaire rien | 2/4 | 0/4 | frange verte de la fumée près des flammes |
| s2a3 | « red coals » au lieu de « glowing orange coals » | 2/4 | 0/4 | foyer en arche ajouté, lueur sur le mur ; enclume en boîte |
| s2a4 | petites flammes plates cernées d'encre | 0/4 | 0/4 | flammes contre le fond, bord vert ; auvent ajouté |
| s2a5 | flammes sous le rebord du foyer | 2/4 | 0/4 | lueur en dégradé sur le mur droit, seul défaut de c0 |

- Coût : 1,50 $ (20 images à 0,075 $). Total du POC : **3,24 $**, contre-vérifié au crédit près (2300,1 → 1976,1).
- Réglé par la seconde sonde : le fond (plus de déteinte chaude, découpe nette dès que les flammes restent dans le foyer), les ombres portées et les éclats hors silhouette (la découpe par la maquette les efface), la frange. s2a5_c0 passe 1, 2, 5, 6, 7, 8, 9 chez (B) comme chez moi.
- Pas réglé, en 9 tentatives sur les deux sondes : le feu de la forge éclaire le mur droit en dégradé (items 3 et 4). Chaque phrase de prompt l'a réduit, aucune ne l'a supprimé.
- Le verdict ne change pas : **NO-GO** (critère 1), G1-style échouée deux fois.

## Sonde v5 (prompt v5 de Guillaume, 2026-10-28)

Nouvelles règles : nuit, lune fixe (azimut 225°, élévation 55°), blockouts en couleur composée sous Cycles avec la palette relevée sur les paliers, ombres portées et flaques calculées, audit de palette de nuit, de détail et de sens de la lumière, planche avec le candidat posé sur un sol de nuit 4×4 et comparé à `tier_6` à la même échelle. Fichiers figés v5 en `ee63267b`.

| Tentative | Changement | (A) | (B) et moi | Cause principale |
| --- | --- | --- | --- | --- |
| v5 a1, magenta | prompt v5 | 2/4 | 0/4 | le foyer embrase le mur droit (26, 4) ; pierre lavande ou blanche (9, 24) |
| v5l a1, bleu nuit | même graines | 0/4 (mesure sans valeur) | 0/4 | même lueur ; « asset de jeu » (24, 25) |
| v5 a2, magenta | braises rouge sombre dans la maquette | 1/4 | 0/4 | FLUX rallume le foyer en four voûté, même lueur |
| v5l a2, bleu nuit | idem | 0/4 | 0/4 | idem, plus des restes de fond |
| v5 a3, magenta | « dull red coals, no flames » | 0/4 | 0/4 | la lueur disparaît sur c1 et c3, mais FLUX assombrit la clé (fond violacé) et du rose déteint dans la pierre |

- Coût : 1,50 $ (20 images). Total POC : **4,74 $**, contre-vérifié au crédit près.
- La DA a fait un bond : nuit froide, tuiles rouge-brun, fenêtres ambrées, encre franche, faces gauches claires. Planches dans `~/.cache/bati-art-loop/iso/forge_solid/v5*_sheet*.png`.
- Le défaut dominant reste la lumière du foyer : en a3 elle recule nettement, sans disparaître pour le regard neuf (façade rosée, mur orange derrière le foyer). Et le prompt de nuit fait dériver le fond : FLUX assombrit le magenta (jusqu'à (196, 32, 184)), et la clé ne le retire plus.
- Le bleu nuit (variante historique) ne se détoure pas et n'apporte rien de plus en DA à graine égale : le magenta est retenu.
- Découvert : FLUX peint une lune dans le ciel dès que le prompt parle de clair de lune (6 rendus sur 8 en a1). La découpe par la silhouette de la maquette l'efface.
- Corrections de l'audit avant tout jugement, notées dans `LOG.md` : octets Lab signés de Pillow, et sens de la lumière mesuré sur les faces, sans les ombres portées intérieures.
- Le triptyque n'a pas été relancé : sa réservation aurait dépassé les 2,00 $ de la sonde.
- Verdict inchangé : **NO-GO** (critère 1). G1-style a échoué pour la troisième fois.

## 9. Questions pour Guillaume

1. **La forge est le pire cas du lot.** C'est le seul bâtiment qui porte sa propre source de lumière, et c'est la seule cause qui reste. Deux suites à moins de 1 $ chacune :
   - peindre une forge au foyer éteint (braises sombres, aucune flamme) et laisser l'app poser la flamme en sprite animé, comme elle pose déjà les ailes du moulin. La lumière sort de la peinture, le feu bouge en plus ;
   - sonder le moulin, qui n'a pas de feu, pour mesurer la méthode sur un bâtiment ordinaire.
2. s2a5_c0 et a3_c3 sont-ils « Bati » à tes yeux, lueur mise à part ? Ce sont les deux étalons de la DA.
3. Le moteur (tap, pan, mémoire) peut se tester avec les blockouts seuls, sans FLUX. Faut-il le faire quand même ?
