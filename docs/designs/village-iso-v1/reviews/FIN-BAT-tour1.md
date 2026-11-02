# FIN-BAT, tour 1 : classement des 21 bâtiments (regard neuf, 31/10)

Pièces : evidence/T41/stades/, evidence/qa-T41/p12-jour.png et pret-avant.png. L'agent n'a pas ouvert les sprites un par un et n'a pris aucune mesure en pixels.

## Notes sur 10, au niveau d'un jeu pro
| Bâtiment | Note | Peint ? | Défaut principal | Correctif le moins cher |
| --- | --- | --- | --- | --- |
| high_road | 3 | solid en maquette | trois stades sans lien | repartir d'une seule idée (portique), peindre le solid |
| observatory | 3 | rough en maquette | dôme à facettes, fente jaune lue comme un bug, pas de lunette | redessiner dôme et lunette, peindre le rough |
| training_dummy | 3 | peint, minuscule | mal formé, ne change pas d'un stade à l'autre | redessiner un poteau de frappe au torse paillé, l'agrandir |
| druid_grove | 4 | se lit comme une maquette 3D | solid et grand sans rapport, blocs violacés | reprendre le grand à partir du solid, retirer le violet |
| dragon_lair | 5 | rough en maquette | rochers en prismes qui se lisent low-poly | peindre le rough, adoucir les arêtes |
| archery_range | 5 | à moitié peint | sol du grand bleu pâle et vide, ombres peintes | assombrir le sol, retirer les ombres |
| armory | 6 | peint | ne se lit pas comme une armurerie, pas de grand | râtelier ou écu, façade ouverte |
| castle_wall | 6 | peint | trop petit pour une muraille, pas de grand | échelle plus grande (FIN-DIS : rempart autour du village) |
| campfire | 6 | peint | le grand change de famille de teinte | flamme animée, recolorer le grand |
| farm | 6 | peint | sol bleu saturé, champs peu lisibles | texture de cultures, face droite éclaircie |
| tent | 6 | peint | toile plate, mâts qui sortent de l'emprise | relever la toile, rentrer les mâts |
| well | 6 | peint | toit énorme | baisser le toit |
| fountain | 7 | peint | pierre terne | eau animée |
| windmill | 7 | peint | toit en parasol, ressemble à un silo sans ses ailes | réduire le toit |
| barn | 7 | peint | la couleur du toit saute d'un stade à l'autre | harmoniser le toit |
| heroes_hall | 7 | peint | **le bâtiment « géant »** : la plus grosse masse bâtie du village | réduire de 15 % environ |
| quarry | 7 | peint | trop massif pour une carrière | réduire |
| watchtower | 7 | peint | pas de grand, échelle bleue lumineuse | assourdir |
| wizard_tower | 8 | peint | pierre terne, flèche perdue | une fenêtre chaude, étincelles |
| champion_arena | 8 | peint | rough rosé violacé | recolorer le sol du rough |
| forge | 9 | peint, la référence | le grand perd le foyer chaud | réchauffer le foyer |

## Hiérarchie d'échelle proposée
- **Monuments** : champion_arena, dragon_lair, heroes_hall, wizard_tower, castle_wall, observatory.
- **Bâtiments** : forge, windmill, barn, farm, armory, quarry, watchtower, archery_range, high_road.
- **Petites constructions** : campfire, fountain, well, tent, training_dummy, druid_grove.

Note du chef : le juge range druid_grove parmi les petites constructions tout en le disant « trop petit pour un lieu sacré ». À trancher avec Guillaume en FIN-ECH.
