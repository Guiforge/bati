verdict: fail

Audit `iso-tech-auditor` (regard neuf), fin du lot 0, 28/10. Résumé du chef ; les points sont repris tels quels dans BOARD (L0-T11 à L0-T13) ou dans les questions de H0.

Bloquants
1. STATE pointait une action passée : corrigé par le chef.
2. Les ombres des décors tombent sur des bâtiments (rochers (1,10) sur la carrière, arbre (17,10) sur la grange, bosquet (6,18) et arbre (7,18) sur le bosquet du druide), et le test ne vérifie que le sens bâtiment vers décor : L0-T11 (hauteurs des décors) puis L0-T12 (test et déplacement).
3. `heights.py` code en dur les deux blockouts du POC ; un vrai blockout du lot 1 plus haut que son estimation laisserait le test vert : L0-T11 (lire tous les blockouts présents) et L0-T12 (test de péremption).
4. Le plafond FLUX dépend d'une variable d'environnement : L0-T13 (lu dans `VALIDATIONS.md`, noté dans chaque lot). `budget ack` sans garde et 14 scripts FLUX hors garde : question à Guillaume (règle de `guard-team.sh`, figé).

Importants : noms d'images hors schéma (L0-T13) ; le jour casserait la règle d'écart (contrainte écrite et test par ambiance, L0-T12) ; biomes et ambiances lus par aucun code (carte du lot 3) ; critère 10 préparé par les noms seulement (cartes du lot 1) ; mémoire jamais estimée (estimation écrite pour H0) ; plafond présenté comme suffisant alors qu'il borne la dépense sans finir la V1 ; clé BFL exclusive non confirmée ; revues paraphrasées (désormais : sortie brute du relecteur gardée dans `reviews/`) ; fichiers figés non commités ; `push.sh` échouera dans ce worktree (jest n'y trouve aucun test) ; preuves sur appareil incomplètes (L0-T09 en cours) ; croissance réelle jamais montrée.

Mineurs : clés mortes de `isoSpec.json` (`island`, `zoom`, `cellDp`) ; `heights.json` d'estimations dans le bundle ; `heights.py` n'écrit pas au format de biome ; écran vide sans redirection en build publiée ; canal au bord de l'îlot aux paliers 5 à 8 ; test 13 par profondeur seulement ; témoin sur village vide.

Solide : test de la carte avec mutations prouvées ; `heights.json` rejoué à l'identique ; garde-budget ; garde `ISO_POC` vue juste sur appareil ; typage ; audit gelé intact.
