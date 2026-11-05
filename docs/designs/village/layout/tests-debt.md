# Disposition : dette de tests

- `iso-layout`: coins des 11 bâtiments, 4 sections de rempart retirées, grille 29x29, règle d'espacement des ombres autour des cases déplacées.
- `iso-lisiere`: le générateur relit une grille agrandie et ne redonne plus `isoLisiere.json`, non régénéré.
- `iso-rues`: la sortie ouest `[0, 10]` n'est plus une rue (plot de la ferme), les chemins de l'ouest sont neufs.
- `iso-sol-varie`, `iso-riviere`, `iso-motifs`, `iso-route-sud`, `iso-a7-nuit-ouverture`: grilles `TAILLE x TAILLE` construites à la main, les cases négatives y manquent, comptes de cases changés.
- `iso-animaux`, `iso-lanterne`, `iso-pieces`: poule et lanterne déplacées (`[1, 12]`, `[7, 6]`), ombres de pièces près de cases changées.
- `iso-marcheurs-*`, `iso-focal-b1`, `iso-veilleuses`: cadrage et chemins comptés sur l'ancienne carte et les anciens coins.
- `iso-effets`, `iso-tap`, `iso-mouvement`: bâtiments à 1,25 fois leur rectangle, positions en dp attendues à l'ancienne échelle.
- `iso-profondeur-ordre`: vert, `isoOrdre.json` régénéré (UPDATE_ORDRE=1, 135 éléments).

## Design track L4/L5 (04/11)

No test was run. Known to touch tests: none found by reading; `IsoCarteDemo` gains an optional `haut` prop and `Accessoire` an optional `decalage` (the cat). `check.js` gate `props` is new: any caller that parses the "GATE FAILED" line sees a new key.

## L12 a L14 (05/11)

- `iso-accessoires`, `iso-pieces`, `iso-animaux`: accessoires deplaces avec les batiments, pont en deux images (jour, nuit), cle `eau/canal_pont.jour.webp`.
- `iso-layout`: mannequin en [7, 0], `paliers` regeneres par `scripts/layout/paliers.py` (paliers 1 a 12, quartiers, chemins retenus).
- `iso-perf-compteur` et le cliquet de taille d'images : une image de pont de plus (18 a 28 Ko).
- Aucun test lance.

- `iso-marcheurs-*`, `iso-habitants`: plus aucune case de lieu le long du rempart (`casesDuLieu("castle_wall")` vide) et sans les cases `[17, 10]` et `[12, 15]` pour `porte`.
- `iso-pieces`, `iso-eau`: le pont a une image jour (`eau/canal_pont.jour.webp`) choisie par la lumiere ; figurines `farmer_face` et `herbalist_face` : ancre y 736 et 729.
- `iso-accessoires`: huit accessoires retires, cinq deplaces.

## Tests named by the code review (05/11), none run, none fixed

The grid starts at gx = gy = -9 (`DEBUT`), keys are `cle` (isoLayout.ts), every cell is `CASES`. A test that counts `TAILLE * TAILLE` cells, keys by `gy * TAILLE + gx` or treats 0 and `TAILLE - 1` as the grid's edge reads only the old 20 x 20 map; replacement everywhere: `CASES`, `cle`, `DEBUT`, `dansLaGrille` from `@/components/village/iso/isoLayout`.

- `iso-layout.test.ts:54` (all cells), `:146` (own `cle`), `:165` (the edge of the grid is `DEBUT` and `TAILLE - 1`, not 0), `:248` (cells of a plot are `dansLaGrille`, negative ones are valid). Also the corners of the 11 moved buildings and the removed wall sections.
- `iso-rues.test.ts:24` (all cells: `CASES`) and the west exit `[0, 10]`, now a plot cell.
- `iso-sol-varie.test.ts:17` (`CASES`), `:93`, `:101`, `:152`, `:162`, `:172` (keys: use `cle`; `bordsDe` is indexed by `cle`, so `[2]` and `[TAILLE + 2]` are other cells now).
- `iso-motifs.test.tsx:13`, `iso-route-sud.test.tsx:47`, `iso-a7-nuit-ouverture.test.tsx:47` (the set of every cell: keys of `CASES` through `cle`).
- `iso-focal-b1.test.tsx:88` (`vus.add(cle([gx, gy]))`, and the frame counts the grown island).
- `iso-maquettes.test.ts`: the image count (164 now 165: the bridge's day image `eau/canal_pont.jour.webp`), the demo's stage rule (`etapes` table, not the grid) and the anchors test (`farmer_face` 736 and `herbalist_face` 729). The generator keeps the new anchors and the `.jour` key (checked by running `UPDATE_ISO_MAQUETTES=1`: the entries carry `anchor: [384,736]`, `[384,729]` and the `eau/canal_pont.jour.webp` block); it orders and formats the index differently from the committed files, so its output was not kept.
- `iso-lisiere`: the generator reads a grid with negative cells and the lisiere JSON was regenerated (see `paliers.md`); the test compares both.
