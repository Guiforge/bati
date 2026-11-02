# L4-T02 + L4-T09 (qa) : vues montées, pente mémoire de la démo, tap sur la boîte opaque

Statut proposé : prêt pour revue
Auteur : qa
Tour de revue : 1

Code : arbre de travail non commité (base 3fd9b586). Build `.perf` neuve par `heavy.sh --gradle gradle-perf.sh` (`BUILD SUCCESSFUL in 1m 13s`, `evidence/L4-T02/build.log`, rc=0), `gradlew --stop` fait, `install -r` Success, base non remise à zéro.

## 1. Avant / après (émulateur, médianes de 3, `scripts/iso/perf-emu-l4t01.sh`, sortie changée vers `evidence/L4-T02/emu/`)
Brut : `evidence/L4-T02/emu/20261029-165244-emulator-5554/` (`summary.md`, meminfo par passe), journal `emu-run.log` (rc=0). Avant : `evidence/L4-T01/emu/20261029-144406-emulator-5554/`.

| mesure | avant | après | |
|---|---|---|---|
| Views, témoin (onglet Village de production) | 467 | 467 | identique |
| **Views, iso Village (page + carte)** | **1 112** | **792** | -320 (-29 %), reste +325 sur le témoin |
| Views, carte seule palier 12 (au départ) | 815 | 770 | -45 |
| Démarrage à froid témoin / iso Village / iso carte | 674 / 973 / 939 ms | 630 / 880 / 920 ms | -44 / -93 / -19 ms |
| Native Heap Mo : témoin / iso Village (défilement) | 74,3 / 101,4 | 74,3 / 98,5 | -2,9 |
| Native Heap Mo : carte zoom max (pan) / zoom 0,6 | 129,5 / 129,9 | 124,3 / 127,3 | -5,2 / -2,6 |
| Native Heap Mo : retour Cadrer / +30 s / trim | 100,1 / 106,8 / 104,7 | 94,9 / 114,2 / 110,4 | retour -5, +30 s et trim +7 / +6 |
| janky % témoin / iso Village défilement | 2,84 (11/387) / 2,54 (9/354) | 2,28 (9/394) / 2,56 (9/351) | bruit |
| janky % carte seule zoom max / zoom 0,6 | 3,45 / 3,73 | 3,89 / 3,77 | bruit |
| repos 10 s (témoin / Village / carte) | 0 / 0 / 0 | 0 / 0 / 0 | 0 |
| allers-retours zoom max puis Cadrer (tour 2 -> 3) | plateau (-0,5 / +2,3) | plateau (-0,3 ; tour 1 -> 3 +9,5) | plateau |

**Glissé de carte en mode Village (7,89 % avant) : non mesurable par ce script cette fois.** Les glissés horizontaux de 120 ms du script ne donnent que 12 images par passe (contre 228) : la carte est bornée à l'horizontale (déplacement de 40 à 90 px, vérifié en capture, `pan/avant.png`, `pan/apres.png`, `diag.png`), donc presque aucune image n'est rendue ; le tableau le marque « non significatif ». Je n'ai pas de point de comparaison pour savoir si c'est nouveau (le script avait donné 228 images au tour 2 de L4-T01 sans que je sache ce qui avait bougé). Mesure de remplacement, **sans référence avant** : glissés verticaux de 400 ms (3 aller-retours, 3 passes, `scripts/iso/pan-vertical-emu-l4t02.sh`, `evidence/L4-T02/pan-vertical/`) : 138, 150, 150 images, 12 / 11 / 12 janky, soit 8,70 / 7,33 / 8,00 % (médiane 8,00 %). Le chiffre du témoin L4-T01 (framestats) était 4,12 % sur 97 images pour 3 glissés, non comparable (autre nombre de glissés, autre protocole). Le gain sur le glissé est donc **non démontré**. Le framestats de L4-T01 montrait que les janky sont la première image de chaque glissé, ce qui n'a pas de raison de changer avec le nombre de vues.

## 2. Pente mémoire de la démo (changements de palier en Carte seule)
Script `scripts/iso/pente-emu-l4t02.sh` : démarrage frais de `dev-iso`, Carte seule, palier 12 + Cadrer, puis 1, 6, 12 en boucle, 3 s d'attente, `dumpsys meminfo` après chacun. Fait deux fois : 12 changements (`evidence/L4-T02/pente-12/`) et 24 changements (`evidence/L4-T02/pente/`). Native Heap en Mo (Views entre parenthèses) :

| tour | palier 1 (362 vues) | palier 6 (526) | palier 12 (770) |
|---|---|---|---|
| 1 | 78,6 | 84,2 | 107,6 |
| 2 | 86,3 | 89,3 | 113,4 |
| 3 | 94,1 | 86,7 | 110,0 |
| 4 | 92,5 | 94,1 | 116,2 |
| 5 | 98,9 | 101,9 | 125,8 |
| 6 | 107,3 | 89,6 | 112,1 |
| 7 | 94,5 | 97,4 | 119,6 |
| 8 | 100,2 | 103,2 | 125,7 |

(Le premier passage de 12 changements avait donné 105,9 / 112,2 / 110,0 / 116,0 au palier 12 : même allure.) Départ à 75,3 Mo (palier 12, images pas encore chargées).

- **Views : aucune pente.** 362, 526, 770 à chaque fois, exactement (aucune vue qui reste). L'arbre grandit et rétrécit avec le palier, sans fuite de vues.
- **Native Heap : une pente lente et bruitée, pas encore de plateau en 24 changements.** Au palier 12 : moyenne des tours 1 à 4 = 111,8 ; des tours 5 à 8 = 120,8, soit +9 Mo sur 12 changements (~0,75 Mo par changement) ; au palier 1, 78,6 -> 100,2 sur 21 changements (~1 Mo par changement). C'est un ordre de grandeur sous les 6 à 7 Mo par changement de L0-T14 avant son correctif, et du même ordre que les +7,8 Mo sur 18 changements après (a peu près +0,45 Mo par changement ; ici, plutôt 0,75 à 1).
- Après un trim critique (`send-trim-memory RUNNING_CRITICAL`) au palier 12 : 125,7 -> **109,9 Mo** (`pente/apres-trim.txt`), 16 Mo rendus. La pente ressemble donc à du cache d'images (réserves de Glide, vidées au trim), pas à des vues retenues. Je ne peux pas le garantir : ni la pente ni le trim ne sont suivis assez longtemps pour exclure une petite fuite.
- Verdict : règle L0-T14 levée sans fuite de vues visible ; la pente native reste à surveiller (lecture sur un plus long jeu et sur le Fairphone).

## 3. L4-T09 : Maestro `iso-batiments.yaml` avec `tapOn id: iso-batiment-*`
Flux non modifié (déjà en `tapOn: id:`). Chaque essai part de `force-stop` + `am start -W ... bati://dev-iso com.guiforge.bati.perf`, puis le flux (`launchApp stopApp: false`). **3 essais sur 3 : rc=0, tous les pas COMPLETED** (`evidence/L4-T02/maestro/run1.log` + `debug1/`, `run2.log`, `run3.log`) : moulin « Rises with your shoulders », forge « Rises with your chest », carrière « Rises with your back », tour du mage « Rises with every rep of calisthenics », chaque fiche ouverte, fermée, puis absente. Boîtes de la vue d'accessibilité (`maestro/a11y-nodes.txt`), pixels : moulin [189,749][339,867], forge [593,771][744,886], carrière [704,824][855,941], tour [814,593][891,720] (tuiles de la taille de l'opaque, non plus du sprite de 172 x 258 px).

## 4. Accessibilité (ACTION_CLICK)
**Non vérifiable ici** : `emu-adb.sh` ne donne qu'`input tap`, `uiautomator dump` et `dumpsys`, aucun moyen d'envoyer une action d'accessibilité à un nœud (il faudrait TalkBack ou un service d'accessibilité, ce qui touche la configuration de l'émulateur). Ce qui est établi : les 10 nœuds `iso-batiment-*` sont dans l'arbre, `clickable=true`, avec `content-desc` « Farm, stage: rough », « Windmill, stage: rough »... Le chemin ACTION_CLICK ne reste testé qu'en jest (rapport L4-T09).

## 5. Comportement (`evidence/L4-T02/comportement/`, `scripts/iso/comportement-emu-l4t02.sh`)
| point | verdict | preuve |
|---|---|---|
| tap sur le moulin ouvre la fiche | OK | tap (365,805) : « Close » présent (`03-tap-moulin.png`) ; plus Maestro ci-dessus |
| tap à vide ne fait rien | OK | tap (100,520) : pas de fiche, feu de camp inchangé `[483,807][560,849]` (`02-tap-vide.png`) |
| double-tap recadre | OK | glissé vertical : feu de camp `[483,488][560,530]` ; double-tap (900,1100) : retour à `[483,807][560,849]`, pas de fiche (`04-apres-glisse.png`, `05-apres-double-tap.png`) |
| retour arrière ferme la fiche | OK | « Close » absent après KEYCODE_BACK |
| onglet Village de production, drapeau éteint | OK | `bati://village` : héros + blason + tableau de progression + tabbar, aucun `iso-village` ni `iso-batiment` dans l'arbre (`06-prod.png`) |

## Douteux ou non fait
- Glissé de carte horizontal du script : 12 images, pas de chiffre comparable à 7,89 %. Mesure verticale sans référence avant.
- ACTION_CLICK non joué (aucun moyen).
- Pente native : 24 changements, pas de plateau net ; une longue boucle et un Fairphone décideraient.
- Rien n'est mesuré sur le Fairphone. Les chiffres d'émulateur ont une dispersion de quelques dixièmes de point en janky et de plusieurs Mo en Native Heap (voir le plateau de zoom : +9,5 Mo du tour 1 au tour 3 au même cadrage).
- Reste +325 vues sur le témoin en iso Village (792 contre 467).

## Fichiers
`scripts/iso/perf-emu-l4t01.sh` (seule ligne changée : le dossier de sortie, `L4-T02/emu`), `scripts/iso/pente-emu-l4t02.sh`, `scripts/iso/pan-emu-l4t02.sh`, `scripts/iso/pan-vertical-emu-l4t02.sh`, `scripts/iso/comportement-emu-l4t02.sh` (tous `bash -n` ok, à supprimer ou garder à la discrétion du chef), `docs/designs/village-iso-v1/evidence/L4-T02/`.
