# FIN-CAR tour 1 : rapport

Code seul, 0 $, aucun Svg ni taille d'image de plus, rien d'animé, aucune opacité de vue, pas de useMemo/useCallback. Pas de commit.

## Ce qui a changé
1. **Bord** (`bord.ts`, `Tuile`) : berge (4 Path), reflets, encre du contour et traits de fin de tronçon supprimés ; `Bord` ne rend plus que `ilot` (clip) et `bosses`. `PORTEE_BORD` 55 -> 32. Les bosses gardent `isoPre` (l'herbe continue) et reçoivent le niveau de crépuscule le plus externe (0,4), qui prolonge la rampe herbe, crépuscule 3-2-1, bosses, sol du monde. `isoForetSol` `#10302B` -> `#243A30` (égal à `isoPre` voilé à 40 % d'encre, au vert-bleu près). Ombre de contact : `OMBRE_ILE` 14 -> 6 et `isoSocleShadow` 0,4 -> 0,22.
2. **Mer** : `COLONNE_RIVE`, `X_MER`, `RIVE_L`, `ECART_RIVE`, `mer()`, `RIVES`/`Rive`, le genre `rive`, les deux View `iso-monde-mer(-lavis)`, `rive_a/b.webp`, l'entrée `rives` de `tuiles.json`, `rive()` de `generer.py`, `mer`/`merClair` d'isoSpec.json supprimés. `etendue` inchangé : plus rien à atteindre aux bornes de `limitesDe`.
3. **Anneaux** (`monde.ts`) : `eloignement` reçoit un grain par cellule (hash, ±1,3 cellule), qui s'éteint vers l'intérieur (un décalage vers l'extérieur ne joue qu'à plus de 2 cellules du village, pour garder « pas de bois dense à côté de la clairière »). `CaseMonde` porte `rang`. Mesure : plus longue ligne droite de frontière (même paire d'anneaux, 3 cases ou plus alignées) : 5 cases avant, 3 après, au zoom mini du jeu (0,394) et à 0,3 (dev-iso). Les tuiles elles-mêmes (leur bord droit) restent des carrés : c'est le tour 2.
4. **Chemins** (`rues.ts` `SORTIES`, `RuesDessinees`) : la longue rue (rangée gy = 10) sort par ses deux bouts (gx = 0 et 19), serpente 8 cellules, bifurque à 3,5 cellules en une seconde piste, s'amincit jusqu'à un fil, s'arrête avant le bord de la carte. Dessinés dans le Path « sentiers » déjà monté (0 nœud neuf), visibles dès que la dernière case de rue est sur l'île.
5. **Champs et haies** (`champs.ts`, `Tuile`) : blocs 3x2 cases hors de l'île, à 3 cases au plus de sa lisière, pas sur une case montrée, à 1,15 cellule au moins d'un chemin qui sort, dans la boîte de la carte ; deux verts et un ocre sombre (`isoChampA/B/Ocre`), sillons encrés (1 Path), haies en ruban à renflements (1 Path, trait d'encre fin). 5 Path par tuile, 0 Svg. Couleurs sans violet (test). Le fichier `clairiere.webp` reste (repeint au tour 2) ; les champs recouvrent la clairière au contact.

## Comptes (palier 12, IsoVillage 411x520, test iso-perf-compteur copié sans modification pour logger)
| | noeuds | svg | formes | images | tailles | opacités |
|---|---|---|---|---|---|---|
| nuit avant | 950 | 94 | 407 | 176 | 19 | 35 |
| nuit après | 949 | 94 | 407 | 176 | 19 | 35 |
| jour après | 904 | 90 | 374 | 176 | 19 | 36 |
Jour avant non relevé (relevé après les changements seulement). Formes : -6 Path (berge, reflets, encre) +6 (3 teintes de champ, sillons, haies, crépuscule des bosses). `tailles` reste 19 : aucune rive n'était dans le cadre du test. `iso-perf-compteur.test.tsx` vert, non modifié.

## Tests
- `iso-bord` (bord sans berge/reflets/encre, bosses), `iso-camera-ile` (portée du bord ajustée à 32, clés de `Bord`), `iso-monde` (plus de mer ni de rive, aucun export `MER`/`RIVE`, frontières d'anneaux), `iso-dev-screen` (aucun `iso-monde-mer|rive`, au palier 12 comme au 1), `iso-t43-quickwins` (test de la mer retiré), `iso-champs` (nouveau : champs au contact aux paliers 1, 6, 12, hors île, hors routes, couleurs sans violet ; deux sorties, bifurcation, dans la boîte).
- `heavy.sh rtk proxy npx jest iso-` : **Test Suites: 86 passed, 86 total**, Tests: 820 passed. `tsc --noEmit` vert, `biome check` vert sur mes fichiers, `npm run deadcode` sans nouvelle entrée.
- `jest iso- village-scene` : village-scene (20 tests, « Ready to evolve » introuvable) et un test d'`iso-rotation`/`iso-motifs` ont échoué à des moments différents. iso-motifs était à moi (corrigé : les sorties ne s'affichent pas dans une tuile sans cases). village-scene et iso-rotation touchent `VillageScene.tsx`, `VillageDrawer.tsx` (non suivi) et `disposition.ts`, modifiés par quelqu'un d'autre en ce moment : je ne les ai pas touchés.

## À vérifier par qa (build requise)
- Capture à zoom 0,6, nuit et jour : le losange se devine-t-il encore ? La rampe du bord (herbe -> bosses -> sol) est-elle douce ? C'est une lecture à l'œil, pas un test.
- Les champs recouvrent le papier peint de la clairière : raccord avec les tuiles forêt voisines (coupure droite possible au bord d'une tuile de 320 dp).
- Les deux rues qui sortent au palier 12 et à un palier où la dernière case de rue n'est pas encore montrée (pas de sortie : attendu).
- Chemins et champs ne vont qu'aussi loin que la boîte de la carte (960x480, les Svg de tuile) : les coins haut-gauche et bas-droit en donnent environ 8 cellules ; au-delà, c'est la forêt peinte.

## Risques
- Rampe de teinte lue à l'œil, valeurs calculées (voile d'encre), pas encore vues sur appareil.
- L'ombre de contact et les couleurs de champ sont des valeurs de départ à ajuster après capture.
