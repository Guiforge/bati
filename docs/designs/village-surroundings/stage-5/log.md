# Journal de l'étape 5

- 01/11, tête dd7cceb0 : les alentours peints entrent dans l'app, chaque couche derrière son drapeau (`constants/isoPoc.ts` `ALENTOURS`, tout éteint). Capture : `bati://dev-iso?peint=tout` ou `?peint=sol,foret,decor,animaux,plan`. Aucun appel FLUX.
- Images : `assets.py` (une toile par famille : sol, forêt, accessoires, animaux ; nuit cuite pour ce qui se pose au-dessus de l'étalonnage). Planches de contrôle sans appareil : `palier1.webp`, `palier6.webp`, `palier12.webp` (`dump_alentours.mjs` puis `composite.py`).
- Recalage du terrain sur la nouvelle disposition : rivière juste (IoU 0,998 contre le masque refait sur dd7cceb0), sous-bois juste (0,992) ; le cœur usé est l'empreinte floutée de l'ancien village (IoU 0,64 avec la nouvelle), la place y tombe. Le terrain couvre 696 x 781 dp : au palier 12 l'île finie (960 dp) et le cadrage d'ouverture (zoom 0,478) le dépassent à gauche et à droite ; ces coins sont sur le fond uni du ton du bord fondu, chemins par-dessus. À repeindre sur la nouvelle disposition, plus large et en 2K.

Rejouer (depuis la racine du dépôt) :
```
python3 -I docs/designs/village-surroundings/stage-5/assets.py
bun docs/designs/village-surroundings/stage-1/stub_rn.mjs <dossier>/dump.js && bun <dossier>/dump.js > <dossier>/monde.json
bun docs/designs/village-surroundings/stage-5/stub.mjs <dossier>/dump5.js && bun <dossier>/dump5.js > <dossier>/alentours.json
python3 -I docs/designs/village-surroundings/stage-5/composite.py <dossier>/monde.json <dossier>/alentours.json docs/designs/village-surroundings/stage-5
```
- 01/11, tête 4c890fa8 : le terrain est remplacé par celui de l'étape 2, boucle 5 (12 tuiles `sol/terrain_RC.webp`, 3 px par dp, sur 1656 × 2152 dp) ; `alentours.ts` `TERRAIN`, `TUILES_TERRAIN`, `TUILE_TERRAIN`. `assets.py` et `composite.py` ci-dessus lisent encore l'ancien `sol/terrain.webp` : pour le terrain, voir `stage-2/terrain5.py` et `stage-2/composite5.py`.
