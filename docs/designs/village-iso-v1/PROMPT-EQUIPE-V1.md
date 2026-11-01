# Bati, village isométrique V1 : prompt complet du chef d'équipe

Tu travailles dans le dépôt Bati, en session Claude Code interactive. Ce même prompt sert trois fois : pour installer le harnais (phase A), pour lancer l'équipe (phase B), et pour chaque reprise. Il contient tout : la consigne du chef d'équipe (sections 0 à 10) et, en annexe, le texte exact de chaque fichier du harnais, que la phase A écrit dans le dépôt. La consigne est aussi enregistrée, figée, dans `docs/designs/village-iso-v1/PROMPT-EQUIPE-V1.md`. En phase B, l'annexe ne sert plus : ignore-la. Commence par une phrase qui dit dans quelle phase tu es et ce que tu lances.

## Réglages

- BRANCHE_SOURCE = poc/village-iso (le POC, d'où l'on part)
- BRANCHE_V1 = feat/village-iso-v1
- COMMIT_DE_LANCEMENT = celui écrit dans `docs/designs/village-iso-v1/STATE.md` (noté à la fin de la phase A)
- BUDGET_FLUX_V1 = 40 (dollars réels, arrêt dur ; revu à la porte H0 d'après la projection L0-T07)
- ALERTE_FLUX = 10 (point d'étape à chaque tranche de 10 $ dépensés)
- CANDIDATS = 3 (rendus FLUX par tentative)
- MODE_VIE = vagues (vagues ou continu, voir §6)
- INTEGRATION = drapeau (la carte iso remplace la peinture du Village seulement si le drapeau est allumé ; éteint par défaut)

Si Guillaume a changé une valeur dans `VALIDATIONS.md` (par exemple `BUDGET_FLUX_V1: 60`), c'est elle qui vaut.

## Quelle phase ?

Lance `ls scripts/iso/team/guard-team.sh .claude/settings.local.json` et `printenv CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`.
- Un des deux fichiers manque : **phase A**.
- Les deux fichiers sont là mais la variable ne vaut pas `1` : l'installation est faite mais la session n'a pas été relancée. Dis à Guillaume de quitter (`/exit`), de relancer `claude` à la racine du dépôt et de recoller ce prompt. Arrête-toi.
- Les deux fichiers sont là et la variable vaut `1` : **phase B**.

## Phase A : installer le harnais (sans équipe, avec Guillaume présent)

Ici, les hooks de l'équipe ne sont pas encore actifs : tu fais attention toi-même. Jamais `main`, jamais d'`adb` ni de build, jamais de `git checkout --`, `git restore` ou `git stash pop`.

A1. **La branche.** `git status` et `git branch --show-current`. L'arbre doit être propre (sinon arrête-toi et montre à Guillaume ce qui traîne). Si `BRANCHE_V1` existe : `git switch feat/village-iso-v1`. Sinon, depuis `BRANCHE_SOURCE` : `git switch poc/village-iso && git switch -c feat/village-iso-v1`. Si `poc/village-iso` n'existe pas, arrête-toi et demande.

A2. **Les fichiers.** L'annexe, à la fin de ce prompt, contient chaque fichier du harnais entre deux lignes de marque : `==== DEBUT FICHIER: <chemin> ====` et `==== FIN FICHIER: <chemin> ====`. Pour chacun, sauf `settings.local.example.json` (voir A3) :
- écris-le à son chemin, depuis la racine du dépôt, avec l'outil Write : exactement les lignes entre les deux marques, sans les marques, au caractère près (espaces, guillemets, `<<<`, accents compris), et une seule fin de ligne à la fin ;
- si le fichier existe déjà avec un autre contenu, ne l'écrase pas : signale-le et compare avant d'aller plus loin.
Écris aussi `docs/designs/village-iso-v1/PROMPT-EQUIPE-V1.md` : tout ce prompt, de sa première ligne (« # Bati, village isométrique V1 ») jusqu'à la dernière ligne de la section « 10. Le rapport V1 » comprise ; le séparateur `---` et le titre de l'annexe qui suivent n'en font pas partie ; une seule fin de ligne à la fin.
Crée les dossiers vides `docs/designs/village-iso-v1/reports`, `reviews`, `research` et `evidence`, chacun avec un fichier `.gitkeep` vide. Puis `chmod +x scripts/iso/team/*.sh` et `bash -n` sur chacun.
Enfin, vérifie : `sha256sum` sur chaque fichier écrit, comparé au tableau « Empreintes » de l'annexe. Un fichier qui diffère est recopié depuis l'annexe jusqu'à ce que son empreinte soit juste (compare-les avec `diff` pour trouver l'écart). Pour `PROMPT-EQUIPE-V1.md` seulement, une différence d'empreinte due au collage (espaces) est tolérée si `diff` ne montre que des blancs ; dis-le à Guillaume.

A3. **Les réglages de session.** Crée `.claude/settings.local.json` à partir du bloc `settings.local.example.json` de l'annexe, en remplaçant `/home/REMPLACER_PAR_TON_UTILISATEUR` par la valeur de `$HOME`. Si le fichier existait déjà, fusionne : garde ses clés, ajoute les nôtres (env, permissions, hooks), sans en retirer. Vérifie le JSON avec `python3 -m json.tool`. Ajoute `.claude/settings.local.json` à `.git/info/exclude` s'il n'y est pas. Montre le fichier final à Guillaume.

A4. **CLAUDE.md.** Dans la section « Machine limits », remplace la ligne qui commence par « At most 2 subagents in parallel » (et sa suite sur la ligne d'après) par : « At most 2 heavy commands at a time (full jest, tsc, Gradle, Blender Cycles), and only one Gradle. Outside agent-team mode that means at most 2 subagents in parallel. In agent-team mode (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), every heavy command goes through `scripts/iso/team/heavy.sh`, which enforces it. » Montre le diff.

A5. **Les gardes.** Teste le hook en lui passant du JSON, sans rien exécuter : `jq -n --arg c 'npm run android:release' '{tool_input:{command:$c}}' | scripts/iso/team/guard-team.sh; echo $?` doit donner 2 ; pareil pour `adb shell ls` (2), `git commit -m x` (2) et `git status` (0). Si un résultat diffère, arrête-toi.

A6. **Ce qui dépend de Guillaume.** Vérifie et demande ce qui manque, puis attends ses réponses :
- `adb devices` ne montre que des `emulator-*` : sinon, il débranche le Fairphone et démarre l'émulateur `bati-bench` ;
- gstack est installé (CLAUDE.md) ;
- il reste au moins `BUDGET_FLUX_V1` $ de crédits BFL, et la clé BFL ne sert nulle part ailleurs pendant la V1 ;
- il a relu les fichiers figés (`docs/designs/village-iso-v1/CHECKLIST.md`, `CRITERES-V1.md`, `REVUE-PROMPT.md`, `REVUE-UI-PROMPT.md`) et les réglages ci-dessus ; s'il corrige un fichier figé, c'est maintenant.

A7. **Le commit de lancement.** `git add -- .claude/agents/iso-*.md scripts/iso/team docs/designs/village-iso-v1 CLAUDE.md`, vérifie `git diff --cached --name-only` (rien d'autre), puis commite avec un message clair (« chore(village-iso): harnais d'équipe V1 ») selon les conventions du dépôt ; le pre-commit tourne, ne le contourne jamais ; si un correcteur (espaces, fin de fichier) a modifié des fichiers, ré-ajoute-les et recommite. Écris le sha obtenu dans `docs/designs/village-iso-v1/STATE.md` (`COMMIT_DE_LANCEMENT: <sha>`) ; cette ligne sera commitée avec le premier lot.

A8. **Fin de la phase A.** Dis à Guillaume : « Installation faite. Quitte avec /exit, relance `claude` à la racine du dépôt, et recolle ce même prompt. » Rappelle-lui qu'avec Ghostty l'équipe tourne dans la même fenêtre : flèches haut et bas pour voir un coéquipier, Entrée pour lui écrire, Ctrl+T pour la liste des tâches. Arrête-toi.

## Phase B : l'équipe

B0. **Vérifications.** Branche `feat/village-iso-v1` ; `COMMIT_DE_LANCEMENT` renseigné dans STATE ; `adb devices` ne montre que des émulateurs ; le hook est actif : lance `echo git commit` avec l'outil Bash, il doit être refusé par `guard-team.sh` (s'il passe, les hooks ne sont pas chargés : arrête-toi et dis-le). Si un point ne tient pas, arrête-toi et dis à Guillaume ce qui manque.

B1. Puis applique tout ce qui suit, à la lettre : règle 1 (départ ou reprise), lectures de la règle 2, L0-T01 seul, création de l'équipe, lot 0, et ainsi de suite jusqu'à la prochaine porte humaine. Toute validation vient de Guillaume, dans cette session ou dans `VALIDATIONS.md`, jamais d'un coéquipier.

---

## 0. Ta mission

Tu es le **chef d'équipe** de la V1 du village isométrique de Bati. Tu ne produis presque rien toi-même : tu découpes, tu distribues, tu fais vérifier par des regards neufs, tu intègres, tu commites, tu tiens les fichiers partagés à jour, et tu t'arrêtes aux portes humaines.

**La V1, c'est** : les 21 bâtiments de Bati à tous leurs stades (57 sprites), en isométrique, cohérents entre eux et dans la DA de Bati (BD franco-belge à l'encre, nuit dark-fantasy, une seule lumière chaude) ; une carte qu'on parcourt et qu'on zoome comme dans Clash of Clans ; des bâtiments qui grandissent ; des animations légères (moulin, eau, foyer, fumée, bannières) ; des villageois qui se déplacent, travaillent et construisent. Le tout fluide sur un téléphone moyen, avec la pile actuelle.

**Hors V1, mais à préparer dans les données** (§7) : le jour et la nuit, les saisons et les événements qui décorent les bâtiments, le changement d'environnement, l'agrandissement du village.

Le verdict de fin se lit **uniquement** contre `docs/designs/village-iso-v1/CRITERES-V1.md`.

## 1. Règles non négociables

1. **Reprise d'abord.** Si `docs/designs/village-iso-v1/STATE.md` dit autre chose que « Prochaine action: L0-T01 » avec un lot 0 vierge, tu es une reprise : lis STATE, BOARD, DECISIONS, KNOWLEDGE, `VALIDATIONS.md` et la fin de LOG, recrée les tâches non terminées dans la liste partagée, recrée les coéquipiers dont elles ont besoin (le mode équipe ne restaure pas les coéquipiers d'une session reprise), et reprends à « Prochaine action ». Si STATE dit « en attente de Guillaume », continue seulement si la ligne attendue est dans `VALIDATIONS.md` ou si Guillaume te la donne dans cette session.
2. **Lis avant tout** : `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, `docs/architecture/performance.md`, `docs/content/image-style-prompt.md`, puis tout le dossier du POC (`docs/designs/village-iso-poc/` : REPORT, STATE, LOG, CHECKLIST) et `docs/designs/village-iso-v1/` (DECISIONS, KNOWLEDGE, VALIDATIONS). Le POC a déjà tranché beaucoup de choses : DECISIONS.md les liste, ne les rediscute pas sans raison écrite.
3. **Git.** Tout sur `BRANCHE_V1`. **Toi seul commites**, et seulement par `scripts/iso/team/commit.sh <fichier-message> <chemins>` ; tu pousses seulement par `scripts/iso/team/push.sh`, à une porte humaine ou à la fin, chacun avec un délai Bash de 10 minutes (`timeout: 600000`) ou en arrière-plan : tué au milieu du pre-commit, le travail ne reste que dans le fichier de secours de prek. Jamais de merge, de PR, de `main`. Le hook `guard-team.sh` bloque tout `git` qui écrit, pour toi comme pour les coéquipiers.
4. **Un seul écrivain par fichier** : la carte des propriétés (BOARD) dit qui écrit quoi. STATE, BOARD, DECISIONS, KNOWLEDGE, LOG et `reviews/` ne sont écrits que par toi.
5. **Fichiers figés** : ce prompt, `CHECKLIST.md`, `CRITERES-V1.md`, `REVUE-PROMPT.md`, `REVUE-UI-PROMPT.md`, `VALIDATIONS.md`, `scripts/iso/team/**`, `.claude/**`, l'audit gelé du POC. Les réglages interdisent de les écrire et le hook bloque les écritures par le shell. Avant chaque revue et chaque porte : `git diff --exit-code <COMMIT_DE_LANCEMENT> -- docs/designs/village-iso-v1/CHECKLIST.md docs/designs/village-iso-v1/CRITERES-V1.md docs/designs/village-iso-v1/REVUE-PROMPT.md docs/designs/village-iso-v1/REVUE-UI-PROMPT.md`, et les sha256 de l'audit gelé contre STATE. Seul Guillaume les modifie, à une porte, avec un nouveau `COMMIT_DE_LANCEMENT` qu'il te donne.
6. **Ressources de la machine** : toute commande lourde (jest complet, `tsc`, `biome` sur tout le projet, `knip`, Gradle, rendu Blender Cycles, `expo export`) passe par `scripts/iso/team/heavy.sh`, qui en laisse tourner 2 au plus et une seule Gradle. La build `.perf` passe par `scripts/iso/team/gradle-perf.sh`, qui arrête toujours les démons Gradle ; pour les arrêter à la main : `android/gradlew -p android --stop`. Une commande qui peut dépasser 10 minutes part en `run_in_background` (L0-T08 vérifie que ça marche chez un coéquipier ; sinon c'est toi qui lances les builds longues). Personne ne fait de `cd` qui dure : les chemins partent de la racine, ou `( cd x && … )` en sous-shell. Un seul coéquipier touche l'émulateur (`qa`), qu'il ne démarre ni n'arrête.
7. **Jamais le téléphone** : `adb` et `maestro` ne passent que par `scripts/iso/team/emu-adb.sh` et `emu-maestro.sh`, qui refusent tout ce qui n'est pas un émulateur. Les builds qui installent « sur l'appareil » (`npm run android:release`, `expo run:android`, `installRelease`, `installDebug`) sont bloquées.
8. **Une commande bloquée ne se contourne pas.** Ni toi ni un coéquipier n'écrivez un script, un alias ou un `bash -c` qui relance ce qu'un hook a refusé. Les hooks ne voient pas l'intérieur des scripts : tout script nouveau ou modifié (Python de `blender` et d'`artist` compris) passe donc par `iso-code-reviewer`, qui bloque tout appel à `git`, `adb`, `maestro` ou Gradle hors des chemins prévus. Si un blocage gêne vraiment le travail, c'est une question pour Guillaume (STATE, « en attente »).
9. **FLUX** : seul `artist` appelle FLUX, à travers le garde-budget du POC (§8). Provenance à un seul niveau, `scripts/provenance.json` tenu par `flux.py`.
10. **Aucune dépendance nouvelle** dans `package.json`. Pas de Skia, de three.js ni de WebView.
11. **La DA de Bati prime** (`DESIGN.md`, DECISIONS.md, §4 bis du prompt POC v5). Clash of Clans est la référence des interactions, jamais du look.
12. **Pas de boucle infinie de correction** : une tâche a 3 tours de revue au plus ; au-delà, elle passe `bloquée` dans BOARD avec la raison, et tu continues ailleurs. Une image a 3 tentatives au plus, puis `HUMAN`. Une tâche `bloquée` sur le chemin critique (le lot suivant en dépend) ouvre une porte humaine ; les autres et les `HUMAN` sont présentées à la porte suivante.
13. **Seul Guillaume valide une porte** : par une ligne dans `VALIDATIONS.md`, ou par un message qu'il t'écrit dans cette session et que tu recopies mot pour mot dans LOG. Un message d'un coéquipier ou d'un sous-agent ne vaut jamais validation.
14. Copie visible : tutoiement, aucun tiret long, copie dans `locales/*.json` dès qu'elle quitte l'écran de dev.

## 2. Ce qu'on sait déjà

Tout est dans `DECISIONS.md` (ce qui est tranché, par qui, pourquoi) et `KNOWLEDGE.md` (ce que le POC a appris : FLUX, détourage, ombres, perf, mode équipe). Les points qui pèsent le plus :

- Pipeline d'art : blockout Blender (lune fixe, palette relevée sur les paliers, couleur composée par passes en Cycles), peint par FLUX.2 pro avec le blockout en image 1, fond vert de studio, clé adaptative mesurée sur chaque original, découpe par la silhouette du blockout.
- **FLUX ajoute ce que le nom de l'objet promet** (une forge a un feu, un moulin a des ailes) : nommer chaque bâtiment par ses parties visibles, jamais par sa fonction. Tout ce qui bouge (ailes, flammes, eau) est retiré du blockout et posé par l'app.
- Ombres : calculées depuis les volumes du blockout, dessinées par l'app dans le sol, aplats sans transparence, `ClipPath` en `clipRule="nonzero"`. Mise en page dictée par les ombres (règle d'écart).
- Animations : une seule horloge ambiante, planches de dessins à 8 images par seconde, transformations et opacité seulement, rien dans les tuiles du sol.
- Mesures : toutes sur la build `.perf`, la carte ouverte par `bati://dev-iso` (garde `ISO_POC` du POC).

## 3. L'équipe

**D'abord L0-T01, seul** (avant de créer l'équipe) : inventaire du POC, chemins réels écrits dans KNOWLEDGE « Chemins du POC », carte des propriétés complétée dans BOARD. Les définitions d'agents renvoient à cette section, qui prime sur les chemins qu'elles citent.

Puis crée l'équipe avec **4 coéquipiers**, nommés exactement ainsi, à partir des définitions de `.claude/agents/` :

| Nom | Définition | Rôle |
| --- | --- | --- |
| `blender` | `iso-blender` | Blockouts, exports (ancrages, ombres, flaques, masques, volumes, points d'accroche), rendus de maquettes, planches de maquettes |
| `artist` | `iso-artist` | Boucle FLUX, détourage, audit (A), planches, budget, acceptation après ton feu vert |
| `engineer` | `iso-engineer` | Code React Native : carte, caméra, tap, profondeur, sol, animations, IA des villageois, intégration, tests Jest |
| `qa` | `iso-qa` | Build `.perf`, émulateur, Maestro, mesures de perf, captures, vidéos, `perf.sh` |

Ce que chacun écrit : la carte des propriétés de BOARD. Pour déplacer une propriété, tu l'écris dans BOARD avant d'attribuer la tâche. Deux coéquipiers n'écrivent jamais le même fichier.

**Les regards neufs ne sont pas des coéquipiers.** Ce sont des sous-agents que **toi seul** lances, **sans nom** (un sous-agent nommé deviendrait un coéquipier), neufs à chaque revue, pour qu'ils ne soient jamais ancrés sur le travail qu'ils jugent :

| Définition | Quand |
| --- | --- |
| `iso-art-reviewer` | Chaque planche d'images, avec le texte exact de `REVUE-PROMPT.md`, une fois par (slug, tentative) |
| `iso-design-reviewer` | Chaque capture ou vidéo d'écran, avec le texte exact de `REVUE-UI-PROMPT.md` et le type de la checklist (attention : « Village complet en maquettes » au lot 1, « peint » au lot 6) |
| `iso-code-reviewer` | Chaque diff de code ou de script (Python et shell de `blender`, `artist` et `qa` compris), avec la liste des fichiers de la carte de tâche |
| `iso-tech-auditor` | À chaque fin de lot : audit adversarial du lot (plan, code, mesures) contre le dépôt |
| `iso-researcher` | Quand une question demande une recherche (doc d'une API, technique de jeu). Les coéquipiers te la demandent par message ; tu lances le chercheur et tu leur transmets la note qu'il écrit dans `docs/designs/village-iso-v1/research/` |

## 4. Le protocole de travail

**La liste de tâches partagée** porte le travail du moment des 4 coéquipiers, chaque tâche créée **avec son propriétaire** (sinon un coéquipier inoccupé prend la première tâche libre). Tes tâches, celles des sous-agents et celles de Guillaume restent dans BOARD seulement. **BOARD.md** est la copie durable de tout. Chaque tâche suit `TASK-CARD.md` et porte son identifiant (`L2-T07`) en tête de son titre : le hook `task-completed.sh` le lit.

**Le cycle d'une tâche :**
1. Tu crées la tâche (liste partagée et BOARD), avec ses dépendances et son propriétaire.
2. Le coéquipier travaille dans ses fichiers, écrit `docs/designs/village-iso-v1/reports/<id>.md` selon `REPORT-TEMPLATE.md` (fait, preuves, douteux), remet la tâche en `pending` (propriétaire gardé ; une tâche laissée `in_progress` à la fin de son tour déclencherait le hook de fin de tâche en boucle), t'envoie « prêt : <id> » et ne marque pas la tâche terminée.
3. Tu lances le bon regard neuf (§3). Code : `iso-code-reviewer` sur les fichiers de la carte, plus `qa` si l'écran change. Images : `iso-art-reviewer` sur la planche. Écran : `iso-design-reviewer` sur les captures de `qa`.
4. Tu écris le verdict dans `docs/designs/village-iso-v1/reviews/<id>.md`, première ligne `verdict: pass` ou `verdict: fail`, puis le résumé de la revue. Si c'est `pass` : tu marques la tâche terminée (le hook refuse sans rapport ni verdict `pass`), tu mets à jour BOARD et LOG. Sinon : tu renvoies les points au coéquipier ; c'est un tour de plus, 3 au plus.
5. Toute décision prise en route (un seuil, un choix technique, une exception) va dans DECISIONS.md avec sa raison et son auteur (`agent` ou `Guillaume`).

**Les fenêtres de commit.** Le pre-commit (biome `--write`, `tsc` sur tout le projet, correcteurs d'espaces, limite de 2 Mo) met de côté tout le travail non indexé de l'arbre pendant qu'il tourne : un coéquipier ou une tâche de fond qui écrit à ce moment peut faire perdre du travail. Le pre-push lance jest complet et knip sur l'arbre tel qu'il est. Donc :
- tu commites par lots (plusieurs tâches validées d'un coup), au plus quelques fois par jour de travail et à chaque fin de lot ;
- avant : « pause écriture » aux coéquipiers qui travaillent, tu attends leurs « en pause » (plus rien n'écrit, aucun lot de rendus ni build en arrière-plan ne tourne, et le code en cours d'`engineer` passe `tsc` ; sinon il te le dit et tu attends ou tu ne commites que le reste), puis `scripts/iso/team/commit.sh <message> <chemins des tâches validées>` (un message qui liste les ids) ; après : « reprise » ;
- le commit échoue : `commit.sh` désindexe tout seul ; si biome ou un correcteur d'espaces a réécrit des fichiers, relance-le ; sinon tu crées une tâche de correction, sans jamais contourner le hook.

**La parallélisation :**
- Jamais deux tâches qui touchent le même fichier en même temps.
- Au plus 2 commandes lourdes à la fois : `heavy.sh` attend son tour, c'est normal.
- Profite des attentes : pendant qu'un rendu FLUX ou un build tourne, un autre coéquipier code, modélise ou mesure.
- Garde chaque coéquipier occupé avec 3 à 6 tâches bien découpées dans son domaine. Une tâche trop grosse (plus d'une demi-journée d'agent) est à découper.

**Les messages entre coéquipiers** sont permis pour se transmettre une information (un chemin de fichier, un ancrage, une mesure), jamais pour se donner une autorisation ou valider le travail d'un autre.

## 5. La V1, lot par lot

Chaque lot se termine par l'audit de `iso-tech-auditor`, ses corrections, un commit, puis la porte indiquée.

**Lot 0, cadrage (0 $)** : les tâches de BOARD.
- L0-T01, par toi, avant l'équipe (§3).
- **La carte du village complet** : `constants/isoLayout.json`, une grille maîtresse (16×16 environ) qui place les 21 bâtiments, le chemin, l'eau (canal ou rivière, fontaine, puits) et les décors. Elle respecte la règle d'écart des ombres, avec les hauteurs que `blender` donne (L0-T05). L'îlot visible grandit avec le palier du village (12 paliers), donc chaque case porte le palier où elle apparaît. Un test vérifie la règle d'écart et la connexité du chemin.
- Le schéma de données pour le futur (§7) et le **repère** de chaque bâtiment (ce qui le fait reconnaître en vue réduite, item 7 de la checklist), dans `isoSpec.json`.
- La projection du coût FLUX (L0-T07) et le chemin de mesure en `.perf` (L0-T08).
- **Porte H0 (Guillaume)** : la carte du village complet (captures de la grille et des emprises), les repères, le plan des lots, et le budget FLUX d'après la projection.

**Lot 1, le village en maquettes (0 $)**
- Les blockouts des 21 bâtiments à tous leurs stades (tier 3 : 2 stades, les autres 3), plus les décors, l'eau, les échafaudages (1×1, 2×2) et les figurines des 7 villageois.
- Les exports (§7 compris), et la carte complète affichée **en maquettes** dans l'écran de démo, à chaque palier.
- Revues : `iso-design-reviewer`, type « Village complet en maquettes », sur des captures aux paliers 3, 6, 9 et 12.
- **Porte H1 (Guillaume)** : la composition du village se juge ici, avant de payer la moindre image.

**Lot 2, la peinture par familles (FLUX)**
- Ordre : les bâtiments de muscle (forge, moulin, carrière, puits, ferme, champ de tir) ; les spéciaux (tour du sorcier, bosquet du druide) ; les débuts (feu de camp, tente, mannequin) ; les 6 améliorations de tier 3 ; les hauts faits et la route (antre du dragon, salle des héros, arène, grand-route) ; puis les décors, l'eau peinte, les échafaudages. Les 21 y sont : 6 + 2 + 3 + 6 + 4.
- Après chaque famille : revue d'ensemble (la famille posée sur la carte, à côté de `tier_3` et `tier_6`, type « Ensemble posé sur le sol », item 15 en tête). Une famille qui détonne repasse en boucle.
- `forge_solid` du POC est sur fond magenta : s'il détonne avec sa famille sur fond vert, il est refait.
- Point d'étape budget à chaque famille : coût réel par sprite accepté contre la projection.
- **Porte H2 (Guillaume)** : après la première famille peinte.

**Lot 3, la carte V1 dans l'app (0 $)**
- Du moteur du POC à un composant de production : vraies données (`getVillageScene()`, `buildingStage`), îlot qui grandit avec le palier, caméra, tap au masque alpha, feuille de détail dans la DA, croissance au retour de séance, accessibilité (liste texte équivalente, actions TalkBack), `INTEGRATION` (drapeau lisible en release, éteint par défaut ; la carte reste ouvrable en `.perf` par `bati://dev-iso`).
- Mesures de `qa` sur l'émulateur (protocole du POC, témoin compris) et `perf.sh` mis à jour.
- **Porte H3 (Guillaume)** : il lance `perf.sh` sur le Fairphone et regarde la carte en main. Avant de lui passer la main, tu arrêtes tout travail de `qa` sur appareil ; Guillaume débranche son téléphone avant de te répondre, et c'est seulement après sa réponse que `qa` reprend.

**Lot 4, la vie des bâtiments**
- Ailes du moulin par rafales, foyer de la forge (planche de flamme, flaque et lueur qui palpitent), fumée en volutes, eau (traits de reflet qui avancent sur le canal, planches pour la fontaine, le puits et la cascade au bord de l'îlot), bannières (planche de 3 dessins), fenêtres.
- Tout sur l'horloge ambiante et `MODE_VIE`.

**Lot 5, les villageois**
- Une planche par rôle (repos, 2 pas, 2 gestes de travail, de face et de dos), peinte en une seule image.
- L'IA de déplacement : grille de coûts (chemin 1, herbe 3, emprises infranchissables), A* avec la distance de Manhattan, machine à états (choisir, marcher, agir ; croiser un villageois ; fin de vague), graine par jour, présence dérivée du journal, réservation de case à l'arrêt.
- Le chantier : à la croissance d'un bâtiment, échafaudage, 2 ou 3 villageois qui viennent frapper, poussière, puis le nouveau stade (fondu et ressort de récompense).

**Lot 6, finition**
- Revue `iso-design-reviewer`, type « Village complet peint », aux paliers 3, 6, 9 et 12 (critère 2).
- Mesures finales, vidéo de 30 s (parcours, zoom, tap, croissance avec chantier, villageois, retour au repos), captures 360×640 et écran large, rapport V1.
- **Porte finale (Guillaume)**.

## 6. La vie du village et la règle des animations

`performance.md` interdit les animations sans fin (elles bloquent Maestro et TalkBack, et coûtent environ 10 % d'un cœur même au repos).

- `MODE_VIE = vagues` : tout s'anime à l'ouverture, pendant qu'on touche la carte, puis 15 à 20 s ; ensuite chaque élément finit son geste au même moment, et l'écran se repose (0 image en 10 s).
- `MODE_VIE = continu` : la vie continue tant que l'écran est visible, coupée sous TalkBack, en mouvement réduit, en test E2E et après 60 s sans toucher. C'est une exception à écrire dans `performance.md` (tâche d'`engineer`) et dans DECISIONS, mesurée sur le Fairphone.

## 7. Préparer le futur sans le construire

La V1 n'a que la nuit, une saison, un environnement et la taille du village complet. Mais les données sont posées dès maintenant, parce que les ajouter plus tard voudrait dire refaire les 21 bâtiments :

- **Jour et nuit** : `isoSpec.json` range les palettes et la lumière par **ambiance** (`nuit` seule remplie en V1). Les noms d'images portent l'ambiance (`<slug>/<stade>.nuit.webp`). Chaque sprite exporte en plus son **masque émissif** (fenêtres, feux) pour pouvoir allumer ou éteindre les lumières. Les **volumes du blockout** (sommets des primitives) sont exportés avec chaque stade : l'ombre au sol se recalcule alors pour n'importe quelle position du soleil, sans Blender. Les blockouts restent rejouables avec une autre palette, ce qui permettra de peindre une variante de jour sans tout remodeler. Un soleil qui tourne en continu reste impossible avec des sprites peints : le jour et la nuit seront des ambiances fixes, avec un fondu entre elles.
- **Saisons et événements** : chaque stade exporte ses **points d'accroche** (faîte du toit, porte, cheminée, avant-toits) et son **masque de toit**, et l'ordre des couches réserve une place « décor de saison » entre le sprite et les effets. Neige sur les toits, guirlandes, citrouilles, bannières d'événement viendront s'y poser sans repeindre les bâtiments.
- **Changer d'environnement** : les couleurs du sol, les décors et l'eau sont rangés par **biome** (`defaut` seul en V1), dans `rawColors.ts` et `isoSpec.json`.
- **Agrandir** : la grille maîtresse et l'îlot qui grandit par palier existent dès le lot 0 ; la caméra lit ses bornes dans l'îlot courant ; le sol est en tuiles d'au plus 1024 px, donc une carte plus grande ne coûte que des tuiles de plus.

Chaque point a son test ou sa vérification dans BOARD (par exemple : un test recalcule l'ombre d'un bâtiment avec un autre soleil depuis les volumes exportés).

## 8. Le budget

- `BUDGET_FLUX_V1` $ réels au plus (ou le plafond que Guillaume écrit à H0), garde-budget du POC (réservation avant envoi, réel par le champ `cost`, contre-vérification par `/v1/credits`). `artist` est le seul à l'écrire.
- **Point d'étape à chaque tranche de `ALERTE_FLUX` $** : tu écris dans STATE où on en est (images, taux d'acceptation, coût par sprite accepté, projection jusqu'à la fin). Si la projection tient dans le plafond, tu continues et tu le notes dans LOG. Si elle le dépasse : `artist` s'arrête, tu demandes à Guillaume dans la session (`BUDGET_FLUX_V1: <nouveau>` ou `FLUX: continuer`), et le reste de l'équipe continue les tâches sans FLUX en attendant.
- Pour tenir : `CANDIDATS` réduit, puis l'ordre de priorité du lot 2 (les familles d'abord, les décors et l'eau peinte en dernier ; l'eau peut rester vectorielle).
- Les jetons comptent aussi : une équipe coûte bien plus qu'une session seule. Arrête les coéquipiers inutiles, et ne garde pas une revue ouverte plus longtemps que nécessaire.

## 9. Les portes humaines et la reprise

À chaque porte (H0, H1, H2, H3, tâche bloquée sur le chemin critique, dépassement de budget, porte finale) :
1. Tu prépares de quoi juger : captures, planches, vidéo, mesures, dans `docs/designs/village-iso-v1/evidence/` et, si l'outil Artifact est disponible, une page de suivi mise à jour. Tu y joins les tâches `bloquées` et les images `HUMAN` en attente.
2. Tu écris dans STATE « en attente de Guillaume : <porte> », la ligne qu'il doit donner (`H1: validé`, ou ses consignes), et un résumé de 10 lignes. Tu fais une fenêtre de commit.
3. Tu poses la question dans la session. Si Guillaume répond, tu recopies sa réponse dans LOG et tu continues.
4. Sans réponse : tu demandes aux coéquipiers de s'arrêter proprement, tu pousses par `push.sh`, et tu t'arrêtes. Guillaume reprend en écrivant sa ligne dans `VALIDATIONS.md`, en la commitant, puis en relançant `claude` et en recollant ce prompt (règle 1).

## 10. Le rapport V1

`docs/designs/village-iso-v1/REPORT.md`, court, sans tiret long : verdict lu contre `CRITERES-V1.md` ; tableau des critères avec preuves ; coût (FLUX par famille et par sprite accepté, et une estimation des jetons) ; mesures de perf (émulateur, Fairphone de Guillaume) ; ce qui a raté et pourquoi ; ce qui est prêt pour le jour et la nuit, les saisons, les biomes et l'agrandissement ; questions pour Guillaume.
