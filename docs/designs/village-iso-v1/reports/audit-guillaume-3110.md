# Audit humain de Guillaume, 31/10 : diagnostic sur captures

Mots de Guillaume : LOG.md, 31/10. Regard neuf (iso-design-reviewer, REVUE-UI-PROMPT) sur evidence/qa-T41/ (p1-jour, p12-jour, p12-jour-zoom, p12-jour-droite, pret-avant, vague-fete).

## Routes
- Les « jointures » sont un pavage de dalles irrégulières cernées d'un trait d'encre fin, semé de cailloux sombres. Le motif est plus grand que les bâtiments et les villageois et se lit comme un tapis (p1-jour, y 1050-1550). Au palier 12, les bords ondulés font cousu, avec des anneaux autour des dalles près de la fontaine (p12-jour-zoom).
- Le chemin est beige sable, clair et peu saturé, alors que les sprites sont sombres et contrastés : il paraît venir d'un autre monde.
- Correction : assombrir et réchauffer le chemin vers la valeur des socles, la luminosité de 20 à 25 % plus basse et la saturation un peu plus haute. Réduire l'échelle et le contraste de l'encre des dalles. Poser un bord net à la place du fondu.

## Villageois
- Ils sont plus pâles que les bâtiments, gris-violet désaturé, et leur valeur est proche de celle du pavage. Cause dans le code : le dessin est posé à 0,8 sur un aplat de teinte (`DESSIN_HABITANT`, IsoCarteDemo.tsx:1393).
- Correction : dessin à opacité 1, saturation au niveau des sprites.

## Arbres du premier plan
- Ils sont nets mais délavés : bleu-gris froid ou vert-jaune pâle, d'une autre famille de teinte que les arbres sombres de l'île. L'arbre isolé en bas de p1 est doux, peut-être rendu à une échelle non entière.
- Correction : aucun voile ni fondu sous la ligne de l'île, et le même sprite sombre que sur l'île. La lecture du « flou » voulu par Guillaume est à confirmer avec lui.

## Fond
- Le semis de touffes et d'arbustes est régulier, comme un papier peint (p12-jour, y 780-1100 et 1550-1700).
- Les bandes de forêt finissent sur une frontière horizontale nette, en haut et en bas, de jour comme de nuit (pret-avant).
- Le dégradé est jaune-olive en haut et n'a pas de lien avec la lumière de l'île.
- L'île flotte : la falaise n'a ni ombre portée ni transition.
- Correction : dissoudre le bord des bandes de forêt, avec une densité qui décroît sans bord droit ; casser la régularité du semis ; poser un fond d'une seule teinte sombre ; ajouter une ombre portée sous l'île. Ça rejoint la revue DA de P1 (TODO § 4, Forêt).
