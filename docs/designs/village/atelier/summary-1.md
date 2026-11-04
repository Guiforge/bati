# Atelier : résumé de la session 1 (04/11/2026)

**La piste est finie, en une session. Le village se voit en images sans émulateur.** Pas comme le prompt le prévoyait : Skia n'est pas dans l'appli, et Guillaume a choisi de ne pas l'y mettre (`checkpoint.md`, choix A). L'atelier ouvre la vraie route `dev-iso` dans un navigateur sans écran.

## Ce qui est fait

| Commande | Ce qu'elle donne | Temps |
|---|---|---|
| `render` | un état à la taille du téléphone | 3 s |
| `strip` | les 12 paliers côte à côte | 44 s |
| `sheet` | un bâtiment à chaque stade | 17 s |
| `clip` | 6 s de mouvement : images, planche, mp4 | 59 s |
| `check` | occlusion, ancres, valeur, tailles, budget | 72 s pour 3 paliers |

Mode d'emploi : `PIPELINE.md`, section 6. Aucune dépendance ajoutée, aucun fichier du village changé. Le prompt porte un amendement en tête de `PROMPT-tracks.md`.

**Calibrage contre l'émulateur** (cible 2 %) : nuit 1,47 %, jour 2,67 % et 3,36 %. **Le jour ne passe pas la cible.** mara a échoué le premier passage (place sans pavage, corrigé) et passe les 3 états au second, avec une réserve sur la valeur du sol. Ne pas régler la valeur du sol à quelques niveaux près dans l'atelier, surtout loin du village : une bande du voile diffère de 7 niveaux sur 255 au plus, cause non trouvée (`handoff.md`, pour GAME).

**Ce que `check` dit déjà, pour LAYOUT** (jour) :

| Palier | Bâtiments sous 85 % visibles | Ancres à plus de 2 px | Coeur / périphérie | Noeuds en mouvement (budget 68) |
|---|---|---|---|---|
| 1 | 0 sur 6 | 5 sur 14 | 142 / 100 | 4 |
| 6 | 3 sur 18, pire le moulin à 67 % | 9 sur 49 | 119 / 102 | 19 |
| 12 | 5 sur 21, pire le moulin à 67 % | 11 sur 62 | 117 / 105 | 23 |

Les objets qui flottent, vus par Guillaume, ressortent bien : jusqu'à 10 px au-dessus du pied sur les bâtiments, en pixels du téléphone (mannequin d'entraînement au palier 1).

## Ce qui n'a pas été fait, ou reste fragile

- **Abandonnés** (A3, A9) : le découpage en `buildDrawList`, `motionAt`, `paint` et sa garde de code. Seconde visite émulateur annulée : l'appli n'a pas bougé.
- **Pas de test d'un geste** (panoramique, pincement, toucher) : le code de l'appli n'a pas changé, donc rien à comparer.
- **Pas de mesure de temps d'image** : le budget de mouvement reprend le plafond de `iso-ciel.test.tsx`, et n'est pas la même mesure (noeuds qui ont bougé en 6 s, contre noeuds montés). PERF le refait.
- **`check` est une première lecture, non vérifiée à la main** : le pied d'un accessoire vient d'un rapport fixe, les ailes tournées ne cachent rien, les villageois n'ont pas de test de pied. J'ai regardé ses sorties, pas relu ses 456 lignes. LAYOUT doit vérifier 2 ou 3 cas à l'oeil avant de s'y fier.
- **`clip`** : le mouvement est vu sur les ailes du moulin ; un villageois qui marche n'a pas été isolé. Entre deux passes, 4 images sur 31 diffèrent de moins de 8 niveaux.
- **Un seul regard sur les images** : mara, deux fois. anim, env et theo n'ont pas été lancés : la piste ne change aucun look.
- **L'atelier ne tourne pas en CI** : Playwright vient de l'installation gstack.

## Chiffres

FLUX : 0 $. Sous-agents : 5 sur 150. Temps : environ 50 min. Sommet : voir `progress.md` et `git log`. Verrou d'art : `LOCK_OK`.

## Pour Guillaume

1. **Coup d'oeil de 5 minutes** : `img/strip-jour.jpg`, `img/strip-nuit.jpg`, `img/sheet-forge-jour.jpg`, `img/clip-t12-jour-planche.jpg`, `img/calibration-*.jpg` (appli à gauche). Il n'y a pas d'avant/après : le village n'a pas changé.
2. **Le prompt de `~/Téléchargements` n'a pas l'amendement.** Lancer DIRECTION depuis ce fichier écraserait la copie du dépôt. Partir de `docs/designs/village/PROMPT-tracks.md`.
3. **DIRECTION peut partir.**
