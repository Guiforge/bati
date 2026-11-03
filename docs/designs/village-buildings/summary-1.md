# Résumé de la session 1, chantier bâtiments

Session arrêtée le 03/11/2026 à la demande de Guillaume : la méthode change, la prochaine session part d'un nouveau prompt (direction artistique d'abord). Le checkpoint de verrouillage n'a pas été écrit, et la paire pilote n'est pas finie.

**Tip :** `feat/village-iso`, fusion `8696ce2a`, plus le commit de ce résumé. **Suite complète :** verte sur `02d73f33` (529 suites, 7352 tests). Pas relancée sur `8696ce2a`, qui n'ajoute que des scripts et des specs, ni sur les docs.

## Les 3 décisions à retenir
1. Modèle FLUX 3 Image, peinture neuve avec le stade précédent en référence pour la forme, finition (b).
2. Un défaut qui revient à chaque peinture se corrige dans la maquette, pas dans la peinture. Les quatre tours du moulin l'ont montré : la coupure du fût et ses diagonales venaient de `maquette_peinture.soften`.
3. Le moteur des bâtiments existe derrière ses drapeaux, mais rien n'est branché et sa magie échoue encore à G-MOTION.

## Ce qui a été fait
- **Base propre :** rouge réparé, main fusionnée, drapeaux iso allumés en dev et perf, éteints en publié, capture liée à son commit. Le coin de beauté correspondait au verrou à 0,000 %.
- **Étape 0 :** outils, états de capture, `headroom.md`, calibration, `card-sheet.md`, `pipeline.md`, 81 captures de référence, checkpoint d'étape 0.
- **Moteur :** `BatimentMoteur`, `MoteurBld`, `MagieBld`, marqueurs et tap par rang. G-UPGRADE passe. G-MOTION échoue : la magie tracée en code se lit vectorielle, décision de la passer en images fixes peintes, pas faite.
- **Exploration :** E1, E3, E4, E5. E2, le test de rythme, n'a pas été fait.
- **Moulin, « windmill A, classique » :** 4 tours de sondes puis peinture. **Gardé pour comparaison seulement, non intégré.**
- **Observatoire :** maquettes seulement.
- **Kit de maquettes :** `scripts/bld/kit_maquette.py` (tour, socle, toits, dôme, arche, échafaudage, grue à roue), plus un type de pièce `figure` pour les modèles CC0 posés. `scripts/iso/blockouts/cc0/` contient `Farmer.fbx` et sa note de licence.

## Réponses de l'étape 0
Le détail est dans [`decisions.md`](decisions.md).
- Planche de cartes : tout gardé, Guillaume raye le matin. Les [wink] restent non approuvés, avec un repli prévu.
- UPGRADE_RULE : B, une amélioration dont l'aspect change a son propre marqueur et son tap.
- Battement de rang sur tap : oui, le marqueur s'étend à chaque rang. Les éléments de la section 6 restent statiques.
- Questions de la prep : mes réponses par défaut.
- Tailles d'image : relevées là où il faut.
- Go : 30 $ et 250 passages, registre monté à 75 $ à sa demande.
- Calibration ratée (mara et theo à 2 sur 3) : continuer, juges notés. Guillaume juge lui-même au checkpoint.
- Plus de garde APK. Les bâtiments actuels ne contraignent rien, sauf emprise, rangs, seuils, XP et règles de déblocage.

## Ce qu'ont décidé les explorations
- **E1, directions :** moulin A, un seul pic de cristal mat ; la lyre reste l'idée préférée de mara. Observatoire C, l'astrolabe, seul survivant à l'époque. Atlantes faits à la main : échec, lus « Well » puis « Champion Arena ».
- **E3, modèle :** FLUX 3 Image, il garde la maquette. FLUX.2 pro gagne S-D mais peint ce qu'il ne doit pas.
- **E4, méthode :** peinture neuve avec le stade précédent en référence. La chaîne d'édition plaît mais perd des éléments : ce qui plaît entre dans la maquette. Sol jamais peint avec le bâtiment.
- **E5, finition :** (b), contour plus épais et intérieur fin.
- **Appris sur les sondes :** une référence de pierre doit être un recadrage de mur nu, sinon son toit passe aussi. FLUX oublie ce qui n'a pas de forme dans la maquette (le caleçon). Saturation du pic : 0,54 gardée, à 0,40 il lit ardoise, ce qui fait gemme est sa forme.

## État du moulin A, classique
- Dans `windmill/r1/final/` (ignoré par git, dans l'archive) : `bande.png`, 5 stades avec ailes peintes.
- Peints dans `elements/` : ailes, rubans, âne, teasers, gags, gardien, fanion de clan. Le script a été arrêté en plein lot, sans rapport final : ces éléments n'ont pas été relus ni contrôlés un par un.
- Pas faits : bannière et blason de clan, magie en images fixes, sol, nuit, intégration, gates en jeu. La bande avec ailes peintes n'a été jugée par personne.
- Défauts connus : pierre poivrée en haut, couture du rough, caleçon à une rayure et trait trop fin, résidu magenta du mythique à 0,0068 pour un seuil de 0,005.
- G-ID : passé pour le moulin, y compris le pic d'une seule masse.

## Dépenses
- **FLUX :** 9,30 $ sur les 30 $ de la session (registre 54,14 $ sur 75 $). Plus 0,14 $ encore réservés par le lot coupé à l'arrêt, peut-être facturés. Moulin : environ 7,3 $ en tout, dont 0,70, 0,84, 1,22 et 1,54 $ pour les quatre tours de sondes et 3,62 $ pour la peinture.
- **Sous-agents :** environ 103 passages sur 250, compte estimé à la main.
- **Temps perdu :** environ 4 h la nuit et 23 min ce matin : rapports bloqués par des attentes de peintres. La règle d'attente de la section 9.0 vient de là.

## Questions ouvertes
1. Atlantes ou astrolabe : A3a, fait de vraies figures CC0, passe G-ID 4 fois sur 4, mais n'a jamais été comparé à l'astrolabe peint. Il reste d'autres directions possibles avec la nouvelle méthode.
2. Lyre ou cristal pour le moulin : l'idée préférée de mara contre le choix du prompt et de S-C.
3. Anneaux de glyphes et faisceau de nuit sur l'observatoire : mara y voit un risque de portail ou de butin. Repli : l'aurore seule.
4. `VillageScene.tsx:514` fait évoluer seul un bâtiment prêt, sans tap, ce qui contredit la promesse. Le drapeau par rang retire ce chemin ; le choix produit reste à Guillaume.
5. Écarts à la carte gelée du moulin : pic d'une seule masse, caleçon dans la maquette, âne et cheval en sprites, tuile en terre cuite au lieu de l'ardoise.
6. Lunette de l'observatoire qui raccourcit du grand au legendary : G-KEEP pas jugé.
7. Champion Arena lu « Observatory » 4 fois sur 4 par 2 inconnus, puis correctement ou « unsure » pour d'autres : à traiter dans sa carte.
8. Calibration : mara et theo peuvent laisser passer un défaut vectoriel de nuit. Guillaume doit vérifier lui-même.
9. Battements [wink], `iso-spec` à 200 px, 2 vulnérabilités modérées signalées par GitHub sur main (pas regardées).

## Ce qui reste en place
- **Archive :** `~/bati-archives/2026-11-03-session1.tgz`, 1,6 Go, 4418 fichiers : captures ignorées du chantier, atlantes A3, clés des tests à l'aveugle. Sans les loupes, sans vidéos de `~/.cache/bati-art-loop`, sans les packs CC0 (zips dans `~/.cache/bati-cc0/` et `~/Téléchargements`). Rien n'a été supprimé.
- **Émulateur :** perf installé depuis `56e95e0c`, dev depuis `bb2d9a82` : pas reconstruits sur le tip. Metro tourne encore depuis le dossier iso.
- **Worktrees gardés :** `bati-bld-flux` (`bld-flux`, fusionnée) et `bati-bld-engine` (`bld-engine4`, fusionnée), à retirer quand tu veux.
- **Non fusionné dans la branche iso, rien supprimé :** `feat/village-iso-v1` (écrasée dans `292f62d5`), `bld-prep-history`, `loupe-s-night`, `poc/village-iso`, worktrees détachés `p0-wt` et `iso-audit`, plus les branches sans lien avec ce chantier.
- **Verrou des loupes :** bon avant la dernière fusion.
- **Dette de tests :** aucune connue, `tests-debt.md` pas créé.
