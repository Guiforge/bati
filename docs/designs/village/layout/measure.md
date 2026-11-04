# Mesure du plan d'aujourd'hui (04/11/2026)

`node scripts/atelier/atelier.js check --tier 1,...,12 --light jour`, deux fois, sha 43b840af8 (arbre avec le param `haut`). Sorties brutes: `layout/scratch/atelier/check-*.json` (copies de travail hors dépôt). Code de sortie 1 des deux côtés, comme prévu.

- **Défaut** (`stadeDemo`, le stade baisse avec le palier de la case): total `occlusion 37, anchors 105, depth 0, hooks 90, tap 0, motion 0` (somme des 12 paliers).
- **Plus haut** (`?haut=1`, tous les bâtiments à leur dernier stade): `occlusion 40, anchors 105, depth 0, hooks 98, tap 0, motion 0`.

## Le param `haut`

`?haut=1` dans `app/dev-iso.tsx`, passé à `IsoCarteDemo` (`haut`): chaque bâtiment prend `batiments[code].stades.at(-1)` et tous reçoivent le drapeau légendaire, à tout palier. Route de dev seulement (`ISO_POC`, redirige hors dev), sans le param rien ne change. Le param `stade` déjà déclaré ne sert qu'au blason.

**Vérifié par les noms de fichiers des images** (stade = premier mot): au défaut, le palier 1 est tout `rough`, le palier 12 a 15 `grand` et 6 `solid`; avec `haut=1` le palier 1 a déjà 5 `grand` et 1 `solid`, et les paliers 9 à 12 sont identiques au défaut (15 `grand`, 6 `solid`). Les 6 `solid` sont les bâtiments dont le dernier stade est `solid` (leur liste `stades` s'arrête là). Aucune image `legendary` ni `mythic` n'est tirée par la carte: elle ne sait dessiner que rough, solid, grand (`Stade`); le drapeau légendaire ne change que la bannière. Les stades `legendary` et `mythic` existent dans `peints/` et ne sont pas mesurés ici.

## Portes, par palier

Nombre de bâtiments sous 85 % visibles / sprites à plus de 2 px écran de leur pied (sur le total de sprites mesurés) / crochets couverts (sur les dessinés). Tap: 0 partout.

| Palier | Bât. | Défaut occ. | Défaut ancr. | Défaut crochets | Haut occ. | Haut ancr. | Haut crochets |
|---|---|---|---|---|---|---|---|
| 1 | 6 | 0 | 5 / 14 | 0 / 6 | 0 | 6 / 14 | 1 / 6 |
| 2 | 9 | 2 | 6 / 21 | 3 / 9 | 0 | 6 / 21 | 2 / 9 |
| 3 | 12 | 1 | 6 / 29 | 2 / 12 | 1 | 6 / 29 | 3 / 12 |
| 4 | 14 | 0 | 6 / 35 | 4 / 14 | 2 | 6 / 35 | 5 / 14 |
| 5 | 16 | 2 | 7 / 42 | 6 / 16 | 3 | 8 / 42 | 6 / 16 |
| 6 | 18 | 3 | 9 / 47 | 7 / 18 | 5 | 9 / 47 | 11 / 18 |
| 7 | 18 | 5 | 9 / 49 | 11 / 18 | 5 | 9 / 49 | 11 / 18 |
| 8 | 20 | 4 | 11 / 52 | 11 / 20 | 4 | 11 / 52 | 11 / 20 |
| 9 | 21 | 5 | 12 / 55 | 11 / 21 | 5 | 11 / 55 | 12 / 21 |
| 10 | 21 | 5 | 12 / 58 | 11 / 21 | 5 | 11 / 58 | 12 / 21 |
| 11 | 21 | 5 | 11 / 58 | 12 / 21 | 5 | 11 / 58 | 12 / 21 |
| 12 | 21 | 5 | 11 / 59 | 12 / 21 | 5 | 11 / 59 | 12 / 21 |

## Pannes, la pire d'abord (par bâtiment)

Visible % = la pire valeur sur les 12 paliers; palier et stade où elle tombe; nombre de paliers sous 85 %. « Cache » = les images qui couvrent le plus de pixels. Crochet = la boîte de `hooks.json` couverte à plus de 1 % dans au moins un palier, avec la part la plus forte (tous états).

| Bâtiment | Visible % défaut | Visible % haut | Paliers sous 85 % (défaut / haut) | Qui le cache | Crochet |
|---|---|---|---|---|---|
| windmill | 67,8 (p5 grand) | 67,8 (p3 grand) | 8 / 10 | quarry, villageois fermier | raté, 28 % (tour, galerie, sacs de farine) |
| watchtower | 81,7 (p9 solid) | 81,7 (p9 solid) | 6 / 7 | pan de rempart, habitant | raté, 2 % (plateforme et cor) |
| forge | 81,8 (p2 rough) | 83,0 (p5 grand) | 9 / 8 | tas de bois 1, armory | raté, 15 % au défaut, 9 % haut (cheminée, foyer, enclume) |
| wizard_tower | 82,1 (p6 grand) | 82,1 (p4 grand) | 7 / 9 | druid_grove, menhir 2 | tenu (0 %) |
| castle_wall | 82,1 (p7 solid) | 82,1 (p6 solid) | 5 / 6 | pans de rempart, habitant | raté, 12 % (porte de rondins) |
| druid_grove | 82,2 (p5 solid) | 86,4 (p8 grand) | 1 / 0 | forge, habitant | raté, 7 % (chêne sacré, dolmen) |
| tent | 82,4 (p2 solid) | n/a (haut: au-dessus de 85) | 1 / 0 | fountain | raté, 4 % |
| archery_range | 86,3 | 86,3 | 0 / 0 | pan, râtelier 1 | raté, 5 % défaut, 2 % haut (cibles) |
| heroes_hall | 86,5 | 86,4 | 0 / 0 | campfire, training_dummy | raté, 6 % (bannière) |
| fountain | 88,0 | 88,0 | 0 / 0 | étal 1, pan | raté, 9 % |
| barn | 88,4 | 89,4 | 0 / 0 | potager 1 | raté, 12 % défaut, 9 % haut |
| observatory | 90,2 | 90,2 | 0 / 0 | linge 1, habitant | raté, 7 % |
| armory | 95,2 | 95,2 | 0 / 0 | castle_wall, pan | raté, 4 % |
| champion_arena | 98,8 | 98,8 | 0 / 0 | habitant | raté, 1 % |

Les autres bâtiments (campfire, farm, high_road, quarry, training_dummy, well, dragon_lair) passent la porte d'occlusion et n'ont aucun crochet raté.

Lecture: le moulin est de loin le pire (un tiers de son corps caché par la carrière à tous les paliers où les deux existent, et son crochet couvert à 28 %). Ensuite quatre bâtiments tout juste sous le seuil, cachés par d'autres bâtiments, des pans de rempart ou des accessoires. Les crochets ratés (12 sur 21 à haut palier) viennent en majorité de petits recouvrements (1 à 9 %), pas de cachés francs.

## Ancrages

Les 11 à 12 sprites au-delà de 2 px par palier sont tous du côté « le dessin finit au-dessus du pied » (flottants). L'écart le plus grand relevé au palier 1 est training_dummy -9,6 px écran, puis fountain -5,9 et heroes_hall -5 (bâtiments), et deux figurines de villageois à +4 et +3 (le bas du dessin sous le pied déclaré). Voir `flottants.md`.

## Ce que la mesure ne voit pas

- L'ordre de peinture est celui du DOM: un sprite tourné (ailes du moulin) n'occlut pas, les villageois et les murs n'ont pas de test de pied.
- Les accessoires, éléments de bâtiment (teasers, gags, ajouts) et le décor ne comptaient pas dans la porte d'ancrage avant L5 (voir `flottants.md`).
- Les stades `legendary` et `mythic` ne sont jamais dessinés par la carte de démo, donc non mesurés.
- Le jour seulement (`--light jour`); la nuit n'est pas mesurée ici.
- Une mesure de pixels ne dit pas si c'est beau: le moulin caché à 68 % mérite un regard, un crochet couvert à 1 % non.
- Le sha porte `-dirty` (les deux fichiers du param `haut`); le plan mesuré est celui de HEAD.
