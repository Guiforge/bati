# Planche de référence de style

## Ancre de style (31/10, acceptée par Mara)
`ancre_heroes_hall_grand_jour.webp` : brut t2 de la reprise probe-00 (`p0jba2_c0`, original PNG dans `~/.cache/bati-art-loop/iso/heroes_hall_grand/`), jour doré, fond magenta. C'est l'ancre unique de toutes les générations FLUX de la boucle.
À ne pas reproduire : contour extérieur plus fin que 8 px, faces d'ombre brun chaud au lieu d'ardoise `#2E3552`, tuiles un peu trop orange.

## Recette FLUX de la boucle
- 2 références au plus : le blockout en premier (la forme), puis l'ancre (l'humeur, poids bas dit dans le prompt).
- Fond uni (magenta demandé). Contrôle à l'arrivée : fond uni sur les 4 bords, ΔE ≥ 25 contre chaque couleur du bâtiment, aucune ombre ni dégradé sur le fond. Seuil à confirmer sur 2 ou 3 bâtiments.
- Prompt : forme du blockout (large et bas, pas de tour), encre noire épaisse et régulière `#0F1518`, aucune ombre portée hors du socle, hex de la bible, ni rose ni violet.
- Rejet sous 0,40 d'encre et sous 0,85 d'IoU contre le blockout.
- Détourage par la teinte du fond mesuré (pas de clip au blockout), plus grande zone connexe, bords érodés de 1 à 2 px et désaturés, contour extérieur porté à 8 px par dilatation en `#0F1518`, pied recalé sur le losange.

## Les cinq sprites existants

Mara, 31/10. Cinq sprites Bati existants, copiés sans retouche, les plus proches de la bible (`docs/designs/village-style-bible.md`). Les sprites peints du dépôt sont en webp, pas en PNG : copiés tels quels. Aucune image de Thronebreaker ici.

| Fichier | Origine | Pourquoi |
| --- | --- | --- |
| `forge_solid.nuit.webp` | `assets/images/village/iso/forge/solid.nuit.webp` | Le plus proche du but : colombages, tuiles rouille, cheminée de pierre, foyer qui chauffe le mur, enclume. Trait d'encre juste, matières lisibles. Référence de chaleur. |
| `forge_grand.nuit.webp` | `assets/images/village/iso/forge/grand.nuit.webp` | Bâtiment trapu au toit haut, pierre peinte avec des touches, flaque de lumière orange au sol. Référence de silhouette et de flaque. |
| `heroes_hall_grand.nuit.webp` | `assets/images/village/iso/heroes_hall/grand.nuit.webp` | Bardeaux peints au pinceau, bannières au blason, statue : le contenu Bati le plus fort. Référence de texture de toit et de bannières. |
| `barn_solid.nuit.webp` | `assets/images/village/iso/barn/solid.nuit.webp` | Toit de bardeaux avec un vrai grain de pinceau, caisses et clôture : la densité d'accessoires à suivre. |
| `windmill_solid.nuit.webp` | `assets/images/village/iso/windmill/solid.nuit.webp` | La lumière de gauche la plus nette : face gauche claire, face droite froide, toit de chaume en touches. Référence de direction de lumière. |

Défaut commun à corriger, pas à copier : tous posent sur une dalle carrée sombre, et la pierre tire au gris-bleu froid.

## Bâtiment héros pour la sonde
**`heroes_hall`, stade `grand`** : `assets/images/village/iso/heroes_hall/grand.nuit.webp`, toile `building3x3`, **1280 × 1600 px**, ancre **(640, 1536)**. C'est la plus grosse masse bâtie (FIN-BAT), le monument de Bati par excellence (blason, statue du héros), et le point focal de la bible (§7).

Ce que la sonde doit changer :
1. Ambiance de fin d'après-midi dorée : lumière `#F2E2B4` de gauche, ombres `#2E3552` à droite ; pierre chaude `#8C7A66` au lieu du gris-bleu.
2. Toit plus haut et plus chaud (tuiles rouille `#9A4E32` ou chaume ocre), colombages et enduit `#C9B48C` sur l'aile, socle de pierre lisible.
3. Plus de dalle sombre : le socle finit dans l'herbe, avec herbe, galets et terre battue en bordure.
4. Densité dans l'emprise : tonneaux, caisses, une lanterne sur poteau, un râtelier ; bannières au blason gardées ; statue du héros lisible.
5. Texture de pinceau visible partout, même trait d'encre `#0F1518` de 8 px, aucun élément copié. Même toile, même ancre, même emprise 3 × 3 ; FIN-BAT conseille de réduire la masse de 15 % environ, à garder dans l'emprise.
