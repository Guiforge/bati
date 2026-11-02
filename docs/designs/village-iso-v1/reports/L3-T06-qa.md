# L3-T06 QA : niveaux de détail au zoom (appareil, build .perf)

Auteur : qa. Build `.perf` neuve (`--rerun`, `BUILD SUCCESSFUL in 1m 10s`), `install -r` Success, force-stop du `.dev`. Preuves : `docs/designs/village-iso-v1/evidence/L3-T06/`.

## Verdict : non vérifiable sur l'émulateur tel que l'écran de test est câblé. Aucun des 5 points n'a pu être mesuré au palier 1 ou 2.

Deux blocages, tous deux constatés :

1. **La carte seule (`bati://dev-iso`, mode « Carte seule », palier 12, boutons `+`/`-`/`iso-zoom-06`) ne fournit pas `PalierContext`.** Seul `IsoVillage` le fait (`IsoVillage.tsx:141`) ; `app/dev-iso.tsx` monte `IsoCarteDemo` sans lui. Elle reste donc toujours au palier 0, même au zoom max (~2,4 après 8 appuis sur `+`). La preuve : la mémoire n'y bouge pas pendant 9 appuis sur `+` (Native Heap 75 392 -> 75 636 kB, TOTAL PSS 187 734 -> 188 517 kB, `new-mem-montee.txt`), alors que le palier haut devait ajouter plusieurs dizaines de Mo ; la netteté est identique à celle de la build précédente (ci-dessous).
2. **Le mode Village (`IsoVillage`, le seul qui active les paliers) n'offre que des zooms de palier 0 sans pincement.** `iso-grandir` cadre à `ZOOM_CAPTURE` = 0,6, le double-tap recadre, et il n'y a pas de bouton de zoom. Le pincement n'est pas simulable : `input` n'a pas de multitouch et `sendevent` sur `/dev/input/event2` répond « Permission denied » (`pinch1.png`, le geste n'a rien fait). De plus le village du héros n'a que 8 bâtiments (palier 1 de village), pas le village complet du palier 12 : le budget de 57 Mo ne peut pas être mesuré en mode Village.

## Ce que j'ai pu établir
- **Aucune régression visible au palier 0.** La carte au zoom max de la build précédente (`base-zoommax.png`, 8 appuis sur `+`) et celle de la build T06 (`new-zoommax-8.png`) ont la même netteté (écart-type du laplacien sur le feu de camp : 10,7 contre 10,7, `comparaison-feu-avant-apres.png`). En mode Village après `iso-grandir` : image identique pixel pour pixel à la même capture de la build précédente (`L3-T05/tour3/rejeu-fin.png` contre `village-grandir-repos.png`, écart moyen 0,0, 0 pixel > 40).
- **Mémoire mode Village (8 bâtiments, zoom ≤ 0,6)** : départ Native Heap 101 540 kB / TOTAL PSS 223 802 kB ; après `iso-grandir` 104 980 / 235 874 ; après double-tap (retour) 103 512 / 228 314 (`village-mem-1-depart.txt`, `-2-zoome.txt`, `-3-retour.txt`). Les écarts viennent de l'animation de croissance, pas des paliers. Graphics vaut 0 sur l'émulateur (non significatif). Pic pendant un pincement : non mesuré (pas de pincement).
- **Repos 10 s en mode Village** : 0 image rendue, 0 janky (`repos-village-gfxinfo.txt`).
- **Glissé rapide en mode Village au zoom 0,6 (palier 0, pour mémoire)** : 58 images, 5 janky (8,62 %), p90 16 ms (`glisse-palier0-gfxinfo.txt`). Pas de mesure au zoom max.
- **Clignotement au franchissement de 1,0 et 1,75** (pincement ou double-tap) : non testé ; le double-tap ne fait que recadrer au zoom de départ, il ne franchit aucun palier.
- **Défilement au zoom max, flou au bord, durée** : non testé.

## Tour 2 (paliers branchés dans la carte seule)
Build `.perf` neuve (`--rerun`, 1m10s), `install -r` Success, force-stop du `.dev`, `bati://dev-iso`, carte seule, palier 12, Cadrer puis `+` (162,780) ; attente > 300 ms avant chaque mesure. Preuves : `evidence/L3-T06/tour2/`. Vidéos (cache) : `~/.cache/bati-art-loop/iso/evidence/L3-T06-tour2-franchissements.mp4`, `...-glisse.mp4`.

1. **Netteté : KO, aucun gain mesurable.** Au zoom max (x9, `x9.png`) face à la capture de la build précédente (`base-zoommax.png`, zoom légèrement différent), après mise à la même échelle (agrandir l'ancienne de 1,16) : laplacien 10,2 (ancienne) contre 10,05 (nouvelle) ; à l'échelle native de l'ancienne : 12,61 contre 12,53 (`comparaison-feu-avant-apres.png`). Le gros plan est visuellement identique. Réserve : les deux zooms ne sont pas strictement égaux (x8 trop petit, x9 trop grand par rapport à l'ancienne).
2. **Mémoire : n'augmente presque pas, et ne redescend pas.** Native Heap / TOTAL PSS (kB, `mem-0-depart.txt`, `mem-montee.txt`, `mem-9-retour.txt`) : départ 76 712 / 183 971 ; x1 75 452 / 189 490 ; x5 (détail 1) 76 056 / 190 806 ; x7 (détail 2) 76 296 / 191 795 ; x9 (max) 76 740 / 192 168 ; retour au départ par `-` : 79 876 / 198 620. Soit +0,6 Mo de Native Heap du départ au zoom max (attendu ~+40 Mo) et +3,2 Mo de plus après le retour (ne redescend pas). Pic au franchissement de 1,75 (x6 -> x7, 100 échantillons, ~60 ms d'intervalle, `pic-meminfo-boucle.txt`) : Native Heap 78 216 -> 78 532 (max 78 532), TOTAL PSS max 195 752 (la première valeur), ensuite ~195,1 à 195,6 Mo : pas de pic. Les appuis ont été faits sans pause entre séries, donc le retour (+14,6 Mo PSS) peut aussi venir d'autres allocations (caches Glide) et non du décodage ; je ne sais pas départager.
3. **Clignotement : non vu.** Film (screenrecord, 30 i/s extraits) des appuis x5, x6, x7 : chaque appui saute en une image d'un état à l'autre, sans image intermédiaire vide (45 -> 46, 91 -> 92, 128 -> 129 : écarts > 340 000 px, aucun état de transition). 19 images (0,6 s) après l'appui x7 le détail change (image 147 -> 148) : 4 pixels de différence (écart moyen 0,02, `film-c147.png`, `film-c148.png`) : pas de flash, mais pas non plus de changement visible, ce qui rejoint le point 1. Limite : screenrecord n'encode que les changements d'écran, une image isolée pourrait m'échapper à 30 i/s. Pincement et double-tap : non testés (pas de pincement ; le double-tap recadre, ne franchit pas 1,0).
4. **Défilement au zoom max (swipe 90 ms, inertie ~0,5 s) :** 30 images, 1 janky (3,33 %), p90 16 ms (`glisse-zoommax-gfxinfo.txt`). Pas de flou au bord relevé : netteté (laplacien sur la carte) stable de l'image 30 à 45, 8,3 -> 7,4 (le contenu change, bord de l'île à l'image 45, `glisse-c045.png`). Durée d'un éventuel flou : non mesurable, aucun flou observé.
5. **Repos 10 s :** 0 image rendue, 0 janky, 0 deadline ratée (`repos-gfxinfo.txt`).

Constat global : la mémoire, la netteté et l'image du film indiquent que le décodage plus grand n'est pas appliqué (ou pas visible) au palier 1 et 2 sur cette build, y compris au zoom max. À vérifier par le chef : un re-décodage effectif d'une `Image` expo-image avec `{uri, width, height}` sur une ressource empaquetée en release (`.perf`) ; je ne peux pas le lire depuis l'extérieur de l'application.

## Tour 3 (tailles décodées par les journaux Glide) : BLOQUÉ
Demande : activer `log.tag.Downsampler`, `log.tag.Glide` (et `log.tag.Engine`) par `setprop`. La commande `scripts/iso/team/emu-adb.sh shell setprop log.tag.Downsampler VERBOSE` est refusée par la garde : « emu-adb.sh: the emulator is Guillaume's to start, stop and reconfigure. Tell the lead. » (code 64). Je ne contourne pas la garde. Rien n'a été changé sur l'émulateur ; `getprop log.tag.Downsampler` est vide.

Ce que j'ai pu lire sans toucher aux propriétés : `logcat -d` ne contient aucune ligne `Downsampler` ni `Glide` (les 627 lignes qui correspondent à « Engine » viennent de `BugleRcsEngine`, un autre paquet). Les niveaux par défaut ne journalisent pas les décodages : aucune taille source, demandée ou décodée, ni configuration de bitmap (HARDWARE ou non) n'a pu être relevée. L'hypothèse « bitmap HARDWARE, donc absent de Native Heap » reste ni confirmée ni infirmée.

À décider par le chef ou Guillaume : autoriser ces `setprop` sur l'émulateur (ou les poser depuis sa session), ou une build de test qui journalise la taille passée à `Image` (pas faisable par moi, pas de code).

## Tour 4 (reloadAsync au changement de détail, sonde `iso-charge-*`)
Build `.perf` neuve (`--rerun`, 1m10s), `install -r` Success, force-stop du `.dev`, carte seule, palier 12, Cadrer. Texte de la sonde lu par uiautomator ~0,5 à 1 s après chaque étape, avec Native Heap / TOTAL PSS en kB (`evidence/L3-T06/tour4/etapes.txt`). Le nombre `n` est cumulé depuis le lancement ; « src » vaut 896x1344 (pas 1280x1600).

| Étape | forge (taille, n) | moulin (taille, n) | Native Heap | TOTAL PSS |
|---|---|---|---|---|
| départ | 294x441, n=1 | 294x441, n=1 | 76 844 | 187 563 |
| x5 (détail 1) | 294x441, n=2 | 294x441, n=2 | 83 620 | 207 513 |
| x6 | 294x441, n=2 | 294x441, n=2 | 83 588 | 201 615 |
| x7 (détail 2) | 515x772, n=3 | 515x772, n=3 | 116 448 | 241 765 |
| x7 + 1 s | 515x772, n=3 | 515x772, n=3 | 116 452 | 235 207 |
| x9 (max) | 515x772, n=3 | 294x441, n=5 | 124 984 | 247 014 |
| Cadrer (0,5 s) | 647x970, n=4 | 647x970, n=6 | 145 664 | 270 892 |
| Cadrer (7 s) | 647x970, n=4 | 647x970, n=6 | 145 292 | 265 180 |
| (autre passe) 3x `-`, puis 6x `-` | 515x772, n=8 | 515x772, n=10 | 132 788 puis 132 596 | 258 341 puis 255 761 |

1. **Rechargement : OK, il a lieu.** n monte à chaque changement de détail (x5 : 1->2 ; x7 : 2->3).
2. **Tailles : pas celles annoncées.** À x5 (détail 1) le bitmap reste 294x441 (attendu 735x919) bien que n monte ; à x7 il vaut 515x772 (attendu 924x1155) : environ 57 % de la source 896x1344 et non 82 %. Hors zone (moulin à x9) il revient à 294x441.
3. **Mémoire : KO.** Native Heap monte de 76,8 à 125 Mo (+48 Mo, ~+58 Mo de PSS) au zoom max, et **ne redescend pas** : après Cadrer il vaut 145 Mo (le bitmap est même plus gros, 647x970, alors que la vue est revenue au zoom de départ), après 9 appuis sur `-` 132,6 Mo avec 515x772. Le décodage reste donc grand au zoom de départ (attendu : retour à 294x441 et ~77 Mo). C'est le contraire de « n=3 + taille de départ » demandé : Cadrer n'a pas déclenché de retour au palier 0.
4. **Netteté au zoom max : OK, nettement meilleure.** Laplacien sur le feu de camp, même échelle que la build précédente : 10,2 (avant) contre 19,87 (maintenant), et 12,61 contre 25,86 à l'échelle native (`comparaison-feu-avant-apres.png`) : briques, joints et bois visiblement plus nets.
5. **Clignotement au rechargement : non vu.** Film 30 i/s autour de l'appui x7 (`planche-x7-45-56.png`, vidéo en cache `L3-T06-tour4-x7.mp4`) : saut de zoom à l'image 46, le détail passe à n=6 / 515x772 à l'image ~55 (0,3 s plus tard), les sprites restent affichés sur toutes les images, aucune image vide ni disparition. Limite : screenrecord ne code que les changements d'écran.
6. **Repos 10 s : OK.** 0 image rendue, 0 janky (`repos-gfxinfo.txt`).

Résumé : le rechargement et la netteté marchent (gain net au zoom max), mais le niveau de détail ne redescend pas au retour au zoom de départ, et la mémoire reste à ~132 à 145 Mo (au lieu de ~77). Détail 1 ne change pas la taille du bitmap. Non testé : pincement, défilement au zoom max sur cette build, le palier haut sur d'autres sprites que forge et moulin.

## Tour 5 (prop posée dans le même lot que la source)
Build `.perf` neuve (`--rerun`, 1m10s), `install -r` Success, force-stop du `.dev`, carte seule, palier 12. Sonde lue ~0,8 s après chaque étape (`evidence/L3-T06/tour5/etapes.txt`). Native Heap / TOTAL PSS en kB.

| Étape | forge | moulin | Native Heap / TOTAL PSS |
|---|---|---|---|
| départ | 294x441 n=1 | 294x441 n=1 | 76 740 / 185 426 |
| x5 | 515x772 n=2 | 515x772 n=2 | 114 096 / 241 665 |
| x6 | 515x772 n=2 | 515x772 n=2 | 114 088 / 231 293 |
| x7 | 647x970 n=3 | 647x970 n=3 | 129 732 / 259 833 |
| x9 | 647x970 n=3 | 647x970 n=5 | 122 908 / 244 453 |
| 2x `-` (de x9) | 515x772 n=4 | 515x772 n=6 | 123 120 / 252 647 |
| 3x `-` | 515x772 n=4 | 515x772 n=6 | 123 304 / 241 449 |
| 5x `-` (zoom < 1,0) | 294x441 n=5 | 294x441 n=7 | 103 232 / 227 139 |
| 9x `-` | 294x441 n=5 | 294x441 n=7 | 103 332 / 222 020 |
| 9x `-` + 6 s | 294x441 n=5 | 294x441 n=7 | 103 352 / 222 450 |
| x9 (seconde passe) | 647x970 n=7 | 647x970 n=11 | 129 256 / 257 989 |
| Cadrer (0,8 s puis 6 s) | 294x441 n=8 | 294x441 n=12 | 105 656 / 230 021 puis 226 781 |

1. **Tailles : OK, conformes.** x5 : 515x772 ; x7 : 647x970 ; x9 inchangé ; sous 1,75 en descendant : 515x772 ; sous 1,0 : 294x441 ; Cadrer : 294x441. Le moulin hors zone à x9 (n=5 contre n=3 de la forge) reste décodé en grand ici (647x970, n=5) : il est dans la zone.
2. **Mémoire : redescend en partie seulement.** De 129,7 Mo (x7) à 103 Mo (retour sous 1,0) puis 105,7 Mo après Cadrer, mais le point de départ était 76,7 Mo : il reste ~27 à 29 Mo de plus que le départ, et 6 s plus tard le tas ne bouge pas (103 332 -> 103 352). Ce reliquat vient probablement des caches/pool de Glide ; je n'ai pas pu le départager.
3. **Netteté au zoom max : OK.** Laplacien du feu de camp, même échelle que la build précédente : 21,96 contre 10,2 (avant), et 28,63 contre 12,61 à l'échelle native (`comparaison-feu-avant-apres.png`).
4. **Clignotement autour de x7 : non vu.** Film 30 i/s (`planche-x7-46-57.png`, vidéo en cache `L3-T06-tour5-x7.mp4`) : saut de zoom à l'image 46, tailles passées à 647x970 n=10 / 14 à l'image ~56 (0,33 s plus tard), tous les sprites visibles sur toutes les images. Limite : screenrecord n'encode que les changements d'écran.
5. **Défilement rapide au zoom max (swipe 90 ms, inertie ~0,5 s) : OK.** 29 images, 1 janky (3,45 %), p90 16 ms (`glisse-zoommax-gfxinfo.txt`). Aucun sprite flou au bord pendant l'inertie (`planche-glisse-31-48.png`) : seul le moulin repasse de 647x970 à 294x441 à l'image ~43 (n=16 -> 17) quand il quitte la zone, hors de l'écran.
6. **Repos 10 s : OK.** 0 image rendue, 0 janky, 0 deadline ratée (`repos-gfxinfo.txt`).

Non testé : pincement ; palier haut sur d'autres sprites que forge et moulin ; le pic mémoire au passage de 1,75 sur cette build.

## Pour débloquer (tour 1)
Au choix : brancher `camera.detail` dans `app/dev-iso.tsx` (le contexte autour de `IsoCarteDemo`) pour que la carte seule au palier 12 exerce les paliers avec les boutons `+`/`-` ; ou une passe de pincement sur le Fairphone par Guillaume. Je ne touche pas au code.
