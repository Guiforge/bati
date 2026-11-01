# Bible de style du village iso

Mara, 31/10. Mise à jour de la DA existante (DESIGN.md, DECISIONS.md, FIN-CAR, AUDIT-DA tour 2, T41, FIN-BAT), pas un départ de zéro. Grille de notes : `docs/designs/village-loop/rubric.md`.

**En une phrase : la carte de Thronebreaker, encrée par un dessinateur de BD belge.** Un monde peint, chaud, dense et vivant, avec le trait sombre et la gentillesse de Bati.

## 1. Le style cible en règles
1. **Peint, jamais plat.** On voit le pinceau sur le sol, les toits et le feuillage : touches visibles, bords cassés, deux ou trois valeurs dans chaque aplat. Aucune surface en couleur unie de plus d'un quart de case.
2. **Encré.** Bâtiments, décor solide et personnages ont un contour d'encre. Le sol, les routes, l'eau, la brume et la lumière n'en ont jamais (décision du 30/10 sur les routes).
3. **Une lumière, chaude, de gauche.** Les faces gauches et les toits prennent la lumière, les faces droites sont à l'ombre froide. Les ombres portées partent vers la droite de l'écran.
4. **Trapu et un peu exagéré.** Toits hauts (la moitié de la hauteur au moins), colombages, chaume ou tuiles rouille, socle de pierre visible. Une silhouette doit se reconnaître en noir plein.
5. **Plein.** Chaque case bâtie porte des accessoires. La place n'est jamais vide.
6. **Vivant.** Toujours au moins une chose qui bouge à l'écran : fumée, bannière, eau, oiseau, villageois.
7. **Le camp grandit.** Chaque palier ajoute des bâtiments, des accessoires et de la vie. Rien ne disparaît, rien ne recule.

## 2. Lumière
- **Direction** : azimut 225°, élévation 55° (`constants/isoSpec.json`, `moon`), vérifiée dans le code (`components/village/iso/ombres.ts`) et sur les sprites (forge, moulin : face gauche claire, face droite sombre). La lumière vient de la gauche de l'écran.
- **Lumière chaude** : `#F2E2B4` sur les faces éclairées (lavis), `#F0A848` pour les reflets dorés des bords de toit.
- **Ombre** : `#2E3552`, ardoise bleu à peine violet. L'ombre portée reste un aplat opaque calculé à l'avance (ton du sol mêlé à 40 % de `#2E3552`), jamais une transparence (décision du 28/10).
- **Longueur** : 0,70 fois la hauteur, vers la droite. On ne l'allonge pas : la règle d'écart des ombres (`__tests__/iso-layout.test.ts`) interdit une élévation sous 55°. L'effet « longue ombre douce » s'obtient par un bord fondu en deux crans, pas par la longueur.
- **Ambiance de référence** : fin d'après-midi dorée (`jour`, prévue dans `isoSpec.json`). La nuit (§9) est la seconde ambiance, celle du « waouh ».

## 3. Palette (17 hex)
| Rôle | Hex | Origine |
| --- | --- | --- |
| Herbe au soleil (olive) | `#6A7442` | `isoPreSec` |
| Herbe mousse, mi-ton | `#435A36` | `isoPreMousse` |
| Herbe profonde, sous-bois | `#25402F` | `isoPreProfond` |
| Chemin de terre | `#7A5A38` | `isoTerre` |
| Ocre, terre au soleil, chaume éclairé | `#C2944E` | nouveau |
| Tuiles rouille | `#9A4E32` | nouveau, plus chaud que `tile` |
| Enduit des murs | `#C9B48C` | nouveau |
| Bois | `#6B4A2E` | nouveau, entre `wood` et `isoTronc` |
| Pierre chaude | `#8C7A66` | `isoPierreChaudeClair` |
| Pierre à l'ombre | `#584A3E` | `isoPierreChaudeSombre` |
| Eau bleu ardoise | `#4A6A7C` | nouveau |
| Feuillage | `#4C7A3E` | `isoHerbeHaute` |
| Lumière | `#F2E2B4` | `isoJourLavis` |
| Lueur chaude (fenêtres, lanternes, feux) | `#F0A848` | `isoLueur` |
| Ombre | `#2E3552` | nouveau |
| Encre | `#0F1518` | `isoInk` |
| Accent bannière | `#8A2432` | `isoBanniere` |

Les nouveaux hex vont dans `constants/rawColors.ts` et nulle part ailleurs. Les gris-bleus de nuit (`isoGrass`, `isoPath`, `thatch` bleu) ne servent plus au rendu de jour.

## 4. Règles de peinture (identiques partout)
- **Texture** : moyenne. Touches de pinceau lisibles à zoom 1, fondues à zoom 0,6. Pas de grain photo, pas de bruit.
- **Détail par case** (S = 384 px) : 3 à 6 petites formes lisibles (tuiles, pierres, planches, touffes). Au-delà, ça devient du bruit au téléphone.
- **Trait d'encre** : `#0F1518`, 8 px de contour extérieur à l'échelle S (`lineThicknessPx`), 4 px pour les lignes intérieures. Même épaisseur pour bâtiments, décor et personnages (les villageois rejoignent les bâtiments, lot 5).
- **Trois tons par matière** (dessus, éclairé, ombre), chauds côté lumière, froids côté ombre.
- **Pas de dalle** : le bâtiment pose sur un socle de pierre qui finit dans l'herbe, avec herbe qui déborde, galets, terre battue. La dalle carrée sombre des sprites actuels disparaît.

## 5. Atmosphère (en code)
| Couche | Comment | Outil |
| --- | --- | --- |
| Brume des bords | dégradé `#C9C2B0` à 0 puis 35 % vers les bords du monde, jamais sur le village | react-native-svg `RadialGradient` |
| Ombres de nuages | 2 ou 3 taches floues `#2E3552` à 18 %, qui traversent en 40 à 60 s | Svg + Reanimated `translateX` |
| Rais de lumière | 3 bandes obliques `#F2E2B4` à 10 %, venant de la gauche, qui respirent | Svg `LinearGradient` + opacité |
| Vignette | coins assombris à 25 % vers `#2E3552` | Svg fixe |
| Étalonnage | voile chaud `isoJourVoile` le jour, voile bleu nuit `isoNuitVoile` la nuit | existe |

Attention : Guillaume a retiré la brume avec le ciel le 30/10, et FIN-CAR dit « ni brume ni voile ». Ici la brume reste au sol, aux bords seulement. **À faire valider par Guillaume** avant de la coder.

## 6. Vie
- Fumée des cheminées en colonnes qui penchent un peu à droite (existe, `isoFumee`).
- Bannières au vent (existent), une ondulation lente, jamais synchronisées.
- Oiseaux en vol le jour, corbeaux sur les toits (existent).
- Eau animée : rides et écume qui glissent sous le pont, roue du moulin qui tourne.
- Feuillage qui ondule : une légère oscillation des bosquets par groupes.
- Nuit : fenêtres et lanternes allumées, lucioles (existent).
- Villageois aux actions lisibles : forger, puiser, porter, balayer, lire, dormir (planches `repos_*` existantes).

## 7. Composition
- **Diorama** : le village au centre, le monde qui continue autour (champs, haies, bosquets), pas d'île sur l'eau (FIN-CAR).
- **Un bâtiment héros** : la salle des héros, la plus haute silhouette chaude, vers où les chemins convergent.
- **Chemins courbes** : aucune rue droite en croix. Les chemins sortent du village et serpentent.
- **Une rivière et un pont** : la rivière traverse en diagonale, un pont de bois encré, un moulin à eau.
- **Pas de grille visible** : on décale décor et accessoires hors des cases, l'herbe passe sur les bords.

## 8. Densité
**Accessoires** : clôtures, charrettes, tonneaux, caisses, bottes de foin, tentes, bannières, feux de camp, potagers, bosquets, tas de bois, lanternes sur poteau, puits, épouvantail, enclos, sacs de grain, échelles, linge qui sèche.

**Petites histoires** (peintes ou en planche, toutes visibles sans toucher) :
1. Un chat qui dort sur le toit de la grange.
2. Un pêcheur assis au bout du pont, ligne dans l'eau.
3. Deux villageois qui se disputent devant la forge, un fer à cheval à la main.
4. Un enfant qui court après une poule dans le potager.
5. Une charrette de foin avec une roue cassée, le charretier qui se gratte la tête.
6. Un vieux qui fait la sieste contre un tonneau près du feu de camp.
7. Un renard qui guette l'enclos depuis la lisière.
8. Un apprenti qui monte un seau d'eau sur l'échafaudage du prochain chantier.

## 9. La nuit, un « waouh »
Toutes les fenêtres chaudes `#F0A848`, flaques de lumière au sol (règle du 28/10), lanternes sur les chemins, feu de camp et forge qui palpitent, lucioles. Sol bleu nuit avec encore de la couleur (mousse, ocre assourdi). Jamais un marais vert sombre : si la capture de nuit se lit vert sur vert, l'étalonnage est raté (repère 3 de la grille).

## 10. La montée de stade, image par image
Elle part de la révélation v2 (`components/village/iso/revelation.ts`), déclenchée au toucher du joueur.
1. **0 à 120 ms, anticipation** : l'ancien stade se tasse de 4 % et monte de 6 px (existe).
2. **120 à 240 ms, silhouette** : il devient une ombre chaude plate (existe).
3. **Avant le toucher, échafaudage** : le chantier montre déjà des poutres et une échelle, le joueur sait qu'il y a quelque chose à réclamer.
4. **240 ms, impact** : arrêt de 80 ms, anneau doré et bouffée de poussière `isoPoussiere` (existent).
5. **320 ms, rebond** : le nouveau stade arrive 6 % trop grand et se pose en 250 ms (existe).
6. **Avec l'impact, étincelles** : 8 à 12 points `#F2E2B4` qui montent et retombent. **Nouveau.**
7. **Avec l'impact, petit coup de caméra** : secousse de 3 px sur 120 ms, puis la caméra glisse doucement vers le bâtiment. **Nouveau.**
8. **570 ms puis 900 ms** : fenêtres et bannière s'allument, l'onde dorée traverse le village, la phrase d'histoire s'affiche (existent).

## 11. Trait Thronebreaker vers Bati
| Trait | Comment on l'obtient | Code, peinture ou les deux |
| --- | --- | --- |
| Sol peint au pinceau | tuiles de sol repeintes par FLUX, raccords testés | peinture |
| Palette terreuse chaude | §3, tokens dans `rawColors.ts` | les deux |
| Lumière chaude de gauche | tons par matière dans la peinture, voile chaud en code | les deux |
| Ombres douces froides | aplats calculés, bord fondu en deux crans | code |
| Brume, rais, ombres de nuages | §5 | code |
| Bâtiments trapus, toits hauts | blockouts Blender puis peinture | peinture |
| Densité de décor | accessoires peints posés par la graine | les deux |
| Vie partout | Reanimated sur l'horloge unique | code |
| Points d'intérêt qui brillent | halo doux `#F0A848` qui respire sur le bâtiment prêt à monter | code |
| Camp qui grandit | données du journal, paliers | code |
| Trait d'encre BD | contour 8 px dans la peinture | peinture |
| Contenu Bati (gardien, blason, statues) | sprites existants | peinture |

## 12. À ne pas faire
- Vectoriel plat, aplats unis, formes géométriques nettes sans pinceau.
- Dégradés brillants, reflets de plastique, contours lumineux de jeu mobile.
- 3D réaliste, rendu Blender visible, arêtes low-poly.
- Épaisseurs de trait mélangées, ou de l'encre sur les routes et le sol.
- Place vide, case bâtie sans accessoire.
- Bâtiments posés sur leur dalle sombre.
- Petit village perdu dans une grande forêt sombre (repère 3 de la grille).
- Tout élément copié : composition, bâtiment, personnage, interface ou logo de Thronebreaker. Aucune image du jeu dans le dépôt ni envoyée à FLUX.
- Toute mécanique qui casse une promesse : monnaie, boutique, minuteur d'attente, retour en arrière, montée sans le toucher du joueur. Tout vient du journal d'entraînement.
