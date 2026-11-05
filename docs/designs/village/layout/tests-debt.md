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
