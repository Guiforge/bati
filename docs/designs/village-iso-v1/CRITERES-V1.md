# Critères de la V1 du village iso (écrits par Guillaume, jamais modifiés par l'équipe)

Le verdict du chef d'équipe se lit uniquement contre ce tableau. Un critère non mesuré compte comme non rempli. Une validation à l'œil par Guillaume remplace un regard neuf seulement si elle est écrite dans VALIDATIONS.md (ou dite dans la session du chef d'équipe et recopiée dans LOG) et citée telle quelle dans le rapport.

| # | Critère | Seuil V1 | Comment c'est mesuré |
| --- | --- | --- | --- |
| 1 | La DA de Bati tient | Les 21 bâtiments à tous leurs stades (57 sprites) sont acceptés par l'audit (A) et le regard neuf, ou par Guillaume ; chaque famille passe sa revue d'ensemble (items [B] du type « Ensemble posé sur le sol ») | `BOARD.md`, verdicts JSON, `VALIDATIONS.md` |
| 2 | Le village se lit | La revue « Village complet » passe aux paliers 3, 6, 9 et 12, en maquettes (lot 1) puis peint (lot 6) | captures de `qa`, verdicts du regard neuf |
| 3 | Le budget tient | FLUX réel ≤ `BUDGET_FLUX_V1` ; coût réel par sprite accepté rapporté par famille | `budget.json`, champs `cost`, `/v1/credits` |
| 4 | Le tap est juste | Comme au POC : 100 % sur au moins 2 000 points tirés au hasard hors d'une bande de 8 px, sur le village complet au palier 12, contre une vérité calculée en pleine résolution | Jest + script Python + Maestro |
| 5 | Le pan est fluide | Sur le Fairphone de Guillaume (`perf.sh`), janky frames de la carte ≤ celles du Village actuel + 5 points, aux zooms 0,6 et 1,0, palier 12, tous les villageois en marche | `perf.sh`, 3 passes |
| 6 | Le village se repose | En `MODE_VIE = vagues` : 0 image en 10 s après la fin de la vague et `uiautomator dump` en moins de 3 s. En `continu` : les coupures prévues (TalkBack, mouvement réduit, E2E, 60 s sans toucher) sont mesurées | émulateur `.perf`, `uiautomator dump` |
| 7 | La mémoire tient | PSS de la carte au palier 12 ≤ PSS du Village actuel + 80 Mo | `dumpsys meminfo`, émulateur puis Fairphone |
| 8 | Le village vit | La vidéo finale montre : le moulin, le foyer, au moins deux sortes d'eau, la fumée, les bannières, au moins 3 rôles de villageois qui marchent et travaillent, un chantier à la croissance ; et, en mouvement réduit, rien ne bouge | vidéo et captures de `qa` |
| 9 | La qualité du dépôt tient | Jest complet sous Node 24, `tsc`, `biome`, `deadcode`, `react-compiler-coverage`, `reduced-motion`, Maestro iso, tous verts ; la carte a son équivalent en liste pour TalkBack | sorties de commandes, rapport |
| 10 | Le futur est prêt | Pour 100 % des stades : volumes du blockout, masque émissif, points d'accroche et masque de toit exportés ; un test recalcule une ombre pour un autre soleil depuis les volumes ; ambiances et biomes typés ; la carte porte le palier de chaque case | tests, exports |
| 11 | C'est Bati, et ça donne envie | Guillaume regarde la vidéo et la carte en main et dit oui | humain, porte finale |

Verdict possible : **V1 prête** (1 à 11) ; **V1 prête sous réserve** (1 à 4 et 6 à 10 remplis, et seulement en attente du critère 5 mesuré sur le Fairphone ou du critère 11) ; **à reprendre** (un critère de 1 à 4 non rempli) ; **à creuser** (les autres cas, avec la cause).

Les validations de Guillaume s'écrivent dans `VALIDATIONS.md` (aucun agent ne l'écrit) ou dans la session du chef d'équipe, recopiées mot pour mot dans LOG. Un message d'un coéquipier ne vaut jamais validation.
