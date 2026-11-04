# Atelier : une question pour Guillaume

## Q1. Skia dans l'appli, ou pas ?

**Le constat.** Le prompt v4 suppose une scène dessinée avec Skia. Elle ne l'est pas : `@shopify/react-native-skia` n'est ni dans `package.json`, ni dans le lockfile, ni dans une seule ligne de code. La carte est faite de vues `expo-image`, `react-native-svg` et Reanimated (772 images et 204 SVG montés au palier 12, compte du navigateur). Le découpage demandé (`buildDrawList`, `motionAt`, `paint` partagés par l'appli et l'atelier) veut donc dire : ajouter un module natif et réécrire tout le rendu du village. Une dépendance neuve est à toi de décider, donc je ne l'ai pas fait.

**Ce que j'ai fait à la place, et qui marche déjà.** L'atelier ouvre la vraie route `dev-iso` dans un navigateur sans écran. Ce sont les composants de l'appli, pas une copie : aucune dépendance neuve, aucun fichier du village touché. Un état en 3 s, les 12 paliers en 44 s, sans émulateur ni Metro.

Écart moyen avec l'émulateur, au pixel, barres coupées (cible du prompt : 2 %) :

| État | Écart | Réduit à 1/8 |
|---|---|---|
| Palier 6, nuit | **1,47 %** | 0,44 % |
| Palier 1, jour | 2,67 % | 1,92 % |
| Palier 12, jour | 3,36 % | 1,39 % |

Le jour ne passe donc pas la barre des 2 %. Ce qui reste : le détail fin, décodé à une autre taille sur Android, et une bande douce du voile des alentours (au plus 7 niveaux sur 255), dont je n'ai pas trouvé la cause. Voir `img/calibration-*.jpg`, appli à gauche, atelier à droite.

**Le choix :**

| | A. Atelier navigateur, on garde les vues (recommandé) | B. Skia dans l'appli (prompt v4) | C. Liste de dessin sans Skia |
|---|---|---|---|
| Dépendance | Aucune | Module natif, binaires précompilés (224 Mo sur disque) | `canvaskit-wasm` en dev |
| F-Droid | Rien ne change | **Risque non levé** : f-droid.org refuse les binaires précompilés, il faudrait compiler Skia dans sa recette. Aucune appli F-Droid avec Skia trouvée | Rien ne change |
| Taille de l'APK | Rien ne change | +41 Mo annoncés par la doc de Skia (toutes ABI, non mesuré ici) | Rien ne change |
| Travail | Fait | Réécrire le rendu du village (coeur de 2 400 lignes, plus Tuile, Alentours, Marcheur, etc.), puis repasser toute l'intégration | Sortir le calcul des composants, et écrire un second moteur de dessin |
| L'atelier montre l'appli ? | Oui par construction, mêmes composants ; moteur différent (navigateur contre Android) | Oui, même `paint` | Seulement tant que deux moteurs restent d'accord |
| Performance | Inchangée : PERF travaille sur les vues | Sans doute le vrai gain (une image plutôt que 772), **non mesuré** | Inchangée |

**Ma recommandation : A.** L'objectif de cette piste est de voir le village sans émulateur et d'y croire : c'est atteint sans risquer F-Droid ni réécrire ce qui marche. Si PERF montre plus tard que les vues ne tiennent pas sur un téléphone moyen, Skia redevient une question, avec un chiffre pour la trancher.

**Ce que A change au prompt** (section 6 et appendices) : plus de `buildDrawList`, `motionAt`, `paint` ni de garde de code. LIFE et VILLAGERS modifient les composants et leurs données, comme aujourd'hui. Les pistes voient le résultat par `render`, `strip`, `sheet`, `clip` et `check`. Pour LIFE, le « motion core » devient les fonctions pures déjà là (`horloge.ts`, `marcheurs.ts`). La règle « aucune horloge, aucun hasard » tient déjà : il n'y a aucun `Math.random` dans le dessin, et l'atelier fixe l'heure.

**Ce qui n'attend pas ta réponse :** DIRECTION peut partir, elle n'a besoin que de `render` et `strip`.

Écris sous le titre ci-dessous : A, B ou C.

## Réponse de Guillaume

A (donnée dans la conversation le 04/11 : « we follow you reco »).
