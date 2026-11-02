# L5-T04 (qa) : villageois qui marchent

Date : 2026-10-29. Arbre non commité (base d90ceced). Émulateur emulator-5554. `.perf` neuf (`evidence/L5-T04/build.log`, BUILD SUCCESSFUL en 1m12, démons arrêtés), `install -r` Success, `iso-vider-cache` (onglet Village), force-stop, réouverture par `am start`. Carte seule, palier 12, « Tous debout : oui », zoom `iso-zoom-06`. Preuves dans `docs/designs/village-iso-v1/evidence/L5-T04/`.

## Méthode et limites (à lire d'abord)
- Dans `dev-iso`, la carte seule ne démarre une vague qu'au montage (focus). Un tap à vide ne lance rien : `useCameraIso` n'y reçoit pas `onToucher` (`gfxinfo` : 0 image après un tap et un swipe). Le toucher ne relance des vagues que dans l'onglet Village. Un remontage remet le cadrage et les villageois à leur graine du jour. La « deuxième vague d'un tap à vide » n'est donc pas réalisable en carte seule : la vague 2 en carte seule est un nouveau montage (Village, puis Carte seule, puis `0,6` après 0,7 s), ce qui laisse environ 1 s de vague au cadrage avant le zoom.
- `screenrecord` n'a pas de réglage d'i/s : il a écrit environ 50 images/s en mouvement (946 images en 18,5 s). Extraction à 2 i/s (0,5 s) pour les planches, et à 7 et 10 i/s pour les gros plans. Pas de vidéo brute dans `evidence/`.
- Au zoom 0,6 l'écran ne montre que le centre de l'île (le feu, la tente, la forge, l'armurerie, le puits, le repaire). Deux villageois marchent dans le champ par vague ; le troisième est hors champ ou caché. Les cibles de profondeur de la tour, de l'observatoire, du moulin et de la ferme n'y sont pas visibles.
- Les premiers films (taps trop rapprochés, tap à vide) étaient inutilisables et ont été refaits ; seuls les derniers sont gardés.

## Captures
- `planche-vague-1.jpg` et `planche-vague-2.jpg` : 12 images par vague (3,0 s à 17,0 s), zoom 0,6. Vague 1 et vague 2 sont deux montages (voir plus haut).
- `depart-forge-10ips.png` : départ du forgeron, à 10 i/s, vague 2.
- `marche-10ips.png` : le forgeron en marche, 10 i/s.
- `occultation-armurerie-7ips.jpg` : le forgeron passe derrière l'armurerie, 7 i/s, vague 1.
- `onglet-village-cadrage.png`, `onglet-village-vagues-1s.jpg` : onglet Village (palier du héros), 2 vagues (la seconde par un toucher à 28 s).
- `gfx-vague-zoom06.txt`, `gfx-vague-cadrage.txt`, `repos-gfx.txt`.

## Réponses

**a) Départs décalés, chemins suivis : OK en partie.** Vague 2 : le marcheur gris est déjà en mouvement à 4,0 s (il entre par le bord gauche), le forgeron part vers 4,5 s (immobile à 3,0 et 4,0 s, en marche à 5,0 s). Les départs sont donc à des temps différents. Les trajets suivent le chemin : le forgeron descend la route le long de la forge puis contourne l'armurerie sans la traverser. Je n'ai vu que deux marcheurs par vague dans le cadrage ; le troisième n'a pas été identifié. Non prouvé : le décalage exact des trois.

**b) Rebond et changement de côté : rebond OK, coins non démontrés.** Le gros plan à 10 i/s (`marche-10ips.png`) montre le sprite qui monte et descend d'une image à l'autre pendant la marche, et rien quand il s'arrête. Le côté (face, dos, miroir) aux coins : le coin du forgeron est derrière l'armurerie (caché), et je n'ai pas pu lire le miroir avant et après sur les images gardées. Non prouvé.

**c) Tous immobiles à la fin, cases distinctes : OK dans le champ.** Les films sont fixes à partir de 17 s environ (vague 1 et vague 2). Vague 2 : le forgeron à gauche de l'armurerie, le marcheur gris près de la tente, le ménestrel rouge au feu, trois cases distinctes, aucun chevauchement. Le troisième marcheur, hors champ, n'a pas pu être contrôlé.

**d) Vague suivante : NON CONCLU.** En carte seule la vague suivante est impossible dans le même montage (voir limites). La comparaison de deux montages montre les mêmes positions de départ (graine du jour : forgeron à la porte de la forge, ménestrel au feu) et des marcheurs différents (vague 1 : le forgeron descend vers l'armurerie, un marcheur en haut à droite à 7,0 s ; vague 2 : le marcheur gris et le forgeron). Dans l'onglet Village, la seconde vague (toucher à 28 s) fait marcher un autre villageois (une silhouette à lanterne apparaît à gauche vers 29 s), mais « sans saut de position » n'est pas prouvé : la vue à 1 s ne le permet pas. À reprendre avec un film de la fin de vague 1 au début de vague 2 dans l'onglet Village, en gros plan.

**e) Profondeur : OK.** `occultation-armurerie-7ips.jpg` : le forgeron descend vers l'armurerie, disparaît entièrement derrière son toit pendant environ 1,1 s (images 6 à 12), laisse voir une tranche au bord gauche du toit (13 et 14), puis réapparaît devant la grille, côté ouest. `depart-forge-10ips.png` : au départ il est partiellement caché par le mur gauche de la forge, puis sort devant. Pas de villageois devant un toit qu'il devrait passer derrière dans ce que j'ai vu. Non regardés (hors champ) : tour, observatoire, moulin, ferme, haut du chemin du puits.

**f) Clignotement ou image manquante au départ et à l'arrivée : OK au départ, arrivée non regardée à 10 i/s.** À 10 i/s autour du départ du forgeron (2,6 à 4,2 s) et en marche (4,0 à 5,6 s) : le sprite est continu, pas de disparition, pas de saut d'une image, pas de double. L'arrivée n'a été vue qu'à 2 i/s et à 7 i/s (derrière l'armurerie) : rien d'anormal, mais pas de gros plan dédié.

**g) Repos : OK.** Trois mesures `gfxinfo` (carte, 10 s, plus de 13 s après la fin de vague ; puis Village, 10 s, après 20 s) : `Total frames rendered: 0`, `Janky frames: 0` (`repos-gfx.txt`).

**h) Trames longues pendant une vague : 1 au-dessus de 34 ms** (tranche 40 ms), plus 1 dans la tranche 32 à 34 ms ; sur 694 images, vague 2, zoom 0,6. Même compte sur la vague au cadrage (749 images : 1 à 40 ms, 1 à 32 ms). Médiane 23 ms sur cet émulateur. Pas de mesure de perf au sens du protocole.

## Point 4 : onglet Village, palier du héros
Le héros est au palier 1 : ferme et moulin, forge, tente et feu de camp, puits, tour de guet, champ de tir, parcelles en chantier (voir `onglet-village-cadrage.png`). Je vois quatre silhouettes autour de la tente et de la forge, et rien près des bâtiments absents (arène, observatoire, bosquet). Les marcheurs de l'onglet viennent de ce groupe. Je n'ai pas attribué chaque silhouette à son rôle : « seuls les rôles dont le bâtiment est construit marchent » est cohérent avec ce que je vois, non démontré rôle par rôle.

## Constats
- La consigne « tap à vide » pour la vague 2 ne marche pas en carte seule de `dev-iso` (voir limites). Si on veut une vague 2 sans remontage en carte seule, il faut brancher `onToucher` dans `app/dev-iso.tsx`.
- `iso-vider-cache` n'est visible que dans l'onglet Village ; la carte seule le cache.
- Le cadrage de la carte seule est recalculé à chaque montage ; `iso-zoom-06` doit être retapé après chaque remontage.

## Non vérifié
Toucher pendant une vague, mouvement réduit, onglet quitté puis rouvert, village à 1 ou 2 bâtiments (points 5, 6, 8 de la fiche), zoom fermé, troisième marcheur, miroir aux coins, profondeur à la tour, à l'observatoire, au moulin et à la ferme, Fairphone.

## Tour 2 (qa, 2026-10-30)

Arbre non commité (base d90ceced). `.perf` neuf (`evidence/L5-T04/t2/build.log`, BUILD SUCCESSFUL en 1m20, démons arrêtés), `install -r` Success, `iso-vider-cache` (onglet Village), force-stop, réouverture par `am start`. Preuves dans `evidence/L5-T04/t2/`. Aucune vidéo gardée.

**Méthode.** `screenrecord` écrit environ 38 images/s ici, pas 30 ; extraction à 10 i/s pour les gros plans. Pour savoir qui bouge sans repérer à l'œil, une carte de traces : différence entre images successives, amplifiée, accumulée sur une fenêtre (`traces-*.png`, vert vif = mouvement). Le moulin (disque) et les feux sont toujours du bruit. Les villageois sont minuscules au rythme de 1 i/s : les décisions ci-dessous viennent des gros plans à 10 i/s et des traces, pas des planches à 1 i/s.

### Point 2, onglet Village (palier 1 du héros), fin de vague 1, tap à vide à environ 29,8 s, vague 2
- **Autres villageois en vague 2 ? NON, un seul.** `traces-vague1.png` (3 à 17 s) : trois marcheurs (deux traits verticaux qui descendent, un chemin en « > »). `traces-vague2.png` (29 à 40 s) : un seul marcheur, le villageois à lanterne, qui rejoue le chemin en « > » (descend vers la pointe, puis revient en bas à gauche) ; aucun autre. `traces-repos-et-vague1.png` (gauche) : de 17 à 29 s, entre les deux vagues, rien ne bouge sauf moulin et feux. Ce n'est donc pas « d'autres » villageois : la vague 2 reprend celui que la vague 1 a laissé à sa case, et laisse les deux autres au repos.
- **Départ de la case d'arrivée, sans saut : OK.** `depart-vague2-10ips.jpg` (images 0 à 19, 29,0 à 30,9 s) : le villageois est déjà à sa case d'arrivée de la vague 1 (même position qu'à 23 s, `gros-plan-fin-vague1-1ips.jpg`), immobile jusqu'à l'image 8, puis avance par pas réguliers (9 à 19), sans téléportation. Les trois villageois non marcheurs gardent leur place.
- **Ombre ovale : OK.** Ovale sombre net sous le villageois, immobile (images 0 à 8) comme en marche (9 à 19) ; elle le suit.
- **Clignotement au départ et à l'arrivée : OK, aucun.** Départ : sprite continu sur 20 images à 10 i/s. Marche : `marche-vague2-10ips.jpg` (35,0 à 36,9 s), sprite continu. Arrivée : `arrivee-vague2-10ips.jpg` (36,9 à 38,8 s), il s'arrête, l'ombre reste, 20 images identiques, pas de disparition ni de double. Réserve : le sprite change d'orientation en marche (de dos près de la tente, vers 33 s) ; vu à 1 i/s seulement, je n'ai pas vérifié l'image exacte du changement.
- **Réserve** : on voit le champ central du village du héros (palier 1, sans les bâtiments absents) ; je n'ai pas contrôlé les rôles hors champ.

### Point 3, Carte seule, palier 12, « Tous debout : oui », zoom 0,6
Capture de la scène : `carte-palier12-zoom06.png` (palier 12 en orange, Tous debout oui, « 0,6 » appliqué, bâtiments de l'île).
- **Tap à vide après le repos lance une vague : OK.** Repos 0 image ; après un tap : 181 images en 3 s (`carte-tap-repos-gfx.txt`). Avec le tap dans `dev-iso`, `onToucher` est bien branché (le constat du tour 1 est levé).
- **Tap en pleine vague : horloge prolongée, pas de saut vu, pas de relance visible : OK avec réserve.** Témoin, un seul tap (`carte-1tap-ydif.txt`, `carte-1tap-traces.png`) : mouvement de 3 s à 18 s. Deux taps (à 3 s et à environ 9 s, `carte-2taps-ydif.txt`, `carte-2taps-traces.png`) : mouvement jusqu'à 28 s, soit 10 s de plus. L'animation s'étend donc. Un marcheur suivi à 3 i/s autour du second tap (6,5 à 10,2 s) avance de façon continue, arrive vers 9 s et reste en place ; je n'ai vu ni saut, ni retour au départ, ni nouveau trajet après le second tap. Réserve : la comparaison témoin/deux taps ne montre pas les mêmes trajets au-delà de 9 s (graine différente par passe), donc « pas de nouveau plan » est conclu de l'absence de saut et de nouveau départ sur ce marcheur, pas d'une comparaison image par image de tous.

### Point 4, repos : OK
- Onglet Village, plus de 4 minutes après la dernière vague, 10 s : `Total frames rendered: 0`, `Janky 0` (`repos-village-gfx.txt`).
- Carte seule, 25 s après la dernière vague (et 30 s après le montage), 10 s : 0 image, `Janky 0` (`repos-carte-gfx.txt`).
- Trois captures à 1,5 s d'intervalle au repos : le moulin garde la même pose (`repos-village-3captures.png`). Observation : pendant le film d'un repos de 17 à 29 s le moulin et les feux bougent encore ; ils s'arrêtent donc après environ 20 s de repos au moins. La mesure de 0 image est valable au-delà.

### Point 5, vague à la première ouverture de l'onglet : OK
Ouverture par force-stop, `am start`, tap « Onglet Village » (film lancé avant le tap). Les traces de 3 à 9 s montrent un marcheur en route sans aucun toucher ; à 4 s les gros plans (`gros-plan-fin-vague1-1ips.jpg` précède) montrent déjà un villageois en mouvement près du moulin. Reproduit dans les passes mouvement réduit (premier montage de chaque passe).

### Point 6, mouvement réduit : OK, mais pas avec le réglage demandé
- `settings put global animator_duration_scale 0` passe la garde (valeur lue : 0), mais **ne coupe rien** : après force-stop et réouverture, les marcheurs marchent et le moulin tourne (`mouvement-reduit-animator0-traces.png`, 724 images en 12 s juste après l'ouverture). L'application lit `AccessibilityInfo.isReduceMotionEnabled` (`stores/settings.ts:127`), que React Native tire de `transition_animation_scale`, pas de `animator_duration_scale`.
- Avec `transition_animation_scale 0` (même commande, autorisée par la garde), après force-stop et réouverture : **rien ne bouge**. Traces vides de 4 s à la fin (`mouvement-reduit-transition0-traces.png`, vert uniforme), 34 images au total sur un tap de 15 s plus l'ouverture, village bien affiché (`mouvement-reduit-village.png`).
- Valeurs remises à 1 : `animator_duration_scale` 1, `transition_animation_scale` 1, `window_animation_scale` 1 (relues).

### Non vérifié, ou écarts à connaître
- 30 i/s demandés : `screenrecord` n'a pas ce réglage (environ 38 i/s ici).
- Troisième marcheur de la vague 1 et hors champ : pas attribué rôle par rôle.
- Profondeur (derrière un toit) : non regardée ce tour, déjà OK au tour 1.
- Trames longues : non mesurées au sens du protocole (gfxinfo seulement : 1 trame jankée sur 181 pour la vague du tap, 3 sur 2405 sur deux taps).
- Barre de débogage visible en haut de l'écran (texte « forge 187x280 ... ») : elle masque les boutons du haut ; ne vient pas du code vu ici.

### Verdict
| Point | Verdict |
|---|---|
| 2 vague 2 : autres villageois | NON, un seul, celui laissé par la vague 1 (à confirmer par le chef) |
| 2 départ sans saut | OK |
| 2 ombre ovale | OK |
| 2 clignotement | OK (aucun) |
| 3 tap à vide au repos | OK |
| 3 tap en pleine vague | OK avec réserve (étend l'horloge de 10 s, aucun saut vu) |
| 4 repos 0 image | OK (Village et Carte seule) |
| 5 vague à la première ouverture | OK |
| 6 mouvement réduit | OK avec `transition_animation_scale` ; KO avec `animator_duration_scale` seul (par conception de RN) |
