# Finition : un chantier par élément, chacun dans sa boucle

Guillaume, 31/10 (mot pour mot dans LOG.md) : il veut séparer le travail en boucles, une par chose, pour améliorer en parallèle et surtout se concentrer sur chaque point. « Mon objectif, c'est vraiment de confiner tous les détails pour que ça soit un bon niveau […] un niveau assez professionnel de jeux vidéo, on ne veut pas toutes les fonctionnalités […] on veut surtout que le rendu soit sympa ». Plaisir à regarder, sentir le village grandir, un peu organique.

## La boucle d'un chantier
1. **État des lieux.** La qa capture l'élément seul, en gros plan, aux paliers 1, 6 et 12, de jour et de nuit, et en film quand l'élément bouge. Une même passe de qa sert à plusieurs chantiers.
2. **Juge neuf.** Un regard neuf ne regarde que cet élément, avec ce critère : « est-ce au niveau d'un jeu vidéo pro, à côté des bâtiments peints ? ». Il rend une note sur 10, les défauts classés et le correctif le moins cher. Son rendu va dans `reviews/FIN-<id>-tour<N>.md`.
3. **Correctif.** Selon le chantier : ingénieur, artiste ou blender, puis une relecture neuve.
4. **Vérification.** La qa vérifie sur l'émulateur, puis le chef commite.
5. **Fin.** Le chantier est fini à 8/10 ou plus, ou après 4 tours. Le reste est alors écrit pour Guillaume.

Règles de cadence :
- 3 sous-agents au plus en même temps.
- Un seul agent sur l'émulateur à la fois.
- FLUX seulement par le garde, avec un plafond par chantier.
- Les règles dures ne bougent pas : 64 nœuds animés, rien au repos, mouvement réduit, cliquets de perf, rien ne recule.
- T43 (Mara et Théo) note l'ensemble entre deux vagues de chantiers.

## Les chantiers
| id | Chantier | Ce que Guillaume a vu (31/10) | Qui |
| --- | --- | --- | --- |
| FIN-BAT | **Bâtiments, un par un** : dessin, trois stades, animations propres (flammes, lumières, fumée, effets de métier) | observatoire « très bizarre » ; un bâtiment paraît géant ; mannequin mal formé | art-reviewer, artist, engineer |
| FIN-ECH | **Échelle et hiérarchie** : les monuments en gros, les petits bâtiments en petit ; la taille peut grandir avec le stade (Guillaume, 31/10) | « changer la taille des bâtiments en fonction de [leur importance] » | engineer (échelles), artist si besoin |
| FIN-ROU | **Routes** | après le tour 1 de l'audit, à rejuger | engineer |
| FIN-CAR | **Carte et fond** : forêt naturelle, plus de village qui flotte ; repeinture permise pour ne plus avoir d'île (Guillaume, 31/10), mer de droite reculée | « le village a l'air de flotter dans une mer un peu bizarre d'arbres » ; « apesanteur » | engineer, artist (tours 2 et 3 du fond) |
| FIN-DIS | **Disposition et remparts** : agencement, place, rues, un rempart qui entoure le village au lieu d'être un bâtiment à part | « pas de remparts », « un bâtiment à part » | engineer, blender |
| FIN-DEC | **Petit décor** : arbres, rochers, accessoires dispersés de façon naturelle | « pas du tout dispersé de façon naturelle » | engineer |
| FIN-VIL | **Villageois** : jamais figés, sauf ceux qui dorment avec des Z ; métier selon le bâtiment (T42) | « certains [villageois] sans bouger du tout » | engineer, artist (poses) |
| FIN-ANI | **Animaux et oiseaux** | « les oiseaux, ils sont absolument horribles » | artist, engineer |
| FIN-MAG | **Effets magiques** au niveau de finition des bâtiments ; piste d'animations peintes image par image pour les moments clés (révélation de stade) | « paraissent très grossiers par rapport à la finition des bâtiments » | researcher, artist, engineer |
| FIN-LUM | **Lumière et éclat** : rien ne brille plus fort que son rôle | « les drapeaux brillent très très fort comparés aux routes » | engineer, art-reviewer |
| FIN-BLE | **Ce qui vient de Blender sans peinture** : inventaire, puis peint ou retiré | « tout ce qui est fait avec Blender [et] pas dessiné se voit » | art-reviewer, artist |
| FIN-MAN | **Manipulation** : tap, caméra, zoom, bulle, montée de stade | à juger | qa, design-reviewer |
| FIN-SON | **Son** de chaque chose | « le son de chaque chose » | à cadrer avec Guillaume (écoute) |
| FIN-VOC | **Vocation** : à quoi ressemble le village d'un héros qui ne fait que courir, quand la plupart des bâtiments sont à l'arrêt | « si un individu fait que courir […] à quoi ça ressemble » | engineer (graine de démo), qa, design-reviewer |

## Ordre
1. **Vague 1**, sans émulateur pendant que la qa en cours finit : FIN-BAT (classement des 21 bâtiments sur planches), FIN-BLE (inventaire), FIN-MAG (recherche sur l'animation image par image : coût, perf, budget FLUX).
2. **Vague 2**, après la capture commune : FIN-CAR, FIN-DIS, FIN-VIL, FIN-LUM, FIN-ECH.
3. **Vague 3** : FIN-ANI, FIN-DEC, FIN-ROU, FIN-VOC, FIN-MAN.
4. **FIN-SON** : avec Guillaume.

## Suivi
| id | tours | note | état |
| --- | --- | --- | --- |
| FIN-BAT | 1 | classement fait (reviews/FIN-BAT-tour1.md) | en cours |
| FIN-ECH | 0 | hiérarchie proposée, taille par stade décidée | à faire |
| FIN-ROU | 1 | routes assombries, bornes au palier 1 | en cours |
| FIN-CAR | 1 | tour 1 en code fait, tours 2 et 3 peints à budgéter | en cours |
| FIN-DIS | 0 | | à faire |
| FIN-DEC | 1 | lisière en bosquets | en cours |
| FIN-VIL | 1 | opaques, métiers visibles, dos gris retirés | en cours |
| FIN-ANI | 1 | oiseaux coupés la nuit ; refonte à faire | en cours |
| FIN-MAG | 2 | lecteur de planche, effets encrés, révélation v2 | en cours |
| FIN-LUM | 1 | flaques de nuit ; drapeaux trop vifs à reprendre | en cours |
| FIN-BLE | 0 | | à faire |
| FIN-MAN | 0 | | à faire |
| FIN-SON | 0 | | à faire |
| FIN-VOC | 0 | | à faire |
