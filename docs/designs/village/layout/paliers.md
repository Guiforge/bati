# Paliers : le village grandit vers l'extérieur (L7)

Les positions ne changent jamais d'un palier à l'autre, seul ce qui se révèle change. `python3 scripts/layout/paliers.py` écrit `paliers` et `etapes` dans `constants/isoLayout.json` et peut être relancé (`--plan` n'écrit rien). Règle : un plot et 2 cases de sol autour, son chemin jusqu'au feu et 1 case autour, au palier du bâtiment ; ensuite le sol entre et autour (palier du voisin plus un), la campagne aux paliers 10 à 12 ; enfin un passage minimax depuis le feu, donc l'île est d'un seul tenant à chaque palier et ne recule jamais. Un plot n'entre jamais avant son palier. `etapes` est le même tableau : le palier où commencent les stades du bâtiment (`stadeDemo`).

| Palier | Bâtiments qui apparaissent | Ce qui s'ouvre | Cases (île) | Zoom |
|---|---|---|---|---|
| 1 | feu, tente, mannequin, salle des héros (stade brut, l'appentis), puits | le camp, sentiers étroits, la place | 141 | cadrage serré sur salle et place |
| 2 | forge, tir à l'arc, fontaine | la place s'élargit, chemin de la forge | ~200 | idem |
| 3 | ferme, armurerie, carrière | berge ouest et la ferme, carrière au bord de la rivière | 269 | cadrage du bâti |
| 4 | moulin, tour du sorcier | le moulin sur l'autre rive, la tour à l'est | ~330 | idem |
| 5 | grange, bosquet | le nord de l'autre rive | ~400 | idem |
| 6 | porte et rempart, tour de guet | le mur (palissade) ferme le sud et l'ouest | 484 | idem |
| 7 | observatoire, champs | l'ouest lointain, les champs du sud | ~520 | idem |
| 8 | route haute, antre du dragon | l'est et le nord-est | ~550 | idem |
| 9 | arène | le sud-ouest | 575 | idem |
| 10 à 12 | aucun nouveau bâtiment | la campagne autour, la lisière | 672 au 12 | idem |

Zoom : aucune borne n'a été éditée. Le cadrage d'ouverture (`cadrage`, `cadrageSerre`) et le plancher de zoom (cadrage entier de l'île) se calculent sur `visible` de chaque palier, donc ils suivent la nouvelle île ; vérifié sur les rendus 1, 3, 6, 9, 12 (`img/prop-t*-jour.jpg`).

## Les deux conflits, à décider par Guillaume

**(a) Maisons au palier 1.** L'amendement veut « un hameau avec sa place, son feu et quelques maisons » au palier 1, la règle 3 de `target.md` veut un palier 1 presque nu, « ni cabane, ni maison ». Le palier 1 construit ici n'a **pas de maison** : feu, tente, puits, la salle des héros en appentis, le mannequin, caisses et sacs, des sentiers étroits. Il se lit comme un campement dispersé, pas comme un hameau. Les maisons sont du travail de GROWTH.

**(b) Le départ est étiré.** Sur son plan, la tente est en [5, 8] et le mannequin en [7, 1], loin du feu en [12, 11] : au palier 1 le mannequin est seul en haut à droite, la tente à gauche (`img/prop-t1-jour.jpg`, 141 cases). Alternative mesurée pour un départ serré : tente en [8, 11] et mannequin en [13, 9] (leurs places d'avant), rendu `img/prop-t1-serre.jpg`. Elle coûte au palier 12, jour, tous stades hauts : **3 bâtiments sur 21 sous 85 %** (mannequin 28,3 %, tente 70,8 %, rempart 82,2 %) contre 1 sur 21 avec le plan (carrière 83,2 %). Une position vaut pour tous les paliers. Le plan de Guillaume reste le défaut.

## Mesures

Porte d'occlusion, jour, tous bâtiments debout comme l'atelier les montre à chaque palier :

| Palier | Bâtiments montrés | Sous 85 % | Pire |
|---|---|---|---|
| 1 | 6 | 0 | mannequin 100 % |
| 3 | 12 | 1 | carrière 82,1 % (mannequin) |
| 6 | 17 | 1 | carrière 83,2 % |
| 9 | 21 | 1 | carrière 83,2 % |
| 12 | 21 | 1 | carrière 83,2 % |

Décalage d'une case de la carrière ou du mannequin (palier 12, mesuré, non appliqué) : mannequin en [7, 0] donne carrière 94,8 % et aucun bâtiment sous 85 % ; mannequin en [8, 2] donne 94,0 % ; mannequin en [8, 1] aussi aucun sous 85 % ; mannequin en [6, 1] donne 53,3 % et carrière en [3, -1] ou [4, 0] donnent 72,4 % et 53,1 %. Le meilleur : le mannequin une case au nord, [7, 0].

Plans vus de dessus par bande : `img/prop-plan-t1-3.jpg`, `-t4-6`, `-t7-9`, `-t10-12` (`python3 scripts/layout/plan.py bands img/prop-plan`).
