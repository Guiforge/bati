# Sondes BC, série 1 : verdict d'env (02/11)

Les 4 familles sont rejetées. Coût : 1,05 $. Pas de peinture en série.

| Famille | Meilleur morceau | Pourquoi rejetée |
| --- | --- | --- |
| decals | v2, pierres seules et ornières | Galettes de terre rondes (ellipses du greybox), touffes soudées à un socle, ombres peintes, encre, terre trop orange |
| arbres | v1, teintes par arbre | Dalles (v0, v1, v3), disques et couronnes en œufs (v2), pas de masse, troncs longs, lumière beige, pas de sous-bois |
| route | v0, bords les moins raides | Bordures continues comme un quai, ornières en voie ferrée, tronçon droit, encre, orange saturé, mouchetis |
| champ | v0, les gerbes | Sillons en matelas, losange à bords droits, épouvantail cassé, ombres peintes, chemin en pointillés |

**Cause commune** : les greybox à bords nets sont recopiés tels quels. « No ink » et « no cast shadow » ne tiennent pas dans un long prompt.

## Décisions du chef

- **Bordures de pierres** : PROMPT.md section 12 en veut aux paliers 4 à 6, l'écran cible que Guillaume a choisi n'en a pas. L'écran cible gagne. À signaler au checkpoint du coin de beauté.
- **Bords du champ** : le contrat 5 reste. Le bord droit du blé de la cible n'est pas à copier.
- **Bas gauche de la cible** : signes qui ressemblent à de fausses runes, pas un modèle.

## Série 2 : ce qui change

- Le sol plat et les objets debout sont peints séparément. Les objets vont sur magenta, leur ombre vient du code.
- Route et champ sont repeints sur un vrai morceau du sol en jeu, puis posés avec un masque doux hors ligne.
- Les arbres ont pour références les masses de forêt déjà en jeu, et non des bâtiments encrés.

## Séries 2 et 3 : verdict d'env (02/11)

Tout est rejeté, sauf la recette du pré repeint (`sondes-3/sol-coin` v3), à retoucher. Dépensé sur les 3 séries : 2,74 $.

- **Pré** : retirer la moitié des fleurs, créer de grandes plages calmes, détail près des chemins seulement, terre usée moins saturée et sans ligne autour.
- **Arbres** : les bouquets déjà en jeu sont meilleurs que tous les neufs. On arrête d'en peindre, on recompose ceux du jeu hors ligne.
- **Decals** : découpés dans le sol peint, plus générés à part. Ils servent à ancrer les objets, aux bandes de palier, aux raccords et à de rares accents.
- **Route et champ** : repeinture sous masque serré, à la résolution réelle, sur une esquisse construite. La repeinture globale donne un ruban et une feuille. Partir de `sondes-2/route/route_v3` et `sondes-2/champ/champ_v2`.
- **Gerbes et épouvantail** : sur magenta, vue de dessus 2:1, un objet par image. La vue de face a été rejetée.
- **Refusé par le chef** : recadrage de la cible comme référence FLUX. La section 12 demande des assets du jeu. À proposer à Guillaume seulement si la série 4 échoue.

## Série 4 : écartée par le chef, sans juge (02/11)

0,73 $, total 3,47 $. Taux utilisable 3 sur 8. Pré plat, champ en losange collé, chemin marron, découpes d'arbres à bandes floues, dalles sous les pieds. Non présentée à env : un passage de moins.

**Pivot, série 5** : repeindre un recadrage de la vraie capture du palier 6 (route, murs et bâtiments donnent l'échelle), selon la recette de l'écran cible, puis garder le sol seul, reprojeté dans le terrain. C'est une nouvelle peinture, donc la règle « les écrans cibles ne sont jamais livrés » tient. Écart à la section 12 (décals sur fond plat) à signaler au checkpoint. Arbres : masses du jeu entières, sans découpe.

## Série 5 : la méthode marche (02/11)

0,28 $, 1 tirage utilisable sur 4 (`try2/v0`), 3,00 px par dp réels, aucun bâtiment déplacé. Route, blé et gerbes valent enfin la cible à 2x. Restent la tache bleue des anciens polygones et une couture devinable à gauche. Le chef a acquitté l'alerte des 40 $ du registre (`budget ack`, réservé au chef, dans le budget autorisé par Guillaume). Env n'a pas encore jugé cette série.
