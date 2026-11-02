# T44 tour 1, point 1: règles de génération des quartiers

Fichiers neufs : `components/village/iso/quartiers.ts`, `__tests__/iso-quartiers.test.ts`. Aucun fichier existant modifié.

## Règles
- `construire({ palier, montres, graine })` donne `Construction[]` : case, famille (artisans, entraînement, calme, rempart), genre (maison, échoppe, atelier, rempart), taille 1 ou 2, palier de naissance, bâtiment d'ancrage.
- Un plan complet est calculé une fois par graine (palier par palier, glouton), puis filtré par l'état : palier atteint et bâtiment d'ancrage montré. Monotone par construction.
- Cases : herbe seulement (le décor, l'eau, les rues sont exclus par le sol), hors emprise de tout bâtiment, hors chemin d'accès, hors sentiers (segments porte -> rue), hors place (Chebyshev <= 2 du feu).
- Maisons : case voisine d'une rue, à 5 cases au plus de l'emprise du bâtiment de métier le plus proche (déjà là à ce palier) ; la famille vient du métier (forge, armurerie, carrière, ferme, grange, moulin = artisans ; tente, mannequin, tir à l'arc, arène, tour de guet, muraille, antre = entraînement ; druide, mage, observatoire, puits, fontaine, hall = calme).
- Rempart : cases d'herbe au bord de l'île du palier (voisine d'une case non encore montrée), choisies au plus loin des sections déjà posées ; 0 aux paliers 1-2, 12 au palier 12. Une section posée reste, devenue muraille intérieure quand l'île grandit.
- Taille : une pièce est une case ; `taille` 2 = dessinée plus grande, si la pièce est née il y a 3 paliers (2 pour le rempart) et que son ancre n'est pas au stade `rough`. Ne baisse jamais.
- Cibles : 6 / 25 / 50 aux paliers 1 / 6 / 12 (courbe `TOTAL`).
- Vocation : illisible dans le code iso (rien ne la nomme sous `components/village/iso/`), donc non prise en compte ; la graine est la seule entrée libre. À brancher quand elle existera.

## Tests (`__tests__/iso-quartiers.test.ts`, 7)
Déterminisme ; aucun recul (famille gardée, taille jamais en baisse) sur les 12 paliers et 4 graines ; montée de stade sans rétrécissement ; aucune collision (herbe, hors emprises, une pièce par case) ; case dans l'île du palier ; rempart au bord à sa naissance ; densité palier 1 (4-8), 6 (20-30), 12 (42-58).

## Commandes
- `npx jest __tests__/iso-quartiers` : 7/7.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre. `npx biome check --write` sur les 2 fichiers : propre (un `biome-ignore` justifié sur `plan`, complexité).
- `scripts/iso/team/heavy.sh rtk proxy npx jest iso- village-scene ...` : `Test Suites: 3 failed, 78 passed, 81 total`, `Tests: 8 failed, 835 passed`. Les 3 (iso-village, iso-effets, iso-ciel, 73-120 s chacune) sont lentes sous charge ; relancées seules, iso-ciel et iso-effets passent (36/36). iso-village non relancée seule, aucun fichier existant n'a changé.

## Reste (après feu vert)
Rendu en blocs de couleur, interrupteur dev « Quartiers : off / blocs », relevé des comptes de perf au palier 12 jour et nuit.

## Tour 1 suite : rendu en blocs (après feu vert)

**Vocation** : `rg -n "vocation" src components db app` ne trouve rien d'utile (seulement `src/licenses.json` et mon commentaire). Aucun signal de pratique (types de séances, répartition course/vélo/poids du corps) n'est calculé et exposé à la carte iso, donc je n'ai rien ajouté à `construire`. Il faudrait le calculer côté `db/village.ts` (à côté de ce qui dérive les bâtiments du journal) : une part par pratique sur les séances du journal, passée à `IsoVillage` en prop facultative, puis en entrée facultative de `construire` pour pondérer les familles (entraînement pour le poids du corps, une famille « relais et bornes » pour un coureur).

**Rendu** (dev seulement, off par défaut) :
- `quartiers.ts` : `QuartiersContext` (faux par défaut, rien ne le fournit dans l'onglet) et `blocD()` (losange plat levé + deux faces avant du prisme bas, taille 2 = 1,6x plus haut).
- `IsoCarteDemo.tsx` (fichier existant, pas `IsoVillage.tsx`) : import ; `COULEUR_FAMILLE` et `blocsDeTuile()` avant `Tuile` ; prop `quartiers` de `Tuile` ; dans `Tuile`, après les lueurs et avant le lavis de jour, 3 `Path` par famille présente (côtés, ombre des côtés, dessus) dans le Svg existant de la tuile ; dans `IsoCarte`, `useContext(QuartiersContext)` + `construire(...)` (graine 0) + `quartiers={quartiers}`. Aucun nœud animé, opacité de vue, image ni Svg nouveau. Limite : un bloc proche du bord de tuile peut être coupé par le clip de la tuile (maquette).
- `constants/rawColors.ts` : `isoQuartierArtisans` (ocre), `Entrainement` (brique), `Calme` (mousse), `Rempart` (gris pierre), `Cote` (ombre rgba). Pas de violet.
- `app/dev-iso.tsx` : bouton `iso-quartiers` « Quartiers : off / blocs » (état local, off), fournisseur du contexte ; `biome-ignore` de complexité sur `DevIso` (17 > 15).
- Cliquet : `iso-perf-compteur.test.tsx` non modifié, vert.

**Perf, palier 12, tous les bâtiments** (`__tests__/iso-quartiers-compte.test.tsx`, comptes hôte jest, sans appareil ; le décompte varie de quelques dizaines d'un rendu à l'autre à cause de la vie : oiseaux, villageois) :
- jour : off 906 nœuds / 90 Svg / 374 formes / 176 images / 37 opacités ; blocs 934 / 90 / 398 / 176 / 37 (+28 nœuds, +24 formes).
- nuit : off 950-1001 nœuds / 94-100 Svg / 407-436 formes ; blocs 974 / 94 / 431 (+24 formes), 176 images, 35-40 opacités.
- Surcoût : environ +24 `Path` et ~+25 nœuds, aucun Svg, image ni opacité de plus. Sous le plafond de 1024 nœuds du cliquet. Mesure en ms (gfxinfo) : à faire par la qa sur la build `.perf`.
- Le test ajouté ne garde que : images identiques, nœuds <= 1100, opacités <= 55 (le reste varie avec la vie).

**Commandes** : `tsc` propre ; `biome check --write` sur mes fichiers propre ; `heavy.sh rtk proxy npx jest iso- village-scene ...` : `Test Suites: 1 failed, 81 passed, 82 total` (iso-habitants-vue, 28 s, sous charge ; relancée seule : 10/10). `iso-village` relancée seule : passe (59/59 avec le test de comptes) : le doute de timeout est levé, les 3 échecs précédents étaient de la charge.
