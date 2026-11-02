# L3-T05 QA : animation de croissance sur la carte iso (appareil)

Auteur : qa. Build `.perf` neuve (`--rerun`), `BUILD SUCCESSFUL in 1m 11s`, `install -r` Success, force-stop du `.dev`, `bati://dev-iso`, mode Village (`iso-mode-village`). Preuves : `docs/designs/village-iso-v1/evidence/L3-T05/`. Vidéo (2,7 Mo) : `~/.cache/bati-art-loop/iso/evidence/L3-T05-croissance-1.mp4`.

1. Build + ouverture : OK (`build.log`, `depart.png`, `village.png`).
2. Séquence `iso-grandir` : OK. La vidéo (`planche-video.png`, 6 images/s) montre la carte au cadrage de départ, puis le recadrage vers la forge (~600 ms, `rafale-3.png`), puis l'arrivée de la carte « Your quest built this : Forge, rank 2 -> rank 3 » en fondu (`carte-fin-video2.png`). 3 s plus tard (`apres-3s.png`), deux captures identiques à l'octet (md5 égal) : plus rien ne bouge. Vérifié : le recadrage et la carte de récompense. Non vérifié : le fondu croisé de l'ancien sprite au nouveau et le ressort, trop fins pour 6 images/s et pour des captures de 0,5 s ; la forge de la carte garde le même aspect à mon œil.
3. Deux fois de suite : OK avec une réserve. Le second appui rejoue (`rejeu-1.png`, `rejeu-2.png`), finit au même cadrage (`rejeu-fin.png`), et la carte de récompense est là. Réserve : le premier jeu annonce « rank 2 -> rank 3 », le second « rank 2 -> rank 4 » (`rejeu-fin.png`). Est-ce voulu (la démo monte d'un cran à chaque appui) ? Je ne sais pas. De plus `apres-3s.png` (~6 s après le premier appui) ne montre plus la carte de récompense, alors qu'à ~4 s après le second elle est encore là (`rejeu-fin.png`) : elle part donc seule, durée non mesurée.
4. Repos 10 s après la croissance : OK. `repos-gfxinfo.txt` (reset, 10 s sans toucher) : Total frames rendered 0, Janky 0, Frame deadline missed 0. À comparer aux 42 images de la bannière seule : 0, mieux. Mémoire à ce moment (`dumpsys meminfo`) : TOTAL PSS 234 993 kB, Graphics 0 (émulateur, non significatif). La carte de récompense était encore affichée pendant la mesure (`repos-fin.png`).
5. Carte manipulable après croissance : OK. Glissé (`apres-glisse.png`) : la carte suit, la page reste, la carte de récompense a disparu. Tap sur la forge : la fiche s'ouvre, Forge rank 1, séances, Close (`tap-forge.png`).
6. Drapeau éteint (`bati://village`) : OK. Un appui sur la scène ouvre le visionneur « Isoville / Tap anywhere to close » (`prod-tap-scene.png`), refermé d'un appui. Le cameo n'a pas été examiné.

Non vérifié : fondu croisé et ressort à l'œil (cadence), passes de mesure complètes (3 passes, mémoire pendant la croissance), vidéo à haute cadence, TalkBack. Le héros est toujours à 8 bâtiments, forge rank 1 en vrai ; le rang 2/3/4 de la carte est celui de la démo.

## Tour 2 (iso-grandir corrigé)
Build `.perf` neuve (`--rerun`), `BUILD SUCCESSFUL in 1m 9s`, `install -r` Success, force-stop du `.dev`, `bati://dev-iso`, mode Village. Preuves : `evidence/L3-T05/tour2/`. Vidéo (2,2 Mo) : `~/.cache/bati-art-loop/iso/evidence/L3-T05-tour2-croissance.mp4` (images extraites à 30 i/s).

1. **Bâtiment et rangs : le Campfire, « Not built yet -> rank 1 »**, et non forge 2->4 (`carte1.png`). Identique au second appui (`carte2.png`). Le héros n'a que 8 bâtiments « rough » ; le feu de camp est annoncé comme neuf alors que son sprite est déjà sur la carte au départ (`depart.png`). À trancher : est-ce le bâtiment attendu ?
2. **Images à 30 i/s : KO, je ne vois ni fondu ni ressort.** Le recadrage dure ~0,5 s (images 50 à 63, `planche-recadrage.png`) : la carte zoome sur le feu de camp. Ensuite, sur 1,5 s (images 63 à ~105, `planche-62-109.png`, `planche-gros-plan-56-75.png`, `planche-gros-plan-86-95.png`), le feu de camp reste identique de taille, de position et d'opacité (seule la flamme vacille) : pas d'« ancien stade » (rien, puisque « Not built yet »), pas de fondu, pas d'échelle qui rebondit. Seul signe : la luminosité moyenne de la zone baisse très légèrement (51,66 -> 51,55) vers l'image ~90, sans doute le vrai sprite qui revient. Le sprite est visible dès la première image du recadrage : s'il était censé être masqué, il ne l'est pas. Réserve : la vidéo est de l'émulateur, le ressort pourrait être trop discret pour 30 i/s sur un feu de camp.
3. **Voisin devant/derrière : non observé.** Un villageois à gauche du feu de camp et deux autres plus haut ne passent pas derrière le bâtiment pendant la fenêtre (positions stables sur la planche). Non démontré pour un cas de croisement.
4. **Après : OK.** 3 s plus tard deux captures identiques à l'octet (`apres-3s.png`, `apres-3s-b.png`). Repos 10 s : 0 image rendue, 0 janky, 0 deadline ratée (`repos-gfxinfo.txt`). Tap sur le feu de camp : sa fiche s'ouvre (Campfire, rank 1, Close ; `tap-feu.png`).

Non vérifié : la forge (le bouton ne la choisit plus), un voisin qui croise le bâtiment, la mémoire pendant la croissance.

## Tour 3 (sprite masqué dès le début, recadrage 500 ms, puis fondu et ressort)
Build `.perf` neuve (`--rerun`), `BUILD SUCCESSFUL in 1m 10s`, `install -r` Success, force-stop du `.dev`, `bati://dev-iso`, mode Village, `iso-grandir` filmé. Preuves : `evidence/L3-T05/tour3/`. Vidéo (2,9 Mo) : `~/.cache/bati-art-loop/iso/evidence/L3-T05-tour3-croissance.mp4`. Images à 30 i/s (numérotées depuis le début du film). Même bâtiment : Campfire, « Not built yet -> rank 1 » (`carte1.png`, `rejeu-fin.png`).

- **Le feu disparaît au début : OK.** Visible jusqu'à l'image 48, absent dès l'image 49 (`planche-disparition-38-61.png` : il ne reste que son ombre), juste avant le début du déplacement de caméra (image ~50). Le recadrage dure ~15 images (~0,5 s, images ~50 à 65). Le feu reste caché ~21 images (49 à 70).
- **Fondu : OK.** Premiers pixels du feu à l'image 70-71, opacité croissante jusqu'à l'image ~77 (`planche-feu-60-115.png`, lignes 2 et 3) ; surface détectée 824 px (image 71) -> 2 715 (76) -> 3 000 (80).
- **Ressort : visible mais faible, mesure grossière.** Largeur du cadre englobant de l'écart avec le fond : 106 (image 71), 137 (72), 158 (73, pic), 155, 154, 150 (76-78, creux), 151-155 (79-81), 155 (82 et après). Soit un dépassement d'environ +2 % puis un creux de -3 %, et non les ~7 % annoncés. Le fondu en cours et l'ombre du villageois à gauche faussent la mesure ; la surface atteint son maximum à l'image 82 (3 120 px) puis retombe à 2 987 à l'image 96 (+4 % de surface, soit ~2 % en linéaire) : le vrai sprite reprend la place à l'image ~96 (1,5 s après le début du recadrage), sans saut visible.
- **3 s après : OK.** Deux captures identiques à l'octet (`apres-3s.png`, `apres-3s-b.png`).
- **Repos 10 s : OK.** 0 image rendue, 0 janky, 0 deadline ratée (`repos-gfxinfo.txt`).
- **Tap sur le feu : OK.** Fiche Campfire, rank 1 (`tap-feu.png`).
- **Second appui : OK.** À 0,4 s le feu est de nouveau masqué (ombre seule, `rejeu-0s4.png`), la caméra ne bouge pas (déjà cadrée), et à ~3 s la carte de récompense « Not built yet -> rank 1 » est là avec le feu revenu (`rejeu-fin.png`).

Non vérifié : l'amplitude exacte du ressort (mesure par différence de pixels, bruitée par le fondu) ; le moment exact de l'appui dans le film (le feu reste visible 11 images après le début de la vidéo, pas forcément égal au délai d'appui).

## Tour 4 (fondu ramené à 150 ms, ressort à pleine opacité)
Build `.perf` neuve (`--rerun`, 1m11s), `install -r` Success, force-stop du `.dev`, `bati://dev-iso`, mode Village, `iso-grandir` filmé (vidéo en cache `~/.cache/bati-art-loop/iso/evidence/L3-T05-tour4-croissance.mp4`), images à 30 i/s, mesure de la largeur du feu de camp (bâtiment annoncé : Campfire, « Not built yet -> rank 1 ») image par image par différence avec une image où il est caché (`tour4/largeur-par-image.txt`, planche `tour4/planche-feu-60-107.png`).

- Le feu est caché pendant le recadrage, puis apparaît à l'image 67-68 (premières images fantômes, `planche-feu-60-107.png`), à pleine opacité vers l'image 71 : fondu d'environ 4 à 5 images (~150 ms), conforme.
- Largeur du feu (px, image 72 = pic) : 110 (68), 163 (69), 173 (70), 179 (71), **180 (72)**, 178 (73), 173 (74), 168 (75), 165 (76 à 79), puis 166 à 168 jusqu'à l'image 95, qui est la taille de repos de la couche animée. À l'image 96 le vrai sprite reprend la place avec une largeur de **172** px.
- **Pic : +4,7 % au-dessus de la taille finale du vrai sprite (172 px)**, atteint vers l'image 72, soit ~5 images (~150 ms) après la première apparition, donc à pleine opacité. Par rapport à la taille de repos de la couche (167 à 168 px) le dépassement est de +7,3 à +7,8 %, ce qui est le ~7 % visé. Creux à 164 px (-4,7 % de la taille finale) à l'image 78, puis retour à 167 à 168.
- **Défaut relevé : saut de taille au remplacement.** La couche animée se stabilise à 167 à 168 px, le vrai sprite fait 172 px : à l'image 96 (environ 1,5 s après l'appui) le bâtiment grandit d'un coup de ~2,9 % (4 à 5 px) sans transition. Je ne sais pas si c'est le sprite de repos ou la couche qui est mal calibré.
- Repos 10 s ensuite : 0 image rendue, 0 janky, 0 deadline ratée (`tour4/repos-gfxinfo.txt`).

Limite : la largeur vient d'une différence de pixels (seuil), qui sous-estime légèrement pendant les premières images de fondu (image 68) ; le pic, à pleine opacité, n'est pas touché.

## Tour 5 (rectangle de la couche identique à la carte, ombre de socle dessinée par la couche)
Build `.perf` neuve (`--rerun`, 1m11s), `install -r` Success, force-stop du `.dev`, mode Village, `iso-grandir` filmé (vidéo en cache `~/.cache/bati-art-loop/iso/evidence/L3-T05-tour5-croissance.mp4`), images à 30 i/s, même mesure de largeur du feu de camp qu'au tour 4 (`tour5/largeur-par-image.txt`).

- Largeur (px) : image 70 : 162 ; 71 : 166 ; 72 : 178 ; **73 : 180 (pic)** ; 74 : 179 ; 75 : 176 ; 76 à 80 : 170 à 171 ; 81 : 166 ; 82 à 96 : **171** ; **97 : 172** (vrai sprite, jusqu'à la fin).
- **Pic : +4,7 % au-dessus de la taille finale (172 px)**, inchangé (+5,3 % de la taille de repos de la couche). Creux de 166 px (-3,5 %) à l'image 81.
- **Le saut est quasi disparu** : la couche se stabilise à 171 px au lieu de 167 à 168, et le remplacement (image 96 -> 97) ne change plus que de 1 px en largeur (171 -> 172), contre ~5 px au tour 4. La hauteur passe de 109 à 111 px (+2 px).
- **Différence de pixels, dernière image de la couche (96) contre première image du vrai sprite (97), gros plan** (`tour5/remplacement-96-97-diff.png`) : écart moyen 1,13 (niveaux de gris), 77 pixels au-dessus de 30, **0 au-dessus de 60** ; la différence ne dessine que des contours fins sur tout le bâtiment (arêtes des pierres, bûches, pilier, bord du socle), ce qui correspond à un ré-échantillonnage d'environ 1 px : le vrai sprite est légèrement plus grand que la couche (1 px de large, 2 de haut), sans changement de forme, de couleur ni d'ombre. L'ombre de socle ne réapparaît plus au remplacement (aucune zone d'ombre dans la différence). Entre les images 95 et 96 (couche seule) l'écart est de 0,003.
- Il reste donc : un décalage de ~1 px (0,6 %) sur les contours au remplacement, non visible à l'œil sur la planche.
- Repos 10 s : 0 image rendue, 0 janky, 0 deadline ratée (`tour5/repos-gfxinfo.txt`).
