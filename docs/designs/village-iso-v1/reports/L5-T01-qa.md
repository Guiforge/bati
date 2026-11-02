# L5-T01 (qa) : captures du sol varié

Date : 2026-10-29. Arbre non commité sur 6b5ef155. Émulateur emulator-5554, `.perf`, base jamais touchée.
Preuves : `docs/designs/village-iso-v1/evidence/L5-T01/`.

## Méthode
Build `.perf` neuf (`build.log`, BUILD SUCCESSFUL en 1m43, démons Gradle arrêtés), `install -r` Success. Avant les captures : `iso-vider-cache` (tap 850,194), force-stop, réouverture par `am start`, attente de 22 s. Les sondes `iso-charge-*` donnent forge_grandnuit / windmill_grandnuit avec les bons ids (2131231290 / 2131231299) au palier 12 : pas de sprite périmé. Recadrage sous la barre de débogage (le texte des sondes recouvre le haut de la carte, donc le recadrage coupe à y=1200 en carte seule).

## Captures
- a) `village-brut.png`, `village-recadre.png` : onglet Village, palier 1 (rangs de la base), après 20 s. Le défilement de la page diffère de `L4-AUD/village-recadre.png` (la barre de débogage plus haute pousse la page, les boutons Carte seule / Grandir sont hors cadre). Forge = maison à cheminée, plus de tour.
- b) `carte12-brut.png`, `carte12-cadrage.png` : Carte seule, palier 12, cadrage.
- c) `zoom-brut.png` / `zoom-chemin-recadre.png` (9 appuis sur +, centre du village, chemin et galets), `zoom2-brut.png`, `zoom3-brut.png` / `zoom-bord-recadre.png` (bord sud-est de l'îlot), `zoom-chemin-3x.png` (agrandissement x3 d'une zone de chemin).
- d) `parcelles-2x.png` : x2 de l'onglet Village, parcelles de terre (tir à l'arc, carrière, tente, puits, feu).
- Repos : `repos-gfx.txt`.

## Ce que je vois (sans juger le style)
- **Motif répété** : au cadrage palier 12, plus de damier à deux teintes. Les cases d'herbe ont 4 à 5 teintes (vert sombre, vert-gris, un peu de vert olive), mais à cet éloignement le sol reste un patchwork de losanges de 1 case, régulier à l'échelle de la maille ; pas de répétition d'un groupe de cases repérable à l'œil. Les décals de touffes sont tous de la même forme et de la même taille ; deux ou trois touffes identiques se retrouvent côte à côte au zoom.
- **Décals, la nuit** : lisibles en zoom max : touffes (contour sombre, peu de contraste avec l'herbe), feuilles ocre (visibles), fleur violette (visible, rare), cailloux gris clair (visibles). Au cadrage, seuls les galets et les cailloux se lisent (petits points clairs), les touffes et les feuilles se perdent. Les galets de bord de chemin (ellipses gris clair cernées d'encre) se lisent partout et forment des lignes pointillées le long des chemins ; ils sont plus contrastés que le reste.
- **Coutures** : aucune ligne claire entre tuiles voisines sur les captures (pas de trait de fond visible). Les bords de losange montrent un fin liseré d'anticrénelage sombre au zoom x3, sur toutes les jonctions, y compris entre deux teintes voisines. Aucun décal coupé au bord d'une tuile vu sur les captures (galets et touffes entiers). Au zoom x3 un galet touche l'angle d'une case sans être coupé.
- **Bord de l'îlot** : au zoom max, le bord sud-est montre les dernières cases d'herbe plus sombres, puis le fond noir ; la transition est franche (bord net en losange), les arbres de la lisière sont posés au-delà et ne recouvrent pas le bord. L'assombrissement se lit comme un dégradé court sur 1 à 2 cases, mais ne fond pas l'îlot dans le noir. Au cadrage, le bord reste net.
- **Parcelles** : terre brune en 2 à 3 nuances sous un liseré d'encre ; visibles sous les bâtiments en maquette (tir à l'arc, carrière, puits, feu).
- **Chemin** : trois nuances de gris-bleu ; les cases claires se distinguent de l'herbe.

## Repos
20 s sans toucher, reset `gfxinfo`, 10 s : `Total frames rendered: 0`, `Janky frames: 0`. OK.

## Non vérifié
Perf (gardée pour la fin), Fairphone, autre ambiance (jour), comparaison pixel à pixel, matérialité d'une couture sur un écran à haute densité.

## Tour 2 (taches de 4 cases, brins pleins, galets irréguliers, bord sur 3 cases)

Build `.perf` neuf (`evidence/L5-T01/t2/build.log`, BUILD SUCCESSFUL en 2m04, démons arrêtés), `install -r` Success, vidage du cache par `iso-vider-cache` (tap 850,194 en mode Village), force-stop, réouverture, 22 s. Sondes : forge_roughnuit / windmill_roughnuit avec les bons ids (2131231291 / 2131231300) : pas de sprite périmé. Mêmes cadrages et mêmes gestes qu'au tour 1 (9 appuis sur +, 2 balayages puis 1 pour le bord).
Preuves (`evidence/L5-T01/t2/`) : `carte12-cadrage.png`, `zoom-chemin-recadre.png`, `zoom-chemin-3x.png`, `zoom-bord-recadre.png`, `village-recadre.png` (+ bruts, `repos-gfx.txt`).

Par rapport au tour 1 :
- **Grille** : au cadrage, le damier de losanges de 1 case a disparu : le sol se lit en plaques plus larges, de 2 à 3 teintes, aux bords en escalier. Au zoom, les losanges d'une même teinte se fondent sans trait entre eux ; il reste un liseré d'anticrénelage fin et rare à la jonction de deux teintes différentes (visible sur le x3 comme un trait clair, légèrement pointillé). Pas de couture à l'intérieur d'une plaque.
- **Touffes** : brins pleins, sans contour, gris sombre : moins lisibles qu'au tour 1 (contour encré) ; elles se devinent au zoom max, invisibles au cadrage. Feuilles (ocre, forme hexagonale) et fleur violette toujours lisibles.
- **Galets** : tailles et formes variées (ellipses plus ou moins larges, parfois deux accolés), alignés le long de la bordure chemin/herbe comme avant mais sans la régularité de perles du tour 1. Toujours bien contrastés.
- **Bord de l'îlot** : le sol s'assombrit sur 3 cases vers le sud-est ; dernière rangée presque de la couleur du fond, la limite avec le vide est nettement adoucie. L'îlot se fond mieux dans la lisière qu'au tour 1, sans disparaître (le bord reste lisible sous les arbres).
- **Décals coupés** : aucun vu.
- **Onglet Village** : `village-recadre.png`, forge en maison, palier 1, parcelles et chemin lisibles, plaques larges visibles.

Repos : 20 s sans toucher, reset `gfxinfo`, 10 s : `Total frames rendered: 0`, `Janky frames: 0`. OK.
Non vérifié : perf, Fairphone.
