# Résumé de la vague, chantier bâtiments, 03/11/2026

Les 21 bâtiments sont peints et intégrés, chacun derrière son drapeau : allumé en dev et en `.perf`, éteint en publié et sous jest. Je n'ai touché à aucun drapeau. Toutes les peintures finales sont en FLUX 3 Image. Le mouvement passe à la piste LIFE.

## Les 21 bâtiments

Direction : celle que tu as validée sur la page. La colonne « Meilleur gag » donne le dernier gag de chaque bâtiment, tel qu'il est peint.

| Bâtiment | Direction | Meilleur gag | Mythique reconnu au G-ID |
|---|---|---|---|
| campfire | 4 | Table basse à deux bols pleins, un chien dort dessous | 0/2 |
| tent | 4 | La toute petite tente, un gros chien endormi sur une couverture devant | 0/2 |
| training_dummy | 4 | Petite épée de bois et petit drapeau plantés dans le sable | 0/2 |
| wizard_tower | 4 | Deux balais de chaque côté d'un mât de fer court | 2/2 |
| druid_grove | 4 | Haute pile de pierres, un petit nid au sommet | 2/2 |
| high_road | 4, mythique sans description de stade, validé par toi | Une tortue dort sur une borne, un lièvre à ses pieds | 0/2 |
| archery_range | 4 | Une flèche au centre de la cible, fendue par une seconde | 1/2 |
| watchtower | 4 | Très large nid de cigogne sur un poteau, cigogne et deux grands petits | 2/2 |
| forge | 4 | L'épée droite, avec l'ancienne épée tordue gardée à côté | 2/2 |
| armory | 4 | Support de bois portant casque, plastron et gantelet levé | 0/2 |
| farm | 4 | Un grand taureau couché sur la paille, le joug sur son dos | 2/2 |
| barn | 4 | Un chat et son grand chaton au sommet des bottes, l'échelle n'arrive pas en haut | 0/2 |
| quarry | 4 | Le rocher sur le palier du haut, une couverture et une gourde vide posées dessus | 0/2 |
| castle_wall | 4 | Une chèvre couchée sur une haute pile de caisses, un ruban à la corne | 2/2 |
| well | 5, Le Balancier de glace | Dalle givrée, une bande nette au milieu, une roue à côté | 1/2 |
| fountain | 3, sans le tonneau géant | Les deux bottes de pierre vides, une plaque fendue appuyée dessus | 2/2 |
| dragon_lair | 4, 4 stades | Un bol d'eau sur une pierre et un râteau aux dents usées | 1/2 |
| heroes_hall | 4, 4 stades | Une table dressée, chaque tabouret vide | 2/2 |
| champion_arena | 7, 4 stades | Un énorme gantelet tordu sur une charrette, une cale sous la roue | 1/2 |
| windmill | 5, Le Moulin Gréé | Un sac recousu lesté d'une ancre, un chapeau au sommet d'une perche | 0/2 |
| observatory | 4 | Une petite chouette posée sur le gros capuchon de l'oculaire | 2/2 |

## Contrôles

| Contrôle | Résultat |
|---|---|
| Suite complète, Node 24, tip `4e9bb41f` | 556 suites et 7577 tests verts, 1 ignoré de chaque |
| Verrou des loupes | 83 fichiers conformes, relu aux dernières fusions et avant le push |
| Coin verrouillé | 0,000 % d'écart hors bâtiment, tolérance 8. Mesuré sur le `.perf` de 19h44, pas refait depuis |
| Tap | Environ 0,6 s en `.perf`, à 0,1 s près. La lenteur vue plus tôt vient du dev |
| G-ID | 39 justes, 21 incertains, 21 faux sur 81, sans canari. Indicatif : tu as validé ces images, rien n'a été repeint pour ça. Détail : [`g-id-vague.md`](g-id-vague.md) |
| APK `.perf` | 106 Mo en x86_64, environ 29 Mo d'assets en plus |
| Personnes, runes, gore | Mara a relevé 4 armures, une silhouette dans le givre et 2 taches lues comme du sang : 7 gags repeints |
| Détourage | 84 éléments sur 174 avaient plus de 5 % d'intérieur fantôme, 0 maintenant. Défaut de `final.py` corrigé |

## Dépenses
- **FLUX :** 100,03 $ sur 140 $ au registre, soit 45,89 $ depuis le début de la session 2. Ce chiffre lit le registre partagé : si LIFE y a déjà dépensé, sa part est dedans.
- **Sous-agents :** environ 155 passages sur 250, compte estimé à la main.

## Pour LIFE
- **Ancres :** dans `constants/buildings/<code>.ts`, champ `ancres`, relevées sur les peintures. Les éléments et les lueurs sont placés à la main sur la vraie peinture.
- **Lueurs :** halo doux et fixe (`LueurDouce` dans `BatimentMoteur.tsx`), sans animation. `souffleLueur` reste exporté pour toi.
- **Moment d'évolution :** provisoire, un carré brun puis des cercles plats. Le tap, la bulle et le passage de rang marchent.
- **Oiseau :** une tache bleu-noir sur le toit de la forge le jour, un contour blanc sans remplissage la nuit (vers x460, y1195 et sur `p12-nuit`). À identifier, ce n'est pas dans les peintures à ma connaissance.
- **FLUX :** j'ai acquitté l'alerte des 100 $. La prochaine tombe à 110 $. 0,80 $ sont réservés au registre, pas par moi, je n'y ai pas touché.
- **Émulateur :** `emulator-5554` et le port 8081 sont libres.

## Ce qui n'a pas été fait
- **Pas de nouveau build `.perf`** depuis `9a92296a`. Tout ce qui a suivi passe par Metro en dev : lueurs, détourages, repeintes. Aucun nouveau type d'asset.
- **Planches d'éléments refaites mais pas relues** après la reprise du détourage. Mesures et tests seulement. Reste à voir : bords doux sur les objets fins (watchtower gag_2, gag_3, gag_7, farm teaser_r9).
- **Repeintes vues en jeu sur 4 captures :** armurerie, puits, forge, tour du mage. Les quatre s'affichent, je n'ai pas fait relire les gags un par un en contexte.
- **Éléments manquants :** `teaser_r6` du moulin et `gag_1` du puits n'ont pas de fichier découpé, ces deux moments sont simplement absents.
