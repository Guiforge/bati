# Plan de disposition du village (FIN-DIS)

Mara, 01/11. Plan sur papier, à valider par Guillaume avant tout code.

## Diagnostic
1. Pas de point focal : la salle des héros est en (15,2), au bord droit, derrière la carrière.
2. Une grille posée : 21 dalles à pas régulier, rangée 10 et colonne 10 droites (la croix interdite par la bible §7).
3. Pas de quartiers : arène, antre et salle aux coins, petites maisons entre elles.
4. Une place qui n'en est pas une : 4 cases autour du feu ; puits et fontaine ailleurs.
5. Un rempart isolé : un pan 1x3 à l'est, sans rien à protéger.

## Le plan
`.` herbe, `#` chemin, `+` place pavée, `~` eau, `=` pont, `w` cascade, `m` pan de rempart, `t` arbre, `r` rochers, `c` champ ou potager. Lettres : voir la table.
```
    gx 0123456789012345678 9
gy 0   t.~............LLL..
gy 1   .t~....VV..Z.r.LLL..
gy 2   ..~....VV..#...LLL..
gy 3   t.~.GG###QQ#BB####..
gy 4   ..~.GG#.#QQ#BB#..m..
gy 5   .t~.GG#.#######..m..
gy 6   ..~...#....#.XX..W#.
gy 7   t.~.EE#.HHH#.XX..m#.
gy 8   .t~.EE#.HHH#.##RRm#.
gy 9   ..~.EE#.HHH#.D#RRK#.
gy10   ##=#####++++++###K##
gy11   ..~...#.TT++F+AA#K#Y
gy12   t.~.MM#.TT++++AA#m#Y
gy13   .t~.MM###+OO+#AA#m##
gy14   ..~.cc#P#+OO#...#m..
gy15   t.~##############m..
gy16   cc~mmmmmmmmm#mmmmm..
gy17   cc~ccCCC#####ccc..t.
gy18   .c~ccCCC#ccc#cccr...
gy19   t.w.cCCC#.t.#.t...t.
```

| code | lettre | [gx,gy] | emprise | palier cible | arrivée attendue |
|---|---|---|---|---|---|
| campfire | F | [11,11] | 1x1 | 1 | P1 |
| tent | T | [8,11] | 2x2 | 1 | P1 |
| training_dummy | D | [13,9] | 1x1 | 1 | P1 |
| heroes_hall | H | [8,7] | 3x3 | 1 (socle vide d'abord) | route finie |
| farm | E | [4,7] | 2x3 | 2 | P1-P2 |
| forge | X | [13,6] | 2x2 | 2 | P1-P2 |
| archery_range | A | [14,11] | 2x3 | 2 | P1-P2 |
| well | P | [7,14] | 1x1 | 2 | P1-P2 |
| quarry | Q | [9,3] | 2x2 | 3 | P1-P3 |
| windmill | M | [4,12] | 2x2 | 3 | P1-P3 |
| wizard_tower | Z | [11,1] | 1x1 | 4 | optionnel |
| druid_grove | B | [12,3] | 2x2 | 4 | optionnel |
| fountain | O | [10,13] | 2x2 | 3 | P4-P6 |
| armory | R | [15,8] | 2x2 | 5 | P4-P7 |
| barn | G | [4,3] | 2x3 | 5 | P4-P7 |
| castle_wall | K + m | [17,9] + 21 pans | 1x3 + pans | 6 | P4-P7 |
| watchtower | W | [17,6] | 1x1 | 6 | P4-P7 |
| observatory | V | [7,1] | 2x2 | 6 | P4-P7 |
| high_road | Y | [19,11] | 1x2 | 8 | 1re lieue |
| champion_arena | C | [5,17] | 3x3 | 9 | P5-P9 |
| dragon_lair | L | [15,0] | 3x3 | 8 | 1er boss |

## Règles
- **Cœur** : la salle des héros en tête de place, sa face éclairée sur la place, le feu sur son axe. Tente, mannequin, fontaine et puits autour. Socle de la salle visible dès le palier 1 (parvis et bannières en code).
- **Quartiers** : fermier en haut à gauche le long de la rivière (ferme, moulin, grange, puits, potagers, champs hors les murs) ; militaire à droite côté grand-route (mannequin, armurerie, tir à l'arc, porte, tour de guet) ; artisans (forge à l'angle de la place, carrière derrière la salle) ; mystique à la lisière du fond, hors les murs.
- **Monuments en périphérie, visibles** : arène hors les murs devant, antre dans les rochers du fond, poteau de grand-route sur la route.
- **Chemins** : quatre entrées vers la place (grand-route par la porte est, pont à l'ouest, porte sud, lisière au nord), un chemin de ronde, deux ruelles. Courbés au rendu, jamais plus de 4 cases droites.
- **Rempart** : castle_wall reste un seul bâtiment. K est la porterie sur la grand-route ; 21 pans lui appartiennent (nouvelle liste `rempart`), dessinés à son stade (palissade puis pierre), un tap sur un pan ouvre castle_wall. Il ferme l'est et le sud ; la rivière ferme l'ouest, la forêt et les rochers le fond. Une enceinte sur 4 faces demande une grille 22x22.

## Croissance
Palier d'une case = min(métrique, cible du terrain, de son ombre ou de son accès), puis sans trou. L'île pousse en lobes le long des quartiers ; rien ne recule.

| palier | ce qui s'ajoute |
|---|---|
| 1 | feu, tente, mannequin, socle de la salle |
| 2 | ferme, forge, tir à l'arc, puits |
| 3 | carrière, moulin |
| 4 | tour du mage et bosquet selon la pratique ; terrain de la fontaine |
| 5 | fontaine, armurerie, grange ; milieu du front sud |
| 6 | porterie, tour de guet, observatoire ; pans est (le bourg est ceint) |
| 7 | coins ouest du mur, champs |
| 8 | grand-route, antre ; coins est du mur |
| 9 | arène |
| 10-12 | campagne (champs, haies, lisière, routes qui sortent) |

## Contraintes
- Respectées (calcul en boîtes) : écart des ombres en +gx et -gy, pas de chevauchement, rivière inchangée, un chemin au bord +gx ou +gy de chaque bâtiment, sorties de route.
- Trois exceptions à écrire dans `iso-layout.test.ts` : la case porte de K est un chemin sous une emprise ; castle_wall reçoit les ombres des bâtiments bas ; ombres castle_wall et watchtower ignorées entre elles.
- Risques : ailes du moulin contre la tente (repli : moulin en [3,12]) ; cible du tir à l'arc devant le feu ; arbres et rochers de bordure à reposer.
- À régénérer : isoLayout.json (sol, paliers, batiments, rempart), lieux, isoLayout.ts, ordre de dessin, vérité du tap, itinéraires, cadrage, captures.

## Coût et gain
Lot L : grille et paliers (M), pans dans le moteur et les tests (M), blockouts Blender des pans (M), captures (S). Peinture : 4 pièces de pan x 2 stades = 8 sprites, environ 3 $. Gain estimé par Mara : environ +0,8 pondéré (style +1, fierté +1, personnel +0,5, fun +0,3).
