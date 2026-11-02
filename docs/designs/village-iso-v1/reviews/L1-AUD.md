verdict: fail

Audit de fin du lot 1 (iso-tech-auditor, neuf), sur `075bd3b3`. Techniquement solide (jest iso 72 verts, jest complet 415 suites vertes, tsc, test_exports 87 stades, heights stable, test_budget et test_audit PASS, audit gelé intact, aucune image acceptée, aucune dépendance). Échoue sur la boucle. Corrections du chef : L1-T18 à L1-T22 (BOARD), BOARD et STATE remis à jour, ligne DECISIONS pour les deux cases de chemin.

Sortie brute :

verdict: fail

Je n'ai écrit aucun fichier, je n'ai pas touché à l'émulateur et je n'ai pas appelé FLUX. Le lot 1 est techniquement solide (tests verts, exports complets, budget juste). Il échoue sur la boucle : la seule revue « Village complet en maquettes » est un `fail` jamais refait après les correctifs, et H1 est préparée comme si elle était close.

## BLOQUANTS

1. Le critère 2 (moitié lot 1) n'est pas rempli : la seule revue d'écran est un `fail`, jamais refaite. `reviews/L1-T09-design.md:1` dit `verdict: fail` (items 14, 29, 33, 34, `bloquant_echoue: true`), faite avant L1-T16 et L1-T17. Aucune nouvelle revue sur `evidence/L1-T09/remesure2/`, alors que `reports/L1-T17.md:3` la prévoit. Le chef a commité `075bd3b3` et lancé L1-AUD sans elle. Correction : relancer `iso-design-reviewer` (texte figé, type « Village complet en maquettes ») sur `remesure2/palier-{3,6,9,12}.png`, puis `reviews/L1-T09.md` avec la sortie brute. Tant que ce n'est pas fait, H1 ne peut pas s'ouvrir.

2. L'item 14 [B] ne peut pas passer tel que le lot est construit, et la moitié de son échec a disparu dans le résumé du chef. Le relecteur dit : aucun villageois à l'écran, et « mannequin et tente démesurés à côté des maisons et du moulin (palier 3) ». Le résumé (`L1-T09-design.md:5`) ne garde que « villageois relève du lot 5 ». L'échelle du mannequin et de la tente n'apparaît nulle part. Le §5 fait livrer au lot 1 les figurines des 7 villageois, que DECISIONS appelle des « repères de taille » ; elles existent (`assets/images/village/iso/blockout/pieces/villageois_*`) mais ne sont pas posées. Aucune décision ne renvoie l'item 14 au lot 5. Correction : poser 2 ou 3 figurines immobiles sur des cases de chemin dans `IsoCarteDemo`, et une tâche pour l'échelle du mannequin et de la tente.

3. BOARD et STATE ne disent pas l'état réel (même défaut que le bloquant 1 de L0-AUD). `STATE.md:5` « Prochaine action » décrit des étapes faites. BOARD n'a pas de ligne pour L1-T16 ni L1-T17. Statuts périmés : L1-T05 « revue d'art des 5 reprises à faire », L1-T06 « revue d'art (décors, villageois) à faire », L1-T09 « reprise après L1-T07 tour 4 ». L1-T05 a fait 3 tours d'art et échoue encore (`reviews/L1-T05-tour2-art.md` : item 7 [B] sur salle des héros, grand-route, armurerie ; item 10 [B] sur la grand-route) : la règle 12 veut `bloquée`, et le tableau « Bloquées et HUMAN » est vide. Correction : BOARD et STATE à jour, L1-T05 en `bloquée` (3 tours, items 7 et 10), inscrite pour H1.

## IMPORTANTS

1. Fichiers figés jamais commités (déjà L0-AUD) : `CHECKLIST.md`, `CRITERES-V1.md`, `PROMPT-EQUIPE-V1.md`, `REVUE-*.md`, `VALIDATIONS.md`, `scripts/iso/team/`, `.claude/agents/` non suivis, `CLAUDE.md` modifié ; leur sha256 de référence n'est écrit nulle part dans le dépôt ; dates de modification de la phase A ; un `push.sh` à H1 pousserait le lot sans ses critères. Correction : commit de lancement par Guillaume avant H1.
2. Critère 7 : `Graphics: 0` partout (mémoire GPU non comptée) ; le seul état net mesuré (avant L1-T16) donnait 320,6 Mo de PSS à froid contre un témoin de 225,9 Mo (`reports/L0-T08.md:44`), soit +95 Mo, au-dessus du seuil de +80. Le décodage pleine taille de 21 bâtiments ne tient pas sans découpage par zone visible ou niveau de détail : contrainte du lot 3, pas un réglage.
3. Mesures présentées de façon partielle : LOG ne cite que Native Heap ; le PSS à froid monte de 197,0 Mo (remesure 1) à 216,7 Mo (remesure 2, `remesure2/meminfo-froid.txt:37`) et culmine à 243,9 Mo au 20e changement (`meminfo-palier-12-apres-20.txt:37`). « Une minute plus tard froid + 11,5 Mo » est une lecture, pas un GC prouvé (`kill -10` refusé). Écart après 18 changements +41 / +29,6 Mo contre +7,8 en L0-T16, cause non établie. Témoin = village vide. À dire tel quel à H1.
4. Biome non préparé pour décors et eau (§7, déjà L0-AUD) : `isoSpec.json` `biomes.defaut.decors: []`, `eau: null` ; clés `decor/arbre_a.nuit.webp` (`components/village/iso/pieces.ts:14`) sans biome ; `IsoCarteDemo.tsx:76-93` lit `rawColors` en direct ; `isoWater`, `isoFoam`, `isoTree`, `isoRock`, `isoShadowVeil` hors du biome. Correction : biome dans le nom des pièces (ou leur famille) et dans `biomes.defaut`, plus un test.
5. Essai Klein biaisé : Klein 3 tentatives avec couleurs de pierre puis de toit nommées (a2, a3, a4) ; FLUX.2 pro une seule (w5ga2), ancien prompt. `w5gka4_c1` peut devoir son succès au prompt. Taux : 1 sur 12 au regard neuf, 1 sur 3 avec le prompt final. Un lot FLUX.2 pro avec le prompt a4 (0,225 $) trancherait. Projection de L0-T07 non refaite au prix de Klein.
6. L'item 5 [B] déclaré `n/a` cache un défaut du blockout (image 1 donnée à FLUX) : `reviews/L1-T05-tour2-art.md` relève des « ombres portées peintes sur le socle » sur 5 bâtiments ; FLUX les recopiera et l'item 5 échouera au lot 2. À vérifier sur les rendus avant la première famille.
7. Scripts de qa jamais relus (règle 8) : `evidence/L1-T09/{trim-gc,arene-zoom,zoom-seul,palier1-seul,...}.sh` sans revue ; `trim-gc.sh` envoie un `kill -10` par `emu-adb.sh`.
8. Les captures ne mesurent pas l'item 33 au bon zoom (0,6) ; ajouter une capture au zoom 0,6 par palier.
9. Carte validée à H0 modifiée sans ligne dans DECISIONS : (13,5) et (16,5) en chemin (`git diff 501cd96a 075bd3b3 -- constants/isoLayout.json`), seulement dans LOG et `reports/L1-T17.md:69-72`.

## MINEURS
- Budget : `STATE.md:6` annonce 3763,7 crédits, le ledger s'arrête à `balance: 3767.0` et `by_balance: 0.291`, en retard d'un lot (`scripts/iso/iso_loop.py:338-358`) ; les 4 lots V1 portent un `mismatch`. Réel 0,324 $ juste.
- Poids dans le bundle doublé : 87 webp 2,04 Mo, `maquettes.ts` 191 Ko, contre « 1,3 Mo et 99 Ko » dans DECISIONS.
- `biome.json` et `.biome/plugins/noMissingHermesApi.grit` écrits par engineer hors de la carte des propriétés.
- 30 Mo de PNG de rendu sous `scripts/iso/blockouts/renders/` commités (656 PNG), dépôt public.
- `isoSpec.json` garde `island: {w: 8, h: 8}`, clé morte (L0-AUD).
- `ORDRE_COUCHES` (et `decorSaison`) lu par aucun rendu ; lot 3.
- `heights.py` ne couvre que 3 décors, pas les échafaudages (L1-T15 à faire).
- Les pièces n'ont pas l'ambiance dans leur nom de fichier, seulement dans la clé de l'index.

## Ce qui est solide
jest iso- 5 suites, 72 tests ; jest complet 415 suites vertes, 1 sautée, 6138 tests (Node local) ; tsc 0 ; `test_exports.py` « ok: 87 stages, 8 exports each », ombre recalculée à 0,008 px ; `heights.json` sha256 stable (`d4351d72…`) ; `test_budget.py`, `test_audit.py` PASS ; audit gelé intact. §7 : ombre sous un autre soleil (65°) sur 2 stades (`__tests__/iso-maquettes.test.ts:273-297`), 87 stades sous la lune dans `test_exports.py`. Aucune image acceptée (`scripts/provenance.json` inchangé, seul `forge_solid` du POC hors `blockout/`). Aucune dépendance. Revues d'art : verdicts du chef conformes à la sortie brute, écarts dans DECISIONS. Correctif L1-T16 prouvé : 0 envoi lent, 4,38 % de ratées, 0 image au repos.

## Questions pour H1
1. Ouvrir H1 seulement après une revue « Village complet en maquettes » refaite sur la remesure 2 (plus zoom 0,6) et passée ?
2. Ouest entassé et 9 bâtiments desservis par l'arrière : changer la carte de H0 (environ 15 cases) ou accepter ?
3. Observatoire du palier 9 sur une excroissance : déplacer ou garder ?
4. Salle des héros, grand-route, armurerie après 3 tours : reprendre le repère, le laisser à la peinture, ou les valider ?
5. Mannequin et tente démesurés au palier 3 : réduire avant la peinture ?
6. Un lot FLUX.2 pro avec le prompt Klein a4 (0,225 $) pour une comparaison juste ?
7. Si Klein est retenu, accepter `w5gka4_c1` et mettre à jour `LICENSE` et `docs/fdroid.md` ?
8. Content Credentials : garder les originaux signés hors de l'APK, ou rien ?
9. Commit de lancement avant H1 ?
10. Netteté au zoom max réglée au lot 3 par zones visibles ou niveau de détail ?
11. Figurines posées sur la carte dès le lot 1 pour l'item 14, ou lot 5 ?
12. Décors et eau avec leur biome dans le nom dès maintenant ?

Non fait : autres captures une à une, biome, deadcode, jest sous Node 24, solde BFL.
