# Inventaire CLEAN (lecture seule)

Date : 2026-11-03. Dépôt : `/home/guiforge/Documents/code/bati-track-clean`, branche `track-clean`.
Rien n'a été déplacé, renommé, supprimé ni commité. Un seul fichier écrit : ce rapport.
Les fichiers `scripts/bld/sans_losange.py` et `docs/designs/village/clean/scratch/losange/` (travail de l'autre agent) n'ont pas été touchés.

## Méthode et limites

- **Utilisé** : une référence réelle existe dans le code, `package.json`, `.github`, `.claude`, `.pre-commit-config.yaml`, un autre script de la chaîne ou un test. Une simple mention dans une vieille doc ne compte pas.
- **Chaîne actuelle** : `scripts/bld/final.py`, `integrate.py`, `concepts.py`, `scripts/iso/iso_loop.py`, `famille_jour.py`, les scripts de capture (`scripts/bld/capture.sh`, `scripts/iso/loupe_capture.sh`), les tests et la CI.
- **Aucun** script Python ni shell de `scripts/iso/` ou `scripts/bld/` n'est lancé par `package.json`, la CI ou `.pre-commit-config.yaml`. Les tests Python (`test_*.py`) ne tournent que à la main.
- **LIFE** : `/usr/bin/git fetch origin` fait. `git branch -r --list "origin/track-*"` ne renvoie rien. Il n'existe donc aucune branche `origin/track-life`, et aucun croisement n'a été possible. Le `features.json` du track dit la même chose (absent le 03/11). Aucune mention « utilisé par LIFE » n'est donc possible.
- **Autre session vivante vérifiée** : le worktree `/home/guiforge/Documents/code/bati/.claude/worktrees/iso` (branche `feat/village-iso`, verrouillé). Une recherche des noms proposés au retrait y donne des hits seulement dans `scripts/` (les scripts se citent entre eux) et dans deux commentaires de code (voir section 2).

Légende des propositions : **garder**, **archiver** (déplacer dans `~/bati-archives/` puis retirer, après entrée dans `docs/designs/village/archive-index.md`), **retirer**. **Intouchable** = liste interdite de la consigne.

---

## 1. Dossiers de `docs/designs/`

### 1.1 Fichiers de premier niveau

| Entrée | Taille | Suivis | Utilisé par | Unique ou doublon | Proposition |
|---|---|---|---|---|---|
| `error-breadcrumbs.md`, `expeditions.md`, `gps-without-google.md`, `map-immersion.md`, `outing-doors.md`, `rappels.md`, `warmup-prep.md` | 12 à 68 Ko chacun (~250 Ko) | 7 | Hors village (autres tracks). Non vérifié un par un : le nom seul ne prouve rien | Unique | garder (hors périmètre) |
| `village-personnalisation.md` | 44 Ko | 1 | `scripts/village-states.py` (docstring) | Unique | garder |
| `village-style-bible.md` | 12 Ko | 1 | Bible du style | Unique | **intouchable** |
| `village/PROMPT-tracks.md` | 20 Ko | 1 | Prompt des tracks (règles, appendice CLEAN) | Unique | garder |

### 1.2 `docs/designs/village/`

| Entrée | Taille | Suivis | Utilisé par | Unique ou doublon | Proposition |
|---|---|---|---|---|---|
| `village/clean/` | 49 Mo, dont 49 Mo de `scratch/` (ignoré par git, via `.gitignore`) | 0 (`features.json`, `modeles.md` non suivis) | `features.json` du track | Unique | garder. Le `scratch/` sera archivé en fin de track (règle du PROMPT) |
| `village/clean/scratch/losange/` | 49 Mo (103 PNG) | 0 | `scripts/bld/sans_losange.py` (autre agent) | Unique | **ne pas toucher** (hors inventaire) |

### 1.3 `docs/designs/village-buildings/` (23 Mo, 162 fichiers suivis)

**Dossiers par bâtiment.** Chacun contient 5 PNG (rough, solid, grand, legendary, mythic). `scripts/bld/final/<code>.json` cite trois chemins de chaque dossier. Ils sont donc des entrées de `final.py` et `integrate.py`.

| Dossier | Taille | Suivis | Utilisé par | Proposition |
|---|---|---|---|---|
| archery_range | 996 Ko | 5 | `scripts/bld/final/archery_range.json` | garder |
| armory | 1,1 Mo | 5 | `scripts/bld/final/armory.json` | garder |
| barn | 1,2 Mo | 5 | `scripts/bld/final/barn.json` | garder |
| campfire | 1,3 Mo | 14 | `scripts/bld/final/campfire.json` | garder (9 fichiers de rondes en plus : à voir) |
| castle_wall | 868 Ko | 5 | `scripts/bld/final/castle_wall.json` | garder |
| champion_arena | 976 Ko | 5 | `scripts/bld/final/champion_arena.json` | garder |
| dragon_lair | 1,1 Mo | 5 | `scripts/bld/final/dragon_lair.json` | garder |
| druid_grove | 1,2 Mo | 5 | `scripts/bld/final/druid_grove.json` | garder |
| farm | 1,0 Mo | 5 | `scripts/bld/final/farm.json` | garder |
| forge | 944 Ko | 5 | `scripts/bld/final/forge.json` | garder |
| fountain | 1,1 Mo | 5 | `scripts/bld/final/fountain.json` | garder |
| heroes_hall | 980 Ko | 5 | `scripts/bld/final/heroes_hall.json` | garder |
| high_road | 796 Ko | 5 | `scripts/bld/final/high_road.json` | garder |
| observatory | 988 Ko | 5 | `scripts/bld/final/observatory.json` | garder |
| quarry | 1,2 Mo | 5 | `scripts/bld/final/quarry.json` | garder |
| tent | 1,1 Mo | 5 | `scripts/bld/final/tent.json` | garder |
| training_dummy | 1,1 Mo | 5 | `scripts/bld/final/training_dummy.json` | garder |
| watchtower | 764 Ko | 5 | `scripts/bld/final/watchtower.json` | garder |
| well | 1,2 Mo | 6 | `scripts/bld/final/well.json` | garder |
| windmill | 1,2 Mo | 6 | `scripts/bld/final/windmill.json` | garder (fichiers de sondes : à voir) |
| wizard_tower | 520 Ko | 5 | `scripts/bld/final/wizard_tower.json` | garder |

**Sous-dossiers à part.**

| Dossier | Taille | Suivis | Utilisé par | Proposition |
|---|---|---|---|---|
| `maquettes/` | 784 Ko | 11 | Scripts `render_pilot.py` et maquettes d'essai (rondes passées). Non sûr | garder en attendant décision de Guillaume |
| `cards/` | 76 Ko | 5 | `gen_cartes.py`, `gen_pilot_specs.py` (cluster des cartes, voir section 2) | garder (à confirmer) |
| `calibration/` | 8 Ko | 2 | Non trouvé | garder (à confirmer) |

**Fichiers de premier niveau.**

| Fichier | Taille | Utilisé par | Unique ou doublon | Proposition |
|---|---|---|---|---|
| `PROMPT.md` (v3, 03/11) | 28 Ko | Le prompt du track bâtiments | Courant | **intouchable** |
| `catalog.md`, `catalog-v3.md` | 28 Ko, 24 Ko | Catalogue du track | Deux versions (les deux catalogues) | **intouchable** |
| `state.json`, `status.json`, `decisions.md` | 12 Ko, 8 Ko, 20 Ko | État et décisions du track | Uniques | **intouchable** |
| `summary-1.md`, `summary-2.md`, `summary-vague.md` | 8 Ko, 12 Ko, 8 Ko | Résumés des sessions | Uniques | **intouchable** |
| `BRIEF-final.md` | 4 Ko | Cité dans la docstring de `scripts/bld/final.py` | Unique | garder |
| `BRIEF-concepts.md`, `BRIEF-idees.md`, `BRIEF-peinture.md` | 4 Ko chacun | Rien trouvé | Anciens briefs, probablement remplacés par `PROMPT.md` | archiver (à confirmer) |
| `pipeline.md` | 16 Ko | Doc du pipeline (vérifiée le 02/11) | Unique | garder (à renommer en `PIPELINE.md` plus tard) |
| `headroom.md` | 12 Ko | Cité dans `scripts/bld/gates.py` | Unique | garder |
| `card-sheet.md` | 20 Ko | Cité dans `scripts/bld/gen_e1_specs.py` | Unique | garder (à confirmer) |
| `g-id-vague.md` | 4 Ko | Résultat de test G-ID | Unique | garder (à confirmer) |
| `tests-debt.md` | 4 Ko | Dette de tests, à traiter par CLEAN | Unique | garder jusqu'à la fin du track |
| `baseline.spec.json`, `engine-review.spec.json` | 8 Ko, 4 Ko | Non trouvé | Uniques | garder (à confirmer) |
| `prep-summary.md`, `headroom.md`, `retours-concepts-1.md`, `retours-concepts-2.md` | 8 Ko, 12 Ko, 4 Ko, 4 Ko | `retours-*` : rien trouvé | Notes de rondes | `retours-*` : archiver (à confirmer). Autres : garder |
| `checkpoint.md`, `checkpoint-session1.md` | 4 Ko, 8 Ko | Rien trouvé | Points d'étape anciens | archiver (à confirmer) |
| `prompt-village-buildings-prep.md` | 4 Ko | Rien trouvé | Prompt de la session de prépa, finie | archiver (à confirmer) |
| `PROMPT-v2.md` | 52 Ko | Rien trouvé. Remplacé par `PROMPT.md` v3 (« Version : buildings v3 ») | **Doublon** de `PROMPT.md` | archiver. Le prompt courant reste intouchable |
| `PROMPT-v1-pilot.md` | 32 Ko | Rien trouvé. Remplacé par v2 puis v3 | **Doublon** de `PROMPT.md` | archiver. Le prompt courant reste intouchable |

### 1.4 `docs/designs/village-loop/` (13 Mo, 105 fichiers suivis)

| Entrée | Taille | Suivis | Utilisé par | Unique ou doublon | Proposition |
|---|---|---|---|---|---|
| `loupes/` | 12 Mo | 66 | `scripts/iso/loupe_*`, `state.json`, crops verrouillés, `route_tuiles.json` lu par l'app (`components/village/iso/champs.ts`, `alentours.ts`) | Unique | **intouchable** |
| `evidence/` | 4 Ko (1 fichier suivi) | 1 | `scripts/iso/famille_jour.py` lit `evidence/F1-vague*` et `evidence/P4` (les images retenues ne sont pas dans git) | Unique | garder |
| `avant-apres/` | 620 Ko | 3 | Rien trouvé (ancien avant-après de boucle) | Unique | archiver (à confirmer) |
| `iter-01` à `iter-05` | 36, 32, 32, 32, 24 Ko | 25 | `scripts/iso/loop_capture.sh` (exemple de dossier de sortie) | Anciennes rondes | archiver (à confirmer) |
| `calibration/` | 4 Ko | 1 | Non trouvé | Unique | garder (à confirmer) |
| `disposition-plan.md` | 8 Ko | 1 | `constants/isoLayout.json` et `__tests__/iso-layout.test.ts` | Unique | garder |
| `animations-inventaire.md` | 8 Ko | 1 | Non trouvé | Unique | garder (à confirmer) |
| `lots.json` | 16 Ko | 1 | Non trouvé | Unique | garder (à confirmer) |
| `perf-debt.md` | 48 Ko | 1 | Tenu à jour par l'agent `tech` (`.claude/agents/`) | Unique | garder |
| `progress.md`, `REPRISE.md`, `rubric.md` | 12 Ko, 8 Ko, 4 Ko | 3 | Notes de reprise et de suivi | Uniques | garder (à confirmer) |
| `summary.md`, `summary-surroundings.md` | 8 Ko chacun | 2 | Résumés de track | Uniques | **intouchable** |

### 1.5 `docs/designs/village-surroundings/` (1,5 Mo, 167 fichiers suivis)

| Entrée | Taille | Suivis | Utilisé par | Unique ou doublon | Proposition |
|---|---|---|---|---|---|
| `bible.md` | 12 Ko | 1 | Bible des alentours | Unique | **intouchable** |
| `flux-spend.md` | 4 Ko | 1 | Coût FLUX | Unique | garder |
| `licence.md` | 8 Ko | 1 | Licences des images | Unique | garder |
| `stage-5/` | 28 Ko | 5 | `components/village/iso/alentours.ts` (`stage-5/assets.py`, calques peints) | Unique | garder |
| `stage-0/` | 56 Ko | 11 | Seulement `scripts/iso/loupe_bc_sondes.py` et `loupe_bc_sondes2.py` (`stage-0/loop-2/planches.py`) | Unique | archiver (à confirmer) |
| `stage-1/` | 708 Ko | 13 | Aucun référent hors docs | Ronde passée | archiver (à confirmer) |
| `stage-2/` | 300 Ko | 66 | Cité en commentaire (`components/village/iso/terrain.ts`, « stage-2/loop-5 ») | Ronde passée | archiver (à confirmer) |
| `stage-3/` | 156 Ko | 35 | Aucun référent | Ronde passée | archiver (à confirmer) |
| `stage-4/` | 184 Ko | 34 | Aucun référent | Ronde passée | archiver (à confirmer) |

### 1.6 `docs/designs/village-iso-poc/` (68 Ko, 6 fichiers)

| Fichier | Taille | Utilisé par | Unique ou doublon | Proposition |
|---|---|---|---|---|
| `REVUE-PROMPT.md` | 4 Ko | `scripts/iso/iso_loop.py` (`REVIEW_PROMPT`) | **Doublon** de `village-iso-v1/REVUE-PROMPT.md` | garder (lu par `iso_loop.py`, intouchable) |
| `CHECKLIST.md`, `CRITERES-GO.md`, `LOG.md`, `REPORT.md`, `STATE.md` | 60 Ko au total | Rien (historique du POC) | Superseded par `village-iso-v1` | **archiver** (sûr) |

### 1.7 `docs/designs/village-iso-polish/` (4 Ko, 1 fichier)

| Fichier | Taille | Utilisé par | Unique ou doublon | Proposition |
|---|---|---|---|---|
| `README.md` | 4 Ko | Rien hors docs | Unique | **archiver** (sûr) |

### 1.8 `docs/designs/village-iso-v1/` (3,3 Mo, 444 fichiers suivis)

| Entrée | Taille | Suivis | Utilisé par | Proposition |
|---|---|---|---|---|
| `reports/` | 1,8 Mo | 225 | `scripts/iso/team/task-completed.sh` (lit `reports/<id>.md` pour les tâches en cours) | archiver **à la fin du track iso** (pas avant) |
| `reviews/` | 752 Ko | 143 | Même hook (`reviews/<id>.md`) | archiver à la fin du track iso |
| `research/` | 220 Ko | 15 | Non trouvé | archiver (à confirmer) |
| `plan/` | 220 Ko | 42 | Non trouvé | archiver (à confirmer) |
| `DECISIONS.md`, `KNOWLEDGE.md`, `CHECKLIST.md`, `BOARD.md`, `TASK-CARD.md`, `STATE.md`, `TODO.md`, `REPRISE.md`, `LOG.md` (136 Ko) | 4 à 136 Ko | 9 | `.claude/agents/iso-artist.md`, `iso-blender.md`, `iso-engineer.md` (lus au démarrage) | garder tant que l'équipe iso tourne |
| `REVUE-PROMPT.md`, `REVUE-UI-PROMPT.md`, `AUDIT-MARA-THEO-PROMPT.md`, `PROMPT-EQUIPE-V1.md` | 4 à 32 Ko | 4 | Relecteurs et équipe (`.claude/agents/`) | garder (à confirmer pour `AUDIT-MARA-THEO-PROMPT.md`) |
| `PLAN-PERF.md`, `PLAN-SPEC-VI.md`, `PROPOSITION-GRILLE.md`, `CRITERES-V1.md`, `REPORT-TEMPLATE.md` | 4 à 12 Ko | 5 | Rien trouvé hors docs (`REPORT-TEMPLATE.md` : modèle des rapports) | archiver (à confirmer), sauf `REPORT-TEMPLATE.md` (garder) |
| `VALIDATIONS.md` | 4 Ko | `scripts/iso/iso_loop.py` | Unique | **intouchable** |

### 1.9 Doublons à signaler (sans les toucher)

- `REVUE-PROMPT.md` existe dans `village-iso-poc/` et `village-iso-v1/`. `iso_loop.py` lit celui du POC. Ne rien retirer avant de changer `iso_loop.py`.
- `catalog.md` et `catalog-v3.md` : deux catalogues. Intouchables tous les deux, à trancher par Guillaume.
- `scripts/bld/concepts/*.json` (20) et `scripts/bld/final/*.json` (21) : mêmes bâtiments, deux étapes du pipeline. Pas un doublon.

---

## 2. Scripts

### 2.1 `scripts/iso/` (43 Mo, 1537 fichiers suivis)

Les 1247 PNG de `blockouts/renders/` (40 Mo) sont les entrées de `iso_loop.py`, `famille_jour.py` et du test `iso-accroches`. Garder.

| Fichier(s) | Référent (preuve) | Unique ou doublon | Proposition |
|---|---|---|---|
| `iso_loop.py` | Intouchable | Unique | **intouchable** (et son registre) |
| `isolib.py` | `iso_loop.py`, `scripts/bld/bldtools.py`, `maquette_peinture.py` | Unique | garder |
| `iso_audit.py`, `audit-thresholds.json` | `iso_loop.py`, `bldtools.py`, `.claude/agents/iso-artist.md` (audit gelé) | Unique | garder |
| `iso_blockout.py` | `pipeline.md` (étape rendu), `scripts/bld/gen_a3_specs.py` | Unique | garder |
| `famille_jour.py` | `scripts/bld/integrate.py` (nuit), `nuit_alentours.py`, `famille_jour` dans `scripts/provenance.json` | Unique | garder |
| `nuit_alentours.py` | Importe `famille_jour.py` ; cité par `cuire_sol.py` | Unique | garder |
| `reference_sprites.py` | `famille_jour.py`, test `__tests__/iso-sol-encre.test.ts` | Unique | garder |
| `empreinte-sprites.js` | `scripts/bld/integrate.py`, test `__tests__/iso-cache-images.test.ts` | Unique | garder |
| `exports/heights.py`, `exports/heights.json` | `__tests__/iso-layout.test.ts`, `iso-spec.test.ts`, `constants/isoSpec.json` | Unique | garder |
| `exports/accroches.py` | Test `__tests__/iso-accroches.test.ts` (régénère `constants/isoAccroches.json`) | Unique | garder |
| `exports/stage_exports.py` | `pipeline.md` (exports par stade), `render_animaux.py` | Unique | garder |
| `exports/light_check.py`, `exports/test_exports.py`, `exports/test_accroches.py` | Tests des exports | Unique | garder |
| `exports/accroches_planche.py` | Rien | Unique | archiver (sûr) |
| `blockouts/gen_tier3.py`, `gen_tier4.py`, `gen_specials.py`, `gen_muscle.py` | `pipeline.md` (« Spec d'un stade ») | Unique | garder |
| `blockouts/gen_v2.py`, `gen_v2_vague3.py`, `render_v2.py`, `verify_v2.py`, `g0.py` | `VERSIONS.md`. `pipeline.md` dit qu'ils ne sont pas versionnés, or ils le sont ici | Contradiction | garder, à confirmer |
| `blockouts/gen_animaux.py`, `gen_decor.py`, `gen_peinture.py`, `gen_repos.py`, `render_animaux.py`, `render_peinture.py`, `render_repos.py` | `VERSIONS.md`, les uns par les autres | Rondes de peinture/repos | archiver (à confirmer) |
| `blockouts/*.json` (rough, solid, grand, par bâtiment) | `iso_loop.py`, `famille_jour.py`, `__tests__/iso-maquettes.test.ts` | Unique | garder |
| `blockouts/bld/` (68 JSON, 476 Ko : e1, a3, pilote) | Seul `windmill_sails.json` est lu par l'app et ses tests (`carteDemo.ts`, `maquettes6.ts`, `iso-layout`, `iso-dump-sprites`). Le reste : rondes de cartes | Rondes | `windmill_sails.json` : garder. Reste : archiver (à confirmer) |
| `blockouts/pieces/`, `peinture/`, `repos/`, `cc0/` | Entrées des rendus (CC0 : licences à garder) | Unique | garder |
| `team/` (9 scripts) | `.claude/agents/iso-*.md`, `CLAUDE.md` (`heavy.sh`), hooks `guard-team.sh` et `task-completed.sh` | Unique | garder |
| `perf.sh`, `perf-summary.sh` | `.claude/agents/iso-qa.md`, `team/gradle-perf.sh`, `team/guard-team.sh` | Unique | garder |
| `loupe_capture.sh` | `scripts/bld/capture.sh` (capture du track bâtiments, PROMPT 9.5) | Unique | garder |
| `loupe_crop.py`, `loupe_dump_pull.py`, `loupe_night.py`, `loupe_checks.py`, `vector_allowlist.json`, `build_guard.py` | `loupe_capture.sh`, `loupe_checks.py` ↔ `gates.py`, `test_loupes.py`, `team/install-build.sh` | Unique | garder |
| `loop_capture.sh` | `loupe_capture.sh`, `vue_ensemble.sh`. Sert au dossier `iter-XX` | Ancienne boucle | garder pour l'instant (à confirmer) |
| `vue_ensemble.sh` | Rien. Pointe vers `docs/designs/village-loop/vue-ensemble` (absent) | Unique | archiver (sûr) |
| `layout_preview.py` | Cité en commentaire dans `constants/isoLayout.json`. Écrit dans `village-iso-v1/evidence/L0-T03` | Ponctuel | archiver (à confirmer) |
| `cost_projection.py` | Rien | Unique | archiver (sûr) |
| `planche_factice.py` | Rien | Unique | archiver (sûr) |
| `recolor_night.py` | `pipeline.md` (ligne 21) : ancien chemin de nuit, **remplacé par `famille_jour.py`** | **Doublon** de `famille_jour.py` | archiver (sûr) |
| `simule_voile_coeur.py` | Commentaire seul dans `components/village/iso/alentours.ts:1012` | Ponctuel | archiver (à confirmer). Corriger le commentaire |
| `ab_pairs.py` | Seulement `test_loupes.py` | Unique | archiver (à confirmer), avec son test partiel |
| `cuire_sol.py` | Commentaires dans `solBandes.ts` ; `loupe_bc_sol.py`, `loupe_bc_sondes10.py` | Unique | garder (à confirmer) |
| `rempart_champs.py` | Cité par `nuit_alentours.py` et par les commentaires de `champs.ts`, `rempart.ts` | Unique | garder (à confirmer) |
| `rues_port.py` | Test `__tests__/iso-route-sud.test.tsx` (commentaire), `test_loupes.py`, `loupe_bc_sondes5/6.py` | Unique | garder (à confirmer) |
| `recadrer_animaux.py` | `exports/test_exports.py` | Unique | garder (à confirmer) |
| `recadrer_statues.py` | `components/village/iso/statue.ts` (la taille est tenue par un test) | Unique | garder |
| `mesure_ombres_bleues.py` | Seulement `loupe_bc_sondes12.py` | Ponctuel | archiver (sûr, avec ses sondes) |
| `t27_paires.py`, `t41_stades.py` | Rien. Écrivent dans `village-iso-v1/evidence/T27`, `T41` et `reports/` (rondes passées) | Ponctuel | archiver (sûr) |
| `sonde00.py`, `sonde00_planche.py`, `sonde01.py`, `sonde01_planche.py` | Rien hors eux-mêmes | Doublons par paires (planche) | archiver (sûr) |
| `loupe_bc_sondes.py` à `loupe_bc_sondes12.py` (12 fichiers), `loupe_bc_sol.py`, `loupe_targets.py` | Seulement entre eux (chaîne de sondes BC). Ils ont produit les crops verrouillés de `loupes/bc/` | **Doublons** en série (sondes 2 à 12 réécrivent la 1) | archiver (sûr). Garder une copie dans l'archive, car ils ont produit des images verrouillées |
| `test_audit.py`, `test_blockout_shapes.py`, `test_budget.py`, `test_loupes.py` | Tests d'outils vivants (`iso_audit`, `isolib`, `iso_loop`) | Unique | garder (`test_loupes.py` teste aussi `ab_pairs`) |

**Vérification dans le worktree `iso` (autre session).** Les noms proposés au retrait n'apparaissent que dans `scripts/` et dans deux commentaires : `components/village/iso/alentours.ts:1012` (cite `simule_voile_coeur.py`) et `constants/isoLayout.json` (cite `layout_preview.py`). Il faut donc mettre à jour ces commentaires quand on retire les scripts.

### 2.2 `scripts/bld/` (876 Ko, 84 fichiers suivis)

| Fichier(s) | Référent (preuve) | Unique ou doublon | Proposition |
|---|---|---|---|
| `final.py` | Entrée de la chaîne. Lit `scripts/bld/final/<code>.json` | Unique | garder |
| `concepts.py`, `concepts/*.json` (20) | Importé par `final.py` ; lit `concepts/<code>.json` | Unique | garder |
| `integrate.py` | Entrée de la chaîne. Génère `constants/buildings/*.ts` (21) et les tests `iso-bld-*.test.ts` (23) | Unique | garder |
| `final/*.json` (21) | Lus par `final.py` et `integrate.py` ; chemins des PNG de `village-buildings/` | Unique | garder |
| `bldtools.py` | `gates.py`, `test_bldtools.py`, `render_cartes.py`, `render_e1.py`, `explore_e5_e4.py` | Unique | garder |
| `gates.py` | Portes du track bâtiments (PROMPT §7, 9.5, 10) ; test `test_bldtools.py` | Unique | garder |
| `lock_check.py` | Lit le verrou des loupes ; `test_bldtools.py` | Unique | garder |
| `capture.sh` | Appelle `scripts/iso/loupe_capture.sh` (PROMPT 9.5) | Unique | garder |
| `final_bande.py`, `final_deliver.py`, `final_elements.py`, `final_guides.py`, `final_guides2.py`, `final_paint.py`, `final_run.sh`, `gen_final_specs.py` | Pas appelés par `final.py` ni `integrate.py` (`final.py` n'importe que `concepts`). `final_guides2` est une version 2 de `final_guides` (doublon probable) | Cluster de rondes finales | archiver (à confirmer) |
| `gen_cartes.py`, `render_cartes.py`, `kit_maquette.py`, `maquette_peinture.py`, `test_cartes.py`, `test_kit_maquette.py` | `gen_cartes` ↔ `final_guides`, `kit_maquette`, `render_cartes` | Cluster des cartes | garder pour l'instant, décision Guillaume |
| `explore_e3.py`, `explore_e5_e4.py`, `cibles_e1.py`, `cibles_run.sh`, `gen_e1_specs.py`, `render_e1.py` | Ronde E1 : seulement entre eux | Ponctuel | archiver (sûr, sauf si la décision cartes les garde) |
| `gen_a3_specs.py`, `render_a3.py`, `gen_pilot_specs.py`, `render_pilot.py` | Rondes A3 et pilote : seulement entre eux | Ponctuel | archiver (à confirmer) |
| `seam_check.py`, `sondes2.py`, `sondes2_maquettes.py`, `sondes3.py`, `sondes4.py`, `sondes4_maquettes.py`, `sondes_moulin.py` | Sondes : seulement entre eux | **Doublons** en série (sondes 2, 3, 4) | archiver (sûr) |
| `test_bldtools.py`, `test_concepts.py`, `test_final.py`, `test_integrate.py` | Tests de `bldtools`, `concepts`, `final`, `integrate` | Unique | garder |

### 2.3 Scripts hors périmètre (intouchables)

- `scripts/village-states.py`, `village-states-push.sh`, `village-sounds.sh`, `villager-faces.py`, `generate-village.py`, `generate-villagers.py` : ancienne scène 2D du village. **intouchables**.

---

## 3. Tests (`__tests__/` et `scripts/`)

Un test de `__tests__/` ne peut pas être retiré pour une seule raison : le nom contient `iso`. Presque tous testent du code de l'app, qui reste. Résultat :

| Groupe | Nombre | Cible | Proposition |
|---|---|---|---|
| `__tests__/iso-*.test.*` (hors iso-bld) | 119 | Code de l'app (`components/village/iso/`) | garder |
| `__tests__/iso-bld-*.test.ts` | 23 | Générés par `integrate.py` (« kept if it exists ») | garder |
| `__tests__/iso-accroches`, `iso-maquettes`, `iso-layout`, `iso-spec`, `iso-cache-images`, `iso-sol-encre`, `iso-route-sud`, `iso-lisiere-sud`, `iso-dump-sprites` | (dans les 119) | Lisent des fichiers des scripts (renders, `heights.json`, `empreinte-sprites.js`, `reference_sprites.py`, `rues_port.py`, `route_tuiles.json`) | garder. Ces entrées sont utilisées |
| `__tests__/village-*.test.*` (16) et `villager*` (4) | 20 | Ancienne scène 2D et copie | **intouchables** |
| `__tests__/db-village*.test.ts` | 4 | Données du village (base) | garder |
| `__tests__/data/iso-tap-alpha.py`, `.json` | 2 | Données de test (`iso_audit`) | garder (à confirmer) |
| `scripts/iso/test_*.py`, `scripts/iso/exports/test_*.py`, `scripts/bld/test_*.py` | 12 | Tests Python des outils | garder. Pas lancés par CI ni `npm test` : à lancer à la main |

**Aucun test de `__tests__/` ne cible un script proposé au retrait.** Seul `scripts/iso/test_loupes.py` (partiellement `ab_pairs.py`) et `scripts/iso/exports/test_exports.py` (`recadrer_animaux.py`) doivent suivre leur script s'il est archivé.

---

## 4. Branches locales

Total : 207 branches locales (`main`, `feat/village-iso`, `track-clean` et les autres). Trois listes :

**A. Fusionnée dans `origin/feat/village-iso` : 119.**
- 102 sont aussi fusionnées dans `origin/main`. Candidates à retirer plus tard, après accord de Guillaume.
- 17 seulement dans iso (pas dans main) : `feat/village-iso` lui-même (à garder) et 16 branches `bld-*` (`bld-capture2`, `bld-engine2`, `bld-engine3`, `bld-engine4`, `bld-flux`, `bld-images`, `bld-int-all`, `bld-int-campfire`, `bld-int-fix`, `bld-measured`, `bld-nuit`, `bld-positions`, `bld-tab-fix`, `bld-tap`, `bld-tests`, `bld-village-rang`). Ne pas retirer avant que iso soit fusionnée dans main.

**B. Fusionnée dans `origin/main` mais pas dans iso : 7.**
- `main` (locale, à garder), `feat/armeabi-v7a-227`, `worktree-agent-a1dfead4d67c01a70`, `worktree-agent-a4a55cef59741d0c4`, `worktree-agent-a7813cd7b4eb6280c`, `worktree-agent-a7c112e8eea8a37db`, `worktree-agent-abd36881335d75587`.
- Proposition : liste pour Guillaume.

**C. Non fusionnée (ni iso ni main) : 81.**
- Répartition par préfixe : `fix/` 19, `feat/` 10, `fleet/` 9, `worktree-*` 5, `village*` 3, `reminders/` 3, `planches*` 3, `bld-*` 2, `pr*` 2, `i18n*` 2, `docs/` 2, `chore/` 2, `backup*` 2, `add-*` 2, `release`, `exercise`, `bench`, et 12 sans préfixe.
- Proposition : liste pour Guillaume. Ne rien retirer. La liste complète est dans `/home/guiforge/.cache/tmp/claude-1000/-home-guiforge-Documents-code-bati/3d206c59-5df1-4a3e-a715-2068c641aef9/scratchpad/not_merged_nomain.txt`.

---

## 5. Worktrees (`git worktree list`, 12 entrées)

| Chemin | Branche | État | Proposition |
|---|---|---|---|
| `/home/guiforge/Documents/code/bati` | `main` | Dépôt principal | garder |
| `/home/guiforge/Documents/code/bati-track-clean` | `track-clean` | Ce track | garder |
| `/home/guiforge/Documents/code/bati/.claude/worktrees/iso` | `feat/village-iso` (verrouillé) | Session iso vivante | **garder** (ne pas toucher) |
| `/home/guiforge/.cache/bati-art-loop/iso/p0-wt` | détachée | Boucle art (FLUX) | garder (à confirmer) |
| `/home/guiforge/.cache/bati-bench/src/BUILD-28P-66b45b1412` | détachée | Bench de build | liste pour Guillaume |
| `/home/guiforge/.cache/bati-bench/src/BUILD-29P-5496649a52` | détachée | Bench de build | liste pour Guillaume |
| `/home/guiforge/.cache/bati-v03` | `feat/village-v03` | Track v03 (branche `+`, donc prise ailleurs) | liste pour Guillaume |
| `/home/guiforge/Documents/code/bati/.claude/worktrees/audit-copie-fr` | `worktree-audit-copie-fr` | Vivant ou non : non vérifié | liste pour Guillaume |
| `/home/guiforge/Documents/code/bati/.claude/worktrees/design-exos` | `worktree-design-exos` | Idem | liste pour Guillaume |
| `/home/guiforge/Documents/code/bati/.claude/worktrees/fleet-past-session` | `fleet/past-session` | Idem | liste pour Guillaume |
| `/home/guiforge/Documents/code/bati/.claude/worktrees/iso-audit` | détachée | Idem | liste pour Guillaume |
| `/home/guiforge/Documents/code/bati/.claude/worktrees/wearable` | `worktree-wearable` | Idem | liste pour Guillaume |

Aucun worktree retiré. Les deux worktrees `bati-bench` sont détachés : ils peuvent être retirés une fois Guillaume prévenu.

---

## 6. Résumé

1. **Taille proposée au retrait : environ 4,5 Mo (4 647 Ko) sur 681 fichiers**, si tout est accepté. Hors total : `blockouts/bld/` (476 Ko), `cards/` et `maquettes/` (860 Ko), et le `scratch/` de 49 Mo (archivé en fin de track).
2. **Sûr (51 fichiers, environ 524 Ko)** : 28 scripts iso ponctuels, 17 scripts bld de rondes, `village-iso-poc/` (5 fichiers hors `REVUE-PROMPT.md`), `village-iso-polish/README.md`. Aucun référent trouvé, `recolor_night.py` est remplacé par `famille_jour.py`.
3. **À confirmer avec Guillaume (630 fichiers, environ 4 Mo)** : `village-iso-v1/` (425 fichiers de rondes, 2,1 Mo, à archiver à la fin du track iso), `village-surroundings/stage-0` à `stage-4` (159 fichiers, 1,1 Mo), `village-loop/iter-*` et `avant-apres/` (28 fichiers, 708 Ko), cluster final bld (8 fichiers), anciens prompts et briefs bâtiments (10 fichiers, 105 Ko).
4. **Intouchables et laissés en place** : `village-loop/loupes/`, `~/.cache/bati-loupes-lock/`, `iso_loop.py` et son registre, `VALIDATIONS.md`, `.claude/agents/`, le drapeau INTEGRATION, l'ancienne scène 2D, la bible du style, la bible des alentours, `PROMPT.md`, catalogues, état, décisions, listes de verrouillage, résumés des tracks.
5. **Incertitudes** : LIFE n'a pu être croisé (aucune `origin/track-*`). Les rôles de `gen_v2*.py` (non versionnés selon `pipeline.md`, présents ici), du cluster cartes et de `stage-1..4` ne sont pas tranchés. Deux commentaires de l'app citent des scripts à retirer. La copie de travail a des changements non commités qui ne sont pas les miens (`scripts/bld/final/well.json`, `scripts/bld/sans_losange.py`, `scripts/bld/test_sans_losange.py`) : ils sont laissés tels quels.

---

## 7. Pour Guillaume (décisions)

- Valider la liste sûre (51 fichiers) et lancer l'archivage vers `~/bati-archives/`.
- Décider du cluster des cartes (`gen_cartes`, `render_cartes`, `kit_maquette`, `maquette_peinture`, `cards/`).
- Décider du sort de `village-iso-v1/reports` et `reviews` (à la fin du track iso, le hook en a besoin).
- Trancher `catalog.md` contre `catalog-v3.md`.
- Liste des branches et worktrees à valider avant tout retrait (sections 4 et 5).
