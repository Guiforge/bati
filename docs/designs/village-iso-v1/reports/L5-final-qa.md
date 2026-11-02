# L5-final-qa : captures finales du lot 5

Date : 2026-10-30. Émulateur emulator-5554. Source : cba2f90f, aucun code modifié, aucun commit. Pas de mesure de perf.
Note : au lancement, l'état git montrait déjà des modifications de `__tests__/iso-*.test.tsx` qui ne sont pas de moi.
Preuves : `docs/designs/village-iso-v1/evidence/L5-final/` (aucune vidéo gardée, chaque fichier sous 1,2 Mo).

## Méthode
`.perf` neuf (`build.log`, BUILD SUCCESSFUL en 1m11), démons arrêtés, `install -r` Success. `iso-vider-cache` (onglet Village), force-stop, `am start` sur bati://dev-iso. Le recadrage (`-recadre`) coupe sous la barre de débogage : y=264 dans l'onglet, y=1150 en Carte seule (1140 au zoom). Vagues : film `screenrecord` 1080x2400 pris pendant un toucher à vide, images extraites à 4 i/s ; le mouvement démarre à 2,0 s dans le film (le toucher), donc +2 s, +6 s et +10 s = images à 4,0, 8,0 et 12,0 s du film (écart d'environ 0,25 s). Les films ne sont pas gardés.

## Fichiers (chaque capture : `-brut.png` 1080x2400 et `-recadre.png`)
- a) `a-village-repos-brut.png`, `a-village-repos-recadre.png` : onglet Village, palier 1, 27 s après l'ouverture du mode, au repos.
- b) `b-village-vague-02s-*`, `b-village-vague-06s-*`, `b-village-vague-10s-*` : onglet Village pendant une vague, 2, 6 et 10 s après le toucher (lucioles cyan visibles près du canal sur la 06 s).
- c) `c-carte12-cadrage-repos-*` : Carte seule, palier 12, Tous debout oui, Cadrer, 30 s de repos ; `c-carte12-cadrage-vague-*` : même cadrage, 2 s après un toucher, pendant la vague.
- d) `d-zoom-max-place-*` : palier 12, 12 appuis sur +, la place (tente, feu, villageois rouge, rat gris en haut à droite, fontaine) ; `d-zoom-max-forge-*` : même zoom après un glissé vers la gauche, la forge (braise, enclume, cheminée).
- e) `e-carte3-cadrage-*` : Carte seule, palier 3 (10 terrains), Tous debout non, cadrage.
- `avant-apres.jpg` (1528x1550, 0,2 Mo) : `evidence/L4-AUD/village-recadre.png` à gauche, `a-village-repos-recadre.png` à droite, légendées.
- `repos-village-gfx.txt`, `repos-carte-gfx.txt`, `build.log`.

## Repos
Onglet Village (27 s après l'ouverture du mode, reset gfxinfo, 10 s) : Total frames rendered 0, Janky 0. Carte seule (environ 35 s après le dernier toucher) : 0 et 0.

## Réserves
- Les images de la vague sont à environ 0,25 s près du délai demandé.
- Au cadrage palier 12 les villageois font quelques pixels, comme déjà noté ; ils se lisent au zoom max.
- Une première capture de « repos » faite par erreur sur la Carte seule palier 1 (l'app rouvre dans le dernier mode) a été refaite en onglet Village ; seule la bonne est gardée.
- Émulateur seulement.
