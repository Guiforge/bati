# L4-T09 (qa) : pourquoi le tap Maestro n'ouvre pas de fiche

Statut proposé : prêt pour revue (diagnostic seulement, aucun code touché)
Auteur : qa
Build : le `.perf` installé au tour 2 de L4-T01 (`maxDistance` 8 dp), pas de reconstruction.
Preuves : `docs/designs/village-iso-v1/evidence/L4-T09/` (flux `m*.yaml`, journaux `m*.log`, `dumpsys-input` bruts, `adb-tap-points.txt`, `adb-press-durations.txt`).

## Cause probable
**Ce n'est pas Maestro, ni le geste RNGH, ni la durée de l'appui : le point visé tombe hors du masque de tap du sprite.** `tapOn id: iso-batiment-windmill` (et `point: "24%,31%"`) tape au centre de la boîte du bâtiment (264,749 ; 259,744). Le tap est résolu par `batimentAuPoint` sur le masque du sprite (`tapBatiment.ts`) : au centre de la boîte du moulin, entre les ailes, le masque n'est pas posé, donc `onOpen` n'est jamais appelé. `input tap 264 750` tombe 1 px plus bas, sur le masque, et ouvre la fiche.

Preuve par `input tap` (état neuf de `dev-iso` à chaque essai, `adb-tap-points.txt`) :

| point (px) | fiche |
|---|---|
| moulin 264,750 | ouvre |
| moulin 264,749 (centre de la boîte) | **rien** |
| moulin 259,744 (24 %,31 %, le point de Maestro) | **rien** |
| moulin 263,750 / 265,750 / 264,751 / 264,760 | ouvre |
| moulin 264,700 / 230,800 | rien |
| forge 669,767 (centre de la boîte) | **rien** |
| forge 669,775 / 669,790 | ouvre |

Preuve que Maestro tape correctement : `tapOn point: "264,751"` (flux `m12-maestro-hit-point.yaml`) **ouvre la fiche** du moulin (`failed_steps=0`). Le tap de Maestro et `input tap` sont donc équivalents dès que le point touche le masque. Mon hypothèse du tour 2 de L4-T01 (un appui de durée presque nulle non retenu par le tap RNGH) était fausse : je la retire.

## 1) Un Pressable ordinaire, tap Maestro
**Marche.** `tapOn id: iso-mode-carte` (bouton de mode, même écran) bascule bien en « Carte seule » (`m1-pressable.yaml`, `m1.log` : 3 étapes `COMPLETED`, y compris `assertVisible id: iso-mode-village`). Le tap Maestro n'est pas en cause en général ; la différence vient de la zone de la carte, c'est-à-dire du masque (voir ci-dessus), pas du geste (un tap `input` au bon pixel ouvre la fiche avec les mêmes gestes).

## 2) Événements bruts
`getevent -lt` **ne voit rien** : les événements injectés par `input` ou par Maestro (UiAutomation) ne passent pas par `/dev/input` (`getevent-maestro-tap.txt`, 26 lignes de périphériques, aucun événement). La file récente de `dumpsys input` (`RecentQueue`, avec `eventTime`) les montre :

| geste | événements | durée down→up | MOVE |
|---|---|---|---|
| Maestro `tapOn` (point ou id) | DOWN puis UP en (259,744) ou (264,749) | 117 à 127 ms | 0 |
| `input tap 264 750` | DOWN et UP au même `eventTime` | 0 ms | 0 |
| `input motionevent DOWN`, 150 ms d'attente, `UP` | DOWN puis UP en (264,750) | 211 ms | 0 |
| Maestro `longPressOn` | DOWN, 7 MOVE sur place, UP | ~117 ms visibles (la file n'en garde que 8) | sur place |
| Maestro `swipe` start=end, 100 ms | DOWN, 6 MOVE sur place, UP | 105 ms | sur place |
| Maestro `swipe` start=end, durée 0 | DOWN, 1 MOVE, UP | 17 ms | sur place |

Les appuis sur place par `input swipe 264 750 264 750 <ms>` de 10, 40, 80, 120, 200 et 400 ms **ouvrent tous la fiche** (`adb-press-durations.txt`) : la durée n'est pas en cause, ni la présence de MOVE sur place, ni l'absence de MOVE.

Contrôle de session : pendant qu'une session Maestro est ouverte (driver connecté), un `input tap 264 750` envoyé de l'extérieur ouvre la fiche et Maestro la voit (`m8-idle-session.yaml`, 2 étapes `COMPLETED`) : la session Maestro ne dérègle ni les gestes ni l'accessibilité.

## 3) `tapOn` point, `longPressOn`, `swipe` de durée 0
Tous échouent, pour la même raison (le point est 259,744 ou 264,749) : `m2` (tapOn point), `m3` (longPressOn), `m4` (swipe durée 0), `m5` (swipe sur place, 100 ms), `m6` (tapOn id), `m7` (tapOn sans `launchApp`), `m10` (tapOn id de la forge, contrôle : échoue aussi, le centre de sa boîte, 669,767, ne touche pas le masque). **Aucun ne diffère par son geste ; lequel « ouvre » n'est qu'une affaire de pixel.** Seul un point au bon endroit, tapé par Maestro, réussit (`m12`, 264,751).

Hors sujet mais vu au passage : `swipe` Maestro déplace bien la carte (`m9` : le feu de camp passe de y=712 à 393) et ne laisse aucune fiche ouverte au relâchement : la fonction `maxDistance` du tour 2 tient aussi sous les gestes Maestro.

## 4) Maestro attend-il que l'écran soit stable ?
Non concluant. Sur la carte au repos le tap ne tombe sur aucun recadrage ni croissance : rien ne s'anime sans action. Le flux `m11-pan-then-tap.yaml` (un glissé de 80 ms puis un `tapOn id` immédiat sur la forge) échoue, mais il échoue aussi sans glissé (`m10`) pour la raison du masque ; il ne dit donc rien sur la stabilité. **Non vérifié** : un tap Maestro qui tomberait pendant une croissance ou l'inertie. Le flux devrait viser un point du masque avant d'en tirer une conclusion.

## Ce qu'un ingénieur devrait changer
- **Dans le flux (`.maestro/iso-batiments.yaml`, `qa`)** : remplacer `tapOn id: iso-batiment-*` par `tapOn point: "<x>,<y>"` sur un point du masque de chaque bâtiment (ex. moulin 264,751 ; forge 669,775 ; carrière et tour du mage à relever de la même façon). Fragile aux changements de sprite : un point par bâtiment, pris en pixels sur l'émulateur 1080x2400.
- **Dans le code (au choix de l'ingénieur)** : donner à chaque `iso-batiment-*` une boîte de test placée sur le masque (par exemple, centrer son rectangle sur un pixel du masque, ou exposer un point de tap par bâtiment) pour que tout outil qui tape « le centre » (Maestro, accessibilité) ouvre la fiche. C'est aussi une question d'accessibilité : `Windmill, stage: rough` est annoncé comme actionnable mais l'activation par le centre ne fait rien. Un tap d'accessibilité (`ACTION_CLICK` sur l'élément) n'a pas été essayé ici.
- Vérifier que le masque n'a pas de trou au centre de chaque bâtiment (moulin, forge) : un joueur qui tape au centre visuel du moulin n'ouvre rien non plus.
