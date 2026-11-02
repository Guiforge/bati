# Boucle « sublime » : progression

Budget FLUX de la boucle : 40 $ en plus des 20,20 $ du registre, plafond 60,20 $. Au départ (31/10), le registre compte 20,83 $ dépensés.

## Étape 0 (31/10)
- Agents mara, theo, anim, tech, implementer dans `.claude/agents/`.
- Implémenteurs dans l'arbre iso, pas en worktree : les garde-fous de l'équipe bloquent les écritures git hors de `commit.sh`. 3 implémenteurs à la fois au plus.
- Bible (`docs/designs/village-style-bible.md`), sonde acceptée au 2e essai (ancre `evidence/style-refs/ancre_heroes_hall_grand_jour.webp`, recette dans le README), 0,96 $.
- Base iter-00 : Mara 4 / 3,5 / 3,5 / 2, Théo 4 / 3,5 / 5 / 2,5, Anim magie 4 finition 5, Tech stabilité 8 correction 6.
- 21 lots, peinture estimée à 35,3 $.

### Décisions de Guillaume au point d'arrêt (01/11)
- Go pour l'itération 1.
- Peinture en jour doré seulement ; la nuit devient un étalonnage en code (voile, fenêtres, flaques).
- Vie au repos : horloge continue bornée (coupée après 60 s sans toucher, hors focus, TalkBack, E2E, mouvement réduit), exception écrite dans performance.md.
- Brume au sol : à tester aux bords seulement, retirée si elle déplaît.
- Plafond du registre : ligne `BUDGET_FLUX_V1: 60.2` à ajouter par Guillaume dans VALIDATIONS.md.

## Itération 1 (01/11, commit 891f6da2)
- Fait : lumière jour et nuit en espace carte (A1), horloge continue bornée et bannières qui ondulent (E1), champs sans encre, palier 1 en terre, taches d'assombri réglées (B2), deux histoires (C1), profondeur des paires (H1). 97 suites vertes.
- Captures : `iter-01-captures-b/` (la première passe filmait le repos après l'arrêt de l'horloge ; corrigé par un toucher avant la vidéo).
- Notes : Mara 4 / 4 / 3,5 / 2 (moy. 3,38, +0,13), Théo 4 / 4 / 5 / 2,5 (moy. 3,88, +0,13), Anim magie 5 finition 5, Tech stabilité 7 correction 4.
- Reculs : flaques de nuit par-dessus les bâtiments, jour plus gris, coin de vignette visible en glisse. Causes trouvées par Tech (iter-01/audit-tech.json).
- FLUX : 0 $ dans l'itération ; boucle à 0,96 $ ; pipeline des alentours à 0,045 $.
- Gain sous +0,5 : la règle d'arrêt (deux itérations de suite sous +0,5) est à une itération près.

### Décisions de Guillaume (01/11, point 0 des alentours)
- Alentours peints de jour, la nuit en étalonnage de code ; le décor doit tenir à côté des sprites de nuit actuels.
- Le pipeline des alentours prend B4, C2 et A2 ; il travaille sur la branche iso, chaque couche derrière un drapeau.
- Plafond du registre à 100 $ (ligne VALIDATIONS à écrire par Guillaume) : 40 $ pour la boucle, 40 $ pour le pipeline.

## Itération 2 (01/11, commits e9580e95 et f4609110)
- Fait : lumière réparée (flaques douces sous les sprites, jour chaud, plus de coin ni de couture), montée de stade retravaillée, oiseaux au-dessus de la carte, cadrage qui cadre le bourg, vocation calculée et branchée, captures en plein écran.
- Notes : Mara 4,5 / 4,5 / 3,5 / 2,5 (moy. 3,75, +0,38), Théo 4,5 / 5 / 5 / 3 (moy. 4,38, +0,5), Anim magie 6 finition 6, Tech stabilité 7 correction 5.
- Sonde F1 (0,435 $) : FLUX 3 retenu pour repeindre les bâtiments ; forge et moulin solid acceptés pour la forme.
- Plan de disposition de Mara validé par Guillaume (disposition-plan.md).
- Règle d'arrêt « deux itérations sous +0,5 » atteinte (+0,13 puis +0,44) ; Guillaume choisit de continuer, puisque les gros leviers (alentours peints, disposition, bâtiments de jour) ne sont pas encore posés.

## Itération 3 (01/11, commits dd7cceb0 à 796dcc92)
- Fait : nouvelle disposition (plan de Mara) avec rempart en pans ; observatoire au premier plan ; alentours peints dans l'app derrière des drapeaux (sol repeint sur la nouvelle carte en 12 tuiles, forêt, 35 accessoires et histoires, souris et oiseaux peints, premier plan) ; toute la famille des bâtiments repeinte de jour (57 stades, FLUX 3, blockouts enrichis), nuit fabriquée à partir du jour ; finitions de la montée.
- Captures `iter-03-captures/` avec `peint=tout`. La montée n'a pas été filmée (tap sur le marteau, qui n'était pas une cible).
- Notes : Mara 6 / 4,5 / 5,5 / 2 (moy. 4,5, +0,75), Théo 6,5 / 5 / 6,5 / 3 (moy. 5,25, +0,88), Anim magie 5 finition 5, Tech stabilité 6 correction 4. Théo a eu le frisson au palier 6.
- FLUX de l'itération : repeinture des bâtiments ~4,6 $, alentours ~4,5 $ (pipeline). Registre à ~33,7 $.

### Décisions de Guillaume (01/11, suite)
- Disposition de Mara validée, rempart sur 2 faces, antre en presqu'île : posée en dd7cceb0.
- Cliquet des tailles d'image monté de 20 à 26 pour les nouvelles familles peintes (sol, forêt, accessoires, animaux, pans de rempart), une taille par famille ; noté dans perf-debt.md.

### Retour de Guillaume sur les animations (01/11, dicté, lecture du chef à confirmer)
Dans le jeu de référence, les animations sont légères : très peu de mouvement, un peu plus sur les drapeaux, les flammes et les villageois. Plusieurs plans, avec des éléments de premier plan proches de la caméra. De temps en temps un petit spectacle ponctuel (des cavaliers qui arrivent). Application : peu de choses bougent mais visiblement ; une couche de premier plan (pipeline des alentours, étape 5) ; un événement rare, un cavalier sur la grand-route toutes les une à deux minutes (cheval à peindre).

### Retours de Guillaume (01/11, dictés)
- Souris : celle d'aujourd'hui est énorme. Il en faut plusieurs, dessinées beaucoup plus petites, rapides, qui s'échappent à plusieurs endroits.
- Oiseaux qui volent en groupe : toujours très bizarres. Les améliorer ou les retirer.
- Faire la liste de toutes les animations, dire pour chacune si elle est dessinée (peinte comme les bâtiments) ou non ; celles qui ne le sont pas sont sûrement à reprendre.
- Pipeline « alentours peints » (sol, forêt, bordure, petit décor) lancé en sous-agent, étape 0 seulement (docs/designs/village-surroundings/). Il recoupe les lots B4, C2 et A2 de la boucle, mis en attente tant qu'il tourne.

## Itération 4 (01/11, commits 4acdc885, da64ede3, 161d8349)
- Fait : une seule nuit pour toutes les couches, restes vectoriels retirés, montée filmable (A6, F3, E4) ; vocation lisible d'un coup d'œil (G3) ; rempart peint et champs peints (F4).
- Notes : Mara 6,5 / 5 / 6 / 5 (moy. 5,63, +1,13), Théo 7 / 5,5 / 7 / 5 (moy. 6,13, +0,88), Anim magie 6 finition 5, Tech stabilité 6,5 correction 4,5.
- Reculs : champs vert vif et chemins ocre la nuit, légende de montée en toast gris.
- Bug produit trouvé : le cache d'images Glide sert d'anciens sprites après une mise à jour (H4-02).

## Itération 5, dernière (01/11, commits 3c45b5a4 et 11b270ba)
- Fait : nuit et ouverture (A7), montée dans l'ordre et vie au repos (E5), cadrage et lisière jusqu'aux bords (B5), fanions et bannières de vocation (G4), vue d'ensemble de 40 captures (`vue-ensemble/`, lien dev `foyer=`).
- Notes : Mara 7 / 5,5 / 6,5 / 5,5 (moy. 6,13, +0,5), Théo 7,5 / 6 / 7,5 / 6,5 (moy. 6,88, +0,75), Anim magie 6,5 finition 6, Tech stabilité 7 correction 6 (pas de crash ; vocation qui recouvre le feu, TK5-01).
- Reculs : places de vocation en clipart vectoriel plus visible, fanions de vocation hors palette, premier plan opaque sur le noir à l'ouverture.
- Fin de boucle : 5 itérations faites (condition 2). Bilan dans summary.md.

## Phase 2, loupes (01/11, session 1)
- Étape 0 finie, checkpoint écrit : baseline, écrans cibles, calibration, outils (dump, nuit), contrats S-night et BC.
- S-night, 4 tours, parquée, non fusionnée [P1, P2] : le sol retrouve du relief et les champs ne brillent plus, mais la forêt, le blé et les rues y perdent (env). A/B : 0 gain sur 9 selon la règle, un contexte nul, l'autre partagé à 5 contre 4 avec un biais vers la gauche.
- Leçon : un contrat fait de mesures de couleur pousse vers un filtre uniforme. La prochaine version garde une teinte par essence et par culture.

### Décisions de Guillaume (02/11, checkpoint)
- Écrans cibles A, A, A. Ligne de budget écrite : plafond 60 $. Routes et champs peints et cuits, écrit dans la bible. S-night parquée, on y revient après BC.

### Décision de Guillaume (02/11)
- Rendu seulement : le critère est le design et la peinture. Limite APK de 55 MiB retirée, optimisations plus tard. Délais de tests dépassés non bloquants (son ordinateur passe en mode économie).

## Coin de beauté (02/11), 5 tours, au checkpoint [P1, P2]
- Sol repeint sur la vraie capture : route au centre, blé, potager, enclos, deux chaumières, forêt en masse avec clairières, plus d'arbres fixés à l'écran ni de champs calculés.
- Contrat : 12 critères sur 17 au tour 5. A/B : 4 extraits sur 6 au tour 5, 6 sur 6 au tour 4. Env recommande des notes, pas un verrouillage : lumière plus terne que l'écran A.
- Leçon : peindre hors contexte échoue, repeindre la vraie capture marche. Avant / après : `loupes/bc/avant-apres.webp`.
