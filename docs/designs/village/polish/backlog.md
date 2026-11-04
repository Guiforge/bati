# Backlog de la piste POLISH

Notes de Guillaume du 04/11, reprises de [`../clean/checkpoint.md`](../clean/checkpoint.md). Elles s'ajoutent à l'audit de l'annexe POLISH de [`../PROMPT-tracks.md`](../PROMPT-tracks.md). Rien de ceci n'a été commencé.

## 1. En premier : ombres et X brun des rues

- **Ombres des bâtiments peints :** les adoucir, bord flou, teinte ardoise, plus de bord droit. Elles sont dessinées par le code, pas peintes.
- **X brun des rues :** le refaire en peinture, ou le retirer s'il ne sert à rien. Fichier : `components/village/iso/RuesDessinees.tsx`.
- Capture de référence : [`../clean/captures-fin/10-ombre-et-rues-du-code.webp`](../clean/captures-fin/10-ombre-et-rues-du-code.webp).

## 2. Ensuite

- **Moulin de nuit :** la bande pâle restante sous la base.
- **Les 3 éléments mordus par le masque :** `archery_range` `gag_8`, `armory` `gag_10`, `windmill` `teaser_r6`. Blanc ou plaque beige mêlés à l'objet.
- **Les 47 éléments à relire après le prochain `integrate.py` :** sur 171, ils ne font pas la taille que donnerait leur source d'aujourd'hui, et le script les régénérera. Voir [`../PIPELINE.md`](../PIPELINE.md). On ne sait pas lequel des deux est le plus récent.
- **Coin verrouillé :** refaire le contrôle avec l'outil d'origine. CLEAN a mesuré 0,03 à 0,08 % hors bâtiments avec un outil proche, pas le même, sur le `.perf` de `bdbada18`.

## Ne pas toucher

- **`fountain` `gag_7`, le chapeau sur les bottes :** Guillaume le garde.
