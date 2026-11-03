# Village iso : qui est où

Tout ce qui est neuf vit ici, dans `docs/designs/village/`. Les vieux dossiers restent à leur place : des outils ou des verrous lisent ces chemins, et une autre session les lit en direct. On ne déplace rien.

## Dans ce dossier

| Fichier ou dossier | Rôle |
|---|---|
| `README.md` | Cette page. |
| `PIPELINE.md` | Les commandes pour ajouter ou changer un bâtiment, une créature, un effet. |
| `PROMPT-tracks.md` | Le prompt des pistes (CLEAN, LIFE, VILLAGERS, GAME, POLISH, PERF) et les règles communes. |
| `archive-index.md` | Ce qui a été retiré du dépôt le 04/11 et comment le récupérer. |
| `clean/` | Piste CLEAN : `features.json`, `status.json`, `decisions.md`, `progress.md`, `inventory.md`, `modeles.md`. `scratch/` est ignoré par git. |
| `life/` | Piste LIFE : `features.json`, `status.json`, `decisions.md`, `progress.md`, `checkpoint.md`, `tests-debt.md`. Travail en cours. |

Une piste = un dossier ici, avec les mêmes fichiers (`features.json`, `status.json`, `decisions.md`, `progress.md`). Les brouillons vont dans `<piste>/scratch/` (ignoré), archivés en fin de piste.

## Dossiers anciens, laissés en place

| Dossier | Pourquoi il ne bouge pas |
|---|---|
| `docs/designs/village-loop/loupes/` | Verrou d'art : `state.json` et les recadrages verrouillés. Copie et sha256 dans `~/.cache/bati-loupes-lock/`, lus par `scripts/bld/lock_check.py`. Jamais écrire. |
| `docs/designs/village-loop/` (le reste : `avant-apres/`, `evidence/`, `calibration/`) | `avant-apres/` est lié depuis un résumé. |
| `docs/designs/village-buildings/` | La piste des bâtiments : `PROMPT.md`, `catalog-v3.md`, `state.json`, `decisions.md`, `pipeline.md`, `BRIEF-final.md`, un dossier par bâtiment. `integrate.py`, `sans_losange.py` et les tests y lisent leurs chemins. |
| `docs/designs/village-iso-v1/` | `VALIDATIONS.md` (jamais déplacer) et `reports/`, `reviews/` : les agents d'équipe y écrivent, `scripts/iso/team/task-completed.sh` les lit. À archiver à la fin du track iso. |
| `docs/designs/village-iso-poc/` | `REVUE-PROMPT.md` est lu par `scripts/iso/iso_loop.py`, le reste par le prompt d'équipe V1. |
| `docs/designs/village-surroundings/` | Les alentours : `bible.md`, `stage-0` à `stage-5`. `stage-5` lit `stage-1`, `stage-3` et `stage-4`. |
| `docs/designs/village-style-bible.md` | La bible de style. Lue par les prompts, les agents et `iso_loop.py`. |

## Les bibles

- Style du village : `docs/designs/village-style-bible.md` (encre #0F1518, lumière en haut à gauche, ombres ardoise, la nuit comme grade de couleur plus lumière codée).
- Alentours (sol, forêt, décor, animaux) : `docs/designs/village-surroundings/bible.md`.

## Où sont les peintures

- Les peintures finales des bâtiments sont ignorées par git : `docs/designs/village-buildings/<code>/final/` (`<stade>.png`, `elements/`, `provenance.json`). Seuls `measures.json` et `strip.png` sont suivis. Elles vivent **dans le worktree iso**, `/home/guiforge/Documents/code/bati/.claude/worktrees/iso`. `integrate.py` et `sans_losange.py` les y lisent par un chemin écrit en dur.
- Les concepts (`<code>/concepts/`), `emprise.png` et les captures sont ignorés aussi.
- Ce que l'app embarque : `assets/images/village/iso/peints/<code>/` (webp jour et nuit), `components/village/iso/peints/<code>.ts` et `constants/buildings/<code>.ts` (générés par `integrate.py`).
- La vieille scène 2D (ce que montre une version publiée) : `assets/images/village/buildings/` et `assets/images/village/*.webp`, dessinée par `components/village/VillageScene.tsx`. Ne pas toucher : voir `PIPELINE.md`, section drapeaux.

## Où sont les archives

`~/bati-archives/` (hors dépôt). Celle du 04/11 : `~/bati-archives/2026-11-04-clean.tgz`, listée dans `archive-index.md`. Tout est aussi dans l'historique git, avant le commit « clean-menage ».
