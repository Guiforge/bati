# Piste surroundings : bilan de la session

Coin de beauté **verrouillé par décision de Guillaume** le 02/11, avec env encore à NOTES sur les critères 2 et 3. Fusionné en avance rapide sur `feat/village-iso`, rien n'est poussé. R1 à R7 restent à faire : R1 part dans une nouvelle session, avec son propre budget. Sa liste obligatoire est dans [loupes/r1/contrat-entree.md](loupes/r1/contrat-entree.md).

Avant, maintenant, écran A : [loupes/bc/avant-apres.webp](loupes/bc/avant-apres.webp). Autres paliers : [loupes/bc/paliers.webp](loupes/bc/paliers.webp).

## État des défauts

| Défaut | État | Preuve |
| --- | --- | --- |
| G16 cache d'images | **Passe** | `__tests__/iso-cache-images.test.ts`. |
| G03 arbres fixes | **Passe** | 0 `screenFixed` et 0 `plan_` dans les 7 captures, critère 1 d'env. |
| G05, G06 route | **Passe sur le coin**, à l'image | Critères 6 et 7. Env n'a pas vu le test jest lui-même, ni le 2x. Bout de route juste avant la porte à reprendre. |
| G07 châtelet | **Passe sur le coin** | Critère 7 d'env, sans jour visible. Porte et route non alignées, voir plus bas. |
| G04 champs | **Passe sur le coin** | Critère 5 d'env, clôtures droites admises. Plus aucun champ calculé. |
| G01 sol | **Passe sur le coin seulement** | Critère 11 sur `route` et `coin-bas`. Le nord et le palier 3 restent à faire. |
| G02 forêt | **Exception**, obligatoire dans R1 | Critères 2 et 3 en échec selon env : jumeaux aux paliers 3 et 4, racine nue au palier 6. |
| Règle 5, ombres froides | **Exception**, obligatoire dans R1 | Un décalage de teinte bleuit l'encre de l'herbe. |
| G15 nuit | **Échoue, parqué** | Branche `loupe-s-night`, non fusionnée. Critère 1 à 0,9849 pour 0,987 sur p12. |
| G14, G19 | À faire | R5 et R6. |
| G17 flamme sur une cabane | Non tranché | R7. |
| G18 créatures sans images dessinées | Non vérifié | R7. |

G08 à G13 appartiennent aux autres pistes.

## A/B à l'aveugle contre la baseline

| Capture | Juges | Gagnés sur 8 | Perdus |
| --- | --- | --- | --- |
| `captures-4` | mara, mara | 6 | lisière, pieds |
| `captures-6` | mara, mara | 5 | lisière, feu, villageois |
| **`captures-7`, verrouillée** | mara, theo | **7** | pieds |

Canari valide à chaque passage. À lire avec prudence :
- **Du bruit :** feu et villageois sont passés de gagné à perdu sans changer d'un pixel entre `captures-4` et `captures-6`. Mara et theo trouvent ces paires serrées à ce dernier passage aussi.
- **Juges différents :** le dernier passage croise mara et theo, pas deux mara.
- **Peu aveugle :** sur les extraits les plus changés, les juges disent que l'écart saute aux yeux.

Extraits KEEP : 14,4 % et 14,0 % d'écart avec la baseline, car aucun n'était verrouillé et les villageois bougent selon la date. Ils passent par décision de Guillaume. Ils sont verrouillés maintenant, pour la règle 10.1.

## Jest

Node 24, état final : 7233 tests sur 7236 en suite complète, 2 échecs par délai dans `iso-dev-screen` et `iso-perf-compteur`, verts seuls avec 120 s (39 sur 39). Preuve acceptée **pour cette fois** par Guillaume. La suite n'a passé d'un seul coup que deux tours de code plus tôt (520 suites sur 520). Non relancée après le reformatage des hooks au commit. À partir de R1, plus d'exception.

Seuils de test abaissés au tour 6 : masses de la boîte nord de 8 à 6, répétitions en miroir de 1 à 2, images de `iso-dev-screen` de plus de 40 à plus de 38 pour les deux rochers retirés. Env juge les deux premiers justifiés.

## Avis de l'intégration finale, sur images fixes

- **Mara** : composition 7,5, cohésion 6,5, lisibilité 7,5. « Très gros progrès. On ne voit plus un prototype », mais deux mondes : un sud peint et un nord resté plat.
- **Theo** : style 7, fun 5,5, fierté 6,5, personnel 3 (peu sûr, aucune vocation sur ces captures). Le village se lit, le feu de nuit donne un frisson, les remparts sont le meilleur moment.

Les deux notent la même chose : le palier 3 fait vieux et le saut vers le palier 4 est trop sec, le hameau du sud ne bouge plus du palier 4 au palier 12, et il reste éteint la nuit. C'est la prospérité que Guillaume a demandée.

Personne n'a jugé le mouvement, la montée de stade, le déplacement de caméra ni un vrai téléphone.

## S-night, parquée

4 tours. Env : le sol va mieux, mais forêt monochrome, blé gris, pavés qui brillent. A/B peu probant.

## Consommation

- **FLUX** : 10,43 $ cette session sur 20 $, dont 8,40 $ pour le coin sur 12 $. Registre : 44,84 $ sur 60 $, reste 15,16 $.
- **Sous-agents** : environ 65 passages sur 80, un de plus que l'arrêt à 64, accepté par Guillaume. Ce compte est tenu à la main.
- **Non mesuré** : fluidité sur appareil, écartée pour l'instant. Dette dans `perf-debt.md`, dont les ombres en images et le sous-bois.

## Questions parquées

- S-night : reprendre avec un contrat refait, ou la laisser ?
- Sous-bois : `sousbois_2` n'est plus tiré mais reste dans le tableau et les assets.

## Les 3 décisions à prendre

1. **Le budget de R1.** Avec la prospérité et le nord à peindre, R1 grossit par rapport aux 5 à 8 $ prévus. Il reste 15,16 $ au registre.
2. **La route et la porte.** Mara et theo notent qu'à partir du palier 7, la route arrive à une brèche du rempart, et la grande porte ne mène à rien. Déplacer l'entrée, ou tirer une branche vers la porte ? C'était prévu en R2.
3. **Le cadre de fin de partie.** À 12 paliers, l'arène sort de 48 px à gauche et la montagne de 84 px à droite. Faire reculer la caméra aux hauts paliers, ou rapprocher ces pièces du centre ?
