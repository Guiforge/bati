# L5-T05-qa : rotation des villageois (L5-T04 tour 3) et petits détails (L5-T05), sur émulateur

Statut proposé : prêt pour revue (un point KO, un non vérifié)
Auteur : qa
Tour de revue : 1

## Fait
- `.perf` neuf (`evidence/L5-T05/build.log`, BUILD SUCCESSFUL en 1m11), démons arrêtés, `install -r` Success, `iso-vider-cache` dans l'onglet Village, force-stop, `am start`. Aucun code modifié, aucun commit. Preuves dans `docs/designs/village-iso-v1/evidence/L5-T05/` (jpg et txt, tous sous 1,5 Mo ; aucune vidéo gardée).
- Scènes vérifiées avant mesure : `scene-zoom06-palier12.jpg` (palier 12, Tous debout oui, zoom 0,6) et `scene-cadrage-palier12.jpg` (cadrage, île entière).
- Méthode : `screenrecord` 1080x2400 (cadrage, onglet) ou 540x1200 (zoom 0,6), images à 10 i/s, différences successives accumulées (vert) sur fond assombri. Chaque vague relancée par un tap à vide (60,2250) après un repos de plus de 20 s.

## Point 2 : rotation des marcheurs, Carte seule, palier 12
Les vagues durent environ 16 s (2 à 18 s, 40 à 56 s, 73 à 90 s), chacune relancée par un tap : 0 mouvement entre deux.
- Zoom 0,6 (`zoom06-traces-3-vagues.jpg`, `zoom06-vague{1,2,3}-2s.jpg`). Le champ n'est qu'un gros plan du centre ; seuls les villageois qui y passent sont comptés.
  - Vague 1 : le villageois beige (le long du feu, il va à gauche puis revient). Le rouge et celui au mannequin restent en place.
  - Vague 2 : le beige encore, plus un villageois à lanterne, arrivé de la droite et passé derrière la clôture de la forge (occultation correcte), qui s'arrête au feu côté droit.
  - Vague 3 : le beige, le villageois à lanterne (parti de là où la vague 2 l'a laissé) et le rouge (du feu vers la droite puis retour). Trois marcheurs.
- Cadrage (`cadrage-traces-vague1-vague3.jpg`) : deux zones de marche en vague 1 (autour du feu et vers le bâtiment central), même ordre de grandeur en vague 3. Les marcheurs sont trop petits pour les nommer un à un à cette échelle.
- Changent-ils d'une vague à l'autre ? OUI : 1 puis 2 puis 3 dans le champ, avec des rôles différents (lanterne absent en 1, présent en 2 et 3 ; rouge seulement en 3). Le beige marche chaque fois.
- Saut ? NON : à chaque frontière de vague les positions de fin et de début coïncident (beige, lanterne et rouge repris à la case où la vague précédente les a laissés, comparés image par image à 0,5 s de la frontière).
- Réserve : « 2 ou 3 par vague » n'est établi que dans l'onglet Village (trois marcheurs, point 4) ; en Carte seule je vois 1 (champ), 2 (champ), 3 (champ) et jamais plus, mais le champ est partiel et le cadrage trop petit pour compter. Un marcheur hors champ n'est ni confirmé ni exclu.
- Verdict : OK avec réserve.

## Point 3 : petits détails
Constat de fond : les corbeaux et les lucioles ne sont dans le code que de `IsoVillage.tsx` (onglet Village) ; la Carte seule de `dev-iso` n'a ni ciel ni corbeaux ni lucioles (fond noir, aucune activité hors de l'île sur les 130 s filmées). Seul le rat est dans la carte. Corbeaux et lucioles ont donc été filmés dans l'onglet Village (`am start`, tap « Onglet Village », film de 60 s, première vague à l'ouverture).
- Corbeaux : OK, sauf la caméra. Une traversée unique de droite à gauche, de 7,9 s à 12,4 s après l'ouverture (4,5 s), en arc dans le tiers haut (au-dessus de la lune, `village-traces-vague.jpg`, `village-corbeaux-3-instants.jpg`) ; quatre oiseaux en V ; rien d'autre dans le ciel sur les 60 s. Lisibilité : bonne devant la lune (noirs sur gris clair) ; sur le ciel sombre, ils ne sont presque pas lisibles (traits fins gris-bleu sur bleu nuit, `village-corbeaux-3-instants.jpg`, instants du milieu et du bas). Le liseré froid n'est pas assez clair. « Sans suivre la caméra » : non vérifié, car l'onglet n'offre aucun glissement de carte et la Carte seule n'a pas de ciel.
- Lucioles : OK (présentes), clignotement non compté. Près du canal à gauche de l'onglet, 2 à 4 points jaune pâle qui apparaissent, dérivent vers le haut et s'éteignent (`village-lucioles-x3.jpg`, luminosité x3 ; à luminosité normale elles sont discrètes). Elles ne sont pas « vert pâle » comme le dit le rapport, plutôt jaune pâle. Deux traces verticales d'une centaine de pixels sur 2,6 s sont leur dérive, bien supérieure aux 3 dp annoncés. Certaines sont au-dessus du vide, hors de l'îlot (image de gauche), contrairement à « seulement sur une case visible ». Les suivre à la caméra : non vérifié (même raison).
- Rat : KO, jamais vu. Six vagues filmées (trois au zoom 0,6, trois au cadrage) ; avec une chance sur deux par vague la probabilité de n'en voir aucun est de 1 sur 64 si le rat se voyait. Au cadrage, balayage de cellules de 24 px sur chaque vague, rien qui ressemble à une course de 1 s ; au zoom 0,6, le champ ne montre pas la rangée 10 devant la ferme, donc rien n'y a été regardé de près. Ni « file devant la ferme », ni « passe derrière ce qui est devant » ni lisibilité du gris sur l'herbe ne sont démontrés. À reprendre avec un champ zoomé sur la ferme et un film plus long, ou en forçant la graine côté code (je ne modifie pas le code).
- Verdict : corbeaux OK (lisibilité à améliorer, caméra non vérifiée) ; lucioles OK (caméra non vérifiée) ; rat KO (non vu).

## Point 4 : onglet Village, palier 1 du héros : OK
Une vague de 3 s à 18 s. Trois marcheurs (`village-marcheurs-1-a-17s.jpg`, `village-traces-vague.jpg`) : le villageois à lanterne (du puits vers le feu), le rouge (autour de la forge) et le beige (feu et tente). Sprites nets, ombre ovale sous chacun, ils se lisent à l'échelle de l'onglet. Un trait diagonal du feu à la forge est la marche du rouge. Les panaches de cheminée, le moulin et les feux bougent aussi (bruit connu). Aucun clignotement vu à 2 s de pas ; pas de contrôle à 10 i/s sur cette vague.

## Point 5 : repos et mouvement réduit : OK
- Repos (plus de 25 s après la dernière vague, 10 s) : onglet Village `Total frames rendered: 0`, `Janky frames: 0` (`repos-village-gfx.txt`) ; Carte seule cadrage `Total frames rendered: 0`, `Janky 0` (`repos-carte-gfx.txt`).
- `transition_animation_scale 0` (lu : 0), force-stop, réouverture : Carte seule, tap à vide, 15 s : 0 image (`mouvement-reduit-carte-gfx.txt`) ; onglet Village, 15 s : 0 image (`mouvement-reduit-village-gfx.txt`), capture `mouvement-reduit-village.jpg` : aucun corbeau, villageois en place. Valeur remise à 1 et relue : 1.
- Limite : un tap mouvement réduit ne montre que 0 image ; la lucioles/rat en mouvement réduit n'ont pas été cherchés image par image.

## Point 6 : trames sur la vague la plus chargée
Carte seule, palier 12, Tous debout oui, cadrage (tout l'îlot, tous les marcheurs), 24 s après un tap à vide (`gfx-vague-cadrage-brut.txt`) : 902 trames rendues, 1 janky (0,11 %), 1 `Frame deadline missed`. Histogramme : 15 ms=4, 16 ms=895, 17 ms=3, rien au-dessus de 17 ms, donc 0 trame sur 902 au-dessus de 32 ms. GPU 50e à 99e percentile : 11 à 13 ms. OK.
Limites : c'est la vague de la Carte seule, qui n'a ni corbeaux ni lucioles ; la mesure de la vague de l'onglet Village (corbeaux et lucioles en plus) a échoué (0 trame, mauvais déclenchement du tap) et n'a pas été refaite. Pas de passe pendant une croissance, pas de protocole à trois passes ni de témoin, et émulateur seulement, pas le Fairphone.

## Verdict
| Point | Verdict |
|---|---|
| 2 rotation : changent d'une vague à l'autre | OK avec réserve (1, 2, 3 marcheurs dans le champ, rôles différents) |
| 2 pas de saut | OK |
| 3 corbeaux : une traversée par vague | OK (lisibilité faible sur ciel sombre) |
| 3 corbeaux : ne suivent pas la caméra | non vérifié |
| 3 lucioles près du canal | OK, clignotement non compté, caméra non vérifiée |
| 3 rat devant la ferme, profondeur, lisibilité | KO (jamais vu en 6 vagues) |
| 4 onglet Village, une vague | OK |
| 5 repos 0 image | OK |
| 5 mouvement réduit | OK |
| 6 trames > 32 ms | OK : 0 sur 902 |

## Douteux ou non fait
- Tests à refaire : rat (zoom sur la ferme, ou graine forcée), glissement de carte pendant le vol des corbeaux (impossible dans l'onglet, aucune scène de dev avec ciel), vague de l'onglet Village mesurée au gfxinfo, passe pendant une croissance.
- Le rapport d'ingénierie dit de filmer corbeaux et lucioles en Carte seule : ce n'est pas possible, ils n'y sont pas montés.
- Barre de débogage (« forge 187x280 ... ») toujours visible en haut, hors code vu.

## Pour la suite
- Revoir le contraste des corbeaux sur le ciel (liseré plus clair).
- Lucioles : dérive observée bien au-delà de 3 dp, et points hors de l'îlot.
- Rat : demander à l'ingénieur un réglage de dev qui force la graine (ou le rat à chaque vague) pour pouvoir le filmer.

## Tour 2 (30/10) : OK avec deux réserves (corbeaux au glissement non prouvé, rat non vu dans l'onglet)

Aucun code modifié, aucun commit. Preuves dans `evidence/L5-T05/t2/` (jpg et txt, tous sous 1,5 Mo, aucune vidéo gardée).

- Premier `.perf` du tour : plantage à l'ouverture de dev-iso (`volCorbeaux` appelait `lune`, non marquée worklet ; `crash-logcat.txt`). Corrigé par l'ingénieur (`"worklet"` sur `lune`). Deuxième `.perf` : BUILD SUCCESSFUL en 1m11 (`build.log`), démons arrêtés, `install -r` Success.
- Ouverture sans plantage : dev-iso, onglet Village, retour à la Carte seule, plusieurs minutes de manipulation : `logcat | grep FATAL` vide. Cache images vidé (`iso-vider-cache`), force-stop, réouverture par `am start`.
- Scènes : `scene-carte-palier12-cadrage.jpg` (palier 12, cadrage) et `scene-carte-zoom-ferme-rat-force.jpg` (palier 12, Tous debout oui, Rat : forcé, zoom + trois crans puis glissé vers la gauche : moulin, ferme à champs, tente, feu).
- Méthode : `screenrecord` 1080x2400, extraction d'images (ffmpeg) à 4-10 i/s, planches rognées, différences d'images et détection de pixels cyan en Python (scratchpad).

### Point 2 : Carte seule, palier 12

- Rat forcé : OK. Course vue dans `rat-ferme-16-images.jpg` (16 images à 10 i/s). Il file vers le bas-droite devant les champs de la ferme, entre le moulin et le métier, environ 1,3 s visibles (de 11,1 s à 12,4 s dans la vidéo, la dernière image avec lui à 12,3 s), cohérent avec 1,5 s. Il court (position qui avance à chaque image), il ne reste pas posé. Une seule vague analysée image par image (la première de la vidéo `ferme`) ; la deuxième vague de cette vidéo n'a pas été dépouillée.
- Lisibilité du rat : bonne au zoom de la capture (silhouette gris-bleu clair, oreilles, queue, contour encré, nette sur le dur sol sombre). Au cadrage entier il fait quelques pixels : je n'ai pas pu le suivre à l'oeil sur l'île entière (je ne l'ai trouvé qu'au zoom). Il est un peu plus clair que le reste du sol, ce qui aide ; à l'échelle du cadrage il se lit comme un point clair qui bouge.
- Profondeur : OK sur une image (planche 3 ligne 1) : il passe sous la pointe d'une aile du moulin (aile dessinée par-dessus), donc derrière ce qui est devant lui. Je n'ai pas d'autre bâtiment qui le recouvre sur sa course : une seule occultation prouvée, par une aile.
- Corbeaux en Carte seule : OK. Vus sur fond noir (dev-iso n'a pas de ciel) : trois à quatre V gris-bleu clair avec un liseré clair, traversée en environ 4 s de gauche à droite, rognés par la barre de débogage. Lisibles : ils se détachent bien du noir. Hauteur de vol : soit tout en haut de l'aire (hauteur de la lune), soit à mi-hauteur, au-dessus de l'île (50 % de la hauteur) où je n'ai pas pu les détecter automatiquement.
- Lucioles en Carte seule : OK, froides et sur l'île. Ce sont des points cyan-bleu (aucun jaune), deux battements par cycle de 5 s (mesuré : flashs à 2,5 s d'écart), au NE de l'île près de l'observatoire.
- Glissement de la carte : lucioles OK. Pendant des glissements, leur centroïde suit la carte (par exemple x = 970 puis 396 après un glissé de 500 px ; 28 glissés d'affilée, le centroïde se déplace de 100 à 150 px entre deux images). Corbeaux fixes : NON PROUVÉ. Un toucher ou un glissé en cours de vague prolonge la vague sans la relancer (`horloge.ts`), mais le vol tombe dans un cycle tiré au hasard et, à mi-hauteur, mes détecteurs n'ont rien isolé sur l'île. Je n'ai donc aucune image d'un vol coupé par un glissé. Lecture du code : `Oiseaux` est monté hors de la caméra (`dev-iso.tsx`, avant le `GestureDetector`), donc il ne devrait pas suivre ; à revérifier à l'oeil par Guillaume.

### Point 3 : onglet Village, une vague

- Corbeaux : OK (`village-corbeaux-4-instants.jpg`, 1 s d'écart). Quatre corbeaux en V, de la lune vers la gauche, en arc, dans le tiers haut. Les deux premiers instants passent devant la lune (liseré clair sur gris de la lune : lisibles) ; sur le ciel sombre, V gris-bleu fin, bien plus lisibles qu'au tour 1.
- Lucioles : OK (`village-lucioles-zoom.jpg`, 5 images à 1 s). Quatre petites lueurs cyan-bleu avec halo, qui s'allument ensemble (images 2, 3 et 5 ; éteintes à l'image 1) et dérivent de quelques pixels, juste au-dessus du bord du canal et de la ferme, sur l'île et non dans le vide. Froides, sans jaune.
- Rat : non vu dans l'onglet (palier 1, une seule vague filmée de 20 s, première vague à l'ouverture). L'ingénieur ne le monte que si l'îlot montre toute sa course : pas établi au palier 1. Non vérifié.
- Trames : vague de l'onglet non mesurée ce tour (pas demandé).

### Point 4 : repos

OK. Plus de 25 s après la dernière interaction, 10 s : onglet Village `Total frames rendered: 0`, `Janky frames: 0` (`repos-village-gfx.txt`) ; Carte seule `Total frames rendered: 0`, `Janky 0` (`repos-carte-gfx.txt`).

### Verdicts

| Point | Verdict |
|---|---|
| 2 rat forcé : court, lisible, derrière ce qui est devant | OK (zoom ferme ; une occultation prouvée, par une aile de moulin) |
| 2 corbeaux lisibles | OK |
| 2 lucioles froides, sur l'île | OK |
| 2 glissé : lucioles suivent la carte | OK |
| 2 glissé : corbeaux fixes | non prouvé |
| 3 onglet Village : corbeaux, lucioles | OK |
| 3 onglet Village : rat | non vu |
| 4 repos 0 image en 10 s | OK |
| Ouverture sans plantage (dev-iso, onglet) | OK |

### Avis de lisibilité

Corbeaux : bien mieux qu'au tour 1 ; le liseré clair les rend lisibles sur le ciel et sur le noir, ils restent fins et petits (à surveiller sur le Fairphone). Lucioles : bonnes, froides, discrètes, avec un halo net ; la dérive est faible, comme prévu. Rat : net au zoom, à peine perceptible au cadrage ; à une échelle de jeu normale il se verra surtout comme une tache claire qui court, ce qui suffit pour un détail de vie, mais ce n'est pas un détail qu'on remarque sans le chercher.

### Reste à faire
- Image d'un vol de corbeaux pendant un glissé (impossible de caler le moment par script ; à voir à l'oeil sur appareil ou en forçant la graine côté code).
- Rat dans l'onglet Village ; mesure d'images de la vague de l'onglet ; passe pendant une croissance ; protocole à trois passes avec témoin ; Fairphone.
- La barre de débogage (« forge ... ask ... ») recouvre le haut de l'aire en Carte seule et les boutons de l'onglet : toujours visible.
