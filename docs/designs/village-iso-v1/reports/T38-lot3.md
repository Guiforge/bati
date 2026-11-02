# T38 lot 3 (engineer)

## 1. T21, images d'ancienne mise en page à la rotation : réduit, pas fermé
- Cause code corrigée : tant que l'`onLayout` de l'aire n'est pas revenu (et au premier rendu), la carte était posée dans la fenêtre entière, plus haute que l'aire réelle (barre d'onglets) : deuxième mise en page, donc le « saut » à 2,50 s. Elle est posée maintenant dans `aireDepuisFenetre(largeur, hauteur, HAUTEUR_BARRE, inset bas)` (disposition.ts, VillageScene.tsx), la même que celle que l'aire mesurée confirme.
- Non corrigeable en JS : les 4 à 5 images entre le redimensionnement natif et l'événement de dimensions (JS) montrent l'ancienne mise en page avec les anciennes tailles. Les cacher demande un `useFrameCallback` qui mesure la racine à chaque image (horloge qui tourne toujours, contraire à « rien ne tourne au repos », non mesuré). **Décision à Guillaume** : accepter ~0,13 s, ou payer ce coût ; je ne l'ai pas écrit.
- Test : `iso-rotation` (aireDepuisFenetre).

## 2. Bulle coupée au bord : corrigé
- Le placement pur est sain (nouveau balayage de toutes les ancres, portrait et paysage avec encoches, `iso-bulle`). La cause réelle : la taille mesurée n'était pas refaite à la rotation, et la hauteur max change avec la fenêtre ; une bulle de 100 dp posée en paysage puis grandie en portrait, ou l'inverse, dépasse le bord. `Bulle.tsx` : la mesure porte la taille de fenêtre, le cadre se remonte et se remesure quand elle change. À 200 % (> 130 %) c'est la feuille, qui ne dépend pas du placement.
- Test : `iso-bulle-vue` (rotation à bulle ouverte).

## 3. Constat 14 « ruines » : de la peinture, passe à T36
Aucun code. Sur les captures (portrait-jour-p6-cadre, p12-cadre) ce sont les colonnes grises brisées en haut au centre de l'île : le sprite de `druid_grove` (« cercle de pierres levées gravées, mangé de lierre », isoSpec.json), qui se lit comme des ruines. Les stades `rough` des autres bâtiments (étais, gravats) y ajoutent. Non peint.

## 4. Constat 17, croissance de démo : ne se reproduit pas, fermé
`__tests__/iso-croissance-duree.test.tsx` : le choix de `croissanceDemo` a toujours un chantier ; `onCroissanceFinie` n'est pas appelé à 2950 ms et l'est à 3010 ms (CROISSANCE_MS + CHANTIER_MS = 3000). Seul le mouvement réduit termine à 0 ms, voulu (si la démo semblait courte sur l'émulateur : vérifier que le mouvement réduit est coupé).

## Commandes
- `rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Test Suites: 63 passed, 63 total`, 692 tests.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : sans erreur. `biome check --write --error-on-warnings` sur les 7 fichiers touchés : propre.

## À vérifier par qa
- Rotation portrait/paysage sur l'onglet : plus de second saut après la mise en page ; compter les images d'ancienne mise en page restantes (attendu : encore quelques-unes).
- Bulle ouverte puis rotation : elle se remesure, reste entière ; ancres près des quatre bords, portrait et paysage, 100 % ; 200 % : feuille.
- Démo « grandir » : scène de 3 s, mouvement réduit coupé.
