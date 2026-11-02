# L4-T05 (qa) : comportement sur émulateur, carte muette pour TalkBack

Build : `.perf` neuf depuis l'arbre non commité (base e8cd4afa), `BUILD SUCCESSFUL`, Gradle arrêté, `install -r` OK. Pas de mesure de perf (suspendues).
Preuves : `docs/designs/village-iso-v1/evidence/L4-T05/` (`build.log`, `run1-3.log`, captures `0*.png`, dumps `ui-*.xml`, `a11y-nodes.txt`, `prod-count.txt`).

## Verdicts
1. Build + install : OK.
2. Flux `.maestro/iso-batiments.yaml` x3 : OK, après correction du flux (voir ci-dessous). 3/3 verts, 19 étapes `COMPLETED` chacun (les 4 points en px passent du premier coup : 264,783 ; 674,818 ; 787,863 ; 853,656).
3. `uiautomator dump`, mode Village, drapeau iso : OK pour les nœuds actionnables, réserve sur le rang.
4. Tap bâtiment / tap ligne : OK.
5. Drapeau éteint, onglet de production : OK (inchangé).

## Détails
**2. Correction du flux (fichier qa).** Les trois premiers essais échouaient à l'étape « Assert iso-mode-village visible » : après le basculement en mode Village, le bouton visible est `iso-mode-carte` (« Carte seule », `app/dev-iso.tsx:117`), `iso-mode-village` n'existe qu'en mode carte seule. Le flux attend maintenant `iso-mode-carte` avant les taps par points. Aucun point n'a eu besoin d'être relevé. Aucune autre modification.

**3. Dump** (`ui-village.xml`, `ui-liste.xml`, `a11y-nodes.txt`) :
- Plus aucun `iso-batiment-*`. Les seuls nœuds `iso-*` restants (`iso-carte`, `iso-maquette-*`, `iso-piece-*`, `iso-socle-*`, `iso-voile-*`, `iso-figurine-*`) sont tous `clickable=false`, sans `content-desc` ni texte. Ils apparaissent encore dans le dump parce que `uiautomator dump` inclut les vues « non importantes » ; le conteneur `iso-village` porte `importantForAccessibility="no-hide-descendants"` (`IsoVillage.tsx:130`). Je n'ai pas vérifié avec TalkBack réel ni avec `dumpsys accessibility` : le dump seul ne prouve pas que le service les ignore, il prouve qu'aucun n'est annoncé ni actionnable.
- Présents : `iso-mode-carte` et `iso-grandir` (clickable), `village-title`, `village-crest` (desc « Why the Bear? », clickable), 15 `village-building-row` clickables avec `content-desc` (nom du bâtiment), et la carte « Next to rise ».
- **Écart avec l'énoncé** : le `content-desc` des lignes est le nom seul (« Campfire », « Tent »...), pas le rang (`accessibilityLabel={name}`, `VillageLists.tsx:286-297`). Le rang est affiché à l'écran (« rank 1 ») mais n'est pas dans le libellé du dump. À trancher par le chef d'équipe : si le rang doit être annoncé, c'est une modification de code, pas de test.
- Les boutons de zoom (`-`, `+`, `Cadrer`) n'existent qu'en mode carte seule, pas en mode Village ; le fichier de référence `L4-T02/maestro/a11y-nodes.txt` ne listait que les `iso-batiment-*`, donc pas de base de comparaison pour eux. Titre et blason présents.

**4. Taps.** Carte : le flux ouvre et ferme les fiches Windmill, Forge, Training Dummy / Tent-type et Quarry (textes « Rises with your shoulders / chest / back / every rep of calisthenics »), 3 fois. Liste : `input tap 540 1670` sur la ligne Campfire ouvre la fiche Campfire (`03-fiche-ligne-campfire.png`, rang 1, « Grows with your hero »). Une seule ligne testée.

**5. Production.** Force-stop, `bati://village` : `iso-village`/`iso-carte` = 0, `iso-batiment` = 0 (`prod-count.txt`), onglet Village avec son image de héros et la barre d'onglets (`05-prod.png`).

## Non vérifié
TalkBack réel ; lignes de liste autres que Campfire ; nom exact du bâtiment de chaque point de flux (les assertions portent sur le texte de la fiche, pas sur le nom).
