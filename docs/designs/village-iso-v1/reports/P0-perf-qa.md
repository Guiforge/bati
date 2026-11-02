# P0-perf-qa : la forêt de Monde.tsx explique-t-elle la régression ?

Builds `.perf` x86_64 faites dans un worktree jetable hors dépôt (`~/.cache/bati-art-loop/iso/p0-wt`, 917dee6b), INTEGRATION = true pour la build seulement. Rien n'a été modifié dans le worktree principal en dehors de ce rapport et de `evidence/P0-perf/`.

## Variantes (APK dans `~/.cache/bati-art-loop/iso/evidence/P0-perf/`, sauf A)
- A : 5ea86807, `AUDIT-DA-cible/apk-5ea86807.apk`, sha 3fbfd13b9f6b65f0...
- H : 917dee6b tel quel, `apk-H-917dee6b.apk`, sha 2b88d6fe02189e7f...
- F1 : H avec `echelle` et `teinte` à 1, `apk-F1.apk`, sha 15652c43b025da18...
- F2 : H avec `echelle` à 1, teinte gardée, `apk-F2.apk`, sha 0c750f1903f8a446...
- Détail de F1/F2 : j'ai écrit `(hasard(), 1)` et non `1` seul, pour consommer le même tirage aléatoire. Sinon toutes les cases suivantes auraient changé de place. Le reste du fichier est identique.

## Protocole
Émulateur unique `emulator-5554`, écran 1080x1920 (remis à la taille d'origine à la fin), même héros (palier 1). Ordre A, H, F1, F2, puis A à nouveau (A2). Chaque variante : `install -r -d`, puis 3 passes vague (force-stop, ouverture à froid de `bati://village`, `gfxinfo reset` juste après le démarrage, 16 s), puis 3 passes glissé (ouverture, 22 s, reset, 9 balayages 850 à 250 px à y 600 en 500 ms), 10 s de repos. Script de mesure : `evidence/P0-perf/mesure.sh`.
Écart avec AUDIT-DA-cible : le glissé compte environ 355 trames et non 745, parce que chaque `input swipe` est lancé par un `adb` séparé. Le comptage est identique d'une variante à l'autre, donc comparable entre elles, pas en valeur absolue avec l'audit précédent.
Preuves brutes : `evidence/P0-perf/gfxinfo/{A1,H,F1,F2,A2}-{vague,glisse}-{1,2,3}.txt` et `*-meminfo.txt`. Captures de l'onglet : `evidence/P0-perf/captures/*-onglet.jpg` (bonne scène sur les cinq : l'onglet Village, palier 1, île au centre).

## Résultats (passes 1/2/3)

| Variante | Geste | Trames | Janky | p50 / p90 / p99 (ms) | Slow UI thread | Slow bitmap uploads | Slow issue draw | GPU p50 |
|---|---|---|---|---|---|---|---|---|
| A (1er) | vague | 853 / 870 / 872 | 1 / 1 / 1 (0,1 %) | 23/24/27, 21/22/24, 21/22/24 | 1 / 1 / 1 | 1 / 0 / 0 | 1 / 0 / 1 | 18 |
| A (1er) | glissé | 356 / 355 / 355 | 1 / 1 / 1 (0,3 %) | 16/16/16 (les 3) | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 1 / 1 | 13 |
| H | vague | 427 / 390 / 356 | 414 / 384 / 356 (97-100 %) | 65/77/81, 77/93/109, 77/93/129 | 321 / 252 / 225 | 414 / 384 / 356 | 222 / 205 / 210 | 10 |
| H | glissé | 149 / 175 / 154 | 149 / 175 / 154 (100 %) | 81/97/113, 77/81/97, 77/93/350 | 96 / 103 / 97 | 149 / 175 / 154 | 81 / 97 / 90 | 9-11 |
| F1 (taille + teinte) | vague | 846 / 860 / 855 | 13 / 3 / 1 (1,5 / 0,35 / 0,1 %) | 25/27/69, 24/26/28, 22/23/26 | 9 / 1 / 1 | 2 / 1 / 1 | 12 / 2 / 0 | 18 |
| F1 | glissé | 357 / 355 / 354 | 1 / 1 / 2 (0,3-0,6 %) | 16/16/16 (les 3) | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 1 / 2 | 12 |
| F2 (teinte seule) | vague | 377 / 322 / 323 | 377 / 322 / 323 (100 %) | 77/81/250, 93/97/150, 93/93/150 | 243 / 189 / 193 | 377 / 322 / 323 | 224 / 208 / 197 | 10 |
| F2 | glissé | 140 / 176 / 181 | 140 / 176 / 181 (100 %) | 93/113/150, 77/81/81, 65/81/81 | 87 / 102 / 109 | 140 / 176 / 181 | 86 / 102 / 93 | 10-11 |
| A (2e) | vague | 865 / 868 / 868 | 1 / 1 / 1 (0,1 %) | 22/23/25, 22/23/25, 22/23/26 | 1 / 1 / 1 | 0 / 0 / 0 | 0 / 1 / 1 | 18 |
| A (2e) | glissé | 357 / 356 / 356 | 1 / 2 / 1 (0,3-0,6 %) | 16/16/16 (les 3) | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 2 / 1 | 12-13 |

Mémoire après les passes (PSS total, Graphics reste à 0 sur l'émulateur) : A 266 615 kB, H 303 476, F1 306 473, F2 305 001, A2 265 481. Les trois variantes de 917dee6b sont à +37 à +41 Mo sur A ; la forêt uniforme n'y change rien (F1 n'est pas plus légère que H).
A et A2 concordent (pas de dérive de l'émulateur). Les trames de H et F2 sont plus basses que A de plus de la moitié (la tâche suit la cadence de 60 à 90 ms), d'où le nombre de trames.

## Captures
H et F1 : `captures/H-onglet.jpg`, `captures/F1-onglet.jpg`. En F1 les arbres sont tous à la même taille et à pleine opacité : forêt plus régulière et un peu plus claire, rien de cassé. Acceptable visuellement pour un correctif ; la perte de variété est à juger en revue DA.

## Conclusion
1. La forêt explique la régression : F1 ramène la vague à p50 22-25 ms, le glissé à 16 ms, `Slow bitmap uploads` de ~100 % à 0-1 trame et `Slow UI thread` de ~60 % à 0-9 trames, au niveau de A.
2. La part est dans l'opacité : F2 (taille fixée à 1, teinte continue gardée) reste à 100 % de trames en retard, p50 65-93 ms, `Slow bitmap uploads` à 100 %, pas mieux que H. Fixer la taille seule ne sauve rien ; ce qui fait passer de F2 à F1 est le retrait de `opacity < 1`.
3. Ce que la taille coûte seule n'est pas isolé : la variante inverse (échelle gardée, teinte à 1) n'a pas été mesurée. On sait seulement que taille + opacité continues = régression, et que l'opacité continue suffit à la garder une fois la taille uniforme.
4. Pour P1 : retirer l'opacité par image en premier (teinte cuite ou voile commun, comme le plan) ; la taille unique reste souhaitable (cache Glide) mais n'est pas prouvée coupable.
5. P1 est à lancer comme décrit dans PLAN-PERF : une taille décodée, échelle par `transform`, teinte cuite. Limite : émulateur à GPU logiciel, pas le Fairphone ; le verdict reste la mesure de Guillaume. Les passes croissance et « tous les villageois en marche » demandées ne sont pas dans cette tâche (non faites).

## Nettoyage
- `p0-wt` : `monde.ts` et `isoPoc.ts` remis à l'état d'origine (`git status` propre dans p0-wt). `node_modules` et `android/app/debug.keystore` (ignorés par git) y restent ; Guillaume supprime le worktree.
- Aucun démon Gradle ne reste (le script les arrête après chaque build). Aucun processus de mesure en cours. Écran de l'émulateur remis à sa taille d'origine, app arrêtée.
- Une première tentative de `npm ci` a échoué sur le cache npm (contenu manquant) ; `npm cache verify` puis `npm ci --prefer-online` a réussi.

P0 fini, p0-wt peut être supprimé.
