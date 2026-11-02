# P1-perf-qa : l'échelle par transform coûte-t-elle quelque chose ?

Build `.perf` x86_64 de la variante P1 dans le worktree jetable `~/.cache/bati-art-loop/iso/p0-wt` (917dee6b), INTEGRATION = true pour la build seulement. Rien d'autre n'a été modifié dans le worktree principal que ce rapport et `evidence/P1-perf/`. Rien n'est commité.

## Variante P1 (éditée à la main dans p0-wt)
- `monde.ts` : champ `teinte` et son tirage `hasard()` retirés. Le tirage en moins décale les cases suivantes : la forêt de P1 n'a pas les mêmes arbres aux mêmes places que A, H et F1 (F1 de P0 consommait le tirage). La mesure n'en dépend pas, mais les captures ne se comparent pas arbre à arbre.
- `Monde.tsx` : forêt en `left/top` fixes, `width/height = IMAGE`, `transform: [{ scaleX: (miroir ? -1 : 1) * echelle }, { scaleY: echelle }]`, plus d'opacité ; rive `[{...}, miroir ? MIROIR_V : null]` ; `MIROIR_H` supprimée.
- `tsc --noEmit` avant la build : une seule erreur, `__tests__/iso-monde.test.ts` lignes 318-319 (`teinte` n'existe plus sur le type). Attendu : ce test est celui de la version complète, hors de la variante demandée. Aucune erreur dans le code de l'app.
- APK : `~/.cache/bati-art-loop/iso/evidence/P0-perf/apk-P1.apk` (journal `build-P1.log` à côté), sha 0d2e8488649fef5d... ; build de 1 min 42 s.

## Protocole
Même émulateur `emulator-5554` réglé à 1080x1920 (remis à 1080x2400 à la fin). Ordre A (5ea86807), F1 (apk de P0), P1, A. Chaque variante : `install -r -d`, 3 passes vague (force-stop, ouverture à froid de `bati://village`, `gfxinfo reset`, 16 s), 3 passes glissé (ouverture, 22 s, reset, 9 balayages 850 à 250 px à y 600 en 500 ms), 10 s de repos, meminfo.
Le `mesure.sh` de P0 n'était pas dans `evidence/P0-perf/` : je l'ai refait d'après le rapport de P0 (`evidence/P1-perf/mesure.sh`, enchaîné par `tout.sh`). Le glissé compte ~295 trames et non ~355 comme en P0, signe que les balayages ne sont pas rejoués exactement comme alors. Les quatre variantes de ce run sont comparables entre elles, pas en valeur absolue avec P0.
Preuves brutes : `evidence/P1-perf/gfxinfo/{A1,F1,P1,A2}-{vague,glisse}-{1,2,3}.txt`, `*-meminfo.txt`, `mesure-brut.txt`.

## Résultats (passes 1/2/3)

| Variante | Geste | Trames | Janky | p50 / p90 (ms) | Slow UI thread | Slow bitmap uploads | Frame deadline missed |
|---|---|---|---|---|---|---|---|
| A (1er) | vague | 867 / 869 / 869 | 2 / 1 / 1 (0,1-0,2 %) | 21/22, 21/22, 22/22 | 1 / 1 / 1 | 0 / 0 / 0 | 2 / 1 / 1 |
| A (1er) | glissé | 296 / 295 / 294 | 1 / 1 / 2 (0,3-0,7 %) | 16/16 (les 3) | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 1 / 2 |
| F1 | vague | 861 / 860 / 862 | 2 / 1 / 2 (0,1-0,2 %) | 22/23, 16/16, 22/23 | 1 / 1 / 1 | 1 / 1 / 1 | 2 / 1 / 2 |
| F1 | glissé | 305 / 302 / 304 | 1 / 2 / 1 (0,3-0,7 %) | 16/16 (les 3) | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 2 / 1 |
| P1 | vague | 860 / 862 / 860 | 3 / 3 / 2 (0,2-0,35 %) | 22/23, 24/26, 22/23 | 1 / 1 / 1 | 1 / 1 / 1 | 3 / 3 / 2 |
| P1 | glissé | 296 / 295 / 296 | 1 / 1 / 1 (0,3 %) | 16/16 (les 3) | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 1 / 1 |
| A (2e) | vague | 869 / 867 / 869 | 1 / 1 / 1 (0,1 %) | 21/22, 22/23, 21/22 | 1 / 0 / 1 | 0 / 0 / 0 | 1 / 1 / 1 |
| A (2e) | glissé | 296 / 296 / 296 | 1 / 1 / 1 (0,3 %) | 16/16 (les 3) | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 1 / 1 |

Mémoire après les passes (PSS total ; Graphics reste à 0 sur l'émulateur) : A 280 015 kB, F1 289 785, P1 291 068, A2 280 043. P1 est à +1,3 Mo sur F1 et +11 Mo sur A.
A et A2 concordent (pas de dérive de l'émulateur). Le repos de 10 s sert à stabiliser l'app avant le meminfo, il n'est pas compté en trames.

## Captures
`evidence/P1-perf/captures/` : `F1-onglet.jpg` et `P1-onglet.jpg` (onglet Village, palier 1, île au centre : bonne scène), `P1-foret-zoom.jpg` et `F1-foret-zoom.jpg` (même zone en haut à gauche, agrandie x2, pour la revue DA).
Lecture de P1 : les arbres gardent des tailles inégales (échelle 0,8 à 1) et sont tous à pleine opacité. Les grands et petits feuillus voisins se lisent nettement. Rien de cassé : pas de décalage, pas d'arbre coupé, miroirs corrects. Plus de variation de teinte : la forêt est plus régulière en couleur qu'en H. C'est ce que la revue DA doit juger.

## Réponse
L'échelle par transform ne coûte rien de mesurable par rapport à F1. Vague p50 22-24 ms (F1 16-22), glissé 16 ms, Janky 0,2-0,35 % en vague (F1 0,1-0,2 %, un trame d'écart), `Slow bitmap uploads` 1 trame et `Slow UI thread` 1 trame, identiques à F1. Le glissé de P1 est aussi propre que celui de F1 (1 trame en retard par passe). L'écart de PSS (+1,3 Mo sur F1) est dans le bruit d'un run à l'autre.
P1 est au niveau de A : critères du plan atteints sur l'émulateur (vague p50 <= 25 ms, glissé 16 ms, < 1 % en retard, `Slow bitmap uploads` < 1 %).
Limites : émulateur à GPU logiciel, une exécution par variante, passes croissance et « tous les villageois en marche » hors de cette tâche. Le verdict reste la mesure Fairphone de Guillaume.

## Nettoyage
- `monde.ts`, `Monde.tsx` et `constants/isoPoc.ts` de p0-wt remis à l'origine (état git propre, vérifié). `node_modules` et `debug.keystore` y restent.
- Aucun démon Gradle ne reste, app arrêtée, écran de l'émulateur remis à sa taille d'origine.

P1 mesuré, p0-wt peut être supprimé.
