# T25-art : statues du totem

Klein `w5gp`, 3 candidats par statue et par tentative, 6 statues. Sujets `STATUES` dans `scripts/iso/iso_loop.py` (correctif au passage : `main()` masquait la fonction `sheet` par une variable de boucle).

## Tentatives (un changement à la fois)
- a1 (blockouts v1, canvas decor) : 0 pass sur 17. `light` vide partout (blockouts sans faces mesurables), pierre gris-bleu. 0,144 $.
- a2 (blockouts v2 ; un changement de prompt : pierre « light cream-beige limestone », surfaces sculptées lisses, socle octogonal) : 3 pass sur 18, socle énorme, animaux coupés en haut. 0,144 $.
- a3 (blockouts v3, canvas `tower1x1` 512x1280, même prompt que a2) : 14 pass sur 18 (échecs : ours c0 et c2, saumon c0, cerf c2). 0,162 $.
- Total 0,450 $ ; sonde klein_prod_real 6,054 / 7,50 ; V1 6,961 $.

## Revue neuve a3 et décision du chef (DECISIONS 30/10)
Pass : ours c1 c2, hermine c1, cerf c0 c1, cheval c0 c2. Saumon et sanglier : lumière trop chaude. Acceptés par le chef (`accepted_by: chef`) : ours c1, hermine c1, cerf c0, cheval c2, saumon c1, sanglier c1. Saumon et sanglier gardent dans la provenance `review.verdict: fail` (item lumière) ; l'audit A passe pour les six, donc aucun `human_override` n'a été écrit (la raison du chef est dans `--human`, ignoré quand l'audit passe).

## Où et comment
- `assets/images/village/iso/pieces/statue_<animal>.webp` + `.json` (masque de toucher, ancrage), animal en clé : `ours`, `hermine`, `saumon`, `cerf`, `cheval`, `sanglier` (slug `pieces/statue_<animal>`).
- Canvas `tower1x1`, 512 x 1280, ancrage [256, 1216] (pied du socle). Pas de recadrage : l'outil écrit le canvas entier. Boîte utile commune : x 134 à 377, y 919 à 1182 (la statue fait environ 243 x 160 à 263 px) ; à recadrer côté app si besoin.
- Candidats et planches : `~/.cache/bati-art-loop/iso/pieces/statue_<animal>/`, planche d'ensemble `~/.cache/bati-art-loop/iso/pieces/statue_planche_a3.png`.

## Limites
- La teinte de la pierre varie d'une statue à l'autre (beige, gris) ; l'app la teinte par matière.
- Pas d'étendard peint (dessiné par l'app) : pas de planche composée avec lui, capture qa après pose.
