# Ce que l'équipe sait (écrit par le chef d'équipe)

Ce que le POC et les recherches ont appris, à lire avant chaque tâche. Une ligne par leçon, avec sa source (fichier, mesure, page).

## Chemins du POC (rempli par L0-T01, prime sur les chemins cités dans les définitions d'agents)
- Boucle d'art : `scripts/iso/iso_loop.py` (commandes blockout, prep-blockout, candidates, audit, recut, sheet, review, record-review, accept, budget ; `night_patch`, `same_hand`), `scripts/iso/isolib.py` (passes Blender, `compose`, `raw_colour`, `flatten`), `scripts/lib/flux.py` (appel BFL, provenance ; branche `flux-3` déjà écrite mais `iso_loop.guard_endpoint` n'accepte que `flux-2-pro-preview`). Outils de contrôle : `scripts/iso/g0.py`, `scripts/iso/test_audit.py`. Le POC n'a pas de variante de production « vert » nommée : les variantes de fond sont dans `BACKGROUNDS` (`w5g` = vert de studio).
- Audit gelé (`iso_audit.py`, `audit-thresholds.json`) et sha256 : `scripts/iso/iso_audit.py` `4beebf0870928f02becc515b97b72cc705f28f295fe260e6570dfcba09668306` ; `scripts/iso/audit-thresholds.json` `3677fc4e7b10829f6151ef02dc47e3656ca7fb5eea5108a58db07912f61185bd` (vérifiés le 28/10 au début de la V1, égaux au gel du POC).
- Bloc de style (`ISO_STYLE`) : `scripts/iso/iso_loop.py`, constante `ISO_STYLE` (vers la ligne 105), avec `PREAMBLE` (ligne 61, champ `{warm}`) et les dicts `SUBJECT`, `WARM`, `STAGE`.
- Budget (`budget.json`) : `~/.cache/bati-art-loop/iso/budget.json` (`iso_loop.BUDGET`), solde lu par `iso_loop.credits()` sur `/v1/credits`. Dépensé au POC : 5,04 $ (champs `cost`). Solde au départ de la V1 : 3796,1 crédits = 37,96 $.
- Blockouts et exports : `scripts/iso/blockouts/{forge,windmill}_{rough,solid,grand}.json`, `windmill_sails.json`, `VERSIONS.md` ; rendus dans `scripts/iso/blockouts/renders/` (`.png`, `.dark.png`, `.green.png`, `.rgba.png`, `.mask.png`, `.classes.png`, `.anchor.json`, ombres et flaques dans l'ancrage). Pas de dossier `scripts/iso/exports/` encore. Pas de blockout de tour de guet. Moteur : `scripts/iso/iso_blockout.py` (Blender 5.1.1 en flatpak, Cycles).
- Moteur de la carte (`components/village/iso/`) : **n'existe pas**. Le POC s'est arrêté avant sa phase 2 (G2 jamais commencée). Tout le moteur est à écrire.
- Écran de démo, garde `ISO_POC`, lien `bati://dev-iso` : **n'existent pas** (ni `app/dev-iso.tsx`, ni `constants/isoPoc.ts`). À créer au lot 0 (L0-T06).
- Flux Maestro `.perf` (onboarding) : **n'existe pas**. Sous-flux réutilisables : `.maestro/subflows/complete-onboarding.yaml`, `seed-hero.yaml`, `relaunch.yaml`.
- `perf.sh` : **n'existe pas** (à écrire par `qa`).
- Sprites acceptés au POC : `assets/images/village/iso/forge/solid.nuit.webp` et son masque `solid.nuit.json` (migré depuis `forge_solid.*` en L2-T00) (`v5a1_c2`, fond magenta, clé adaptative `#F819DF`, `accepted_by: Guillaume` dans `scripts/provenance.json`).
- Données du Village actuel : codes et tiers dans `db/schema.ts` (`buildingCodes`, `buildingDefinitions`) ; stades dans `constants/buildingLevels.ts` (`buildingStage`, `T3_MAX_LEVEL = 3`) ; scène dans `db/village.ts` (`getVillageScene`) ; écran `components/village/VillageScene.tsx` ; art actuel `assets/images/village/buildings/<code>{,_rough,_grand}.webp` et `tier_1..12.webp`. Les 21 : tier 1 campfire, tent, training_dummy ; tier 2 archery_range, quarry, forge, well, windmill, farm, wizard_tower, druid_grove ; tier 3 watchtower, castle_wall, armory, fountain, observatory, barn ; tier 4 dragon_lair, heroes_hall, champion_arena, high_road. 15 × 3 + 6 × 2 = 57 stades.
- Émulateur : `bati-bench`, `emulator-5554`, réservé à ce worktree par `scripts/emu.sh claim`.

## Le mode équipe
- Les demandes d'autorisation des coéquipiers remontent toutes chez le chef d'équipe ; ils héritent de son mode (`acceptEdits` par les réglages).
- L'outil Bash coupe une commande au premier plan à 10 minutes : builds et lots de rendus en `run_in_background`.
- Le pre-commit (biome `--write`, `tsc` sur tout le projet, correcteurs d'espaces, limite de 2 Mo) met de côté tout ce qui n'est pas indexé pendant qu'il tourne : un coéquipier ou une tâche de fond qui écrit à ce moment peut faire perdre du travail. D'où les fenêtres de commit. Jest complet et knip tournent au pre-push.
- Un commit raté laisse des fichiers indexés que le chef d'équipe ne peut pas désindexer (le hook bloque `git restore`) : `commit.sh` désindexe tout seul.
- Une tâche laissée `in_progress` quand un coéquipier finit son tour déclenche le hook de fin de tâche : il la remet en `pending` avant « prêt ».
- `cd android && …` laisse le shell dans `android/` pour la suite : `android/gradlew -p android --stop`, et des sous-shells `( cd x && … )`.
- `git diff <base>..` ne montre ni le travail non commité ni les fichiers nouveaux : la revue lit `git status --porcelain` et `git diff HEAD` sur les fichiers de la carte.
- Le skill `android-builds` recommande `npm run android:release` : interdit ici (installe sur n'importe quel appareil).

## FLUX et les images
- La maquette tient la géométrie : sur un bâtiment seul, recouvrement de 0,93 à 0,98 avec le blockout (sonde v5).
- FLUX ajoute ce que le nom de l'objet promet : feu pour une forge, ailes pour un moulin. Neuf tentatives de prompt n'ont fait que réduire la lueur du foyer.
- Dès que le prompt parle de nuit, FLUX assombrit le fond de clé (magenta mesuré à #F819DF ou (196, 32, 184)) : la clé doit être mesurée sur chaque original.
- Le magenta déteint en violet dans la pierre (jusqu'à 8,6 %) ; le vert ne teinte pas la pierre de façon mesurable.
- FLUX peint une lune dans le ciel (6 rendus sur 8) : la découpe par la silhouette du blockout l'efface.
- Sur une toile large (triptyque de 2688 px), FLUX ignore la maquette : recouvrement de 0,24 à 0,78. Le triptyque n'est pas une méthode.
- Chaque correction de prompt déplace le défaut : changer une seule chose par tentative, et le noter.
- Taux d'acceptation de l'audit (A) observés : forge 2 rendus sur 20 après la clé adaptative ; moulin 0 sur 4 (ailes peintes).
- Coût : environ 0,05 à 0,075 $ par rendu 2×2 avec sa référence ; 4,74 $ pour toute la sonde du POC.
- Ordre de grandeur (audit du harnais) : avec l'acceptation de la forge (environ 1 sur 10), 57 sprites demandent environ 570 rendus, soit 28 à 43 $ pour les seuls bâtiments, avant villageois, planches, décors et eau. 40 $ ne tiennent probablement pas : la projection de L0-T07 est tranchée à H0.

## Audit et outils
- Pillow donne a* et b* (Lab) en octets signés : les lire comme tels, sinon la palette est fausse près de zéro.
- Le contrôle « sens de la lumière » se mesure sur les faces seules, pas sur les ombres internes (cheminée sur le toit).
- La part chaude minimale suit ce que le blockout a d'ouvertures (le moulin n'a qu'une petite fenêtre : 0,35 %).
- react-native-svg 15.16 : `clipRule` vaut evenodd par défaut ; un `Svg` est un bitmap ARGB à sa taille en pixels (tuiles de 1024 px au plus).
- Gradle ne suit pas les images : `:app:createBundleReleaseJsAndAssets --rerun :app:assembleRelease`.
- Un `.perf` neuf ouvre l'onboarding : le terminer une fois par Maestro (`appId` `.perf`), puis ne jamais remettre à zéro.
- Un bâtiment de tier 3 plafonne au niveau 3 : 2 stades (rough, solid).

## Ombres et lumière
- Avec la lune du POC, l'ombre d'un volume part vers la droite de l'écran, d'environ 0,5 case par unité de hauteur ; un voisin collé de ce côté est toujours touché, quel que soit l'angle : c'est la mise en page qui règle le problème.
- Les jeux iso 2D séparent ce qui est dans la silhouette (peint) et ce qui tombe au sol (dessiné à part, sous les sprites) : Age of Empires II garde une couche d'ombre par image.

## Animation et vie
- Une boucle sans fin bloque `uiautomator`, Maestro et TalkBack, et coûte environ 10 % d'un cœur même sans rien dessiner (`performance.md`).
- Planches de dessins à 8 images par seconde : rythme du dessin animé fait main, peu de redessins.
- IA de déplacement : A* avec la distance de Manhattan sur une grille de coûts (chemin 1, herbe 3) ; machine à états simple, sans besoins à gérer.

- **jest ciblé en worktree** : `--testPathIgnorePatterns` prend un tableau et avale les motifs qui suivent (`... /node_modules/ iso-spec` lance toute la suite, environ 110 s). Écrire `npx jest iso-spec iso-layout --testPathIgnorePatterns=/node_modules/` (motifs avant, `=` collé). Vu en L1-T02 et L1-T12 (28/10).

- **Règles du chef sur `iso_loop.py`** (revue de L1-T13, 28/10) : `accept` ne vérifie que l'audit A, pas le regard neuf ni la porte humaine ; on ne lance `accept` que sur un candidat dont `reviews/` donne `pass` au regard neuf (au lot 1 : `windmill_solid` w5gka4_c1 seulement, et après H1). `budget klein-ack` lève l'arrêt Klein et remet à 0 toutes les réservations (globale et de sonde, Klein ou non) : ne le lancer qu'après `budget`, quand aucun lot ne tourne.
- **Le hook de garde lit le texte entier d'une commande Bash du chef** : un mot comme le nom de l'outil de versions suivi d'une sous-commande, même dans une chaîne Python, la bloque. Écrire les revues avec l'outil Write, les mises à jour par un script du scratchpad.

- **sha256 des fichiers figés au 29/10** (référence écrite dans le dépôt en attendant le commit de lancement ; le 28/10, les 30 fichiers de l'annexe avaient leurs sha256 justes, et leurs dates de modification sont toutes de la phase A) :

    60213b7e5359fc95fc8c7e71f5093626abe8e4ffa5ba2618a60cbdab2446cb9f  docs/designs/village-iso-v1/CHECKLIST.md
    fdd032c4766d8752c5c74eebdb78984df21b54ee9f98aa9c16416e99eba08bef  docs/designs/village-iso-v1/CRITERES-V1.md
    29e17559e1226ebb8f5566d7fe78792d9bc0395bf93109fe18ed8eca218f292a  docs/designs/village-iso-v1/PROMPT-EQUIPE-V1.md
    cc1a4984d316563871601f1638aaa54b67e0d3290c3b68069b1675ad39090241  docs/designs/village-iso-v1/REVUE-PROMPT.md
    09c1443fcb057fd49902677c9f70697688522b31c75147caac92887d5767ca86  docs/designs/village-iso-v1/REVUE-UI-PROMPT.md
    c694fc18e1fca99eeb823e228ee467648e7c7aa94e933bc3be16b3aae1695bc2  docs/designs/village-iso-v1/VALIDATIONS.md
    f373cd4769ca85fc85650d64cd6ea07a7bd658e52ef43f46c10d143870a7a37d  scripts/iso/team/commit.sh
    4f6171ca0e53ead77d6346363a9f7549eb25a5594fbc072c4c9651673b8a2251  scripts/iso/team/emu-adb.sh
    adf95464c2a69559d3f793d65a26d12b2c5bfaa6ee7fbe3d772f9e22f0b39795  scripts/iso/team/emu-maestro.sh
    80781aa986d39b1535b97298368f7a629a0cbad1b792dc1b6c95e52d79b13a99  scripts/iso/team/gradle-perf.sh
    00111ffcb81e03199774cf43dad197cdddb84ea5678721c8a4add5d573ab37d3  scripts/iso/team/guard-team.sh
    5b8a738134f16f3d353ec08763b7123c993ffc94afca9bcb0d413028b152a935  scripts/iso/team/heavy.sh
    b0dea2f4eaf0e0a267fadea211f27b00321130848dec3ece1988a6540756c183  scripts/iso/team/push.sh
    99d5545d412183b4fc4add271e9db5c34cbf8a34ce964dc59023bcf125f6a469  scripts/iso/team/task-completed.sh
    e3ebe8d3eefbab348bdee66b38f43f016bf08b36b2f955fb6acb158f1bf3932b  .claude/agents/iso-artist.md
    f2be8164e6329bd36093781cbd384c9a4433bf24dc82d9b8babf902ccce075d5  .claude/agents/iso-art-reviewer.md
    422ac1df46d871c9f572b1a443988cac973fca894bf17bc32618a4dcbfb781d8  .claude/agents/iso-blender.md
    fce87c0d7613b1a6fd10ecb67a4ae1b67a50c94fe9608f494d636df57f86e71d  .claude/agents/iso-code-reviewer.md
    643d32f21dd0c28d555a600618b7a6313ef4fb2c8e847de77479da74b1b6fe83  .claude/agents/iso-design-reviewer.md
    d4ea7d09ca85c46c7d6a73e4f70c636c3dcedc655ae690af8c106065cf2821de  .claude/agents/iso-engineer.md
    27b8e5b0d2f781ea237e13861830c3f336917b5f2ebededddf9f2d19b533029d  .claude/agents/iso-qa.md
    9e888c63b22ef28c710723f9d7721465d077e4606ca670a4cb0b833bd382eb6a  .claude/agents/iso-researcher.md
    4f220df2a596c71ef2bca104fa9817a54fc32cbb4dc56b890045398e7e720dc3  .claude/agents/iso-tech-auditor.md

- Sprites acceptés au lot 2 : `assets/images/village/iso/windmill/solid.nuit.{webp,json}` (Klein `w5gka4_c1`, `accepted_by: Guillaume`, H1 du 29/10).

- **Point budget du lot 2 (29/10, audit du lot 2)** : débuts 0,481 $ pour 6 stades (0,080 $ par sprite accepté) ; muscle et ailes 0,681 $ pour 11 images (0,062 $) ; lot 2 1,162 $ ; V1 1,711 $. Projection des 39 stades restants avec Klein : 2,5 à 3,2 $. La projection de L0-T07 (28 à 43 $, FLUX.2 pro) est périmée.

- **Cache disque de Glide périmé entre deux builds de test** (L4-AUD, 29/10) : expo-image passe les images de l'APK par leur id drawable, et Glide ne les distingue d'une build à l'autre que par le versionCode. Ajouter des images décale les ids ; avec `install -r` et le même versionCode (21301), un sprite affiche le bitmap d'un autre (la forge montrait la tour du moulin). Avant de croire une capture après un ajout d'images : bouton `iso-vider-cache` de dev-iso, ou monter le versionCode de la build de test. Le Fairphone de Guillaume, qui reçoit des .perf par-dessus, est exposé.

- **Un worklet qui appelle une fonction sans `"worklet"` fait planter l'app en release** (L5-T05, 30/10) : « Tried to synchronously call a Remote Function » dès le premier rendu. jest ne le voit pas, le mock de Reanimated exécute tout sur le fil JS. Toute fonction appelée depuis un `useAnimatedStyle` ou une réaction doit porter la directive, même si elle sert aussi en JS.
