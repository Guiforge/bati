# L4-AUD (qa) : B1, flux iso-batiments rejoué sur l'arbre d'audit

Date : 2026-10-29. Base : 85a86766 + corrections d'audit non commitées. Émulateur emulator-5554, `.perf`, base jamais touchée.
Preuves : `docs/designs/village-iso-v1/evidence/L4-AUD/` (`build.log`, `avant/run1-3.log`, `b1-3.log`, `00-ouverture.png`, `village-recadre.png`, `repos-gfx.txt`).

## Verdicts
1. Build + install : OK (`BUILD SUCCESSFUL in 1m 17s`, Gradle arrêté, `install -r` Success).
2. Flux x3 : OK après ajout de l'attente de 20 s. Avant l'attente : 1 KO sur 3.
3. Points : OK, aucun point changé (les 4 passent tels quels).
4. Onglet Village + repos : OK avec réserve (voir détails).

## Détails
**2.** Sans attente (flux inchangé) : run1 rc=1, échec à l'étape 13 `Assert "Rises with your chest" is visible` (le tap 674,818 n'a ouvert aucune fiche, la carte étant à son cadrage de vague) ; 10 étapes COMPLETED ; run2 rc=0 (19 COMPLETED) ; run3 rc=0 (19 COMPLETED). Instable, donc attente ajoutée à `.maestro/iso-batiments.yaml` après `iso-mode-carte` : `evalScript` en boucle d'attente de 20 s (Maestro n'a pas de sleep ; `waitForAnimationToEnd` sortirait tôt). Avec l'attente : b1 rc=0, b2 rc=0, b3 rc=0, 20 étapes COMPLETED chacun, 0 FAILED. L'en-tête du flux n'a pas changé : les points sont les mêmes.

**3.** Points inchangés : 264,783 ; 674,818 ; 787,863 ; 853,656. Pas de relevé nécessaire (le raté du run 1 venait du timing, pas de la position : mêmes points OK dans les 5 autres passes).

**4.** `village-recadre.png` (1080x2136, haut recadré) : onglet Village du dev-iso en mode Village, palier 1, après 20 s. Comparé à `evidence/L4-T08a/village-haut-recadre.png` : même titre, blason, rang, cartes. Différences constatées, à trancher par le chef d'équipe :
- la carte est décalée vers le bas d'environ 245 px et les boutons « Carte seule / Grandir » sont au-dessus (carte sur toute la hauteur du héros, commit 7ef9c7ae, voulu) ;
- le bâtiment au centre-droit est une tour ronde à toit rouge, là où la référence montrait une maison bleue à toit rouge. Je n'ai pas cherché la cause (état des rangs ou variante) ;
- aucun animal visible sur la capture.
Repos : 20 s sans toucher, puis reset `gfxinfo` et 10 s : `Total frames rendered: 0`, `Janky frames: 0`. OK.
Note : `bati://village` ouvre l'onglet de production (drapeau éteint, image de héros), qui ne se compare pas à la référence ; la comparaison vient du bouton « Onglet Village » de `bati://dev-iso`.

## Non vérifié
Cause de la tour ronde vs la maison ; flux avec attente sur un téléphone ; comparaison pixel à pixel.

## Tour 2 : la « tour ronde » à la place de la forge

Build refait depuis l'arbre du moment (`evidence/L4-AUD/build2.log`, BUILD SUCCESSFUL, install -r OK, base intacte), mode Village, palier 1, après 20 s. Preuves : `village2-recadre.png`, `ui-village2.xml`, `rangs.txt`.

- **La tour est toujours là, et le testID dit forge.** `iso-maquette-forge` bounds [583,582][755,840] et `iso-socle-forge` [640,766][734,811] couvrent exactement la tour ronde à toit rouge (zoom vérifié). Voisins : `iso-maquette-well` [620,545][718,693], `iso-maquette-archery_range` [620,521][865,766], `iso-maquette-quarry` [693,638][865,895].
- Les trois sprites de forge de l'arbre (`assets/images/village/iso/forge/{rough,solid,grand}.nuit.webp`, et `blockout/forge/*`) sont des maisons à cheminée : aucun n'est une tour ronde. Le sprite affiché à cet endroit ne vient donc d'aucun fichier forge : c'est un bug de rendu ou de clé de sprite, à chercher par l'ingénieur (je n'ai pas lu le code qui choisit l'image). Hypothèse, non vérifiée : la tour ressemble à un corps de moulin sans ailes.
- Rangs dans la liste du Village (`rangs.txt`) : Forge 2, Well 1, Farm 1, Windmill 1 (Archery Range 2, Campfire 1, Quarry 1, Tent 1, Training Dummy 1, Wizard Tower 1). La forge est à 2 (stade solid attendu), donc l'hypothèse « base d'émulateur différente de L4-T08a » est possible pour le stade, mais pas pour la forme : même solid, ce serait une maison.
- Fenêtre de build écartée en partie : le second build donne la même tour.
- **Chat : montré.** `iso-animal-chat-repos` [588,654][602,664], juste à gauche du puits (le puits est sur l'île) ; poule `iso-animal-poule-repos` [479,599][494,607].

Verdict Tour 2 : KO. La forge est dessinée avec une tour ronde (bug réel, aucun sprite forge ne correspond).

## Tour 3 : `recyclingKey={testID}` dans `Planche`

Build refait (`evidence/L4-AUD/build3.log`, BUILD SUCCESSFUL en 1m29, `install -r` Success, base intacte). Mode Village via « Onglet Village », 20 s d'attente.

1. **La forge est toujours une tour : KO.** `t3-forge-1.png` (recadrage 360x340 autour de [583,582]) montre la tour ronde à toit rouge, pas une maison.
2. **5 passes force-stop, ouverture, mode Village : tour 5 fois sur 5** (`t3-forge-1.png`, puis `t3-forge-r2-r5.png` pour les passes 2 à 5, côte à côte). Après « Carte seule » puis retour en mode Village (`t3-forge-retour.png`) : tour aussi. Rien d'intermittent : la tour est systématique, `recyclingKey` n'y change rien.
3. **Sonde `iso-charge-*`** (mode Carte seule, `ui-carte3.xml`) : `iso-charge-forge` = « forge 187x280 n=1 src 896x1344 », `iso-charge-windmill` = « windmill 187x280 n=1 src 896x1344 ». La sonde ne donne que taille et nombre de chargements (n=1 chacune), pas le nom du fichier, et les deux vues ont la même taille : elle ne peut pas dire quel bitmap la vue forge affiche. Elle exclut seulement un rechargement répété. Confirmation visuelle : `assets/images/village/iso/windmill/rough.nuit.webp` est exactement cette tour (toit court, trou du pivot, porte rouge), donc l'ingénieur a raison sur l'identité du sprite. Au palier 12 en Carte seule, l'emplacement de la forge ne m'a pas permis de trancher (`t3-carte.png`).
4. **Flux `.maestro/iso-batiments.yaml` x1** (`t3-maestro.log`) : rc=0, 20 étapes COMPLETED, 0 FAILED. Il tape par point et vérifie le texte des fiches, pas l'image : il passe malgré la tour.

Verdict Tour 3 : KO. La tour du moulin rough reste affichée à la place de la forge, 5/5 après force-stop et après aller-retour de mode ; la mitigation `recyclingKey` est sans effet sur cette build. Le défaut est donc déterministe, pas un recyclage aléatoire : chercher la clé d'image choisie pour la vue forge au rang 2 (ou la source passée à expo-image), pas le cache.

## Tour 4 : cache disque périmé ?

Build refait (`build4.log`, BUILD SUCCESSFUL en 1m35, `install -r` Success, base intacte). Preuves : `ui-t4-avant.xml`, `ui-t4-apres.xml`, `t4-forge-avant.png`, `t4-forge-apres.png`, `t4-forge-3x.png`, `t4-avant.png`.

1. **Avant vidage** (mode Village, 20 s) : forge = tour ronde. Sondes : `forge 187x280 n=1 ask assets_images_village_iso_forge_roughnuit got android.resource://com.guiforge.bati.perf/2131231291` et `windmill ... ask assets_images_village_iso_windmill_roughnuit got ...2131231300`. Vérification dans l'APK (`aapt2 dump resources`) : 0x7f08023b = 2131231291 = `drawable/assets_images_village_iso_forge_roughnuit`, 0x7f080244 = 2131231300 = windmill_roughnuit. Donc la demande et l'id sont corrects : ce n'est pas un décalage d'id côté JS.
2. **Après `iso-vider-cache` (tap 850,194), force-stop, réouverture, mode Village, 20 s** : mêmes sondes (même ask, même got), et la forge est une maison à cheminée (`t4-forge-apres.png`).
3. **Cas (a) : cache périmé.** Même requête, même id de ressource, image fausse avant le vidage, juste après. Le cache disque de Glide contenait l'ancien bitmap de cet id (id décalé par l'ajout des animaux, `install -r` conserve le cache).
4. **3 passes force-stop, ouverture, mode Village** (`t4-forge-3x.png`) : forge juste 3 fois sur 3.

Conséquence à noter : tout appareil qui a installé une build antérieure par-dessus (le Fairphone de Guillaume) peut afficher de mauvais sprites tant que le cache n'est pas vidé ; le versionCode 21301 identique sur toutes les builds en est la cause. Non testé : la correction durable (versionCode, clé de cache) ; seuls le vidage manuel et ses effets sont vérifiés.
