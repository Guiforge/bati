# Ce qui flotte (04/11/2026)

Mesure: `check` (paliers 6 et 12, `haut=1`), rendus à `zoom=2.4` (`--query 'foyer=<code>&zoom=2.4'`, 6,3 px écran par dp), recoupes sur les peintures elles-mêmes.

## La cause: ce n'est pas l'ancrage des peintures

Hypothèse de départ (CLEAN a recoupé 174 éléments sans recalculer les ancrages): **fausse**, par la mesure.

- **Accessoires (28 à 35 selon le palier)**: les 35 fichiers sont peints avec leur dernier pixel opaque (alpha 128 ou plus) à la ligne 211 pour un pied déclaré à 212/220. Écart de 1 px de toile, soit moins d'1 px écran. L'ombre cuite (alpha 102, bleutée, environ 8 px de haut) vient sous le pied et n'est pas comptée. Le test « toujours 0 » de `check` est donc juste ici, il l'est parce que la peinture suit la constante, pas parce qu'il est aveugle.
- **Éléments de bâtiment (176 fichiers jour: teasers, gags, ajouts)**: posés bas-centre de la toile sur leur ancre. 146 ont une marge transparente sous l'objet, mais la plus grande, 10 px de toile (`watchtower gag_3`), vaut 1,9 px écran à l'échelle du palier 12; aucune ne dépasse 2 px écran. Mesure par `scripts` ad hoc, 0 sur 176 au-dessus du seuil.
- **Bâtiments**: le pied déclaré est au plus à -8,3 px écran du dessin (`training_dummy`), puis `castle_wall` -7,4, `farm` -5,3, `heroes_hall` -5,1, `fountain` -4,3, `armory` -4,1. Jugé non flottant à l'oeil, fichiers générés par `integrate.py`, non touchés.
- **Ombre de contact**: `OmbreContact` ne sert qu'aux villageois et créatures. Les accessoires n'ont que leur ombre cuite, faible. À fort zoom un grand objet (menhir 2, tonneau, tas de bois) paraît posé sur rien. C'est un choix de style (ombre peinte), pas un décalage mesurable. **Décision à prendre** si Guillaume veut des accessoires plus ancrés: ombre de contact du code sous chaque accessoire, ou ombres cuites plus marquées (repeindre, hors de ce lot).

## Les vrais flottants, trouvés à l'oeil puis à la mesure

1. **Le chat de la ferme (`chat_1`)** flottait 100 px écran au-dessus du toit à zoom 2,4 (environ 16 dp). Il se pose au « haut du masque de tap » du bâtiment (`surLeToit`), et ce haut est la pointe du maïs, pas le toit. **Corrigé**, en données: `decalage` par stade dans `alentours.ts` (solide `[-6, 9]`, grand `[-6, 19]`), lu par `AccessoirePeint`. Avant/après: `img/flottants-avant-apres.jpg`. Au palier 3 (solide) le chat est encore un peu haut (environ 8 px écran), à affiner.
2. **Accessoires cachés** (nouvelle porte `props` de `check`, moins de 50 % visibles). Ils ne flottent pas, ils sont derrière quelque chose, donc invisibles ou presque:

| Accessoire | Visible | Cache | Paliers |
|---|---|---|---|
| `tonneaux_1` (case 12,9) | 0,0 % | training_dummy | 6 et plus |
| `tas_de_bois_2` (12,8) | 0,1 % | training_dummy | 6 et plus |
| `caisses_1` (16,7) | 3,0 % | pan de rempart | 12 |
| `menhir_3` (16,5) | 18,2 % | watchtower, pan | 12 |
| `lanterne_2` (16,6) | 27,7 % | pan de rempart | 12 |
| `caisses_2` (7,11) | 41,5 % | tent | 6 et plus |

   Le tonneau « dans le DOM mais invisible » est `tonneaux_1`: le camp du palier 1 est recouvert par le training_dummy dès qu'il se pose. Les déplacer demande de choisir une case libre sur un plan qui est en train de changer (autre agent): **non fait, décision**. Règle du produit à trancher: rien ne disparaît, donc un accessoire recouvert est un manque.
3. **La botte de foin 1 de la ferme** (case 3,8) a sa moitié gauche au-dessus de l'eau de la rivière. Décalée de 0,3 vers la terre, elle passe derrière le toit de la ferme (pire). Remise comme avant. **Décision**: autre case.

**Ancres des bâtiments corrigées (04/11)**: chaque stade a son ancre au pied de sa peinture (`ancres` dans `peints/<code>.ts`, produit par `pied()` de `integrate.py`), 0 bâtiment au-delà de 2 px aux paliers 1, 6, 12 avec et sans `haut=1`; les éléments et le bassin de la fontaine lisent l'ancre nominale (bas de toile moins 64). Avant/après: `img/ancres-avant-apres.jpg`.

## Ce que `check` voit maintenant (`scripts/atelier/check.js`)

- Porte **anchors**: ajoute les éléments (`batiment-teaser|gag|addon`) par leur ligne opaque la plus basse contre le bord bas de leur boîte. Ils ne sont dans le DOM que dans les états `bld=<code>&rang=N` (le moteur de bâtiment), pas dans la carte de démo: la porte ne les voit donc pas sur les 12 paliers. Mesuré une fois sur les 176 fichiers: 0 au-dessus de 2 px.
- Porte **props** (neuve): part visible de chaque accessoire, échec sous 50 %. Dernière ligne de `check`: `GATE FAILED: occlusion 8, anchors 20, props 9, ...` sur 6 et 12.
- Les accessoires restent testés par leur ligne opaque réelle (alpha 128 ou plus, hors ombre cuite): la valeur est 0 parce que la peinture est juste.

## Reste

- 9 accessoires cachés sur 6 et 12 (6 distincts), à replacer avec le nouveau plan.
- Bottes de foin 1 sur la rivière, chat du palier 3 un peu haut.
- Éléments de bâtiment: la position (`gagSlot`, `teaserAt`, posés à la main) n'est pas mesurable sans vérité terrain; vue d'oeil seulement, forge rang 4 (le socle de cheminée sur la crête du toit paraît juste).
- Au plus 1 sprite corrigé (le chat, deux stades) sur les 4 demandés: les autres sont des décisions de plan.
