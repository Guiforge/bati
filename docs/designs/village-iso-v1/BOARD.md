# Tableau des tâches V1 (écrit par le chef d'équipe)

Copie durable de la liste de tâches partagée : elle survit à la fin de la session. Statuts : `à faire`, `en cours`, `en revue`, `terminée`, `bloquée`, `HUMAN`. Chaque tâche suit `TASK-CARD.md`.

**Dans la liste partagée, seulement les tâches des 4 coéquipiers**, créées avec leur propriétaire déjà fixé (un coéquipier inoccupé prend sinon la première tâche libre). Les tâches du chef d'équipe (`chef`), des sous-agents (`auditeur`, `chercheur`) et de Guillaume (`H…`) vivent ici seulement.

## Carte des propriétés (qui écrit quoi)

| Zone | Propriétaire |
| --- | --- |
| `scripts/iso/blockouts/**`, `scripts/iso/iso_blockout.py`, `scripts/iso/exports/**`, `assets/images/village/iso/blockout/**` | blender |
| Scripts de la boucle d'art : `scripts/iso/iso_loop.py`, `scripts/iso/isolib.py` (partie composition), `scripts/lib/flux.py`, `scripts/iso/test_audit.py` (hors audit gelé `iso_audit.py` et `audit-thresholds.json`, à personne) ; `assets/images/village/iso/**` sauf `blockout/**`, `scripts/provenance.json` (par `flux.py`), `~/.cache/bati-art-loop/iso/**` hors `evidence/` | artist |
| `scripts/iso/g0.py`, `scripts/iso/blockouts/VERSIONS.md` | blender |
| `components/village/iso/**`, `app/dev-iso.tsx`, `constants/isoPoc.ts` (garde `ISO_POC`), `constants/isoSpec.json`, `constants/isoLayout.json`, couleurs iso de `rawColors.ts`, `__tests__/iso-*`, clés `village.iso.*` ; au lot 3 `components/village/VillageScene.tsx` et le drapeau ; au lot 4 l'exception de `performance.md` si `MODE_VIE = continu` | engineer |
| `.maestro/iso-*`, `scripts/iso/perf.sh`, `docs/designs/village-iso-v1/evidence/**`, `~/.cache/bati-art-loop/iso/evidence/**` | qa |
| `docs/designs/village-iso-v1/` (STATE, BOARD, DECISIONS, KNOWLEDGE, LOG, `reviews/**`), les commits | chef d'équipe |
| `docs/designs/village-iso-v1/reports/<id>.md` | l'auteur de la tâche |
| `docs/designs/village-iso-v1/research/**` | chercheur |
| Fichiers figés, `VALIDATIONS.md`, `scripts/iso/team/**`, `.claude/**`, `CLAUDE.md` | Guillaume |

L0-T01 complète cette carte d'après ce que le POC a réellement créé (un fichier sans propriétaire n'est écrit par personne).

## Lot 0, cadrage

| Id | Tâche | Propriétaire | Dépend de | Statut |
| --- | --- | --- | --- | --- |
| L0-T01 | Inventaire du POC (fichiers, tests, sprites acceptés, audit gelé et ses sha256, garde `ISO_POC`, flux Maestro `.perf`) ; chemins réels dans KNOWLEDGE « Chemins du POC » ; carte des propriétés complétée. **Fait avant de créer l'équipe** | chef | | terminée (28/10) |
| L0-T02 | Schéma de données du futur dans `isoSpec.json` (ambiances, biomes, points d'accroche, couche de saison, champ `repere` de chaque bâtiment) et types TypeScript | engineer | L0-T01 | terminée (revue pass au tour 2) |
| L0-T05 | Hauteurs maximales et emprises de chaque bâtiment à chaque stade (pour la règle d'écart), depuis les blockouts du POC et des estimations | blender | L0-T01 | terminée (revue pass) |
| L0-T03 | Carte du village complet `isoLayout.json` (21 bâtiments, chemin, eau, décors, palier de chaque case) | engineer | L0-T02, L0-T05 | terminée (revue pass) |
| L0-T04 | Test de la carte : règle d'écart des ombres, connexité du chemin, chaque palier valide | engineer | L0-T03 | terminée (revue pass ; deux importants repris dans L0-T06) |
| L0-T07 | Projection du coût FLUX de la V1 (rendus par sprite accepté au POC, 57 sprites, planches, décors, eau ; fourchette basse et haute) | artist | L0-T01 | terminée (revue pass ; corrections du rapport demandées pour H0) |
| L0-T08 | Chemin de mesure en `.perf` : d'abord vérifier que `run_in_background` marche chez un coéquipier (`sleep 660` en arrière-plan), puis build, onboarding Maestro, capture, mesure témoin de l'onglet Village actuel (l'ouverture de `bati://dev-iso` passe en L0-T09 : l'écran n'existe pas encore) | qa | L0-T01 | terminée (revue pass) |
| L0-T06 | Affichage de la grille maîtresse dans l'écran de démo : cases par palier, emprises, chemin, eau, zones d'ombre, au choix du palier ; plus les deux importants de la revue de L0-T03 et L0-T04 (base du test 8, connexité de l'îlot) et le feu de camp visible | engineer | L0-T03 | terminée (revue pass) |
| L0-T09 | Capture de la grille du village complet et des emprises, par palier, pour H0 ; plus les contrôles sur appareil laissés par la revue de L0-T06 (garde `.perf`, pan, zoom, repos) | qa | L0-T06, L0-T08 | terminée (revue pass ; pincement impossible sur l'émulateur, repris par L0-T14) |
| L0-T10 | Garde-budget de la V1 dans `iso_loop.py` : plafond `BUDGET_FLUX_V1` au lieu de 9,50, dépense comptée depuis le début de la V1 (pas les 5,04 $ du POC), solde initial relu, `CANDIDATES` à 3, test de la garde. Avant le premier rendu V1. Sa revue de code couvre aussi `scripts/iso/cost_projection.py` modifié au tour 2 de L0-T07 | artist | L0-T07 | terminée (revue pass au tour 2) |
| L0-AUD | Audit du lot 0 | auditeur | L0-T02 à L0-T09 | fait, verdict fail (4 bloquants) : corrections L0-T11 à L0-T13 |
| L0-T11 | `heights.py` lit tous les blockouts présents (`ESTIMATES` en repli), donne une hauteur et une ombre aux décors (arbre, bosquet, rochers), écrit au format de biome | blender | L0-AUD | terminée (revue pass) |
| L0-T12 | Test : ombre des décors sur les bâtiments, péremption de `heights.json` face aux blockouts, règle d'écart par ambiance (contrainte du jour écrite) ; déplacer les décors fautifs ; planches régénérées | engineer | L0-T11 | terminée (revue pass) |
| L0-T14 | Écran de démo : mémoire qui monte d'environ 6 à 7 Mo par changement de palier (230 à 357 Mo après 18 changements, L0-T09) : trouver si les tuiles SVG sont recréées et corriger ; boutons de zoom + et - (le pincement ne se simule pas sur l'émulateur) ; redirection quand la garde est fausse ; carte centrée dans l'écran | engineer | L0-T09 | terminée (revue pass au tour 2 ; preuve sur appareil : L0-T16) |
| L0-T15 | Mesure sur émulateur du correctif mémoire de L0-T14 (version opacité) : vues 1683 → 325, pente supprimée après 9 changements, +28 Mo au-dessus du froid, couture d'un pixel entre tuiles | qa | L0-T14 | terminée (revue pass, avec L0-T16) |
| L0-T16 | Remesure après le tour 2 de L0-T14 (`display="none"`, couture, `testID` de l'aire) : mêmes étapes que L0-T15 | qa | L0-T14 tour 2 | terminée (revue pass) : mémoire native +7,8 Mo après 18 changements, vues 325 stables, couture disparue |
| L0-T13 | Garde-budget : plafond lu dans `VALIDATIONS.md` (40 sinon), écrit dans chaque lot ; `accept` nomme selon `nomImage` | artist | L0-AUD | terminée (revue pass) |
| L2-T00 | Migrer `forge_solid` accepté au POC vers `forge/solid.nuit.{webp,json}` et sa clé de `scripts/provenance.json` (contenu inchangé, `accepted_by: Guillaume` gardé), dans une fenêtre de commit, avant le premier `accept` du lot 2 | artist | L0-T13, H2 | terminée (revue pass) |
| L2-T01 | Tests reportés de la revue de L1-T13 : `flux.py` écrit `model` = `flux-3-image-klein` (vrai code) ; `accept` refuse un candidat qui a échoué l'audit A | artist | L1-T13 | terminée (revue pass) |
| H0 | Porte humaine : carte du village, repères, plan des lots, budget FLUX (d'après L0-T07) | Guillaume | L0-AUD | validée (28/10, « Fais au mieux suis tes reco ») |

## Lot 1, le village en maquettes (0 $, sauf l'essai Klein)

Les tâches `blender` passent une à une (elles partagent `iso_blockout.py`). Le reste tourne à côté, deux sous-agents au plus.

| Id | Tâche | Propriétaire | Dépend de | Statut |
| --- | --- | --- | --- | --- |
| L1-T01 | Exports par stade (§7) : les 8 de `isoSpec.exportsParStade` (volumes, masque émissif, points d'accroche, masque de toit, ombre, flaques, masque de tap, ancrage), écrits par `iso_blockout.py` à chaque rendu, plus un rendu « maquette » prêt pour l'app (webp détouré, même cadrage que le futur sprite) ; rejoués sur les 6 stades de forge et moulin et la planche d'ailes ; `heights.py` lit les volumes exportés | blender | H0 | terminée (revue pass ; importants 2 et 3 dans L1-T02, 1 et ombre des ailes dans L1-T07) |
| L1-T02 | Blockouts de la famille muscle restante : carrière, puits, ferme, champ de tir (12 stades), avec leurs exports | blender | L1-T01 | terminée (revue de code pass ; art : 4 bâtiments passent sur le fond) |
| L1-T03 | Blockouts des spéciaux et des débuts : tour du sorcier, bosquet du druide, feu de camp, tente, mannequin (15 stades) | blender | L1-T02 | terminée (code pass aux tours 1 à 3 ; tente et mannequin repris en L1-T05 tour 2, passés à l'art) |
| L1-T04 | Blockouts des 6 améliorations de tier 3 (12 stades) ; G0 relancée sur les nouveaux canevas avant le premier rendu, débord de toit côté long mesuré | blender | L1-T03 | terminée (code pass ; art : 5 passent, armurerie reprise en L1-T05 tour 2) |
| L1-T05 | Blockouts des hauts faits et de la route : antre du dragon, salle des héros, arène, grand-route (12 stades) ; G0 relancée sur les nouveaux canevas avant le premier rendu, débord de toit côté long mesuré | blender | L1-T04 | bloquée : 3 tours d'art, items 7 [B] (salle des héros, grand-route, armurerie) et 10 [B] (grand-route) encore en échec ; code pass ; jugée à H1 |
| L1-T06 | Décors (arbre, bosquet, rochers), eau (canal, bord, cascade), échafaudages 1 × 1 et 2 × 2, figurines des 7 villageois | blender | L1-T05 | terminée (code pass ; art des décors pass ; villageois non revus au lot 1, DECISIONS) |
| L1-T07 | Carte en maquettes dans l'écran de démo : rendus maquette posés par leur ancrage sur la grille, tri en profondeur, à chaque palier ; test qui recalcule l'ombre d'un bâtiment avec un autre soleil depuis les volumes exportés (§7) ; plus, de la revue de L1-T01 : type `PointsAccroche` aligné sur l'export (formes `.px` et `.grid`, `faite` et `porte` nullables, `_doc` de isoSpec.json mis à jour) et ombre des ailes tournées recomposée depuis leur ancrage et `pivot` | engineer | L1-T01 (puis s'étend à chaque famille livrée) | terminée (revues pass aux tours 1 à 4) |
| L1-T08 | Essai FLUX 3 Image Klein contre FLUX.2 pro sur `windmill_solid`, 3 candidats chacun, 0,50 $ au plus, par le garde-budget ; planche côte à côte et mesures de l'audit gelé | artist | H0 | terminée (revue de code pass ; planches fail sur les 6, attendu ; 0,258 $) |
| L1-T09 | Captures de la carte en maquettes aux paliers 3, 6, 9, 12 sur la `.perf`, mémoire et repos | qa | L1-T07 complète (21 bâtiments) | terminée côté mesures (remesure 2 après L1-T17) ; revue d'écran à refaire (L1-T21) |
| L1-T10 | Garde-budget Klein (importants de la revue de L1-T08) : arrêt sur écart de coût écrit dans le ledger, plafond par sonde pour `w5gk`, `accept` refusé pour Klein tant que la licence n'est pas lue, réservation `max(RESERVE, klein_price)` ; puis tentative Klein 3 sur `windmill_solid` (couleur de pierre nommée), 0,10 $ au plus | artist | L1-T08 | terminée (revue de code pass ; planche a3 fail, c0 et c2 à un item près) |
| L1-T11 | Garde-budget : ledger écrit avant `credits()` dans `settle()`, réservations de sonde en vol comptées, arrondi au centime supérieur ; puis tentative Klein 4 (dernière avant HUMAN) sur `windmill_solid`, toit brun-rouge assourdi nommé, 0,10 $ au plus | artist | L1-T10 | terminée (revue de code pass ; w5gka4_c1 pass audit A et regard neuf ; non accepté, licence) |
| L1-T12 | Canevas `building2x3` dans `isoSpec.json` (demandé par blender en L1-T02) et test emprise du bâtiment = emprise du canevas | engineer | L1-T02 | terminée (revue pass) |
| L1-T13 | Test de `settle` qui ne libère que la part de son lot (mutant M7 de la revue de L1-T11) ; lever le refus d'`accept` pour Klein (licence lue, L1-R01) sans rien accepter ; `accept` de `w5gka4_c1` après H1 seulement | artist | L1-T11, L1-R01 | terminée (revue pass ; deux tests reportés en L2-T01) |
| L1-R01 | Licence des sorties de l'API Klein pour une app distribuée sur F-Droid, GitHub et Play | chercheur | L1-T08 | terminée : oui sous condition (mêmes termes que FLUX.2 pro ; C2PA ouvert, à H1) |
| L1-T14 | Plantage de bati://dev-iso sur Hermes (`toSorted`) : correctif et plugin Biome `noMissingHermesApi` | engineer | L1-T09 | terminée (revue pass) |
| L1-T15 | Contrôle d'ombre des échafaudages dans `heights.check()` (au plus les cases des bâtiments de même emprise) ; `lineScale` recopié dans l'`anchor.json` ; mineurs de `reviews/L1-T06.md` (mkdir, docstrings, `shortcut:` de la dédup) | blender | L1-T06 | terminée (dans L1-T18) |
| L1-T16 | Maquettes décodées en entier (un `require` impose la taille du fichier à Glide) : `{ uri }` seul ; voile d'ombre sur l'eau ; règle d'affichage des décors testée dans l'écran | engineer | L1-T09 | terminée (revue pass ; remesure de qa : froid 176 → 79 Mo, pan 100 % → 4,4 %) |
| L1-T17 | Ombres en evenodd (`clipRule` lu sur le `G` côté Android) d'où anneaux et voile inversé ; voile par case ; chemins (13,5) et (16,5) ; cliquet de desserte ; cache `disk` | engineer | L1-T16, L1-T09 | terminée (revues pass aux tours 1 et 2 ; remesure 2 de qa conforme) |
| L1-T18 | Échelle du mannequin et de la tente au palier 3 (revue d'écran, item 14) ; plus L1-T15 (ombre des échafaudages dans `heights.check()`, `lineScale` dans l'`anchor.json`, mineurs) ; et vérifier sur les rendus des 57 stades si l'ombre propre sur le socle (item 5, tenu pour `n/a`) risque d'être recopiée comme ombre portée par FLUX : rapport chiffré | blender | L1-T24 | Nouveau plan du village, organisé, logique et joli par défaut (demande de Guillaume du 29/10) : place centrale, quartiers par usage, rues qui desservent chaque bâtiment par l'avant (plus d'exceptions `DERRIERE`), équilibre est-ouest, croissance lisible palier par palier, décors et eau qui encadrent ; règle d'écart, îlot et paliers gardés ; aperçus par palier et revue d'écran sur les aperçus | engineer | L1-AUD | terminée (revue pass ; jugé à H1) |
| L1-AUD | à faire |
| L1-T19 | Figurines de 3 villageois posées immobiles sur des cases de chemin dans l'écran de démo (item 14) ; biome dans `isoSpec.json` pour décors et eau (`biomes.defaut.decors`, `eau`, couleurs iso lues par le biome, test) ; index régénéré après L1-T18 ; un moyen pour qa de cadrer au zoom 0,6 | engineer | L1-T18 | terminée (revue pass) |
| L1-T20 | Comparaison juste FLUX.2 pro contre Klein : un lot FLUX.2 pro avec le prompt de Klein a4 sur `windmill_solid`, 3 candidats, 0,25 $ au plus ; projection du coût du lot 2 refaite au prix et au taux de Klein | artist | L1-AUD | terminée (revue pass ; 0,225 $) |
| L1-T21 | Nouvelles captures (paliers 3, 6, 9, 12 au cadrage et au zoom 0,6, villageois posés) puis revue d'écran « Village complet en maquettes » refaite | qa, puis chef | L1-T19 | terminée (captures ; revue d'écran fail sur 13, 14, 29, présentée à H1) |
| L1-T22 | Revue de code des scripts de mesure de qa (`evidence/L1-T09/*.sh`) | relecteur | L1-AUD | terminée (revue pass) |
| L1-T23 | Page de suivi H1 : captures, planches, mesures (Native Heap et PSS, sans arrondir le sens), essai Klein, questions de l'audit | chef | L1-T21 | terminée (page version 2) |
| L1-AUD | Audit du lot 1 | auditeur | L1-T01 à L1-T09 | fait, verdict fail (3 bloquants, 9 importants) : corrections L1-T18 à L1-T23 |
| H1 | Porte humaine : composition du village en maquettes, résultat de l'essai Klein | Guillaume | L1-AUD | validée le 29/10 par Guillaume dans la session |

## Lot 2 réduit, le premier quart peint (Klein)

Ordre de Guillaume (29/10) : feu de camp, tente, forge, moulin, puits, ferme, à tous leurs stades, plus la planche d'ailes ; le reste plus tard.

| Id | Tâche | Propriétaire | Dépend de | Statut |
| --- | --- | --- | --- | --- |
| L2-T00 | Migrer `forge_solid` accepté au POC vers `forge/solid.nuit.{webp,json}` et sa clé de provenance (contenu inchangé, `accepted_by: Guillaume` gardé) | artist | H1 | terminée (revue pass) |
| L2-T01 | Tests reportés de L1-T13 (`model` écrit par le vrai `flux.py`, `accept` refuse un candidat qui a échoué l'audit A) ; `accept` de `windmill_solid` `w5gka4_c1` ; `LICENSE` et `docs/fdroid.md` complétés pour Klein | artist | H1 | terminée (revue pass) |
| L2-T02 | Maquette pour FLUX sans ombre propre sur le socle : marque du dessus du socle dans la passe `.cls` (`iso_blockout.py`), sans changer les exports ni les maquettes de l'app | blender | H1 | terminée (revue pass) |
| L2-T03 | `compose(..., socle_shadow=False)` pour l'image 1 de FLUX (`isolib.py`), audit A d'accord avec l'image donnée, G0 et audit gelé inchangés | artist | L2-T02 | terminée (revue pass) |
| L2-T04 | Famille débuts : feu de camp et tente (6 stades) peints avec Klein, revue d'art par stade, revue d'ensemble posée sur le sol | artist | L2-T03 | terminée (H2 validée le 29/10) |
| L2-T05 | Famille muscle du quart : forge (rough, grand ; solid de L2-T00 gardé s'il ne détonne pas), moulin (rough, grand ; solid accepté), planche d'ailes, puits, ferme ; revues par stade et d'ensemble | artist | L2-T04 | terminée (H2b validée le 29/10) |
| L2-T06 | Index des maquettes régénéré à chaque sprite accepté (le sprite peint remplace la maquette sous la même clé) ; captures du quart peint sur la carte | engineer, qa | L2-T04 | index fait (revue pass) ; captures et remesure du quart peint à faire (L2-T11) |
| L2-T07 | Contrôle `light_check.py` (règle `light` de l'audit) sur les maquettes ; tente retournée, muret du feu de camp, anneau du puits rough | blender | L2-T04 | terminée (revue pass) |
| L2-T08 | Sonde Klein de production (5 $) ; planches réduites par candidat ; tentative 3 du feu de camp et de la tente | artist | L2-T04 | terminée |
| L2-T09 | Accept des 6 images de H2, chemin d'acceptation humaine (`--human`) pour campfire_solid | artist | H2 | terminée (revue pass) |
| L2-T10 | Accept des 11 images de H2b (dont les ailes, pièce plate) | artist | H2b | terminée (revue pass) |
| H2b | Porte humaine : forge, moulin, puits, ferme, ailes | Guillaume | L2-T05 | peinture terminée (H2b) ; revue d'ensemble posée sur le sol à faire (L2-T12) |
| L2-T11 | Captures du quart peint sur la carte (paliers 1, 3, 6 ; zoom de cadrage et 0,6) sur une build .perf neuve, remesure courte (Native Heap, PSS, pan, repos), franges vertes regardées sur fond clair | qa | L2-T06 | terminée |
| L2-T12 | Revue d'ensemble « Ensemble posé sur le sol » par famille (débuts ; muscle et ailes) sur les captures de L2-T11, avec tier_3 et tier_6 ; forge_solid (FLUX.2 pro, POC) jugé à côté des forges Klein | chef (regard neuf) | L2-T11 | faite (item 15 pass pour les 5 bâtiments visibles ; 13 et 29 corrigés en L2-T14) ; moulin capturé en L2-T15 |
| L2-T13 | Provenance : champ `review` écrit à l'`accept` (verdict du regard neuf, items en échec, fichier de revue) et repris pour les 19 sprites depuis `reviews/` ; note sur le blockout périmé de forge_solid | artist | L2-T14 | Tente déplacée pour dégager le feu de camp, origine des masses d'ombre (moulin hors cadre) | engineer | L2-T12 | terminée (revue pass) |
| L2-T15 | Recapture : place, moulin et ailes, gros plans de l'ombre de socle, mesure courte | qa | L2-T14 | terminée |
| L2-AUD | terminée |
| L2-AUD | Audit du lot 2 | auditeur | L2-T00 à L2-T06 | fait, verdict fail (2 bloquants, 8 importants) : corrections L2-T11 à L2-T13, L3-T01 |
| H2 | Porte humaine après la première famille peinte (L2-T04) | Guillaume | L2-T04 | peinture terminée (H2) ; revue d'ensemble posée sur le sol à faire (L2-T12) |

## Lots 3 à 6

### Lot 3 (ordre de Guillaume du 29/10 : carte dans l'app, navigation, fiche au tap, animations, évolution)

| Id | Tâche | Propriétaire | Dépend de | Statut |
| --- | --- | --- | --- | --- |
| L3-T01 | Ombre propre du socle dessinée par l'app depuis les volumes exportés (H1) ; vérifier si windmill/solid et forge/solid la portent déjà peinte | engineer | L2-AUD | code pass (revue) ; ombre de socle peu ou pas visible sur les captures de L2-T15, à vérifier en lot 3 |
| L3-T02 | Composant de production `IsoVillage` : vraies données (`getVillageScene()`, `buildingStage`, palier du village), îlot qui grandit avec le palier, mêmes sprites et ordre que la démo ; drapeau `INTEGRATION` lisible en release, éteint par défaut, qui remplace la scène actuelle de l'onglet Village quand il est allumé ; la démo `bati://dev-iso` reste | engineer | L2-AUD | fait |
| L3-T03 | Navigation : pan et pincement bornés à l'îlot courant, zoom min et max de `isoSpec`, inertie légère, double-tap pour cadrer ; rien d'animé au repos | engineer | L3-T02 | fait |
| L3-T04 | Tap au masque alpha d'un bâtiment, feuille de détail dans la DA (réutiliser `VillageDetailSheet` et ses stats), accessibilité (liste texte équivalente, actions TalkBack) | engineer | L3-T02 | fait |
| L3-T05 | Croissance au retour de séance : le stade change avec un fondu et un ressort de récompense, sans animation sans fin | engineer | L3-T04 | fait |
| L3-T06 | Niveaux de détail au zoom : décoder à la taille de la vue selon le palier de zoom (netteté au zoom max sans dépasser le budget mémoire) | engineer | L3-T03 | fait |
| L3-T07 | Mesures sur émulateur (témoin sur un village construit par Maestro, carte iso), `scripts/iso/perf.sh` pour le Fairphone | qa | L3-T02 à L3-T06 | fait |
| L3-AUD | Audit du lot 3 | auditeur | L3-T07 | fait, verdict fail (1 bloquant : perf.sh ne mesure pas le critère 5 et son trim ne prouve rien ; 9 importants) : B1 et I5 corrigés en lot 3, I1 à I4, I8, mineurs en lot 4 |
| H3 | Guillaume lance `perf.sh` sur son Fairphone et regarde la carte en main | Guillaume | L3-AUD | à faire |

### Lot 4 (performance de la carte d'abord, puis les animations ; ouvert d'après L3-AUD)

| Id | Tâche | Propriétaire | Dépend de | Statut |
| --- | --- | --- | --- | --- |
| L4-T01 | Glissé de la carte en mode Village (8,3 % janky contre 2,8 %, L3-AUD I1) : départager verrou `scrollEnabled` (commit Fabric par geste) et coût de dessin au cadrage, puis corriger (piste : ScrollView de RNGH et relations de gestes) | engineer + qa | H3 | fait (émulateur ; téléphone à confirmer) |
| L4-T02 | Ne monter que ce qui est montré dans `IsoVillage` (1 110 vues natives pour 10 bâtiments, L3-AUD I2), mesurer le froid | engineer + qa | H3 | fait (émulateur) |
| L4-T03 | Palier de détail « sous 1 » : décoder à zoom × vue au cadrage (L3-AUD I3) ; essayer `useImage` à la place du détournement `svgVariables` (L3-AUD question 4), mesurer la mémoire rendue (I4) | engineer + qa | H3 | fait (jest ; non mesuré, perf suspendue) |
| L4-T04 | Critère 4 : précision du tap (2 000 points, bande de 8 px, palier 12, vérité pleine résolution) (L3-AUD I8) | engineer | H3 | fait (Jest + Maestro, L4-T09) |
| L4-T05 | Accessibilité de la carte : « rang » au lieu de « stade » pour TalkBack, pas de double annonce carte et liste ; revue d'écran (REVUE-UI-PROMPT) de l'onglet avec la carte (scrims, titre) et de l'ombre de socle | engineer + chef | H3 | code fait ; revue d'écran à faire |
| L4-T06 | Ambiance et biome passés jusqu'à `IsoCarte` (plus de « nuit » en dur, L3-AUD §7) | engineer | H3 | fait |
| L4-T07 | Petites animations (eau, ailes du moulin, feu, fumée, bannières) sur l'horloge ambiante, rien au repos hors `MODE_VIE` | engineer | L4-T01 à L4-T03 | L4-T07a et L4-T07b faits (horloge, vague, ailes, reflets) ; flamme, fumée, bannières, lueur bloquées (L4-T12) |
| L4-T09 | Critère 4 en Maestro : le tap Maestro n'ouvre pas de fiche alors qu'`input tap` l'ouvre ; comprendre (durée d'appui nulle et tap RNGH ?) et faire passer `.maestro/iso-batiments.yaml` | engineer + qa | L4-T01 | fait (émulateur ; TalkBack réel non vérifié) |
| L4-T10 | Libellé TalkBack d'une ligne de la liste du Village : nom seul (`VillageLists.tsx:297`), le rang affiché n'est pas annoncé ; vrai aussi drapeau éteint, à soumettre à Guillaume (touche la production) | engineer | Guillaume | fait |
| L4-T11 | Mise en page de l'onglet Village en mode iso (revue d'écran L4-T05, 27) : îlot cadré sans bande noire au-dessus, titre et nom du village posés sur l'art avec le dégradé et le Récitatif de l'onglet de production, blason hors du bord de l'îlot ; nouvelle revue d'écran avec une capture zoomée dans l'onglet | engineer + qa | L4-T07a | fait (mise en page) ; revue d'écran bloquée sur L4-T08 |
| L4-T12 | Planches de dessins à 8 i/s : flamme de forge (et sa flaque de lueur), fumée en volutes, bannière (3 dessins) ; FLUX par le garde-budget, regard neuf type « Planche de dessins » | artist | Guillaume (29/10) | abandonnée : flamme et fumée dessinées par l'app (L5-T03), bannière avec la peinture |
| L4-T08 | Petits animaux et décor (rochers, arbres) demandés à H1 | blender + artist + engineer | L4-T07 | fait (lisière, maquettes des animaux, animaux posés sans marche) |

Créés par le chef d'équipe au début de chaque lot, d'après le §5 du prompt.

### Lot 5 (un village vivant ; ouvert à la porte du lot 4, perf seulement à la fin)

| Id | Tâche | Propriétaire | Dépend de | Statut |
| --- | --- | --- | --- | --- |
| L5-T00 | Audit d'idées : ce qui rend vivant un village iso 2D (jeux de référence, techniques peu coûteuses), trié par effet et par coût pour Bati | researcher | porte lot 4 | fait |
| L5-T01 | Sol varié et naturel : variantes de tuiles d'herbe, de terre et de chemin, touffes, fleurs, cailloux, bords de chemin, choisis par une graine par case | engineer | porte lot 4 | fait |
| L5-T02 | Ciel : dégradé, lune, étoiles dont quelques-unes scintillent pendant la vague, brume qui dérive | engineer | L5-T01 | fait |
| L5-T03 | Flamme du foyer et fumée des cheminées dessinées par l'app (SVG encré, tokens), sur l'horloge ; points d'accroche `foyer` exportés par blender | blender + engineer | L4-T12 (reco) | fait |
| L5-T04 | Villageois : IA de déplacement (grille de coûts, A*, machine à états), plusieurs styles par rôle (fermier, forgeron, garde, flâneur), marche par poses | engineer | L5-T01 | fait |
| L5-T05 | Petits détails vivants : oiseaux qui passent, rongeurs, animaux qui marchent (IA de L5-T04) | blender + engineer | L5-T04 | partielle : oiseaux et rat faits ; les animaux ne marchent pas (places fixes, poses) |
| L5-T07 | Fenêtres qui s'allument et s'éteignent pendant la vague, lueur à la porte au passage d'un villageois ; points d'accroche `fenetre` et `porte` exportés par blender | blender + engineer | L5-T04 | non faite : `porte` et `fenetres` sont indexées sans lecteur ; présentée à la porte |
| L5-T08 | Corbeaux posés sur les toits, qui s'envolent en arc au toucher proche ; lucioles froides près de l'eau et de la lisière | engineer | L5-T05 | partielle : lucioles faites ; corbeaux sur les toits qui s'envolent au toucher non faits |
| L5-T06 | Audit de fin : vivant, sol, ciel, animation, détails, IA ; revue d'écran ; puis perf sur le Fairphone (Guillaume) | chef + tech-auditor + design-reviewer | L5-T01 à T05 | fait : audit fail corrigé, revue d'écran sur le Récitatif seulement ; perf Fairphone à la porte |
| L5-T09 | Reflets d'eau regroupés dans un seul nœud animé (gagne environ 13 places sous le plafond de 64), mêmes reflets à l'œil | engineer | porte lot 5 | code fait (revue pass) : 18 → 5 nœuds, repos 47, pire 51 ; qa à faire (émulateur tombé) : profondeur près du canal, reflet 2-9 retiré, coût de composition |
| L5-T10 | Animaux qui marchent (IA de L5-T04, poses), corbeaux posés sur les toits qui s'envolent au toucher proche (reprend L5-T05 et L5-T08) | engineer | L5-T09 | code fait (revue pass) : 1 ou 2 animaux par vague sans nœud ajouté, corbeaux sur ferme et forge, envol à moins de 56 dp ; repos 47, pire 57 ; qa à faire (émulateur tombé) |
| L5-T07b | Fenêtres et lueur de porte (reprend L5-T07, points d'accroche déjà indexés) | engineer | L5-T09 | code fait (revue tour 2 pass) : 2 bâtiments aux fenêtres par vague, lueur de porte quand un villageois agit, éteint après la vague ; repos 47, pire 55 ; qa à faire (placement, émulateur tombé) |
| L5-AUD2 | Audit de fin du lot 5 bis, revue d'écran, puis perf Fairphone (Guillaume, à la toute fin) | chef + tech-auditor + design-reviewer | L5-T07b, L5-T10 | audit pass, I1 à I3 corrigés, suite complète verte sous Node 24 (442) ; qa des 3 cartes et revue d'écran à faire (émulateur tombé) ; perf Fairphone en dernier |

### Lot 6 (finition, en autonomie depuis le 30/10)

| Id | Tâche | Propriétaire | Dépend de | Statut |
| --- | --- | --- | --- | --- |
| L5-bis-qa | qa sur émulateur de L5-T09, L5-T07b, L5-T10 (liste de L5-AUD2), revue d'écran | qa + design-reviewer | L5-AUD2 | en cours |
| L6-T01 | Peinture Klein des stades restants, par familles (muscle restant, spéciaux, tier 3, hauts faits et route, décors, eau, échafaudages), regard neuf par stade, revue d'ensemble posée sur le sol par famille, garde-budget | artist + art-reviewer | porte lot 5 | en cours |
| L6-T10 | Le monde autour (prioritaire, retour de Guillaume) : plus d'îlot qui flotte ; forêt dense et variée jusqu'aux bords du cadre, rochers, deux ou trois plans de montagnes au loin, horizon où le ciel rejoint la terre, un bord de mer avec reflet de lune ; dans l'îlot, plusieurs herbes, essences d'arbres, bosquets et rochers, sans motif répété | engineer (+ blender si volumes) | L5-bis-qa | à faire |
| L6-T11 | Palette moins grise (retour de Guillaume : « tout est très gris… il a l'air un peu triste ») : nuit claire et colorée, herbe verte vivante sous la lune, chemins et terre chauds, ciel bleu profond, lumières chaudes des fenêtres ; regard neuf et audit des personas sur avant-après | engineer + design-reviewer | L6-T10 | à faire |
| L6-T12 | Fierté : le dernier stade de chaque bâtiment fait « waouh » (bannières, or, fenêtres chaudes, petit éclat au rang légendaire), la progression des stades se lit d'un coup d'œil ; la croissance se fête | artist + engineer | L6-T01, L6-T02 | à faire |
| L6-T13 | Revue le 30/10 en VI-29 de la spec (PLAN-SPEC-VI.md) : marteau fixe, « Tout faire évoluer », évolution automatique à la séance suivante, état local scène jouée, pas de pastille. Avant : Amélioration à réclamer (demande de Guillaume) : un bâtiment qui peut monter de stade bouge et brille (pendant la vague, rien au repos) ; le toucher ouvre la fiche avec « Améliorer » ; « Tout améliorer » quand il y en a plusieurs ; réclamer lance le chantier (L6-T02) puis le nouveau stade. Plan d'abord (où vit le stade réclamé, migration ou non, liste et TalkBack, drapeau éteint inchangé), relu avant le code | engineer | L6-T10, L6-T11 | plan à faire |
| L6-T02 | Chantier à la croissance : échafaudage, 2 ou 3 villageois qui frappent, poussière, puis fondu et ressort (critère 8) | engineer | L5-bis-qa | à faire |
| L6-T03 | Villageois qui travaillent : gestes de travail en « agir » (au moins 3 rôles), bannières dessinées par l'app (critère 8) | engineer | L6-T02 | à faire |
| L6-T04 | Cartouche Récitatif du titre de l'onglet, en mode iso seulement | engineer | L5-bis-qa | à faire |
| L6-T05 | Revue « Village complet peint » aux paliers 3, 6, 9, 12 (critère 2) | qa + design-reviewer | L6-T01 | à faire |
| L6-T06 | Mesures finales émulateur (critères 4, 6, 7, 9), vidéo de 30 s, captures 360×640 et écran large, rapport V1 | qa + chef | L6-T01 à T05 | à faire |
| L6-T07 | Intégration dans l'onglet Village, pièce maîtresse : cadrage d'arrivée, titre et cartouche, scrims, passage carte et liste, premier effet « waouh », détails ; captures et petit film | engineer + qa | L6-T03, L6-T04 | à faire |
| L6-T08 | Portrait et paysage : la carte se lit et se cadre en paysage et sur grands écrans (bati-fold, bati-tablet), rotation sans saut, chrome qui ne mange pas l'île ; captures dans les deux sens | engineer + qa | L6-T07 | à faire |
| L6-T09 | Revue de l'intégration : regard neuf (REVUE-UI-PROMPT) et audit des personas de Bati (audit-personas-bati) sur captures et film, portrait et paysage ; corrections jusqu'à pass | chef + design-reviewer | L6-T08 | à faire |
| L6-T14 | Bulle BD (spec VI, composant unique de tout ce qui se tape : nom, fait, date, nom accessible ; feuille du bas au-delà de 130 %) : spec dans le design system, puis code ; 12 points tapables au plus, 48 dp | engineer + chef | L6-T13 | à faire |
| L6-T15 | Ambiance jour (spec VI-15 : jour fixe pour le gratuit sur Play) par la lumière de l'app et un étalonnage des sprites de nuit, essai sur 3 bâtiments puis extension | engineer + design-reviewer | L6-T11 | à faire |
| L6-T16 | Mode test qui fige les animations (Maestro), compte des familles animées visibles à la fois (spec : 8 au plus) | engineer + qa | L6-T13 | à faire |
| L6-T17 | Monde sans bord (Guillaume) : forêt, montagnes et mer posées dans l'espace de la carte, jusqu'au-delà de tout ce que la caméra peut montrer à tous les zooms ; glissé qui dépasse l'îlot tant qu'un morceau du village reste à l'écran, pour aller voir la lisière ou la mer ; mémoire tenue par tuiles ou motifs répétés plutôt qu'un grand bitmap ; remplace le suivi à 45 % | engineer + qa | L6-T13 | à faire |
| L6-T18 | Village qui pousse, premier pas (PLAN-SPEC-VI.md §7) : damier caché, rues ondulées dessinées par l'app qui montent en gamme vers la place, chaque bâtiment touche une rue et lui présente sa porte, bord de clairière organique fondu dans la forêt, densité qui baisse vers la lisière ; sans image ni nœud animé de plus | engineer + qa | L6-T17 | à faire |
| L6-T19 | Caméra serrée au palier 1 qui recule à chaque palier, clairière petite au début et forêt qui recule avec le village | engineer + qa | L6-T18 | à faire |
| L6-T20 | Corrections vues par qa (L6-T17-qa.md) : mémoire du monde (+46 Mo PSS au palier 1 : partager l'image décodée ou réduire les tuiles), répétition des plaques au zoom mini, netteté au zoom max, texte de debug hors de l'écran par défaut, bouton 0,6, drapeau de démo « bâtiment prêt » dans dev-iso | engineer + qa | L6-T19 | à faire |
| L6-T21 | Carte presque plein écran, navigation aux seuls gestes comme une photo (pincer, glisser, double-toucher), aucun bouton de zoom en production, infos en surimpression ou tiroir ; rotation permise sur l'écran du village seulement (expo-screen-orientation, demande de Guillaume), paysage : carte à gauche et infos à droite (choix 4B) ; reprend L6-T07 et L6-T08 | engineer + qa | L6-T20 | à faire |
| L6-AUD | Audit du lot 6 | auditeur | L6-T06 | à faire |
| HF | Porte finale : perf.sh sur le Fairphone (critère 5), vidéo et carte en main (critère 11) | Guillaume | L6-AUD | à faire |

## Bloquées et HUMAN

| Id ou slug | Raison | Sur le chemin critique | Jugée à la porte |
| --- | --- | --- | --- |
| L4-T11 revue d'écran | 4 tours en fail ; depuis la lisière (L4-T08a), le reproche porte sur l'aspect maquette de la lisière et des bâtiments non peints : attend la peinture | non | prochaine porte |
| L4-T12 (flamme, fumée, bannière) | 3 tentatives, regard neuf fail sur les trois (reviews/L4-T12.md) ; piste : blockouts Blender ou flamme dessinée par l'app | non | prochaine porte |
| L1-T05 (heroes_hall, high_road, armory) | 3 tours d'art, items 7 et 10 en échec (bannières et lanterne posées au lot 4, cadre de la grand-route solid lu comme un gibet, râtelier en grille) | non (le lot 2 peut peindre les autres familles) | H1 |
