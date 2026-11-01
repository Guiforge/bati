# Inventaire de la page Village et proposition en tours

Date : 31/10/2026. Auteur : chercheur. Aucun fichier de code touché. Lu sur la branche `feat/village-iso-v1`, worktree `iso`.

Décision de Guillaume (mot pour mot) : « la page villegae sera quasiment que l'ISO / les images vont disparaitre et tous dans être le villeage les trofet ete les batiemtn ».

## La réponse en une phrase

Avec `INTEGRATION = true`, la page est déjà « carte + début de liste » (la carte prend l'écran moins 96 dp, `components/village/iso/disposition.ts`) ; la rendre « quasiment que l'iso » veut dire sortir la liste du défilement sans perdre ce qu'elle porte (accès TalkBack, prochain bâtiment, palier, saisons, pierres), et les « trophées » n'ont pour l'instant aucun support de données ni d'art sur cette page, hors blason, saisons et pierres.

## Constats qui changent le cadrage

1. **Le drapeau est éteint.** `constants/isoPoc.ts:29` : `INTEGRATION = false`. Ce que les joueurs voient aujourd'hui est la page peinte (tier_N.webp). Tout ce qui suit sur la carte iso est derrière le drapeau. `VillageScene` prend un paramètre `iso = INTEGRATION`, seul `app/dev-iso.tsx` le surcharge.
2. **Les images de palier ne disparaissent pas du dépôt.** `getVillageTierAsset` sert aussi `FirstFire` (onboarding), `ChronicleCard` (partage), `TonightList`, `BigFeastView`. Seul leur usage dans l'onglet Village part.
3. **Aucun trophée de boss n'est affiché sur la page**, ni aujourd'hui ni avant : `db/village.ts:903-908` dit « The village no longer carries a trophy wall ». `getBossBanners()` ne nourrit plus que le niveau des bâtiments légendaires (antre, arène) ; plus aucun écran ne le lit directement. Les succès vivent dans le Journal (`app/(tabs)/journal/achievements.tsx`), les boss vaincus dans `journal/bosses.tsx` (autre source, `KillReport`).
4. **Code mort déjà là** : la branche `kind: "boss"` de `VillageSelection` et `BossDetail` (VillageDetailSheet.tsx:554) n'est ouverte par personne (grep `kind: "boss"` : aucun appelant, ni dans `components/` ni dans les tests). La doc `village-bulle.md:76` parle d'une « Journal boss card » qui n'existe plus.
5. **Contrainte V1 écrite** : CRITERES-V1 critère 9, « la carte a son équivalent en liste pour TalkBack ». `IsoVillage` se cache lui-même (`importantForAccessibility="no-hide-descendants"`, `accessibilityElementsHidden`, IsoVillage.tsx:485-487) et `village-bulle.md:122` dit « the village list stays its door ». Supprimer la liste sans remplaçant casse ce critère.
6. **Bloquant de fusion déjà noté** (DECISIONS 28/10, 29/10 lignes 55, 61, 75) : les maquettes (96 webp, 2,05 Mo, index 570 Ko) doivent quitter le bundle avant toute fusion dans main ou tout tag. Passer `INTEGRATION` à vrai pour tous ne lève pas ce point.

## Ce que la page est aujourd'hui, élément par élément

Route : `app/(tabs)/village.tsx` (pose `useScreenGuide("guide_village")`, `useAmbientVisit("village_visit")`, `useCueOwner("village")`, un `View testID="village-touch-watch"` qui capte les touchers pour faire partir le villageois flottant) autour de `components/village/VillageScene.tsx` (1229 lignes). Source des données : un seul chargement au focus, `getVillageScene()` + `getCrest()` + `getRecentFeeds()`, puis `loadVillageYears()` ; en drapeau allumé aussi `getClaimedStages()`. Références ci-dessous : « iso ? » = existe déjà dans la carte.

Légende des places : **carte** = objet posé sur la carte ; **bulle** = au toucher, dans la bulle BD ; **bandeau** = petite ligne au-dessus ou au bas de la carte ; **retiré**.

### A. Images (les « images qui disparaissent »)

| # | Élément | Montre / source | Dans l'iso ? | Place proposée | Perdu, pour qui |
| --- | --- | --- | --- | --- | --- |
| A1 | Peinture de palier plein cadre, avec parallaxe et zoom d'appui (`getVillageTierAsset(scene.tier)`, 12 images) | Le palier atteint, depuis le niveau du héros (`getVillageTier`) | Oui, la carte entière la remplace (paliers 1 à 12 par la croissance de l'île) | Retiré (branche `!iso`) | Rien d'informatif : le palier se lit à la taille de l'île. Perd la « peinture » de F-Droid tant que le drapeau est éteint |
| A2 | Visionneuse plein écran de la peinture (`VillageSceneViewer`, toucher sur la peinture) | Même image en `contain`, braises, titre | Sans objet : en iso la carte n'a pas de `onPress` vers le visionneur (inatteignable) | Retiré | Personne en iso. Le zoom de la carte (pincer, double toucher) fait le même travail |
| A3 | Braises (`VillageEmbers`) sur la peinture | Décor, nombre selon le palier | Oui : feux, fumée, lucioles, oiseaux de la carte | Retiré | Rien. `Ember` reste utilisé par `FirstFire` |
| A4 | Vignettes de bâtiment (`BuildingThumb`, `getBuildingIconAsset`) dans la liste, « Prochain à monter », « Depuis ta dernière quête » | Icône rough/solid/grand selon le rang, silhouette si non construit | Oui, les sprites peints de la carte (sauf bâtiments non peints, encore en maquette) | Retiré avec la liste ; dans une liste de repli (voir tour 1) elles peuvent rester ou partir | Lisibilité de la liste pour qui la lit à l'œil ; pas pour TalkBack |
| A5 | Icône dans la fiche (`BuildingDetail`, 54 px) et dans la carte de récompense (`VillageReward`, 46 et 62 px, avant puis après) | Le bâtiment avant et après | La bulle n'a pas d'icône ; la carte montre la croissance, avec la légende `village.iso.legende.<code>.<stade>` | Récompense : voir C6 | Le « avant puis après » écrit (voir C6) |
| A6 | Sprite du muscle dominant (`getSportSpriteAsset`, 20 px) devant la ligne « Focus » | Muscle le plus travaillé sur 7 jours (`getDominantSportOverlay`) | Non | Bandeau (texte seul) ou retiré, à décider | Une information de plus que la carte ne dit pas ; peu critique |

### B. Titre et en-tête (posés sur la carte, au-dessus des scrims)

| # | Élément | Montre / source | Dans l'iso ? | Place proposée | Perdu, pour qui |
| --- | --- | --- | --- | --- | --- |
| B1 | Nom du village (Récitatif en iso, `TitleText` sinon), `useUserStore.villageName` ou nom du palier | Identité | Non (c'est la surcouche du titre) | Bandeau en haut, garde la cartouche BD | Rien tant qu'il reste |
| B2 | Écu (`Crest`, 56 dp, bouton) ou « yeux » (`Glow`) avant la 8e séance | Animal gardien, `getCrest()`. Appui : `CrestSheet` (pourquoi, choisir, devise) | Oui en partie : la **statue du totem** (Statue.tsx, T25) ouvre la même `CrestSheet` (`blason.onPress`) ; bois, pierre, bronze, or selon le stade ; socle vide avant la révélation | Garder l'écu dans le bandeau (porte d'accès 44 dp) et la statue sur la place. Étendard de la place : **retiré par Guillaume le 30/10 (« trop gros »)**, ne pas le remettre | Si l'écu part du titre : l'action TalkBack « crest » de `village-hero-room` disparaît (c'est sa seule voie hors statue, la carte étant cachée) |
| B3 | Puce de flamme (`FlameFlicker` + « Flamme X · N jours ») | Série en cours (`getStreakInfo`), `scene.flame`, `scene.streakDays` | Non : le feu de camp est décoratif, il ne reflète pas la série. La flamme est aussi sur Accueil (`app/(tabs)/index.tsx`) | Bandeau (garder la puce) ; plus tard : le feu de camp qui change de taille selon le niveau de flamme (art à faire) | Pour qui vient voir sa série : un seul endroit à l'écran |
| B4 | Ligne de niveau « Palier · Niveau N · Titre » | `scene.level`, `scene.title`, `TIER_NAMES` | Non | Bandeau | Le titre de rang |
| B5 | Phrase de l'animal (`useCrestLine`) | « Ton gardien est l'ours… », « dès maintenant » le jour de la révélation | Non (la statue a un libellé `village.iso.statue`, pas cette phrase) | Bulle de la statue (ou ligne du bandeau tronquée) | La seule phrase qui nomme l'animal en clair, ce que lit TalkBack |
| B6 | Ligne « Focus » (muscle dominant) | Voir A6 | Non | Bandeau ou retiré | Voir A6 |
| B7 | `village-hero-room` (iso portrait) : un nœud accessible, rôle `header`, qui dit tout le titre (`titleSpeech`) et porte l'action « crest » | Lecture TalkBack dans l'ordre | Spécifique iso | Conserver tel quel dans le bandeau | Sans lui, TalkBack lit le titre en dernier (Fabric ordonne par zIndex) |
| B8 | Scrims haut et bas, scrim de barre d'état épinglé (`village-status-scrim`) | Lisibilité | Spécifique | Garder le haut ; le bas suit le bandeau | Contraste de l'heure et du titre |
| B9 | Villageois flottant (`VillagerCameo` + `guide_village`, `village_visit`) | Phrase ambiante / guide, une fois | Non : les villageois de la carte parlent par leur bulle (T26), c'est un autre système | Garder, décision à part | Le guide de l'onglet (« tutoriel brûlé » si la bande manque, voir `villageCameoBand`) |

### C. Le panneau qui défile (tout est sous la carte)

| # | Élément | Montre / source | Dans l'iso ? | Place proposée | Perdu, pour qui |
| --- | --- | --- | --- | --- | --- |
| C1 | `VillageTier` : « Prochain palier », « Palier N sur 12 », barre d'XP, état « village terminé » | `getTierProgress(level, totalXp)`, `isVillageComplete`, `openDeeds` | Non | Bandeau (une ligne + barre fine) ; l'état terminé en bulle de la salle des héros | La seule réponse à « quand l'île grandit ? » |
| C2 | `village-evolved` (phrase quand mouvement réduit joue aucune scène) | `evolved`, `AccessibilityInfo.announceForAccessibility` | Oui par l'annonce | Garder : la phrase vit dans le bandeau | Mouvement réduit : sans elle, rien ne dit qu'un bâtiment a évolué |
| C3 | `village-claim-all` « Tout faire évoluer » (2 bâtiments prêts ou plus) | `claimable()` sur les rangs réclamés | Non : la carte pose un marteau par bâtiment (`Reclame`) ; « tout » n'existe que dans la page | Bandeau, apparaît seulement s'il y a au moins 2 prêts | Le geste groupé |
| C4 | `NextToRise` (`village-next`) : prochain bâtiment (ou « rien n'a encore monté » le jour 1), barre, lien « Faire une quête » (`router.push`) | `pickNextToRise(buildings, feeds)`, `getRecentFeeds()` | Non. C'est **le seul appel à l'action vers une quête** de la page | Bandeau d'une ligne avec le nom du bâtiment ; appui : sa bulle (`onBulle`). Le lien de quête existe déjà dans `BuildingFacts` (bulle) | La route « je vois quoi entraîner » depuis le village. Accueil a ses propres appels |
| C5 | `Families` : liste de tous les bâtiments par famille, rang, barre de pips, « Monté » (`risen`), « prêt », barre dorée pour le suivant, pierres du rempart dans la ligne | `groupFamilies`, `VillageBuilding[]` | Oui côté œil (la carte), **non côté TalkBack** : c'est la porte unique de chaque bâtiment (action `evolve` incluse) | **Liste de repli** : voir tour 1. Garder `testID="village-building-row"` | Pour TalkBack : tout. Pour Maestro : `village-sheet-check.yaml` |
| C6 | `SinceLastQuest` (`village-changes`) + `VillageReward` (carte dorée qui monte 1,3 s après l'arrivée, 5 s, avant → après) | `parseGrown(grown)` écrit par la victoire ; `GrownBuilding[]` | Oui : la croissance se joue sur la carte (caméra, chantier, fondu, légende `village.iso.legende…`) ; la carte dorée **se joue encore par-dessus** (aucun garde `iso` autour des minuteurs, VillageScene.tsx:447-473) | Retirer la carte dorée et la liste ; la légende de la carte porte le fait ; ajouter une annonce TalkBack de la phrase si mouvement réduit (déjà fait pour l'évolution, pas pour l'arrivée) | « De quel rang à quel rang » écrit, pour TalkBack et mouvement réduit |
| C7 | `Banners` (`village-seasons`) : une rangée par année de village, une bannière par saison, couleur de l'animal, fait de la saison | `loadVillageYears` → `villageYearsRules.seasons()`, `names` | Non | Trophée : bulle de la **salle des héros** (déjà dédiée aux exploits) ou du **rempart** ; tour 3 : bannières de tissu sur le rempart | Les saisons vécues (visibles seulement après la première saison finie) |
| C8 | Pierres du rempart (`Stones`, dans la fiche du `castle_wall`) | Un niveau par pierre dès 21, records et Âges | Déjà dans la **bulle** du rempart (`BuildingFacts` reçoit `years`) | Garder dans la bulle ; tour 3 : pierres posées sur le mur | Rien |
| C9 | Météo du jour (`VILLAGE_FLAVOUR`, 1 phrase, graine jour × palier) | Ambiance | Non | Retirer ou la mettre dans la bulle du feu de camp ; ce n'est pas une donnée | Une phrase d'ambiance |
| C10 | Pied de page « Rien n'est géré ici. Chaque niveau vient d'une séance. » | Règle de la feuille de route | Non | Bandeau du tiroir, en bas | Le rappel de la règle (utile à la première visite) |

### D. Feuilles, états et chargement

| # | Élément | Montre / source | Dans l'iso ? | Place proposée | Perdu, pour qui |
| --- | --- | --- | --- | --- | --- |
| D1 | `VillageDetailSheet` (Tamagui Sheet) : fiche d'un bâtiment (pilote, barre, jalon, séances récentes, histoires terminées, pierres, « Faire évoluer », liens de quête, « Entrer dans la forge ») | `BuildingFacts` + `loadExtra` | Oui : la **bulle** (`ContenuBatiment`) réutilise `BuildingFacts` et `BuildingLevel` (un seul auteur des chiffres). La bulle bascule en feuille (`FeuilleBulle`) au-delà de 130 % de texte | Garder la bulle ; la feuille Tamagui ne sert plus que si une liste de repli ouvre des fiches (alors la réutiliser, ne pas en écrire une troisième) | `forge-screen.test` monte la feuille ; Maestro `village-sheet-check` |
| D2 | `CrestSheet` (pourquoi, choisir un animal, devise) | `getCrest`, `crestCoat`, `crestMotto` | Oui (ouvert par la statue) | Garder tel quel | Rien |
| D3 | Squelette de chargement (même boîte que l'en-tête), état d'erreur « Le village est hors d'atteinte » + Réessayer | `loadFailed` | Identique | Garder | Rien |
| D4 | Bulle BD (`Bulle`, `ContenuVillageois`) sur bâtiment et villageois | `bulle.ts`, `Ouverture` | Oui | Garder, c'est la cible | Rien |
| D5 | Rotation autorisée sur cet onglet seulement (`expo-screen-orientation`), paysage : carte à gauche (60 %), titre et liste à droite (choix 4B) | `dispositionIso` | Spécifique iso | Paysage : le tiroir devient la colonne de droite | Si la liste part : le paysage n'a plus de colonne, la carte peut prendre tout l'écran |

## Les trophées, un par un

| Trophée | Existe où aujourd'hui | Dans l'iso ? | Proposition |
| --- | --- | --- | --- |
| Succès (achievements, `db/achievements.ts`) | Journal seulement. Jamais dans le village depuis la suppression du mur de trophées | Non | Hors village (rester au Journal) tant que Guillaume ne dit pas lesquels sont des objets. Un succès n'a ni lieu ni art |
| Statues de boss (dragon, golem, etc., `getBossBanners`) | Nulle part à l'écran ; `getBossAsset(…, "defeated")` existe (peintures du monstre tombé) ; antre du dragon et arène augmentent avec les boss | Non. L'antre du dragon est un bâtiment, pas une statue | Tour 3 : au pied de l'antre ou de l'arène, une statue (art neuf) par boss vaincu, plafonnée ; bulle = nom, date de victoire, nombre de victoires (reprendre `BossDetail`, qui est mort aujourd'hui) |
| Écu | Titre de l'onglet (56 dp) | Pas comme tel ; sa couleur teint les bannières de bâtiments légendaires (`tissuBlason`) | Garder dans le bandeau |
| Étendard du blason | Était sur la place (T24) | **Retiré le 30/10 (« trop gros »)** | Ne pas le remettre ; si Guillaume le veut, une version petite au sommet de la statue |
| Bannières de bâtiments (Fierte, `fierte.ts`) | Carte uniquement : dernier stade légendaire, trois au plus (salle des héros, rempart d'abord), couleur de l'animal | Oui | Garder ; ne pas confondre avec les bannières de **saison** de `Banners` (C7), qui sont des cartes sur la page |
| Animal gardien (statue) | Carte, place centrale (9,12), ouvre `CrestSheet` | Oui (T25) | Garder. Libellé `village.iso.statue` existe, la phrase `useCrestLine` manque en bulle |
| Saisons | Cartes de `Banners` sur la page, 4 par an, après la première saison finie | Non | Voir C7 |
| Flamme | Puce du titre et Accueil | Non (feu décoratif) | Voir B3 |

## Règles de Bati à tenir pour chaque proposition

- **Aucune pastille ni notification** : le marteau « prêt » est un objet de la carte avec mots (« Prêt à évoluer ») ; ne jamais ajouter de point rouge sur un bandeau ou sur le bouton de liste.
- **Aucun emplacement vide** : la statue sans écu affiche un **socle vide** avant la 8e séance (`statue.ts` VIDE_L), et `Glow` (deux yeux) dans le titre ; ce sont les deux exceptions existantes, assumées (« no animal is invented »). Ne pas ajouter de nouvelles niches de trophées vides : une statue de boss n'apparaît qu'au premier boss vaincu, une bannière de saison après la première saison finie (comme `Banners`, qui ne monte rien avant).
- **Rien ne recule** : les rangs affichés viennent de `drawnLevel(b, shownStages)` ; une carte « avant → après » doit garder `oldLevel <= newLevel`. Les bannières et statues ne se retirent jamais à l'affichage ; les pierres sont rejouées du journal (supprimer une séance reprend une pierre, déjà vrai dans `villageYearsRules`).
- **TalkBack** : la carte est cachée par construction ; une liste ou un tiroir doit rester la porte, avec les mêmes libellés (`village.claim_ready_a11y`, action `evolve`, rôle `button`). Une bulle ouverte envoie le focus sur le nom (`Bulle.tsx:126`).
- **Mouvement réduit** : la phrase `village-evolved` et son annonce doivent rester.

## Images qui partiraient et ce qui les charge

| Fichiers (`assets/images/village/…`) | Chargé par | Disparaît avec la page ? |
| --- | --- | --- |
| `tier_1.webp` à `tier_12.webp` (12) | `getVillageTierAsset` : `VillageScene` (A1), `VillageSceneViewer` (A2), mais aussi `FirstFire`, `ChronicleCard`, `TonightList`, `BigFeastView` | **Non**, à garder. Seuls 2 des 6 appelants partent |
| `sport_{abs,arms,back,chest,legs,shoulder}[_rough\|_grand].webp` (18) | `getSportSpriteAsset` (focus, A6) et repli de `getBuildingIconAsset` pour les bâtiments de muscle (ferme, carrière, forge, puits, moulin, archerie) | `getSportSpriteAsset` devient sans appelant si A6 part (à vérifier avec `npm run deadcode`) ; les fichiers restent chargés par `app/forge.tsx` (forge → sprite de `relatedMuscle`) |
| `buildings/*.webp` : 14 bâtiments × 3 stades = 42 fichiers (campfire, tent, training_dummy, wizard_tower, druid_grove, watchtower, castle_wall, armory, fountain, observatory, barn, dragon_lair, heroes_hall, champion_arena, high_road) | `getBuildingIconAsset` : `VillageLists` (A4), `VillageDetailSheet` (A5), `VillageReward` (A5), `app/forge.tsx` (mais la forge n'a pas d'entrée dans `BUILDING_ICON_ASSETS`, elle prend le sprite de muscle) | **Oui, entièrement morts** si la liste, la feuille et la carte dorée partent et si aucune liste de repli n'a de vignettes. `BUILDING_ICON_ASSETS` et ses 42 `require` sortent du bundle. À confirmer par `npm run deadcode` + `__tests__/assetMap.test.ts` (qui peut énumérer les entrées) |

Le nombre de lignes de l'inventaire ci-dessus compte 15 noms pour « 14 bâtiments » : le décompte de `assetMap.ts:335-411` donne 15 entrées (campfire, tent, training_dummy, wizard_tower, druid_grove, watchtower, castle_wall, armory, fountain, observatory, barn, dragon_lair, heroes_hall, champion_arena, high_road), donc 45 fichiers `rough/solid/grand`. Le commentaire du fichier dit « (14) » et est faux d'un. Le `Glob` ne remonte que 44 fichiers de ce dossier avant coupure à `barn.webp` : je n'ai pas pu recompter les 45 (pas de shell).

## Code qui devient mort si l'ancienne scène part (pour `npm run deadcode`)

Verdict par lecture des imports, **pas par knip** (je n'ai pas de shell, rien n'a été exécuté).

- Fichiers entiers sans autre appelant que `VillageScene` ou lui-même : `components/village/VillageSceneViewer.tsx`, `constants/villageAnchors.ts` (`VILLAGE_ANCHORS` n'est lu que `!iso`, VillageScene.tsx:427), `components/village/villageArt.ts` sauf `villageCameoBand` si le villageois flottant reste (la page l'importe), `villageHeroSlot` et `villageTitleTop` seulement par la scène.
- Dans `VillageScene.tsx` : `TitleText`, `GestureAnimatedScroll` ou `Animated.ScrollView` (selon la structure retenue), le bloc `<YStack testID="village-hero">` painting, `focus`, `hasFocus`, `REWARD_ZOOM`, `zoom`, `PARALLAX_FACTOR`, `viewerOpen`, `paintingMotion` côté peinture ; le paramètre `iso` et `INTEGRATION` (le drapeau cesse d'exister).
- `VillageEmbers` : le composant `VillageEmbers` n'a plus d'usage de production (la scène et la visionneuse partent) ; `Ember` reste (`FirstFire`). `__tests__/ambient-animations-focus.test.tsx` l'importe encore, et knip compte peut-être les tests comme points d'entrée : à lire dans `knip.json`.
- `VillageLists.tsx` : `Families`, `BuildingThumb`, `NextToRise`, `SinceLastQuest`, `VillageTier` morts si la liste part ; `QuestLink` reste (`BuildingFacts`). Le test de couleurs `colour-roles.test.ts:74` lit `VillageLists.tsx` par chaîne.
- `VillageDetailSheet.tsx` : `VillageDetailSheet` lui-même et `BuildingDetail` morts si le drapeau tombe, **`BossDetail` déjà mort aujourd'hui**. `BuildingFacts` et `BuildingLevel` restent (la bulle). Le nom du fichier mentira ; le déplacer vaut un tour à part (renommer entraîne `__tests__/helpers/villageCopy.ts` qui liste les fichiers du village).
- `VillageReward.tsx` mort si C6 est retiré.
- `Banners.tsx` et `Stones.tsx` ne sont pas morts tant qu'une bulle les monte (C7, C8).
- Constantes/ressources : `VILLAGE_FLAVOUR` (si C9 part), `getSportSpriteAsset` (si A6 part), `MUSCLE_LABELS` reste (ailleurs), clés `locales/*.json` `village.open_scene`, `close_scene`, `tap_to_close`, `reward_*`, `changes_title`, `family_*`, `foot`, `flavour` : `__tests__/built-locale-keys.test.ts` et la règle « Copy lives in locales » ne fâchent pas une clé orpheline, mais un test de clés inutilisées peut le faire (non vérifié).

## Tests et flux touchés

- **Jest** : `village-scene.test.tsx` (63 usages de testID, dont `getVillageTierAsset(4)` ligne 244), `village-header.test.tsx` (34, mock de `VillageEmbers`), `village-years-screens.test.tsx` (13, pierres et saisons par l'écran monté), `village-reward.test.tsx`, `village-sheet-back.test.tsx`, `village-detail-unlock.test.tsx`, `forge-screen.test.tsx` (monte `VillageDetailSheet`), `village-art.test.ts`, `ambient-animations-focus.test.tsx`, `villager-figure-village-only.test.ts`, `home-header.test.tsx`. Les `iso-*.test.*` ne changent pas.
- **Maestro** : `village-sheet-check.yaml` dépend de `village-building-row` et de `village-detail` (sa liste partie, il faut un appui de plus pour l'ouvrir ou le réécrire sur la bulle `iso-bulle`) ; `explore-tabs.yaml` (`village-screen`) et `audit*.yaml`, `screenshots.yaml` (`tab-village`) ne dépendent que de l'onglet. Les `iso-*.yaml` (`iso-batiments`, `iso-rotation-gestes` avec `village-(hero|map-side)`) visent déjà la carte.
- **golden-hero** : `golden-hero.test.ts` ne cite le village que dans un commentaire (ligne 22) ; `golden-hero-upgrade.test.ts` trois fois (je n'ai lu que les occurrences). Aucune proposition ci-dessous ne touche `db/`, donc rien ne bouge. Toute lecture neuve (par exemple `getBossBanners` pour des statues) reste une lecture, donc sans effet, mais un calcul changé dans `getVillageBuildings` ou `getVillageScene` ferait bouger les chiffres : liste des chiffres déplacés exigée au PR.
- **Règles du dépôt** : `noReactNativeRawText` (tout nouveau composant qui rend du texte dans un `Text` maison s'ajoute à la liste `skip`), tokens Tamagui 3 sans sigil, aucune couleur hex hors `rawColors.ts`, pas de tiret cadratin dans les chaînes lues par le joueur, copie dans `locales/*.json` seulement.

## Proposition en tours

Principe : on ne supprime une chose qu'après avoir posé son remplaçant, et chaque tour est livrable seul.

### Tour 1 : la carte prend la page, la liste devient un tiroir (plus petit changement)

- `dispositionIso` : `carteH = h` en portrait (plus de `APERCU_LISTE`). Le contenu qui défilait (C1 à C5 et C10, tel quel, dans le même ordre) passe dans **un tiroir** ouvert par un bandeau bas ; le tiroir reprend `Families`, `NextToRise`, `VillageTier`, `claim-all`, pied de page. Le bandeau est un bouton unique (44 dp ou plus), sans pastille ; il dit « Palier N · Niveau N » et le prochain bâtiment en une ligne (C1, C4). Il est **le premier nœud TalkBack** de la page (le critère 9 est tenu). Paysage : le tiroir est la colonne droite déjà existante.
- La carte de récompense (C6) reste jouée **mais seulement** si le mouvement réduit joue aucune scène ; sinon la légende de la carte suffit (garde `iso` dans les minuteurs, quatre lignes).
- On ne retire encore aucun fichier, on ne touche pas aux assets. `INTEGRATION` passe à vrai **après** la sortie des maquettes du bundle (DECISIONS 55/61/75) et la mesure Fairphone ; tant que ce n'est pas fait, le tour 1 se juge dans `dev-iso` (`iso={true}`).
- Perdu : rien d'informatif. Perd la lecture « défilement continu » de la liste.
- Ce qu'un audit visuel doit juger : (1) la page se lit-elle d'abord comme une carte ? (2) le bandeau bas est-il lisible sans masquer le bas de l'île ni la barre d'onglets ? (3) le titre en cartouche et l'écu restent-ils nets sur la carte entière, jour et nuit ? (4) à 130 % et 200 % de texte, le bandeau tient-il (une ligne coupée proprement, jamais une moitié de mot) ? (5) le tiroir ouvert garde-t-il la carte reconnaissable derrière ? (6) paysage téléphone et tablette. Plus : TalkBack du bandeau au tiroir à une bâtiment (focus, `evolve`).

### Tour 2 : retirer l'ancien, rendre l'info à la carte

- Retirer la peinture, la visionneuse, les braises, `VILLAGE_ANCHORS`, le paramètre `iso`, `INTEGRATION` (drapeau permanent), la carte dorée et `SinceLastQuest`, `BossDetail`, les vignettes `BuildingThumb`. Passer `BUILDING_ICON_ASSETS` (42 à 45 fichiers) à la suppression si le tiroir n'a plus de vignettes. Mettre à jour tests et Maestro listés ci-dessus.
- Faire entrer ce qui n'a pas de place : phrase de l'animal et « Focus » dans la bulle de la statue et du feu de camp (B5, B6) ; saisons (C7) dans la bulle de la salle des héros (reste une liste dans une bulle, pas un objet) ; météo (C9) retirée.
- Perdu : les icônes de la liste pour qui la lisait à l'œil ; la carte dorée « avant → après ».
- Ce qu'un audit visuel doit juger : la bulle de la statue et du rempart avec leur nouveau contenu (longueur, défilement, 130 %), l'absence de trou là où étaient les icônes du tiroir, que rien d'ancien ne traîne (ni la peinture au chargement, ni un fond vide au squelette).

### Tour 3 : les trophées deviennent des objets (art neuf, après arbitrage de Guillaume)

- Bannières de saison posées sur le rempart (une par saison vécue, couleur de l'animal), pierres sur le mur, statues de boss au pied de l'antre et de l'arène, flamme qui se lit sur le feu de camp. Chacun exige de l'art neuf et un budget FLUX (V1 à 6,96 $ sur 40 $ de plafond, DECISIONS 94, 95) et une règle de plafond par carte pour garder les nœuds animés sous 64 (DECISIONS 80).
- Perdu : rien ; gain de fierté (« être fier de son village », DECISIONS 83).
- Ce qu'un audit visuel doit juger : (1) un trophée se lit-il à l'échelle de la carte entière, sans zoomer ? (2) les trophées s'ajoutent-ils sans encombrer la place centrale (la statue du totem a déjà été jugée « trop grosse » pour l'étendard) ? (3) un village sans trophée est-il complet, jamais troué ? (4) une personne qui n'a vaincu aucun boss ne voit-elle aucun socle vide ? (5) le tap sur un trophée ouvre-t-il une bulle qui dit pourquoi il est là, sans pastille ?

## Ce que je n'ai pas pu vérifier

- Aucun shell : pas de `npm run deadcode`, pas de `du` sur les assets, pas de recomptage fiable des fichiers `buildings/` (44 vus avant coupure du `Glob`, 15 entrées dans `assetMap.ts`), pas d'exécution de tests ni de build.
- Les verdicts « mort » sont de la lecture d'imports ; knip peut compter les tests comme points d'entrée et en juger autrement (`knip.json` non lu).
- Je n'ai ni vu l'écran réel ni les captures : l'ordre visuel de la page en iso est lu dans `VillageScene.tsx`, pas observé.
- `golden-hero-upgrade.test.ts` : trois occurrences de « village » comptées, pas lues.
- Le contenu exact de `locales/*.json` (clés orphelines après retrait) n'a pas été balayé.
- Je n'ai pas lu `app/(tabs)/_layout.tsx` ni la mise en colonne (`colonneOnglets`), donc l'effet du tiroir sur la barre d'onglets est à vérifier.
- Le sens de « écu et étendard de T24 » : dans `DECISIONS.md`, T24 est la fiche de l'étendard du blason, retiré le 30/10, et la statue du totem est T25 ; c'est ce que j'ai retenu. `reports/L1-T24.md` parle d'une autre tâche (plan du village), sans lien.

## Sources (fichiers lus)

- `app/(tabs)/village.tsx`, `components/village/VillageScene.tsx`, `VillageLists.tsx`, `VillageDetailSheet.tsx`, `VillageReward.tsx`, `VillageSceneViewer.tsx`, `VillageEmbers.tsx` (début), `Banners.tsx`, `Stones.tsx`, `crestLine.ts`, `detailExtra.ts`, `villageArt.ts`.
- `components/village/iso/Bulle.tsx`, `IsoVillage.tsx` (lignes 355-505), `statue.ts`, `fierte.ts`, `disposition.ts`.
- `db/village.ts` (types, `getBossBanners`, `VillageScene`), `db/villageYearsRules.ts` (exports), `db/villageYears.ts` (exports), `db/crest.ts` (exports).
- `constants/isoPoc.ts`, `constants/assetMap.ts` (lignes 270-411 et 690-760), `app/forge.tsx` (usage de l'icône).
- `docs/designs/village-iso-v1/DECISIONS.md`, `reports/L1-T24.md`, `reports/L1-T21.md`, `CRITERES-V1.md` (ligne 15), `LOG.md` (extraits), `docs/design/components/village-bulle.md` (lignes 76, 122-123).
- `.maestro/` (grep `village`), `__tests__/` (grep des noms de fichiers et de `testID`).
