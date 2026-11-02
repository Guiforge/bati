# Audit de Guillaume, 31/10 : tour 1 (villageois, routes, fond)

Code seul, rien de commité, rien mesuré sur appareil.

## 1. Villageois pleins
- `HabitantVue` (IsoCarteDemo.tsx) : un seul `Planche`, opacité 1. L'aplat de teinte et `DESSIN_HABITANT` sont retirés. Les marcheurs avaient déjà le sprite seul à opacité 1 (aucun changement).
- Coût de l'abandon : la teinte par habitant (`Habitant.teinte`, `TEINTES_HABITANTS` dans habitants.ts) ne se voit plus. Aucune teinte ne tient sous un sprite opaque, sauf à repeindre ou à recolorer le sprite (non fait). Le champ reste dans habitants.ts (pas à moi) mais plus personne ne le lit : à supprimer ou à brancher plus tard. Gain : 1 image et 1 opacité de moins par habitant.
- Tests : iso-habitants-vue (plus de `-teinte`), iso-dev-screen (images vues 38/146 devient 35/134).

## 2. Routes
- Pavage plus petit : `REPETITION` 192x96 devient 128x64 (texture 1,5 fois plus petite) ; dalles de la place : 10 par case (3 rangées) au lieu de 5.
- Chemin plus sombre et plus chaud : `isoChemin` #7A5E3A -> #60482C (V 0,478 -> 0,373, soit -22 %, S 0,527 -> 0,543), clair et sombre de même ; `isoRuePave` #7A7462 -> #6A5E48, `isoPaveClair` #8E8872 -> #7C7058, `isoPaveSombre` #4E4A3E -> #3E382C, `isoRueEmpierree` #6A5640. Les textures `terre` et `pierres` (webp pâles, V 0,52 et 0,42) sont voilées de l'intérieur du Pattern par un `Rect` `isoRueVoile` #4A3018 (opacité 0,6 et 0,45, `VOILE_MOTIF`) : valeur plus basse, encre des dalles moins contrastée, 0 nœud de plus par bande.
- Joints du pavage : trait 0,5 -> 0,3, épaisseur 0,9 -> 0,7 ; teintes des dalles 0,3 -> 0,24.
- Bord net : le trait par bande (qui doublait les contours aux jonctions, d'où anneaux et coutures) est remplacé par une forme d'encre unique sous toutes les bandes (un Path par tuile, trait 2 x `ENCRE_SOL`, opacité 0,8).
- Cliquets de `iso-sol-encre` (jamais élargis) : chemins S/V 0,12/0,2 -> 0,11/0,10 (mesuré 0,103/0,086) ; dallages 0,30/0,20 -> 0,15/0,11 (mesuré 0,134/0,103 ; S 0,199 -> 0,306). Les plaques (0,12/0,2) n'ont pas bougé : non demandées.
- Non mesuré à l'oeil : la valeur réelle de l'encre voilée des textures, les couleurs ci-dessus sont des moyennes chiffrées.

## 3. Fond, tour 1
- `iso-monde-fondu` retiré (test dans iso-ciel : 0 élément).
- Anneaux de densité (`anneauForet`, `eloignement` dans monde.ts) : distance au village en cellules du monde, adoucie par la profondeur (devant : 150 dp de moins par cellule, derrière : de plus, borné à 1,5 cellule) et par un bruit lent de 0,8 cellule (pas de frontière droite). Rochers/bouleaux jusqu'à 0,8, bouleaux/mixte jusqu'à 1,3, mixte/coni jusqu'à 2,3, dense/coni au-delà. L'éloignement est borné à `dmin + 0,3 cellule` : jamais de « dense » contre une clairière (preuve par la 1-Lipschitz de la distance, testée). L'étirement `1.7 *` et les classes sont supprimés. Tests : densité croissante par anneau, pas de dense contre une clairière, moins dense devant que derrière à même distance, une rangée change de tuile (pas de frontière droite). Limite : la caméra ne montre qu'environ 1,7 cellule au-delà de l'île, donc le dense ne se voit qu'au bord arrière du cadre.
- `PART_ILE` 0,25 -> 0,5 (navigation.ts). Invariant testé : à chaque coin des pans permis, aux zoom de cadrage, sur trois écrans, le cadre est dans `etendue` (iso-monde, « the world covers the frame » ; le test existant « the whole frame stays inside the reach » couvre le cas avec île). Pour tenir ce test, `etendue` sans île prend `max((1-PART_ILE) w, w - zmin LARGEUR)` comme la version avec île, et le test lit un zoom plancher de cadrage et la vraie boîte de l'île (avant : 0,43 et une boîte arbitraire, valable seulement avec 0,25). Tests de bornes de iso-village mis à jour (±100 au lieu de ±200, etc.).
- Ombre portée sous l'île : le contour `bord.ilot` décalé de 14 dp vers le bas, `isoSocleShadow` (rgba, un aplat), un Path par tuile du sol dans le Svg existant, aucun Svg de plus, aucune animation. Le décalage est sous la marge de tuile (16 dp) : pas de coupure au raccord.
- Flou des arbres de lisière : oui, il vient de là en partie. `ECHELLE_DECODE = 0,5` plus `plafond = 0` : l'arbre est décodé à la moitié du niveau 0 puis étiré (à zoom 1 : environ 3 fois). Passé à 1 : coût mesuré sur les 42 arbres de l'île finie, 0,68 MiB (0,5), 1,54 (0,75), 2,74 (1) ; lisière totale 2,12 -> 4,18 MiB (plafond du test 2,5 -> 4,5). Il reste un flou résiduel à fort zoom à cause de `plafond = 0` (niveau 0 seulement) : à voir sur appareil avant de monter le plafond.
- `COLONNE_RIVE` non touché.

## Cliquet (iso-perf-compteur.test.tsx, non modifié, vert)
| | avant | après | plafond |
|---|---|---|---|
| opacité < 1 | 55 | 42 | 55 |
| tailles d'image | 20 | 20 | 20 |
| `<Svg>` | 95 | 95 | 95 |
| nœuds | 977 | 964 | 1024 |
| images | 206 | 194 | |
| forêt : tailles / opacité | 1 / 0 | 1 / 0 | 1 / 0 |
« Avant » = arbre actuel avec l'aplat des habitants et le voile `fondu` remis (mesure par retrait temporaire), sans les Paths ajoutés : les formes SVG (400) ne sont pas bornées et comptent déjà mes deux Paths par tuile (contour, ombre). Svg et tailles sont à leur plafond : ne rien ajouter.

## Vérifications
- `scripts/iso/team/heavy.sh rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Test Suites: 1 failed, 73 passed, 74 total`. Le seul échec est `iso-accroches.test.ts` (T41 : fumées désynchronisées), le chantier de l'autre ingénieur (feux.ts), pas le mien.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre.
- `npx biome check` sur mes 19 fichiers : propre.

## À voir sur l'appareil
1. Villageois : saturation au niveau des bâtiments, plus de transparence.
2. Chemin et place : valeur proche des socles ; si trop sombre, réduire `VOILE_MOTIF` (0,6 / 0,45) avant de toucher aux couleurs.
3. Dalles : échelle, bord net, plus d'anneaux au palier 12 près de la fontaine.
4. Arbres de lisière : netteté à zoom 1 et 2 (reste de `plafond = 0` ?), mémoire.
5. Fond : anneaux visibles, plus de frontière droite haut/bas, dense au fond ; caméra à demi-cadre ; ombre sous l'île (jour et nuit) sans coupure aux raccords de tuiles.
6. gfxinfo sur .perf : un Path de plus par tuile du sol.

## Relecture : suites (31/10)
- Teinte des habitants supprimée : champ `teinte`, `TEINTES_HABITANTS`, les 4 couleurs `isoHabitant*` (dont la prune, violette). Le tirage de hasard est gardé (`h();` commenté, rôle tiré avant) : les habitants ne changent pas de place. Assertions `-teinte` toujours vraies retirées.
- `noeuds(6) <= noeuds(12)` ne tient plus avec `PART_ILE` 0,5 : 30 contre 25. Raison : avec la moitié du cadre gardée, une île plus étroite que la moitié du cadre (palier 6, zoom 0,8, 411 dp) peut être poussée de `a - zmin * taille`, plus que les `0,5 * a` d'une île large (palier 12) ; le palier moyen peint donc plus de cases. Remplacé par des plafonds (6 : 30, 12 : 25) et la raison écrite dans le test.
- Invariant de caméra testé au plancher réel : `min(plancher du jeu 0,3 ou 0,8, cadrage(visible, w, h - margeBas).zoom)` (MARGE_CADRAGE 0,92), margeBas 0 et 120, paliers 1, 6, 12, deux écrans. Il tient : `etendue` inchangé.
- `MotifsSol` : pas de `Rect` de voile quand `VOILE_MOTIF[m]` vaut 0.

## qa-audit1 : corrections (31/10)
1. **Coupure de l'ombre aux raccords de tuiles.** Cause : la marge de sélection des cases d'une tuile (`COTE / 3`, 16 dp) était plus courte que ce que le bord dessine sous une case : bosse jusqu'à 24, berge 9, reflets, puis mon ombre de 14. La tuile du dessous n'avait pas la case, donc la berge et l'ombre s'arrêtaient en ligne droite au raccord (le défaut existait pour la berge, l'ombre l'a rendu visible). Correctif : `PORTEE_BORD` (bord.ts, 41 dp) ; la marge de `Tuile` vaut `max(COTE/3, PORTEE_BORD + OMBRE_ILE)` (55 dp). Test (iso-camera-ile) : sur toutes les cases de l'île finie, chaque coordonnée de la bosse, de l'encre, de la berge et des reflets reste à moins de `PORTEE_BORD` du losange.
2. **La caméra sort de l'île.** Écart test/appareil : les bornes gardaient la moitié de la BOÎTE de l'île à l'écran, or l'île est un losange et le coin de sa boîte ne porte pas de terre : à chaque coin des bornes, le cadre ne montrait que de la forêt (l'élan n'y est pour rien : le `clamp` du decay et `ramener` pendant le geste tiennent les bornes). Mon invariant ne testait que « le cadre est dans la zone peinte », pas « de la terre est à l'écran ». Correctif : `ileJouable` (navigation.ts) = la moitié centrale de la boîte (tout point en est sur le losange) ; `useCameraIso` borne dessus, `etendue` en tient compte (monde.ts). Nouveau test sur le vrai chemin (iso-camera-ile) : plancher réel `min(plancher, cadrage(visible, w, h - margeBas).zoom)`, bornes de `useCameraIso`, tous les coins à trois zooms, paliers 1, 6, 12, trois écrans, margeBas 0 et 120 : au moins une case de l'île à l'écran. Il échoue avec les anciennes bornes (2 tests sur 3) et passe avec les nouvelles. Effets : le monde peint est un peu plus étendu (nœuds du monde 18 / 18 / 30 aux paliers 1 / 6 / 12) ; `noeuds(6) <= noeuds(12)` tient de nouveau (assertion rétablie, le commentaire d'excuse retiré) ; test « keeps the view when the map changes parent » : la vue gardée est ramenée dans les bornes plus serrées de la nouvelle aire (y 155 devient 89,7), écrit dans le test. Si c'est trop serré à l'oeil, `ileJouable` se règle (le quart d'inset).
3. **La caméra bouge sans commande.** Non reproduit (pas d'appareil), rien corrigé ici. Une seule chose déplace la caméra après un toucher : `camera.vers(vueSur(centreBatiment(premier)))` dans IsoVillage, lancé par l'arrivée d'une `croissance` (changement de `cle`) ; c'est voulu (T02b/T37, la caméra bouge d'abord, puis le chantier). Dans dev-iso elle ne naît que du mode Prêt (toucher du bâtiment prêt, ici le moulin, via `onOpen`) et du bouton Grandir ; en mode carte, aucun toucher de bâtiment ne la lance. Le délai de 6 s ne vient pas de ce chemin (il part tout de suite, 500 ms) : à rejouer en mode Prêt et dans l'onglet pour voir si le toucher est celui du bâtiment prêt. Autre déplacement sans toucher : le recadrage quand la clé `largeur x hauteur : margeBas : boîte de l'île` change (titre qui grandit, bouton de dev-iso qui relance la mise en page, changement de palier) : voulu, et c'est ce que qa a vu en enchaînant les boutons en moins de 5 s. Pas de recentrage sur la bulle ni sur la sélection dans le code. L'inertie (`INERTIE` 0,985) s'éteint en environ une seconde et reste bornée.

Vérifications : `scripts/iso/team/heavy.sh rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Test Suites: 77 passed, 77 total`, 810 tests ; `tsc` propre ; `biome check` : 0 erreur, 2 avertissements de complexité dans iso-camera-ile.test.ts (boucles de test).

## qa-audit1 : suites de la relecture (31/10)
- Biome : `// biome-ignore lint/complexity/noExcessiveCognitiveComplexity` avec raison au-dessus des deux tests d'iso-camera-ile ; 0 avertissement.
- Un seul écrivain pour les bornes : `limitesDe(ile, carte, aire, zoom)` dans navigation.ts ; `useCameraIso` et iso-camera-ile l'appellent tous les deux (le test ne recopie plus la formule).
- Cliquet du monde (iso-monde) : `noeuds(1) <= 18`, `noeuds(6) <= 18`, `noeuds(12) <= 30`, plus `noeuds(6) <= noeuds(12)`. Le palier 12 passe de 25 à 30 nœuds de monde (+20 %), conséquence de `ileJouable` : les bornes se calent sur la moitié centrale de l'île, la caméra va plus loin au-delà de ses bords, il faut peindre plus de forêt. Paliers 1 et 6 : 18 et 18 (30 et 30 avant les anneaux ; le test d'origine 30 / 42 / 49 était un plafond lâche).
- Coût de la marge des tuiles, cases dessinées par tuile (somme sur les 6 tuiles du sol, ratio 2,625) :

| palier | marge d'origine (16 dp) | 55 dp partout | 55 dp sur les cases de rive seulement (livré) |
|---|---|---|---|
| 1 | 79 | 97 | 86 |
| 6 | 305 | 420 | 331 |
| 12 | 514 | 684 | 551 |
| total | 898 | 1201 (+34 %) | 968 (+8 %) |

  Ratio 2,8 : 947 / 1287 (+36 %) / 1013 (+7 %). Au-delà de 30 % en marge générale, donc la grande marge ne vaut plus que pour les cases de rive (un voisin non montré, ou bord de grille) ; les cases intérieures gardent `COTE / 3`. Le test de portée du bord (iso-camera-ile) couvre ce que dessinent ces cases.
- Vérifications : `scripts/iso/team/heavy.sh rtk proxy npx jest iso-camera iso-monde iso-bord iso-perf iso-village iso-sol` : `Test Suites: 9 passed, 9 total`, 134 tests ; `tsc` propre ; `biome check` propre (81 fichiers).
