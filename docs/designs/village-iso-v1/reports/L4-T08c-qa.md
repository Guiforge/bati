# L4-T08c + L4-T10 (qa) : comportement sur émulateur, animaux et glissé depuis le titre

Statut proposé : prêt pour revue
Auteur : qa
Tour de revue : 1

Build : `.perf` neuf depuis l'arbre non commité (base 9c3c10ff), BUILD SUCCESSFUL en 3 min 31 (`evidence/L4-T08c/build.log`), Gradle arrêté, `install -r` OK, base intacte. Perf suspendue : comportement et compte d'images au repos seulement. Aucun fichier > 1,5 Mo dans `evidence/L4-T08c/`, pas de vidéo brute (films gardés dans le scratchpad, images extraites à 30 i/s).

## Verdicts
1. Build + install : OK.
2. Animaux, figurines, vague (L4-T08c) : OK, avec une réserve de cadrage sur la poule.
3. Tap sur un animal : OK (chat exact ; poule au jugé ; corbeau non touché).
4. Repos, 0 image et dump < 5 s : OK.
5. Glissé depuis le titre (L4-T10) : OK depuis le nom et le blason ; KO depuis la zone vide de la rangée du titre (le glissé va à la carte, la page ne défile pas).
6. TalkBack, libellés de la liste : OK.
7. Drapeau éteint, production : OK.

## Détails
**2. Placement.** Palier 12 puis palier 6, mode « Carte seule », zoom des boutons `+`. Recadrages y=264 : `p12-recadre.png`, `p6-recadre.png`, `p12-ouest-recadre.png`, `p6-ouest-recadre.png` (bord ouest). Agrandissements par animal : `p12-chat-zoom.png`, `p12-poule-zoom.png` (x4), `p12-poule-zoom8.png` (x10), `p12-corbeau-zoom.png`, `p6-chat-zoom.png`, `p6-poule-zoom.png`, `p6-corbeau-zoom.png`.
- Chat : sur l'herbe, au centre de sa case, au sud-ouest du puits, son ombre dans la case, rien ne le recouvre. Aux deux paliers.
- Corbeau : sur l'herbe, au centre de sa case, bord ouest, ombre dans la case, entier. Aux deux paliers.
- Poule : sur l'herbe, au centre de sa case, ombre dans la case, contre l'angle du toit de la grange de la ferme. **Réserve** : la pointe de la queue touche l'arête du toit (`p12-poule-zoom8.png`) ; elle est peut-être mordue d'un ou deux pixels par le tri de profondeur. Pas coupée de façon visible à l'échelle de l'écran, mais c'est la case la plus serrée.
- Figurines de villageois : posées sur leur ombre, pieds dans l'ombre (`p12-figurines-zoom.png`, `p6-recadre.png`). Plus de demi-case trop bas.
- Les trois animaux sont montés dès le palier 6.

**2. Film de la vague.** Trois films de 17 à 24 s (écran à 60 Hz, extraction à 30 i/s), la vague part à l'ouverture. Mesure par différence d'image dans la boîte de chaque animal, rapportée à la dernière image (repos) :
- Poses : un cycle de 0,5 s, 12 images (0,4 s) qui diffèrent du repos puis 3 images identiques au repos, répétées sans interruption pendant toute la vague (chat : de 7,27 s à 17,4 s sur le film zoomé, de 3,4 s à 17,5 s sur le film au cadrage par défaut). Planche `film-chat-frames-200.png` (24 images consécutives) : assis, puis deux poses de marche, sans changement de place, sans image blanche ni vide ; la poule suit le même cycle (`film-poule-frames-200.png`). Aucune image où l'animal manque. `film3-chat3-frames-480.png` : les dernières images, au repos.
- Retour au repos : l'enregistrement s'arrête à 17,2 à 17,6 s parce que l'écran ne change plus ; la dernière image est identique aux images de repos du cycle. Sur le film 1, la différence à la dernière image est 0 sur toute la carte de 17,5 s à la fin.
- Le chat et la poule sont en phase (mêmes bornes de segments). Non mesuré : le corbeau en film (hors cadre au zoom utilisé).

**3. Tap.** Au repos, `gfxinfo` remis à zéro, taps sur le chat (590,1532) puis sur la poule (482,1432) : 0 image, capture identique à l'avant (seule l'horloge de la barre d'état diffère), aucune fiche ouverte. Le chat est visé au pixel (position lue sur la capture) ; la poule au jugé (l'image est trop petite pour garantir la touche) ; le corbeau n'a pas été touché (hors cadre au zoom par défaut).

**4. Repos.** Après 20 s sans toucher, `gfxinfo reset`, 10 s : `Total frames rendered: 0`, Janky 0, deadline missed 0 (`repos-gfx.txt`). `uiautomator dump` : 2,07 s (`repos-uia.txt`).

**5. L4-T10, mode « Onglet Village »** (`village-haut.png`, `village-glisse-titre.png`, `village-blason.png`). Mesure par recherche de décalage entre captures (texte de la carte du palier pour la page, bâtiments de l'île pour la carte). La carte a un parallaxe de 0,35 voulu (`PARALLAX_FACTOR` dans `VillageScene.tsx`), donc une page défilée de 281 px déplace l'île de 183 px (0,65 = 1 - 0,35) : c'est le défilement de la page, sans glissé de caméra (décalage horizontal 0).
- Glissé vertical depuis le nom (366,1010), 1,5 s, 300 px : page -281 px, île -183 px, dx 0 : la page défile, la carte n'est pas déplacée. Reproduit à plusieurs hauteurs de 970 à 1040 et de x=235 à 480.
- Glissé vertical depuis le blason (130,1050) : la page défile (-187 px). Le tap sur le blason ouvre « Why the Bear? » (`village-blason.png`) ; fiche fermée par son bouton « Close ».
- Glissé sur la carte, au-dessus du titre : horizontal de 400 px depuis y=600, île décalée de 43 px ; horizontal depuis y=940, île décalée de 84 px (butée). La carte se déplace toujours.
- **KO, zone vide du titre.** Glissé vertical depuis la rangée du titre mais hors du nom et du blason, par exemple (700,1010) ou (366,1080) : la page ne défile pas (plusieurs essais, toujours le même résultat) ; la carte reçoit ce toucher (un glissé horizontal à (550,1010) ou (550,1090) la déplace de 84 px), donc rien n'est perdu, mais « glissé depuis la zone vide du titre fait défiler la page » est faux.
- **Zone de la carte devenue intouchable sous le titre** (là où un glissé ne déplace plus la carte) : le blason, x 47 à 221, y 912 à 1109 (174 x 197 px, 34 300 px²) et la boîte du nom, x 247 à 485, y 968 à 1052 (238 x 84 px, 20 000 px²), soit environ 54 000 px² au total, sur un écran de 1080 x 2400. Le trou entre le blason et le nom (x 221 à 247) et le reste de la rangée restent à la carte. Le blason était déjà un bouton ; ce que le changement ajoute est la boîte du nom.

**6. TalkBack.** `uiautomator dump` (`village-uia.txt`, `liste-uia.txt`) : `Wizard Tower, rank 1`, `Campfire, rank 1`, `Tent, rank 1`, `Training Dummy, rank 1` ; `Watchtower, Not built yet`, `Castle Wall`, `Armoury`, `Fountain`, `Observatory`, `Barn`, `Dragon Lair`, `Hall of Heroes`, `Champion Arena`, `High Road`, tous suivis de « , Not built yet ». Chaque ligne de la liste a un content-desc de la forme demandée.

**7. Production, drapeau éteint.** Force-stop, `bati://village` : `05-prod.png` contre `evidence/L4-T11/05-prod-t2.png` : 1050 pixels diffèrent au-dessus du seuil, tous dans la bande y 54 à 82 de la barre d'état (horloge et icônes). Identique. Repos : 1 image sur un premier relevé de 10 s (chargement), 0 sur le second (`prod-repos.txt`).

## Non vérifié
Zoom au pincement (impossible) ; netteté des animaux au zoom maximum ; tap exact sur la poule et le corbeau ; corbeau en film ; mouvement réduit ; TalkBack réel (dump seulement) ; perf (suspendue).

## Pour la suite
- Piège : `am start -n com.guiforge.bati.perf/.MainActivity` échoue (classe absente) ; `am start -a VIEW -d bati://... com.guiforge.bati.perf` marche.
- Piège de mesure : un glissé vertical qui « ne fait rien » n'est pas perdu, la carte le reçoit (caméra bornée) ; mesurer par décalage d'image, pas à l'œil.
- À décider côté ingénierie : étendre la capture de toucher à toute la rangée du titre, ou garder le blason et le nom seuls.
