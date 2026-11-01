# Point d'arrêt avant l'étape 0

Rien n'est lancé : aucun sous-agent, aucun appel FLUX, aucun commit.

## Tes réponses (01/11)

- Piste : `surroundings`.
- FLUX : +20 $, plafond à 60.
- `env.md`, garde, commit : tu t'en occupes avant la relance.
- Passages de sous-agents : pas encore confirmé, 80 si tu ne dis rien d'autre.

**Reste à faire de ton côté :**

1. Enregistrer `.claude/agents/env.md`.
2. Écrire `2026-11-01 BUDGET_FLUX_V1: 60` sous `## Lignes` de `VALIDATIONS.md`.
3. Retirer `guard-team.sh` de `.claude/settings.local.json`.
4. Commiter les six fichiers en attente.
5. Relancer la session avec le prompt rempli.

La suite de cette page est le détail d'origine de chaque question.

Branche retenue : `feat/village-iso-v1`, la seule qui contient `0fad2396` (c'est sa pointe).

## 1. L'agent `env` est absent : bloquant

Le prompt dit de s'arrêter dans ce cas. `.claude/agents/env.md` n'existe pas, et son texte n'était pas joint au prompt.

**À faire :** enregistre le fichier, puis relance la session pour que l'agent soit chargé.

## 2. Quelle piste ?

- **`surroundings` (recommandé)** : elle porte le plus de défauts que tu as signalés, et 80 passages couvrent S-night, le coin de beauté et R1.
- `vector`
- `buildings`

## 3. Combien de FLUX pour cette session ?

Dépensé : 34,42 $. Plafond : 40 $, la valeur par défaut, car `VALIDATIONS.md` n'a aucune ligne `BUDGET_FLUX_V1`. **Reste : 5,58 $.**

Ordre de grandeur, à prendre comme une estimation et non une mesure : écrans cibles 2 à 3 $, coin de beauté et R1 10 à 20 $.

- **+20 $ (recommandé)** : écris toi-même `BUDGET_FLUX_V1: 60` sous `## Lignes`, avec la date.
- +10 $ : plafond à 50. Le coin de beauté passe, R1 risque de s'arrêter en route.
- +0 $ : écrans cibles et quelques sondes seulement.

## 4. 80 passages de sous-agents, ça te va ?

Oui ou non (sinon, donne le nombre). Je m'arrête à 80 % du budget.

## 5. Le garde de la V1 bloque le travail par loupes

`guard-team.sh` est toujours actif dans `.claude/settings.local.json`. Il n'autorise que le git en lecture, et les commits passent par `commit.sh`. Il bloque donc `git switch -c loupe-<id>`, les fusions et l'adb direct (`emu-adb.sh` le remplace sans problème).

Par ailleurs, six fichiers suivis ne sont pas commités, dont `iso_loop.py` avec la variante FLUX 3 et sa garde de budget. Il y a aussi environ 600 rendus et preuves modifiés ou non suivis. Un implémenteur qui part de `0fad2396` n'aura rien de tout ça.

- **A (recommandé)** : tu retires le garde de `settings.local.json` et tu commites les six fichiers avant la relance. Pour les rendus et les preuves, c'est toi qui décides.
- B : tu gardes le garde et tu me dis comment créer les branches et fusionner. Les implémenteurs restent alors sans ces changements si tu ne les commites pas.

## Déjà vérifié

- FLUX : l'édition d'image par références existe (`scripts/lib/flux.py`, `flux-2-pro-preview`, `flux-3-image`). Je n'ai pas vu de prise en charge des masques, et les écrans cibles n'en ont pas besoin.
- Émulateur : l'AVD `bati-bench` existe, mais il n'est pas démarré. Je le démarrerai au lancement.
- gstack est installé.
