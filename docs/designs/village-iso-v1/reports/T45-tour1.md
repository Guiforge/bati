# T45-tour1 : la carte iso en pleine page, la liste dans un tiroir

Statut proposé : prêt pour revue
Auteur : engineer
Tour de revue : 1

## Fait
- `components/village/VillageDrawer.tsx` (nouveau) : `VillageBandeau` (bouton unique de 56 dp, testID `village-drawer-open`, rôle bouton, libellé « Ton village, palier N », une ligne, chevron, aucune pastille) et `VillageDrawer` (le `FormSheet` des Réglages, donc `Sheet.ScrollView` avec `onMoveShouldSetResponder`, `disableDrag`, retour matériel, fermeture au changement de route).
- `components/village/VillageScene.tsx`, drapeau allumé (`iso`) :
  - la carte occupe toute l'aire moins le bandeau (portrait et paysage) ; plus de `PageScroll`, plus de colonne de droite, plus de `village-hero-room`, plus de parallaxe, plus de geste de glissement sur le titre (`useTitlePan`, `GestureDetector`, `scrollGesture` supprimés) ;
  - le titre et l'écu restent sur la carte, en bas, avec leurs scrims (même géométrie qu'avant, ancrée sur le bas de la carte ; en paysage le bloc titre prend la moitié gauche) ; `importantForAccessibility="auto"` : TalkBack lit le titre tel qu'il est, sans copie cachée ;
  - ordre TalkBack : le bandeau est le premier enfant de l'arbre, la carte (qui se cache elle-même) vient après, aucun `zIndex` dans la page iso (Fabric ordonne par zIndex) ; la barre d'état épinglée n'est plus montée en iso ;
  - le contenu de l'ancienne liste est un seul `panel` (palier et barre d'XP, « Prochain à monter », « Tout faire évoluer », « Depuis ta dernière quête », bâtiments, saisons, météo, pied de page). Il est rendu dans le tiroir en iso, dans le panneau défilant sinon. Les testID sont conservés, dont `village-building-row` ;
  - une ligne qui ouvre un bâtiment, et « Tout faire évoluer » ou « Faire évoluer » lancés de la liste, ferment d'abord le tiroir (la carte montre l'effet, une seule feuille à la fois) ;
  - en mouvement réduit, la phrase `village-evolved` reste sur la page, au-dessus du bandeau (le tiroir d'où part l'évolution est fermé à ce moment-là) ;
  - **carte dorée** : `if (iso …) return` en tête de l'effet des minuteurs, donc ni la carte, ni le zoom, ni la fin de séquence. `SinceLastQuest` reste dans le tiroir. `VillageReward.tsx` lui-même est inchangé.
- `components/village/iso/disposition.ts` : `dispositionIso` rend la carte pleine (`carteW = w`, `carteH = h - HAUTEUR_BANDEAU`), `HAUTEUR_BANDEAU = 56` ; `APERCU_LISTE` et `PART_CARTE_PAYSAGE` supprimés (plus de lecteur). Ce fichier est dans `components/village/iso/` mais n'est pas dans la liste de l'autre ingénieur.
- `components/village/iso/IsoVillage.tsx` : **0 ligne touchée** (la prop `bloque` n'est simplement plus passée).
- `locales/{en,fr,de,es,ru}.json` : `village.drawer_open` (« Ton village, palier {{tier}} ») et `village.drawer_title` (« Ton village »), sans tiret cadratin.
- `.maestro/village-sheet-check.yaml` : avant chaque appui sur `village-building-row`, appui conditionnel sur `village-drawer-open` s'il est visible (drapeau éteint : rien ne change dans le flux ; allumé : il ouvre le tiroir). `village-detail` reste atteignable.
- Tests :
  - `village-scene.test.tsx` : `ready to improve` ouvre le tiroir (`renderIsoDrawer`) avant de lire la liste ; paysage plein écran ; bandeau d'abord dans l'arbre et aucun `zIndex` ; bandeau = un bouton avec le palier, liste absente tant que le tiroir est fermé ; une ligne ouvre la fiche ; titre lu en place avec l'écu bouton ; carte dorée absente en iso (attendue 1,4 s) ; titre en `box-none` ; supprimé le test du glissement du titre et le mock de `scrollTo` ; **nouveau test « flag off »** : pas de bandeau ni de tiroir, la liste dans `village-scroll`, la carte dorée joue, pas de `village-hero-room`.
  - `iso-rotation.test.ts` : nouvelles valeurs de `dispositionIso` (pleine page).
  - `villager-figure-village-only.test.ts` : l'ordre source suit `lastIndexOf("{heroLayers}")` et `{panel}` (la scène place `heroLayers` deux fois).
  - `village-header`, `village-years-screens`, `village-reward`, `village-sheet-back`, `village-detail-unlock`, `forge-screen` : vertes sans changement, car elles rendent la scène drapeau éteint (`iso` faux) ou la feuille seule ; aucune assertion modifiée ni affaiblie.

## Preuves
- `scripts/iso/team/heavy.sh rtk proxy npx jest village iso- forge --testPathIgnorePatterns=/node_modules/` : `Test Suites: 3 failed, 1 skipped, 494 passed, 497 of 498 total` ; `Tests: 5 failed, 1 skipped, 6930 passed, 6936 total`. Les 3 suites rouges ne sont pas à moi :
  - `village-copy-no-chores` (fr, es) et `village-copy-forbidden-words` (fr, de) : légendes `village.iso.legende.windmill.solid`, `castle_wall.grand`, `druid_grove.grand` (les légendes de révélation de l'autre ingénieur) ;
  - `reduced-motion` : `components/village/iso/IsoCroissance.tsx` n'utilise pas `useReducedMotion` (fichier iso hors de ma tâche).
- Après le dernier changement, relancé : `village-scene iso-perf-compteur iso-rotation villager-figure` : `Test Suites: 4 passed, 4 total`, `Tests: 78 passed, 78 total`. `iso-perf-compteur.test.tsx` vert et non modifié.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : aucune sortie d'erreur.
- `npx biome check --write` sur mes fichiers : « No fixes applied », aucune erreur.
- `scripts/iso/team/heavy.sh npm run deadcode` : seulement deux « Tag hints » préexistants (`db/bossFights.ts`, `@legacy`).

## Douteux ou non fait
- Rien n'a tourné sur un appareil : bandeau (56 dp) sur la barre d'onglets, titre sur le bas de la carte, tiroir sur la carte, TalkBack (bandeau, titre, tiroir), 130 % et 200 % de texte, tablette : à la qa. Le bandeau est à une ligne coupée par une ellipse, hauteur fixe.
- Paysage : le titre prend la moitié gauche en bas de la carte ; sur un téléphone de 330 dp de haut il peut cacher une part de l'île. À juger sur capture.
- Le bas de la carte est à 56 dp du bas de l'aire ; l'île garde sa marge basse d'un tiers du bloc titre (comme avant).
- Un tap sur une ligne ferme le tiroir et ouvre la fiche : au retour, la carte est visible, pas le tiroir. Choix à confirmer par le regard neuf.
- Pas d'annonce TalkBack à l'arrivée d'une séance en mouvement réduit (la carte dorée est partie ; `SinceLastQuest` reste dans le tiroir). À ajouter au tour 2 si voulu.
- `.maestro/audit.yaml` (appui `optional` sur `village-building-row`) saute simplement l'étape drapeau allumé ; non modifié.
- `village-copy-*` et `reduced-motion` rouges : voir plus haut, hors périmètre.
- Les images `tier_N.webp` et le code de la scène peinte restent (drapeau éteint = inchangé) ; le retrait est le tour 2.

## Pour la suite
- Le tiroir est `FormSheet` ; `panel` est la seule source de la liste (une seule édition pour les deux modes).
- Pour la qa : ouvrir via `bati://dev-iso` (mode village) ou en allumant `INTEGRATION` ; testID `village-drawer-open`, `village-drawer`, `village-building-row`, `village-hero` / `village-map-side`.
