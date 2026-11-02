# Porte de l'étape 2, boucle 2

01/11/2026. Même grille que la boucle 1. FLUX 3 Image, 4 variantes, 0,192 $.

## Ce qui change depuis la boucle 1

- Masques de `stage-1/loop-3` : la forêt recule avec l'île, la bordure est fixe.
- Aplats adoucis : chaque classe est floutée de 4 px, puis la plus forte gagne. Il n'y a plus de marches.
- Emprises en terre battue claire (`#8A6E4E`, « flat and smooth, no furrows, no crops, no planks »), désordre en herbe piétinée (« no rows, no stripes »), sous-bois en sol nu olive-brun (« no trees, no bushes »).
- v4 remplacée : touches moyennes, bords usés entre chemins et herbe (les ombres de nuages de la boucle 1 cassaient le masque).

## Mesures (`mesures.json`)

| | v1 | v2 | v3 | v4 |
| --- | --- | --- | --- | --- |
| Masque lisible | 0,76 | 0,78 | 0,62 | 0,67 |
| Chemins, rappel / précision | 0,83 / 0,83 | 0,63 / 0,68 | 0,78 / 0,71 | 0,66 / 0,74 |
| Encre | 0,7 % | 0,1 % | 0,5 % | 0,2 % |
| Dans la palette | 53 % | 70 % | 66 % | 76 % |
| Luminance centre / bord | 143 / 98 | 136 / 97 | 140 / 86 | 132 / 92 |

## Notes

| Ligne | v1 | v2 | v3 | v4 |
| --- | --- | --- | --- | --- |
| Suit le masque | 2 | 1 | 1 | 1 |
| Pas de trait sur le sol | 1 | 2 | 1 | 2 |
| Palette et lumière | 1 | 2 | 2 | 2 |
| Rien que du sol, zones justes | 1 | 0 | 0 | 0 |
| Pinceau et raccords | 2 | 1 | 1 | 1 |
| **Total** | **7** | **6 (un 0)** | **6 (un 0)** | **6 (un 0)** |

**La porte ne passe pas (meilleur 7/10, v1).**

- Corrigé : plus de marches (raccords à 2 sur v1), sous-bois nu, chemins bien tenus (0,83 / 0,83 sur v1), centre nettement plus clair que les bords.
- v2, v3 et v4 prennent un 0 sur les zones : l'anneau de désordre devient des rangées de culture, des emprises restent labourées, et v4 met des arbres dans le sous-bois.
- v1 garde quelques emprises labourées et des bandes d'herbe en rangées, et cerne la rivière et certains bords d'un trait fin. Sa palette tire au vert olive (53 %).

Les deux pires lignes pour la boucle 3 :
1. **Zones** : un rectangle iso de couleur unie se lit comme une parcelle, quoi que dise le prompt. L'anneau de désordre sort du sol peint (c'est la zone des accessoires de l'étape 4, peinte en pré), et les emprises deviennent des taches de terre arrondies (flou fort), plus des carrés.
2. **Trait** : le prompt interdit en toutes lettres les lignes dessinées au sol et le cerne de la rivière.
