# Porte de l'étape 1, boucle 1

01/11/2026. Le pipeline ne donne pas de grille chiffrée pour l'étape 1 ; celle-ci reprend sa ligne (« zones tirées des vraies données du village, à l'angle iso du jeu, masques early/mid/late qui ne font qu'ajouter ») et la liste de zones de Guillaume. Seuil : aucun 0, total ≥ 8/10.

## Comment c'est fait

1. `dump_monde.mjs` lit le code de l'app tel quel (commit 891f6da2) : `isoLayout`, `etatCarte`, `champsDe`, `ARETES`, `SENTIERS`, `SORTIES`, `PLACE`, `chaineEau`, `cadrage`, `etendue`. `stub_rn.mjs` le construit avec bun en remplaçant React Native, Expo et la base par un objet vide. Sortie : `monde.json` (ici).
2. `masques.py` dessine en **coordonnées du monde** : 1 px = 1 dp de carte au zoom 1, origine (−348, −836) dp, 1656 × 2152 px, de quoi couvrir tout ce que la caméra peut montrer au palier 12 (`etendue` au zoom plancher). Le cadrage n'entre que dans les calques sur capture : un nouveau cadrage (lot B1) ne touche pas les masques, il suffit de relancer les calques.
3. Paliers montrés : début = 1, milieu = 6, fin = 12 (les trois captures). Le script sait faire les 12 ; le contrôle d'ajout seul les passe tous.

## Fichiers

| Fichier | Contenu |
| --- | --- |
| `masque_palier1.png`, `masque_palier6.png`, `masque_palier12.png` | masques à classes (palette indexée, `legende.png`) |
| `densite.png` | blanc : centre calme et clair ; noir : bords chargés et sombres |
| `calque_palier1.webp`, `calque_palier6.webp`, `calque_palier12.webp` | masques posés sur `iter-01-captures-b/palier-N-jour.png`, aire de la carte seule (lignes 1124 à 2336) |
| `mesures.json` | alignement, ajout seul, groupes de forêt, bordure |

## Zones et règles

| Zone | D'où | Règle |
| --- | --- | --- |
| Bâtiments | `emplacements` des bâtiments debout (`etatCarte(palier, false)`) | emprise au sol |
| Rivière | cases `eau` et `cascade` de `isoLayout.json`, visibles | |
| Chemins | rues (`ARETES`) dont les deux bouts sont visibles, sentiers des bâtiments debout, sorties de route, pont | |
| Place | `PLACE` (rues.ts), autour du feu de camp | |
| Champs | blocs de `champsDe` **hors de l'île finie** | un champ posé sur un futur terrain disparaîtrait : écarté |
| Désordre (accessoires) | anneau d'une case autour de chaque bâtiment, sur l'herbe | jamais à moins de 3 cases du feu (place calme), jamais sur un chemin, une eau ou un bâtiment du palier 12 |
| Forêt | entre 80 dp (`CLAIRIERE` de monde.ts) et 380 dp du losange de l'île finie, hors champs | clairières pour la rivière, les deux routes et 6 trouées qui serpentent ; éclats de moins de 26 cases retirés |
| Bordure | au-delà de 380 dp, plus une bande de 72 dp contre le bord du monde | fixe |
| Calme et chargé | distance au feu de camp (60 %) et au losange de l'île (40 %) | |

## Mesures

- **Alignement** : on cherche le meilleur décalage (±12 px, pas de 3) et la meilleure échelle (0,97, 1, 1,03) en mesurant la verdeur (g − (r + b) / 2) sous les chemins et la place, qui sont le sol plat. Résultat sur les 3 captures : **décalage (0, 0) px, échelle 1,00**. Verdeur sous les chemins contre l'anneau d'herbe de 12 px autour : 4,0 contre 11,0 (palier 1), 1,8 contre 6,7 (6), 1,6 contre 6,4 (12). À l'œil, les chemins beige et pavés tombent dans les contours, les emprises sous les socles.
- **Ajout seul**, du palier 1 au palier 12 (un bâtiment qui pousse sur le sol compte comme ajout) : 60 px perdus en tout, soit un dixième de case. Ce sont des bords : chemin contre eau au pont (32 px), champ contre désordre (24), champ contre eau (4).
- **Forêt** : 6 masses (255 k, 244 k, 92 k, 50 k, 43 k, 17 k px).
- **Bordure fermée** : oui. Depuis le feu de camp, on n'atteint jamais le bord du monde sans la traverser.

## Notes

| Ligne | Note | Pourquoi |
| --- | --- | --- |
| Vraies données, angle exact du jeu | 2 | Tout vient du code de l'app ; décalage mesuré 0 px, échelle 1,00 sur les 3 captures. |
| Les masques ne font qu'ajouter | 2 | 60 px de bord perdus sur 11 montées, un dixième de case. Champs et désordre placés là où le palier 12 ne les mangera pas. |
| Toutes les zones demandées | 2 | Bâtiments, rivière, chemins, champs, place, forêt, bordure, désordre, calme et chargé. |
| Forêt en 5 à 8 masses, bordure qui ferme | 1 | 6 masses et une bordure fermée, mais deux masses font 70 % de la forêt et une trouée finit en sucette (en haut à droite). |
| Lisible pour la suite (étapes 2 à 5) | 1 | Monde fixe, légende, script qui rejoue. Mais aux paliers 1 à 6, le cadrage ne montre ni forêt ni bordure (voir la question plus bas). |

**Total 8/10, aucun 0 : la porte passe.**

## Ce que les masques disent du jeu actuel (pour Guillaume)

- **Les champs actuels ne font pas qu'ajouter.** `champsDe` pose des champs sur des terrains futurs : 18 au palier 1, 17 au 6, 11 au 12. Sept champs disparaissent quand l'île grandit. Les masques n'en gardent que ceux qui sont hors de l'île finie.
- **La forêt actuelle recule.** `monde.ts` élargit la clairière avec l'île (`clairiere`, de 28 à 80 dp). Les masques posent la forêt une fois, à la distance du palier 12 : rien ne recule.
- **Conséquence aux premiers paliers** : la caméra cadre serré sur un petit village, donc l'écran ne montre que du pré, des champs et du désordre, sans forêt ni bordure. La carte ne « s'arrête » pas à l'écran, mais elle paraît vide.
