# Marge de canevas des 21 bâtiments

Mesuré le 02/11/2026 par tech sur l'art actuel de `feat/village-iso` (`.jour.webp`). Lecture seule, rien n'a été repeint.

## En bref

- **Les 21 tiennent dans la taille d'image actuelle**, avec le modèle à 5 stades (règle B comprise) et G-GROW.
- **Trois sont serrés** : moulin, tour du sorcier, forge. Le moulin et la tour ne peuvent pas faire toute leur croissance en hauteur.
- **Un autre plafond arrive avant le canevas** : le test `iso-spec` et ses 200 px (voir Manques). Il n'est pas le cliquet de taille d'image.

## Méthode

- **Silhouette** : alpha > 0,5 du sprite le plus grand d'aujourd'hui, patch de sol retiré.
- **Patch** : isolé, pas seulement estimé. C'est le socle de la maquette (`volumes` de `.anchor.json`) dilaté de 14 px, moins les volumes plus hauts que le socle + 0,1. Contrôle à l'oeil sur 8 bâtiments, le retrait suit bien le losange. Un objet peint à plat sur le socle et absent de la maquette part avec le patch.
- **H** : haut de la silhouette jusqu'à son bas. **Libre** : du haut de la silhouette au haut du canevas.
- **H max** : H si le haut monte jusqu'à 64 px du bord (`anchorMarginPx`, seule marge déjà écrite dans le spec). Sans marge, ajouter 64 px.
- **Moulin** : ailes composées à 45°, c'est-à-dire en X. Le sprite source est déjà en X, sans rotation, échelle 1,15 sur le pivot du stade. Mais les ailes tournent : en position +, leur haut est à y = 162. C'est ce balayage qui fixe son H max, pas le X. Corps seul : haut à y = 400, 284 kpx.
- **Planchers** (ancienne taille au même rang, carte de `constants/buildingStages.ts`) :
  - 10 rangs : rough, solid, grand, puis legendary et mythic au moins le grand d'aujourd'hui.
  - Exploits : rough, solid, grand au moins le solid d'aujourd'hui, mythic au moins le grand d'aujourd'hui.
  - Améliorations : rough et solid au moins le rough d'aujourd'hui, grand, legendary, mythic au moins le solid d'aujourd'hui.
- **G-GROW** : à chaque pas, +10 % en hauteur ou +15 % en aire. Tous les choix sont essayés, pas à pas.
- **Plafond d'aire : 50 % de la zone utile, c'est une hypothèse.** Le meilleur remplissage mesuré aujourd'hui est 46 % (forge). La zone utile est le canevas moins la marge de 64 px et moins ce qui passe sous l'avant de l'emprise.

## Tableaux par famille de canevas

Lire ainsi :
- **Mini H seul** : hauteur du dernier stade si toute la croissance passe par la hauteur.
- **Chemin** : "au choix", hauteur seule ou aire seule passent. "hauteur surtout", l'aire seule ne passe pas. "aire au moins 1 pas", la hauteur seule ne passe pas. "mixte obligé", ni l'une ni l'autre seule.
- **Croise** : voir la section suivante. "base 7" veut dire rang 7 du bâtiment de base.
- **Test** : hauteur que `iso-spec` laisse encore à la maquette, en px.
- Les améliorations sont données en règle B. En règle A, voir plus bas.

### building2x2 (896 x 1344, ancre y = 1280)

| Bâtiment | Sprite | H | Aire (kpx) | Libre | H max | Gain | Mini H seul | Chemin | Croise | Test |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| tent | grand | 556 | 202 | 679 | 1171 | +111 % | 737 | au choix | 7 | 362 |
| quarry | grand | 704 | 300 | 515 | 1155 | +64 % | 852 | au choix | 7 | 266 |
| forge | grand | 904 | 394 | 274 | 1114 | +23 % | 1094 | hauteur surtout | 7 | 42 |
| windmill | grand | 903 | 354 | 256 (balayage 162) | 1001 | +11 % | 1093 | mixte obligé | 7 | 19 |
| druid_grove | grand | 616 | 220 | 617 | 1169 | +90 % | 745 | au choix | 7 | 348 |
| armory | solid | 685 | 270 | 549 | 1170 | +71 % | 829 | au choix | 2, base 7 | 299 |
| fountain | solid | 504 | 148 | 669 | 1109 | +120 % | 610 | au choix | 2, base 7 | 409 |
| observatory | solid | 747 | 232 | 471 | 1154 | +54 % | 960 | au choix | 2, base 7 | 75 |

### tower1x1 (512 x 1280, ancre y = 1216)

| Bâtiment | Sprite | H | Aire (kpx) | Libre | H max | Gain | Mini H seul | Chemin | Croise | Test |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| wizard_tower | grand | 911 | 144 | 219 | 1066 | +17 % | 1102 | aire au moins 1 pas | 7 | 3 |
| watchtower | solid | 726 | 187 | 464 | 1126 | +55 % | 897 | hauteur surtout | 2, base 7 | 170 |

### decor1x1 (512 x 768, ancre y = 704)

| Bâtiment | Sprite | H | Aire (kpx) | Libre | H max | Gain | Mini H seul | Chemin | Croise | Test |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| campfire | grand | 296 | 67 | 372 | 604 | +104 % | 358 | au choix | 7 | 598 |
| training_dummy | grand | 250 | 24 | 382 | 568 | +127 % | 302 | au choix | 7 | 617 |
| well | grand | 432 | 88 | 220 | 588 | +36 % | 523 | hauteur surtout | 7 | 471 |

### building2x3 (1280 x 1280, ancre y = 1216)

| Bâtiment | Sprite | H | Aire (kpx) | Libre | H max | Gain | Mini H seul | Chemin | Croise | Test |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| archery_range | grand | 629 | 211 | 480 | 1045 | +66 % | 801 | au choix | 7 | 148 |
| farm | grand | 669 | 193 | 523 | 1128 | +69 % | 847 | au choix | 7 | 237 |
| barn | solid | 775 | 386 | 417 | 1128 | +46 % | 938 | au choix | 2, base 7 | 103 |

### building3x3 (1280 x 1600, ancre y = 1536)

| Bâtiment | Sprite | H | Aire (kpx) | Libre | H max | Gain | Mini H seul | Chemin | Croise | Test |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| dragon_lair | grand | 924 | 420 | 532 | 1392 | +51 % | 930 | au choix | 4 | 160 |
| heroes_hall | grand | 1078 | 622 | 413 | 1427 | +32 % | 1136 | au choix | 4 | 59 |
| champion_arena | grand | 661 | 447 | 763 | 1360 | +106 % | 733 | au choix | 4 | 407 |

### building1x2 (896 x 1152, ancre y = 1088)

| Bâtiment | Sprite | H | Aire (kpx) | Libre | H max | Gain | Mini H seul | Chemin | Croise | Test |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| high_road | grand | 691 | 155 | 332 | 959 | +39 % | 836 | au choix | 7 | 69 |

### building1x3 (1280 x 1216, ancre y = 1152)

| Bâtiment | Sprite | H | Aire (kpx) | Libre | H max | Gain | Mini H seul | Chemin | Croise | Test |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| castle_wall | solid | 797 | 336 | 319 | 1052 | +32 % | 964 | au choix | 2, base 7 | 30 |

## Où nouvelle et ancienne taille se croisent

Le rang indiqué est le premier où G-GROW **force** la nouvelle silhouette à dépasser l'ancienne. Avant, elles peuvent être égales. La suite d'aujourd'hui passe déjà G-GROW partout où elle sert de plancher, donc rien ne force plus tôt.

| Famille de stades | Premier dépassement forcé | Sommet d'aujourd'hui dépassé |
| --- | --- | --- |
| 10 rangs (12 bâtiments) | rang 7 | rang 7 |
| Exploits (3) | rang 4 | rang 5 : forcé pour l'arène seule, de 6 px ; dragon et héros seulement si la carte le veut |
| Améliorations (6), règle A | rang 2 | jamais forcé : le grand peut rester au solid d'aujourd'hui |
| Améliorations (6), règle B | rang 2 | rang 7 du bâtiment de base |

Attention, G-GROW ne garantit pas un mythique impressionnant. Le mythique du dragon et celui des héros peuvent passer le seuil en restant égaux au grand d'aujourd'hui. C'est à la carte d'imposer le saut.

## Manques

1. **Aucun bâtiment ne manque de canevas si l'aire peut croître.** Moulin : 1 pas en hauteur et 1 en aire, il finit à 47 % de remplissage. Avec un plafond d'aire à 46 %, il ne tient plus : c'est le seul cas fragile.
2. **Tout en hauteur, deux ne tiennent pas.** Moulin : il manque 92 px, soit +128 px de canevas (toiles par pas de 64 px, 2x2 à 1472). Tour du sorcier : il manque 36 px, soit +64 px (tower1x1 à 1344). Sans la marge de 64 px, il manque encore 28 px au moulin (+64 px) et la tour passe.
3. **Forge : ça tient de justesse.** Deux pas en hauteur obligatoires (l'aire n'en permet aucun) et il reste 20 px. Le mythique ne peut pas dépasser +23 %.
4. **Le test `__tests__/iso-spec.test.ts:59` bloque avant le canevas** : il exige 200 px libres au-dessus de `hauteurMax`, soit 2,96 au plus en 2x2. Les maquettes pilotes de la prépa montent à 3,8 (moulin) et 4,02 (observatoire), alors qu'elles tiennent dans le canevas (haut à y = 146 et y = 114). Il passera au rouge dès que `heights.py` lira les nouveaux stades, et forge et moulin n'ont alors plus aucun chemin. À trancher au checkpoint : garder ces 200 px coûterait +192 px à forge, moulin, tour du sorcier, rempart et observatoire si leur croissance reste toute en hauteur, +256 px pour les deux maquettes pilotes.
5. **Cliquet** : `__tests__/iso-perf-compteur.test.tsx:95` et `:166`, 26 tailles au plus, historique dans `docs/designs/village-loop/perf-debt.md:181`. La décision revient à Guillaume.

## Ce que coûterait de relever le cliquet ou d'agrandir une toile

Ces points décrivent le coût. Ils ne recommandent rien.

- **Toute la famille agrandie** : le nombre de tailles ne bouge pas, mais tous ses sprites changent de taille d'un coup. Il faut refaire jour et nuit avec du vide en haut, décaler l'ancre (`h - 64`), refaire les masques `.json` et les `size` et `anchor` de `maquettes*.ts`, et ré-exporter les rendus (`scripts/iso/exports/test_exports.py:59`). Le 2x2 compte 8 bâtiments, la tour 2.
- **Ancien et nouvel art côte à côte derrière le drapeau** : +1 taille par famille agrandie le temps de la migration. Le test le dit (l. 92-94) : une famille à deux tailles est une nouvelle décision.
- **Toile réservée à un seul bâtiment** : +1 taille pour de bon.
- **Place sous le cliquet** : les commentaires du test notent 20 à 24 tailles mesurées pour 26 permises. Je n'ai pas relancé le compte.
- **Mémoire** : calcul à pleine résolution, c'est une borne haute. +459 ko décodés par sprite en 2x2 +128 px (+9,5 % de pixels), +131 ko en tour +64 px (+5 %).
- **FLUX** : même palier de prix pour ces deux tailles (`KLEIN_TIERS`, `scripts/iso/iso_loop.py:81`).

## Limites

- Peintures seules : ni teasers, ni add-ons, ni échafaudage du rang 9. Si la silhouette du mythique doit battre celle du rang 9 échafaudage compris, il faut un pas de plus. Forge, moulin et tour n'ont pas cette place en hauteur.
- Le bas d'une silhouette varie d'un stade à l'autre une fois le patch retiré (high_road : rough 457, solid 451). Une pièce posée devant change donc H sans que le haut monte.
- La colonne Test est approchée : elle compare une hauteur de maquette à un haut de peinture, et la peinture dépasse parfois la maquette (77 px sur la tour du sorcier).
- La nuit n'est pas mesurée : elle gradue la peinture de jour, même toile.
