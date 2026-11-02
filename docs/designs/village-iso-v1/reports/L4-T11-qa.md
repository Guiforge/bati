# L4-T11 (qa) : mise en page de l'onglet Village en iso, sur émulateur

Build : `.perf` neuf depuis l'arbre non commité (base b7fbc637), BUILD SUCCESSFUL, Gradle arrêté, `install -r` OK.
Preuves : `docs/designs/village-iso-v1/evidence/L4-T11/` (`build.log`, `05-prod.png`, `ecran/`). Chaque capture existe en `-brut.png` (écran complet) et `-recadre.png` (recadré sous la barre de débogage, y=264). Aucun fichier > 1,5 Mo.

## Verdicts
1. Build + install : OK.
2a. Haut de l'onglet au repos : OK.
2b. Carte zoomée : NON FAIT (pas de zoom possible en onglet) ; glissé OK ; coupure au pied : non observable.
2c. Police 1,3 : OK (commande acceptée, remise à 1.0).
3. Gestes : OK (glisser la carte, défiler la page, tap bâtiment, blason).
4. Production, drapeau éteint : OK, identique à L4-T05.

## Détails
**2a.** `a-haut-*` : après 25 s, `gfxinfo` 0 image sur 3 s, donc la vague est finie ; ailes à leur pose de repos (en croix). La carte occupe la zone entre la barre d'état (et la barre de débogage de dev-iso) et le titre : l'îlot est cadré et centré, plus de carré au-dessus d'une bande noire. Le palier de l'onglet est 1 (10 bâtiments, îlot de 10 terrains, pas le palier 12 du mode carte seule). Le pied de l'îlot s'arrête à environ 40 px au-dessus du blason, sur fond noir : aucun dégradé visible, aucun bord coupé.
**2b.** Pas de pincement possible (ni outil d'entrée de l'émulateur ni Maestro). Double tap : aucun changement visible (`b-dbltap-*`, le cadrage était déjà celui du recadrage). Glissé : la carte suit le doigt (`b-glisse-*`, île décalée vers le haut et la gauche), puis un glissé vers le bas est borné et laisse l'île un peu plus bas qu'au repos (`b-bas-*`) : le pied reste visible, à environ 10 px au-dessus du blason, sans coupure. **La coupure au pied sous le dégradé n'a donc pas pu être vue** : elle n'apparaît qu'à un vrai zoom, que je ne peux pas produire. À relire sur le téléphone ou avec un outil de pincement.
**2c.** `settings put system font_scale 1.3` par `emu-adb.sh` : accepté (relu : 1.3), remis à 1.0 (relu : 1.0). `c-police-*` : la carte est au même endroit et de même taille (le titre reste à la même ligne, la carte garde son cadrage) ; seuls les textes du dessous grossissent (la phrase « The village changes... » passe sur 2 lignes, « level 1 / 0 XP » sur 2 lignes). Rien ne chevauche la carte. `c-police-defile-*` : la page défile sous la barre de débogage.
**3.** Glisser la carte : OK (voir 2b). Défilement hors carte : OK, glissé depuis la liste, la page défile (`c-police-defile-*`) et remonte ensuite. Tap sur le moulin (264,650) : la fiche Windmill s'ouvre (`d-tap-batiment-*`). Tap sur le blason : la feuille « Why the Bear? » s'ouvre (`d-tap-blason-*`). Non testé : glissé démarré sur le titre (l'ingénierie le signale comme non traité).
**4.** Force-stop, `bati://village` : `05-prod.png` comparée à `evidence/L4-T05/05-prod.png`, même taille (1080x2400) ; 763 pixels diffèrent au-dessus du seuil, tous dans la boîte (81,54)-(150,82), c'est l'horloge de la barre d'état. Identique.

## Non vérifié
Zoom réel dans l'onglet et coupure au pied ; écran compact (pas de second appareil, `wm size` non tenté) ; glissé depuis le titre ; vague ou perf (suspendues).

## Tour 2

Build : `.perf` neuf (BUILD SUCCESSFUL, `build-t2.log`), `install -r` OK. Captures : `evidence/L4-T11/ecran-t2/` (brut et recadré, y=264) et `evidence/L4-T11/05-prod-t2.png`.

Verdicts : a OK, b OK, c OK (police remise à 1.0, relu), d OK, gestes OK, production OK.

- **a. Haut au repos** : 0 image sur 3 s après 28 s. La carte occupe tout le héros, sous le titre et le blason, sur un ciel de nuit en dégradé bleu nuit vers noir ; plus de bande noire ni de coupure au pied de l'îlot (il reste à environ 90 px au-dessus du blason, sur le ciel). Réserve de rendu : en dev-iso, le ciel commence sous la barre de débogage, d'où un bord net à y=210 (affichage) entre la barre noire et le ciel ; en production le héros part du haut de l'écran, ce bord n'existe pas.
- **b. Glissé** : la carte suit le doigt (île décalée en haut et à gauche, un peu rognée par le haut du héros, ce qui est le comportement d'un pan), le ciel reste fixe derrière.
- **c. Police 1,3** : cadrage de la carte identique à a), seuls les textes dessous grossissent.
- **d. Taps** : tap sur le moulin ouvre la fiche Windmill ; tap sur le blason ouvre « Why the Bear? ».
- **Gestes** : la page défile quand le glissé part de la liste ; le glissé qui part de la carte déplace la carte (un glissé depuis y=700 n'a pas fait défiler la page). Pendant le défilement (`b-defile-*`), l'île part avec la page et se fond sous le titre : normal, elle fait partie du héros. Piège de mon protocole : mes premiers taps (bâtiment, blason) sont tombés page défilée ; refaits page en haut (les `d-*` sont ceux de la reprise).
- **Production** : `05-prod-t2.png` contre `L4-T05/05-prod.png` : 678 pixels diffèrent, tous dans la boîte de l'horloge (81,54)-(150,82). Identique.

Non vérifié : zoom réel (pas de pincement possible), écran compact, glissé qui part du titre.

## Tour 3

Build : `.perf` neuf (partagé avec L4-T07b, `evidence/L4-T07b/build.log`, BUILD SUCCESSFUL), `install -r` OK. Captures : `evidence/L4-T11/ecran-t3/` (brut et recadré y=264).

Verdicts : haut sous la barre d'état OK ; titre et blason lisibles OK ; blason tapable OK ; tap bâtiment bas OK.

- **a. Haut au repos** (0 image sur 3 s) : l'îlot est cadré plus bas ; son sommet (le rail et la tour) reste à environ y=430 (affichage), bien sous la barre d'état et la barre de débogage ; le pied descend à y=795, donc sous la ligne du haut du blason (760) mais seulement à droite (x=650), loin du blason (x<183) et du texte du titre (x<410) : le coin gauche de l'îlot passe à y=690 à x=183, au-dessus du blason. Titre « Isoville » et blason restent lisibles sur le ciel et l'îlot (contraste net, le dégradé du bas fond le pied).
- **Blason** : tap à (133,1000) ouvre « Why the Bear? » (`b-blason-*`).
- **Bâtiment bas** : le bâtiment le plus bas est l'escalier de pierre de la carrière (à environ y=700 affichage, près du bord haut du titre) ; tap à (780,835) ouvre la fiche Quarry (`c-tap-bas-*`). Aucun bâtiment ne se trouve derrière le titre ou le blason eux-mêmes.
- Piège noté : la touche retour fermait l'application au lieu de la fiche (fiche fermée en tapant « Close »).
Non vérifié : écran compact, police agrandie sur cette version.
