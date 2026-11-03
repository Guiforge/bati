# Index des archives

Archive : `/home/guiforge/bati-archives/2026-11-04-clean.tgz` (4 novembre 2026, 137 fichiers, chemins relatifs à la racine du dépôt).

Pour récupérer un fichier : `tar xzf /home/guiforge/bati-archives/2026-11-04-clean.tgz -C <dossier> <chemin>` (liste complète : `tar tzf`). Tout est aussi dans l'historique git, avant le commit « clean-menage ».

| Groupe | Fichiers | Pourquoi c'est parti |
|---|---|---|
| `scripts/iso/loupe_bc_sondes.py` à `loupe_bc_sondes12.py`, `loupe_bc_sol.py`, `loupe_targets.py` | 14 | Chaîne de sondes BC (alentours), faite une fois. Les sondes 2 à 12 réécrivent la 1. Aucun autre script ne les importe. Les images qu'elles ont produites restent dans `village-loop/loupes/bc/`. |
| `scripts/iso/sonde00*.py`, `sonde01*.py` | 4 | Sondes isolées, aucune référence. |
| `scripts/iso/t27_paires.py`, `t41_stades.py`, `cost_projection.py`, `planche_factice.py`, `mesure_ombres_bleues.py`, `exports/accroches_planche.py` | 6 | Outils d'une seule ronde (planches, coûts, mesures), cités seulement par d'anciens rapports. |
| `scripts/iso/recolor_night.py` | 1 | Ancien chemin de nuit, remplacé par `famille_jour.py` (dit dans `village-buildings/pipeline.md`). |
| `scripts/iso/blockouts/gen_peinture.py`, `gen_repos.py`, `render_peinture.py`, `render_repos.py` | 4 | Rondes de peinture et de repos. Leurs sorties (`blockouts/peinture/`, `blockouts/repos/`) restent en place. |
| `scripts/bld/explore_e3.py`, `explore_e5_e4.py`, `cibles_e1.py`, `cibles_run.sh`, `gen_e1_specs.py`, `render_e1.py`, `gen_a3_specs.py`, `render_a3.py`, `seam_check.py` | 9 | Rondes E1, E3, E5 et A3 des bâtiments : seulement entre elles. |
| `scripts/iso/blockouts/bld/a3/`, `bld/e1/` | 12 | Specs de ces deux rondes. Les specs du dossier `bld/` à plat (lues par `iso-layout`) restent. |
| `docs/designs/village-buildings/BRIEF-concepts.md`, `BRIEF-idees.md`, `BRIEF-peinture.md`, `PROMPT-v1-pilot.md` | 4 | Anciens briefs et prompt, remplacés par `PROMPT.md` v3. |
| `docs/designs/village-iso-polish/README.md` | 1 | Note d'une piste jamais lancée, aucune référence. |
| `docs/designs/village-iso-v1/plan/` | 42 | Plan et fiches de tâches de la V1, finie. |
| `docs/designs/village-iso-v1/research/` (sauf `klein-licence.md`) | 14 | Notes de recherche de la V1. `klein-licence.md` reste : `village-surroundings/licence.md` la cite. |
| `docs/designs/village-iso-v1/PROPOSITION-GRILLE.md` | 1 | Proposition de grille de la V1, citée seulement par le journal. |
| `docs/designs/village-loop/iter-01/` à `iter-05/` | 25 | Anciennes rondes de la boucle (audits, notes). |

## Gardé alors que l'inventaire proposait de le retirer

- `village-iso-v1/reports/` et `reviews/` : les agents d'équipe y écrivent, `scripts/iso/team/task-completed.sh` les lit, `scripts/provenance.json` cite des revues. À archiver à la fin du track iso.
- `village-iso-poc/` : le prompt d'équipe V1 (figé) demande de lire REPORT, STATE, LOG, CHECKLIST ; `iso_loop.py` lit `REVUE-PROMPT.md`.
- `village-surroundings/stage-0` à `stage-4` : `stage-5/assets.py`, `composite.py` et `stub.mjs` lisent `stage-3`, `stage-4`, `stage-1` ; `bible.md` cite `stage-0`.
- `village-loop/avant-apres/` : lié depuis `summary.md`.
- `village-buildings/` : `PROMPT-v2.md` (PROMPT.md demande de le garder), `retours-concepts-*`, `checkpoint*.md`, `prompt-village-buildings-prep.md` (cités par `state.json`, `decisions.md`, `pipeline.md`).
- `scripts/iso/ab_pairs.py` (procédure des loupes), `layout_preview.py` (cité par `constants/isoLayout.json`), `simule_voile_coeur.py` (cité par `alentours.ts`, fichier de LIFE), `vue_ensemble.sh` et `loop_capture.sh` (REPRISE et summary de la boucle).
- Grappe des cartes et de la finale dans `scripts/bld/` : `gen_cartes`, `render_cartes`, `kit_maquette`, `maquette_peinture`, `render_pilot`, `gen_pilot_specs`, `final_*`, `gen_final_specs`, `sondes2` à `sondes4`, `sondes_moulin`. Elles s'importent entre elles, et `scripts/life/u3_pieces.py` cite `final_elements.py`. Décision de Guillaume.
- `scripts/iso/blockouts/gen_animaux.py`, `gen_decor.py`, `render_animaux.py` : décrits dans `VERSIONS.md`, `heights.py` cite `gen_decor`.
