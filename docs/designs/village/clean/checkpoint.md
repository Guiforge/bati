# Checkpoint de la piste CLEAN

Rien ne bloque. Trois choix, détaillés dans [`summary-1.md`](summary-1.md) :

1. Ombres en polygones et X brun des rues, dessinés par le code : à adoucir ou retirer, dans LIFE ou POLISH ?
2. Les 480 images hors `peints` non notées FLUX 3 ([`modeles.md`](modeles.md)) : les laisser jusqu'à INTEGRATION ?
3. Worktrees et branches gardés : lesquels supprimer ?

## Réponse de Guillaume (04/11)

1. Ombres et X brun des rues : dans POLISH, en premier. Ombres des bâtiments peints adoucies (bord flou, teinte ardoise), plus de bord droit. Le X des rues : refait en peinture, ou retiré s'il ne sert à rien.
2. Les 480 images hors bâtiments : on les garde. La règle « FLUX 3 Image et FLUX 3 Image Klein seulement » vaut pour toute nouvelle image ; POLISH repeint en FLUX 3 celles qu'il touche.
3. Worktrees et branches : tout archiver d'abord (un bundle git de toutes les branches non fusionnées, un tgz des worktrees gardés avec leurs fichiers modifiés, dans ~/bati-archives/), vérifier que le bundle s'ouvre, puis supprimer en local. Ne jamais toucher main, feat/village-iso, les branches track-* d'une session en cours, ni un worktree qu'une session utilise.
4. Pour POLISH : la bande pâle sous le moulin la nuit, les 3 éléments mordus par le masque, les 47 éléments à relire après le prochain integrate.py, et le contrôle du coin verrouillé refait avec l'outil d'origine.
5. Le chapeau sur les bottes (gag_7 de la fontaine) : je garde.
