# État du POC village iso

- Branche : `poc/village-iso`, commit de lancement `03457987`
- Réglages : `PAUSE_APRES_SONDE = oui`, `BUDGET_FLUX_MAX = 9.50`
- Phase : **en attente de Guillaume : G1-style** (échouée trois fois : sonde 1, sonde 2, sonde v5 ; rapport NO-GO écrit)
- Solde BFL initial : 2300,1 crédits (23,00 $), lu le 2026-10-28 avant tout appel ; solde actuel 2126,1
- Budget : réservé 0,00 $, réel 4,74 $ (champs `cost`), 4,74 $ selon le solde (1826,1 crédits), accord exact ; sonde 1 : 1,74 $, sonde 2 : 1,50 $, sonde v5 : 1,50 $
- Émulateur : `bati-bench` (`emulator-5554`), langue `en-US`, 1080x2400 à 420 dpi ; `.dev` et `.perf` déjà installés
- Aucun appareil physique branché

## Portes

| Porte | Statut |
| --- | --- |
| G0 | passée (`scripts/iso/g0.py`, `scripts/iso/test_audit.py`) |
| G1-style | **échouée** : aucun candidat de forge_solid ne passe (A) et (B) |
| G2-moteur | non commencée (le §8 l'interdit après un échec de G1) |

## Slugs

| Slug | Statut | Tentatives |
| --- | --- | --- |
| forge_rough | blockout ; triptyque échoué | 1 (triptyque) |
| forge_solid | **HUMAN** | 3 magenta + 1 historique + 1 triptyque |
| forge_grand | blockout ; triptyque échoué | 1 (triptyque) |
| windmill_rough | non commencé | 0 |
| windmill_solid | non commencé | 0 |
| windmill_grand | non commencé | 0 |
| windmill_sails | non commencé | 0 |
| watchtower_rough | non commencé | 0 |
| watchtower_solid | non commencé | 0 |

## Code d'audit gelé

Non gelé : la recalibration suit un candidat validé par (B), il n'y en a pas eu.

## Résumé pour Guillaume (sonde)

1. Variante historique (`#0B0F19` + `cutout.py`), 1 tentative : 0/4 ; FLUX ne tient pas le fond, et l'encre s'y confond pour toute mesure.
2. Variante magenta, 3 tentatives : (A) passe 7 fois sur 12, (B) et moi 0 ; défauts : le feu inverse la lumière, magenta qui déteint, ombres portées peintes, une hotte ajoutée.
3. Triptyque, 1 tentative : 0/12 ; FLUX ignore le blockout sur une toile de 2688 px.
4. Coût 1,74 $ (0,075 $ par sprite 2x2, 0,135 $ par triptyque), contre-vérifié au crédit près.
5. Le blockout tient la géométrie des sprites seuls (IoU 0,93 à 0,98) : la forme n'est pas le problème.
6. La DA BD de Bati est à portée : a2_c0 et a3_c3 sont encrés et en aplats ; refusés pour des défauts d'objet (ombres, lueur, hotte).
7. Planches : `~/.cache/bati-art-loop/iso/forge_solid/{legacya1,a1,a2,a3}_sheet*.png`, bruts `*_raw.png`, triptyque `~/.cache/bati-art-loop/iso/forge/triptych_raw.png`.
8. Verdict selon les règles : NO-GO (critère 1), détail dans `REPORT.md`.
9. Ma recommandation : avant d'enterrer l'iso, une seconde sonde à moins de 2 $ qui change les règles plutôt que le prompt : un fond de clé froid (vert ou cyan), « pas d'ombre portée » obtenu en effaçant au détourage tout ce qui sort du masque du blockout dilaté, et 5 tentatives.
10. Pour reprendre : écris `G1-style: arrêt` (NO-GO confirmé : je pousse la branche) ou tes consignes pour une seconde sonde, commite, recolle le prompt.

## Consigne de Guillaume

G1-style: seconde sonde (2026-10-28, en session : « ok fais seconde sonde (on veut remove background, ça on va placer les bâtiments) »). Règles de la sonde 2, celles de ma recommandation : fond de clé vert `#00FF00`, ombres portées et éclats hors silhouette effacés au détourage par le masque de la maquette dilaté, 5 tentatives sur `forge_solid`, 2,00 $ au plus. Sprites détourés, posés par l'app.

## Sonde 2 : résultat

Échouée : 0 sur 20, 1,50 $ (total POC 3,24 $, contre-vérifié). Fond, éclats et frange réglés ; reste le feu qui éclaire le mur droit en dégradé (items 3 et 4), seul défaut de s2a5_c0. Détail dans `LOG.md`, `REPORT.md` § Seconde sonde.

## Prompt v5 (Guillaume, 2026-10-28)

« je trouve que le résultat est pas mal, j'ai fait update au prompt » : prompt v5 (nuit, lune fixe, ombres, flammes) et fichiers figés v5.
COMMIT_DE_LANCEMENT: ee63267b
G1-style: nouvelle sonde sous le prompt v5 (phase 0 refaite pour la lune et la couleur composée, puis phase 1, pause ensuite).

## Ancienne prochaine action (sondes 1 et 2)

En attente de Guillaume : **G1-style (sonde 2)**. Rien n'est poussé. Deux pistes dans `REPORT.md` § 9 : peindre une forge au foyer éteint et laisser l'app poser la flamme (comme les ailes du moulin), ou sonder le moulin, qui n'a pas de source de lumière.

## Sonde v5 : résultat

Échouée : 0 sur 20, 1,50 $. Phase 0 v5 verte (G0 lune et couleur composée, `test_audit.py` v5). La DA a fait un bond (nuit froide, tuiles, fenêtres ambrées) ; restent la lueur du foyer sur le mur droit (items 4 et 26, jusqu'à la 3e tentative pour le regard neuf) et un fond magenta que FLUX assombrit quand le prompt parle de nuit. Bleu nuit écarté. Détail dans `LOG.md` et `REPORT.md` § Sonde v5.

## Décision de Guillaume (28/10/2026)

G1-style: validé
COMMIT_DE_LANCEMENT: 1457b461

La DA de la sonde v5 est validée à l'œil sur `v5a1_c2` posé sur le sol de nuit. Le regard neuf l'avait refusée (`v5a1_review.json` : items 2, 4, 9, 24, 26, dont la lueur du foyer sur le mur droit) ; Guillaume accepte cette lueur. Critère 1 : la planche « Style Bati » est remplie par sa décision. Fichiers figés amendés par lui (items 4 et 26, critère 1), commit `1457b461`. Les 9 slugs du cœur restent soumis à (A) et (B).

Consignes, dans l'ordre : (1) détourage adaptatif sur les 20 rendus v5, `v5a1_c2` accepté par Guillaume s'il passe (A) ; (2) essai de fond sur `windmill_solid`, magenta contre vert, 2 candidats par variante, 0,60 $ au plus ; (3) feu de la forge : la lueur peinte reste, la carte de lueur n'est qu'un renfort (opacité 0 à 0,35), plus d'essai foyer éteint ; (4) phase 2 puis phase 3 ; (5) plafond 9,50 $, 3 candidats par tentative si la projection le dépasse.

## Code d'audit gelé (28/10/2026)

- `scripts/iso/iso_audit.py` : `4beebf0870928f02becc515b97b72cc705f28f295fe260e6570dfcba09668306`
- `scripts/iso/audit-thresholds.json` : `3677fc4e7b10829f6151ef02dc47e3656ca7fb5eea5108a58db07912f61185bd`

## Slugs du cœur (production)

| Slug | Statut | Tentatives |
| --- | --- | --- |
| forge_solid | **accepté par Guillaume** (`v5a1_c2`) | sonde v5 |
| windmill_solid | en cours (vert, clé adaptative) | 1 |
| forge_rough, forge_grand, windmill_rough, windmill_grand, windmill_sails, watchtower_rough, watchtower_solid | à faire | 0 |

Méthode retenue : fond vert `#00FF00` décrit comme fond de studio, clé adaptative, découpe par la silhouette, 3 candidats par tentative.

## Prochaine action

Phase 2 (moteur avec les blockouts, 0 $), consigne 4 de Guillaume. Puis phase 3 : forge rough et grand, puis `windmill_solid` tentative 2 (vert, une seule chose change : le sujet décrit un moulin dont on a démonté les ailes pour l'hiver), moulin, ailes, tour, flamme, bonus. Feu de la forge (consigne 3) : la lueur peinte reste, la carte de lueur du §5.7 n'est qu'un renfort d'opacité 0 à 0,35.
