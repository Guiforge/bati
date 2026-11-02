# Carte BC, le coin de beauté (autour de la porte, palier 6)

- **Sujet** : un petit coin amené à la qualité finale, avant de l'étendre : kit de décals, pieds et bouquets d'arbres, lisière, un segment de route, une vignette de champ, arbres de premier plan retirés.
- **Défauts** : G01 (localement), G02, G03, G04, G05, G06, G07 (route à la porte).
- **Piliers** : P1, P2, P4 si un champ ou un hameau montre la vocation.
- **Fichiers** : `components/village/iso/Alentours.tsx`, `alentours.ts`, `constants/isoPoc.ts`, `champs.ts`, `RuesDessinees.tsx`, `monde.ts`, `assets/images/village/iso/{sol,foret,accessoires,champs}/`, nouveau `scripts/iso/cuire_sol.py` (le cuiseur, écrit le manifeste de tampons).
- **Plafond FLUX** : 12 $, chaque lot sous 10 $. La session s'arrête à 20 $ (déjà 2,03 $), R1 compris.
- **Écran cible** : `targets/p06-jour/cible.png`, choix A de Guillaume. Il sert de référence, jamais d'asset et jamais d'image envoyée à FLUX comme texture.
- **Tours max** : 5. Fin par le checkpoint de Guillaume, verrouillage à sa réponse.

## Crops dorés (tuiles, palier 6, jour)

| Nom | Tuiles i0,j0,i1,j1 | Ce qu'on regarde |
| --- | --- | --- |
| `porte` | 11,12,23,24 | la porte, le mur, la route qui arrive |
| `route` | 14,20,30,40 | le segment de route, ses bords cassés |
| `champ` | 18,22,32,36 | la vignette de champ et sa vie |
| `lisiere` | -12,-12,6,8 | forêt mêlée, tailles, pieds |
| `pieds` | -4,0,6,10 | un bouquet, ses racines, ses tufts |
| `coin-bas` | 30,30,50,50 | l'ancien emplacement des arbres fixes |

Plus l'écran complet p06-jour, au format téléphone, à côté de l'écran cible choisi.

## Crops KEEP

`fenetres` (nuit), `villageois`, renard, feu de camp.
