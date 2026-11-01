# Carte S-night

- **Sujet** : la nuit garde les valeurs du jour. Le sol n'est plus un aplat violet, champs et chemins ne brillent plus et ne deviennent plus des grilles sombres.
- **Défauts** : G15. Règle d'art 5.
- **Piliers** : P1 (la capture de nuit donne envie de l'envoyer), P2 (on ouvre le village le soir pour le regarder).
- **Fichiers** : `components/village/iso/AmbianceCarte.tsx`, `scripts/iso/nuit_alentours.py`, les `*.nuit.webp` du sol, des champs et des chemins, `constants/rawColors.ts` (nuit seulement), `scripts/iso/loupe_checks.py` (mesure `night-values`).
- **Coût** : 0 $, aucun FLUX. Plafond FLUX : 0 $.
- **Tours max** : 4.

## Crops dorés (tuiles, caméra du dump, à la taille du téléphone)

Palier 6 et palier 12, `ambiance=nuit`, `fige=1`, `peint=tout`.

| Nom | Prise | Tuiles i0,j0,i1,j1 | Ce qu'on regarde |
| --- | --- | --- | --- |
| `sol-sud` | p06-nuit | 8,20,30,42 | sol, route, aplats |
| `champs-nord` | p06-nuit | -4,-4,10,10 | champs et haies près de la rivière |
| `village` | p06-nuit | 2,0,20,20 | cœur du village |
| `champs-est` | p12-nuit | 4,16,18,26 | champs du sud, les seuls visibles à p12 (déplacé le 01/11 : l'ancien cadre était hors écran) |
| `route-porte` | p12-nuit | 12,12,26,26 | route et rempart |
| `lisiere` | p12-nuit | -14,-14,6,6 | forêt contre le pré |

## Crops KEEP

- `fenetres` : p12-forge-nuit, fenêtres de nuit.
- `feu` : p06-nuit, tuiles 9,8,15,14, lueur du feu de camp.
- `villageois` : p06-nuit, tuiles 8,8,14,14.
