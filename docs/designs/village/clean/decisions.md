# Décisions de la piste CLEAN

- 03/11 : prompt lu dans `~/Téléchargements`, `~/Downloads` n'existe pas sur cette machine.
- 03/11 : worktree de piste `~/Documents/code/bati-track-clean`, hors de `.claude/worktrees`, parce que jest ignore ce dossier.
- 03/11 : `bld-tap` retiré : son verrou nommait un agent mort (pid 3970248 absent), donc il n'était plus tenu. Branche fusionnée dans iso.
- 03/11 : worktrees retirés sans `--force` seulement, pour que git refuse tout dossier modifié. Fichiers ignorés uniques (concepts A3 de l'observatoire, un fichier `.superpowers`) archivés avant dans `~/bati-archives/2026-11-03-clean-worktrees.tgz`.
- 03/11 : `final.py elements` refuse dès qu'un `.raw.png` existe : les deux images manquantes ont été peintes par un script à part, même requête, même modèle.
- 03/11 : le prompt du gag 1 du puits change : « rope loop for the feet » était bloqué par la modération (auto-mutilation). Le refus est facturé, 0,041 $ perdus.
- 03/11 : le losange n'est pas qu'une plaque grise neutre : c'est aussi un bord pâle rose-lavande coupé droit. Le masque traite les deux.
- 03/11 : réglage du masque arrêté après trois passes et une ronde ciblée : les planches sur aplat ne montrent pas le vrai sol, les captures en jeu tranchent.
- 03/11 : 47 éléments sur 171 ne font pas la taille que donnerait leur source d'aujourd'hui (17 de plus de 2 px). Je garde les webp livrés, sans toucher à ces éléments : les captures montrent ce que voit le joueur. Le prochain `integrate.py` les régénérera depuis les sources ; il faudra alors relire ces 47.

- 04/11 : fusion de la piste malgré les bords gris restants : mara ne les voit qu'au zoom, et ce sont en bonne partie les ombres du code.
- 04/11 : ombres et X des rues non touchés : `components/village/iso/` est à LIFE.
- 04/11 : 114 branches locales fusionnées supprimées, toutes contenues dans le tip. Les non fusionnées restent.
- 04/11 : worktree `agent-a6d9e6f2e26961458` gardé : git le dit modifié et le garde-fou de session interdit de lire son état. Commit déjà fusionné.

## Worktrees laissés, pour Guillaume

| Worktree | Pourquoi |
|---|---|
| `.claude/worktrees/audit-copie-fr` | fusionné, mais fichiers modifiés ou non suivis (git refuse). Son lien `node_modules` vers le dépôt principal a été retiré, il suffit de le recréer si besoin |
| `.claude/worktrees/design-exos` | fusionné, mais fichiers modifiés ou non suivis |
| `.claude/worktrees/wearable` | fusionné, mais fichiers modifiés ou non suivis |
| `~/.cache/bati-v03` | travail indexé non commité, sur `feat/village-v03` |
| `.claude/worktrees/fleet-past-session` | non fusionné |
| `.claude/worktrees/iso-audit` | HEAD détaché, non fusionné |
| `~/.cache/bati-art-loop/iso/p0-wt` | HEAD détaché, non fusionné |
| `~/.cache/bati-bench/src/BUILD-28P-…`, `BUILD-29P-…` | fusionnés, mais ce sont les sources de builds du banc d'essai, pas de vieux chantiers |
| `.claude/worktrees/iso` | `feat/village-iso`, verrouillé par cette session |

## Worktrees et branches, réponse de Guillaume (04/11)

Archives dans `~/bati-archives/` : `2026-11-04-branches.bundle` (toutes les branches locales et les HEAD détachés), `2026-11-04-branches.txt` (commit de chaque référence), `2026-11-04-worktrees-gardes.tgz` (fichiers des worktrees sans `node_modules` ni builds Gradle, plus leur dossier d'administration git et le patch indexé de `bati-v03`). Bundle cloné, `fsck` passé, les 107 commits de la liste présents ; tgz relu en entier.

- **Retirés :** `agent-a6d9e6f2e26961458`, `audit-copie-fr`, `design-exos`, `wearable`, `fleet-past-session`, `iso-audit`, `~/.cache/bati-v03`, `~/.cache/bati-art-loop/iso/p0-wt`, les 2 `~/.cache/bati-bench/src/BUILD-*`.
- **Branches supprimées :** 91, en local. Aucune branche distante n'a bougé.
- **Gardées :** `main`, `feat/village-iso`, `track-clean` (cette session), `track-life` (session en cours), `feat/multiplayer-lot0` et `worktree-multi_0` (session `multi_0` en cours).
- **Restaurer une branche :** `git fetch ~/bati-archives/2026-11-04-branches.bundle <branche>:<branche>`.
