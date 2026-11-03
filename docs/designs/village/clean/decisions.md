# Décisions de la piste CLEAN

- 03/11 : prompt lu dans `~/Téléchargements`, `~/Downloads` n'existe pas sur cette machine.
- 03/11 : worktree de piste `~/Documents/code/bati-track-clean`, hors de `.claude/worktrees`, parce que jest ignore ce dossier.
- 03/11 : `bld-tap` retiré : son verrou nommait un agent mort (pid 3970248 absent), donc il n'était plus tenu. Branche fusionnée dans iso.
- 03/11 : worktrees retirés sans `--force` seulement, pour que git refuse tout dossier modifié. Fichiers ignorés uniques (concepts A3 de l'observatoire, un fichier `.superpowers`) archivés avant dans `~/bati-archives/2026-11-03-clean-worktrees.tgz`.
- 03/11 : `final.py elements` refuse dès qu'un `.raw.png` existe : les deux images manquantes ont été peintes par un script à part, même requête, même modèle.
- 03/11 : le prompt du gag 1 du puits change : « rope loop for the feet » était bloqué par la modération (auto-mutilation). Le refus est facturé, 0,041 $ perdus.
- 03/11 : le losange n'est pas qu'une plaque grise neutre : c'est aussi un bord pâle rose-lavande coupé droit. Le masque traite les deux.

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
