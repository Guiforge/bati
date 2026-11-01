# Village iso : reprise

Page à lire en premier pour repartir d'un worktree neuf. État au 01/11/2026.

## Où on en est

- Branche de travail : `feat/village-iso`, un seul commit au-dessus de `main`. Pas encore mergée.
- L'historique détaillé (110 commits) reste dans la branche **locale** `feat/village-iso-v1`, jamais poussée.
- Le village iso existe dans l'app. Les alentours peints sont derrière des drapeaux (`ALENTOURS` dans `constants/isoPoc.ts`), éteints par défaut. Pour les voir : `bati://dev-iso?peint=tout`.
- La boucle « sublime » est finie après 5 itérations, cible non atteinte : Mara 6,13, Théo 6,88, il fallait 8,5. Bilan et notes : [summary.md](summary.md).
- La phase 2 (« loupes ») est préparée mais pas lancée : [loupes/PROMPT.md](loupes/PROMPT.md) et [loupes/checkpoint.md](loupes/checkpoint.md). Rien n'a été dépensé ni commencé.

## Ce qui reste, dans l'ordre

1. Places de vocation : les objets recouvrent le feu (`vocation.ts`, emprise de tri 1x1 pour un dessin de 4 à 5 cases), c'est du vectoriel, et personne ne pratique.
2. Montée de stade : clignotement avant le gel, échafaudage filaire, impact invisible de nuit.
3. Cadrage d'ouverture : village à un quart de l'écran, parcelles sombres à bords nets, route coupée au palier 4.
4. Vie au repos : nuages et rais invisibles au cadrage d'ouverture.
5. Perf du sol peint (~128 Mo décodés, ~12 i/s sur l'émulateur) avant d'allumer les drapeaux dans l'onglet Village : [perf-debt.md](perf-debt.md).

Détail : `iter-05/audit-*.json`.

## Décisions en attente de Guillaume

- Allumer les alentours peints dans l'onglet Village (après le lot perf).
- Budget FLUX : `VALIDATIONS.md` n'a toujours pas de ligne `BUDGET_FLUX_V1`, donc plafond 40 $, 34,42 $ dépensés. Écrire `2026-11-01 BUDGET_FLUX_V1: 60` sous `## Lignes`.
- Passages de sous-agents pour les loupes : 80 par défaut.

## Règles qui tiennent

- Émulateur seulement, appareil toujours passé explicitement (`adb -s emulator-5554`, `maestro --device`). Un run a effacé les données du vrai téléphone.
- Promesses de Bati : tout vient du journal, rien ne recule, pas de monnaie, pas de boutique, pas de minuteur, montée au toucher seulement.
- Une seule taille d'image par famille de sprites. Le cliquet est à 26, le monter est une décision de Guillaume.
- Jamais d'image de Thronebreaker dans le dépôt ou envoyée à FLUX. `moodboard/` est ignoré par git, pour l'ambiance seulement.
- Avant un commit iso : `npx jest iso- village-scene village-copy reduced-motion locale built language`.
- Après un changement de sprite : `node scripts/iso/empreinte-sprites.js` (un test échoue sinon).

## Outils

- Peinture : `scripts/iso/iso_loop.py` (réserve et règlement du budget), `famille_jour.py`, `nuit_alentours.py`, `rempart_champs.py`. FLUX 3 Image retenu. Recette : blockout + ancre de style (`forge_solid`), fond magenta vérifié, contour 8 px. Voir [evidence/style-refs/README.md](evidence/style-refs/README.md).
- Captures : `scripts/iso/loop_capture.sh <dossier>`, `scripts/iso/vue_ensemble.sh <dossier>`. Ils refusent un dossier non vide et vident le cache d'images avant.
- Liens dev : `nu=1`, `palier=`, `mode=pret`, `jouer=1`, `ambiance=`, `vocation=`, `foyer=`, `zoom=`, `fige=1`, `peint=tout`.
- Mode équipe V1 : `scripts/iso/team/` (`guard-team.sh`, `commit.sh`, `heavy.sh`, `emu-adb.sh`, `emu-maestro.sh`). Le garde n'est plus branché : `settings.local.json` n'est pas versionné.
- Agents d'audit : `.claude/agents/` (`mara`, `theo`, `anim`, `tech`, `env`, `implementer`).

## Documents utiles

- Style : [../village-style-bible.md](../village-style-bible.md). Disposition : [disposition-plan.md](disposition-plan.md). Animations : [animations-inventaire.md](animations-inventaire.md). Grille de notes : [rubric.md](rubric.md).
- Décisions et savoir de la V1 : `../village-iso-v1/DECISIONS.md`, `KNOWLEDGE.md`, `plan/`, `research/`.
- Alentours : `../village-surroundings/bible.md`, `flux-spend.md`, `licence.md`.

## Ce qui n'est plus dans le dépôt

Preuves, captures par itération, planches et rendus intermédiaires. Ils restent dans `~/.cache/bati-art-loop/` (candidats FLUX, vidéos, registre, captures archivées, et `iso/archive-worktree/` pour `vue-ensemble` et `iter-05-captures`) et dans l'historique local de `feat/village-iso-v1`. Certains chemins de `scripts/provenance.json`, de `reviews` ou de `reports` pointent vers ces fichiers : c'est un historique, pas une dépendance.
