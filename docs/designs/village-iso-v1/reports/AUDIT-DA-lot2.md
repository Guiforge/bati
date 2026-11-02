# AUDIT-DA lot 2 : l'eau et le bord de l'île (défauts 3, 17, 18, 40)

## Ce qui dessinait les deux bords (trouvé avant de coder)
Tout vient de `Tuile` dans `components/village/iso/IsoCarteDemo.tsx`, pas de `Monde.tsx` ni de `lisiere.ts` (qui ne posent que des arbres) :
- les cellules du rang 1 (`bordsDe`, solVarie.ts) étaient dessinées en `blob(..., 0.82)` au lieu d'un losange, et une « lisière » `blob(..., 1.1)` en `isoForetSol` à 60 % débordait dessous (le halo jaune-vert, défaut 18) ;
- les plaques de pelouse (`plaques`, `blob` jusqu'à 1,1 cellule, trait de 8) et l'ombre de bord (`sombres`) dépassaient du losange : ce sont les lobes aux paliers 1 et 6 (17). Au palier 12 l'île est un grand losange plein, d'où le liseré plat.

## Ce qui change
- `components/village/iso/bord.ts` (nouveau, pur, testé) : `bordDe(cases, vu)` rend les chemins d'un bord unique : losanges exacts (pelouse et masque), encre sur chaque côté exposé, berge en épaisseur de 9 dp (terre sur pierre, face droite et face gauche) sous les côtés tournés vers le joueur, reflets (traits clairs hachés par cellule, sans hasard) sous le front. Défauts 17 et 40 (même berge et reflets pour tous les paliers).
- `IsoCarteDemo.tsx`, `Tuile` seulement : pelouse en losanges, lisière supprimée (18), plaques et ombre de bord rognées par un `ClipPath` `clipRule="nonzero"`, berge et encre dessinées ; `RuisseauDessine` : trait d'encre sur l'eau. Lignes touchées : l'import `bordDe`, le début de `Tuile` (`eau: Ceau`, `dedansTerre`, `bord`), les `Defs`, le bloc entre « The bank » et « The plots before the streets », et `RuisseauDessine`. Aucune autre ligne des fichiers à auteur inconnu.
- `riviere.ts` (3) : demi-largeur 0,16 à 0,20 cellule, balancement 0,28 à 0,25 (le test garde l'eau dans sa colonne), berge plus marquée (0,4 et 0,75).
- Couleurs : aucune nouvelle (isoTerre, isoTerreSombre, isoCliff, isoCliffShadow, isoEauNuitCoeur, isoInk).
- Pas de nœud animé ni de bitmap en plus : 8 chemins SVG statiques par tuile de sol, redessinés à la croissance.

## Checks
- `npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : 56 suites, 615 tests verts (dont `__tests__/iso-bord.test.ts`, `iso-riviere`).
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre. `npx biome check --error-on-warnings` sur bord.ts, riviere.ts, IsoCarteDemo.tsx, iso-bord.test.ts : propre.

## Limites
- Rien vu à l'écran (pas d'émulateur pour moi) : à capturer par `qa` aux paliers 1, 6, 12, nuit et jour, zoom mini et départ.
- (3) la largeur est en dp de carte (tuiles statiques) : au zoom mini 0,3 elle fait 6 à 7 px, pas une largeur d'écran constante ; l'encre et la berge sont là pour la lire. Si insuffisant, élargir `DEMI` ou passer à un dessin au zoom.
- (40) lu comme « l'eau teal autour de l'île » : c'est le fond du monde (Monde.tsx), laissé tel quel ; l'île y gagne berge et reflets. Si le défaut visait autre chose, à redire.
- La berge de 9 dp sous le sommet bas du palier 12 peut être rognée par le bas de la dernière tuile (les tuiles s'arrêtent à `HAUTEUR`, carteDemo.ts `tuiles`, non touché) : à vérifier en capture.
- La lavis de jour ne couvre pas la berge.

## Correction du chef : contour organique (remplace « losanges exacts » ci-dessus)
- `bord.ts` : chaque côté exposé d'une case est plié vers l'extérieur en deux points (1,5 à `BOSSE` = 6 dp, hachage de la case et du côté, sans hasard). Les coins restent fixes, les côtés se rejoignent. Jamais vers l'intérieur : aucune case n'est rognée. Même dessin à tous les paliers, une case garde son contour quand l'île grandit. Trait d'encre net, pas de flou, pas de halo. La pelouse (`dedansTerre`) ajoute les bosses ; plaques et ombre de bord sont rognées au contour (`ilot`) ; la berge (terre, pierre, encre du bas) suit le contour ; reflets inchangés.
- Risque de la berge du bas au palier 12 : réel (mesuré : l'île y touche exactement y 0 et 480, x 0 et 960). Les tuiles s'arrêtaient à `HAUTEUR`. Correction : `tuiles()` de `carteDemo.ts` (fichier à auteur inconnu) : une constante `DEBORD = 12` et `+ DEBORD` dans le `h` de la ligne `rects.push`, plafonné par `pas + 1` donc toujours sous 1024 px. Le test `iso-dev-screen` « tiles cover the map » (le mien) tolère ces 12 dp en bas de la dernière rangée. Le haut et les côtés de l'île au palier 12 restent au bord de la carte : les bosses près des sommets haut, gauche et droit y sont rognées (peu visible, les coins sont fixes).
- Tests : `iso-bord.test.ts` (bords déterministes, pliés vers l'extérieur de 1 à BOSSE dp seulement, pas un losange, toutes les cases dans le masque aux paliers 1, 6, 12, berge du bas contenue dans la dernière rangée de tuiles).
- Checks : jest `iso-` et `village-scene` 56 suites, 617 tests verts ; `tsc` via heavy.sh propre ; biome propre sur bord.ts, riviere.ts, IsoCarteDemo.tsx, carteDemo.ts, iso-bord.test.ts, iso-dev-screen.test.tsx.

## Tour 2 : contour en avancées lisses (remplace les plis de 1,5 à 6 dp)
- `bord.ts` : sur chaque ligne de côtés exposés, des avancées de 1 à 3 cases (pièces posées depuis l'indice 0, donc stables quand l'île grandit) et de 10 à 24 dp (`BOSSE_MIN`, `BOSSE`), en lobes `sin(pi u)^0.6` échantillonnés en 8 points par côté, nuls à leurs extrémités, jamais vers l'intérieur. Une avancée est rognée à la série de côtés exposés qui la contient, les côtés d'une même avancée se raccordent. Hachage de la ligne et de la position, aucun hasard. Terre, berge et encre suivent (`coteLisse` remplace `coteOrganique`). Encre en `strokeLinejoin="round"` (IsoCarteDemo, `Tuile`, une ligne).
- `carteDemo.ts` : `DEBORD` 12 vers 36 (berge sous une avancée de 24 dp). `iso-dev-screen.test.tsx` : tolérance 12 vers 36.
- Tests `iso-bord.test.ts` : déterminisme, 9x9 points par case dans le masque (paliers 1, 6, 12), amplitude (lobe de 10 dp exact, contour d'au moins 7 dp hors des losanges), aucune suite de segments sur un axe iso de plus de 2 cases.
- Checks : `npx jest iso- village-scene` 56 suites, 621 tests verts ; `heavy.sh npx tsc --noEmit` propre ; biome propre sur les fichiers touchés.
- Limites : rien vu à l'écran (à capturer par `qa`, paliers 1, 6, 12, jour et nuit). Aux quatre sommets du palier 12 qui touchent le bord de la carte, le début d'une avancée peut être rogné de quelques dp. Les coins entre avancées sont des pointes arrondies par le joint d'encre, pas des courbes. Une avancée voisine d'un coin rentrant peut recouvrir un peu de terre déjà dessinée, sans effet visible (même herbe).
