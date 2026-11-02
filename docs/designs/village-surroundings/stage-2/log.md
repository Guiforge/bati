# Journal de l'étape 2

- Boucle 1, 01/11 : sol peint du palier 12, 4 variantes FLUX 3 Image depuis le masque de `stage-1/loop-2`. Porte ratée, 7/10 au mieux (`loop-1/gate.md`) : emprises et désordre peints en cultures, sous-bois peint en arbres, bords en escalier. 0,192 $.
- Réponses de Guillaume : sol nu sous la forêt, GO pour la boucle 2 avec les deux correctifs.
- Boucle 2, 01/11 : masques `stage-1/loop-3`, aplats adoucis, emprises en terre battue, désordre en herbe piétinée. Porte ratée, 7/10 (`loop-2/gate.md`) : plus de marches, mais l'anneau de désordre devient des rangées de culture. 0,192 $.
- Boucle 3, 01/11 : désordre peint en pré, emprises arrondies, lignes au sol interdites. Porte ratée, 7/10 (`loop-3/gate.md`). Sol retenu : **v2**. 0,192 $.
- Limite de 3 boucles atteinte : arrêt, point de contrôle de Guillaume.
- Décision de Guillaume : « terrain seul ». Boucle 4 accordée, vert du pré ajouté à la palette de la bible.
- Boucle 4, 01/11 : terrain seul (pré, cœur usé, rivière, sous-bois, bordure), composite avec les chemins du code et les sprites. **Porte passée, 8/10, terrain retenu v1** (`loop-4/gate.md`). 0,192 $.
- Arrêt au point de contrôle de l'étape 2.
- Boucle 5, 01/11 (après l'étape 5, tête 4c890fa8) : terrain refait sur la disposition du jour, sur tout ce que la caméra peut montrer (1656 × 2152 dp), à 3 px par dp ; FLUX peint la bande visible en 3 × 3 tuiles fondues, la bordure est faite en code ; 12 tuiles de l'app de même taille. Porte 8/10 (`loop-5/gate.md`). 2,39 $ (dont 1,30 $ d'essais rejetés).

Rejouer la boucle 5 (depuis la racine du dépôt) :
```
bun docs/designs/village-surroundings/stage-1/stub_rn.mjs <cache>/dump.js && bun <cache>/dump.js > <cache>/monde.json
python3 -I docs/designs/village-surroundings/stage-1/masques.py <cache>/monde.json <cache>/masques
python3 -I docs/designs/village-surroundings/stage-2/terrain5.py aplats
python3 -I docs/designs/village-surroundings/stage-2/terrain5.py assemble      # après heros et tuiles v1
python3 -I docs/designs/village-surroundings/stage-2/composite5.py <cache>/monde.json <cache>/alentours.json docs/designs/village-surroundings/stage-2/loop-5
```
`<cache>` = `~/.cache/bati-art-loop/iso/surroundings/stage2/loop-5` ; `alentours.json` vient de `stage-5/stub.mjs` puis `dump5.js`.
