# Checkpoint de l'étape 0

Étape 0 finie. Il me faut tes 5 réponses avant le coin de beauté. Réponds par exemple : `1A 2A 3A 4 oui 5 oui`.

Pendant ton absence, seule la loupe S-night a avancé : elle ne coûte rien en FLUX et ne dépend d'aucune de ces réponses. Elle reste sur sa branche, `loupe-s-night`, jamais fusionnée sans ton accord. Son état est en bas de page.

## 1. Écran cible du palier 1

![p01](targets/p01-jour/choix.webp)

- **A (recommandé)** : clairière nette, piste de terre, meule et épouvantail.
- B : même idée, mais il reste un grand arbre dans le coin bas à droite (il sera retiré en jeu de toute façon).

## 2. Écran cible du palier 6

![p06](targets/p06-jour/choix.webp)

- **A (recommandé)** : hameaux, champs vivants, c'est le plus proche de ta liste.
- B : le plus riche en forêt, avec les quatre champs bien lisibles.
- C : hameaux seuls, plus calme.

Il reste des arbres de coin sur ces images. Ils partiront quand même (G03) : c'est une référence, pas ce qui sera livré.

## 3. Écran cible du palier 12

![p12](targets/p12-jour/choix.webp)

- **A (recommandé)** : faubourg le long de la route, ville au loin sur la terre ferme, sans ciel.
- B : plus d'abondance et plus de meules, mais une bande de ciel en haut, donc une caméra moins juste.

Il n'y a que deux choix ici : deux autres variantes sont écartées car des bâtiments avaient bougé (15 et 30 px). Sur les 3 écrans, tu peux aussi refuser en une ligne, pour une seule régénération (1 $ au plus).

## 4. Budget FLUX : à toi d'écrire la ligne

Dépensé : 36,45 $ sur 40 $, dont 2,03 $ cette session. **Reste : 3,55 $.** Le coin de beauté et R1 ont besoin de 10 à 20 $ de plus (estimation). La ligne n'est toujours pas dans `VALIDATIONS.md`, et je n'ai pas le droit de l'écrire.

- **Oui (recommandé)** : écris `2026-11-02 BUDGET_FLUX_V1: 60` sous `## Lignes` de `docs/designs/village-iso-v1/VALIDATIONS.md`.
- Non : je m'arrête aux sondes du coin de beauté, 3 $ au plus.

## 5. Routes peintes : je modifie la bible ?

La bible des abords dit « chemins et champs restent dessinés par le code ». Le prompt de phase 2 demande des routes et des champs peints (G04, G05, G06). Les deux ne tiennent pas ensemble, et le contrat du coin de beauté en dépend.

- **Oui (recommandé)** : route et champs deviennent peints et cuits dans le sol, et j'écris ta décision dans la bible.
- Non : ils restent en code, et G05, G06 et G04 se feront avec un meilleur dessin, sans peinture.

## À savoir, sans réponse demandée sauf si tu n'es pas d'accord

- **APK arm64 : 71,1 MiB**, déjà au-dessus de la limite de 55 MiB du prompt, avant toute loupe. `AGENTS.md` dit que tu as retiré ce budget le 18/10. Je continue donc à mesurer et à noter, sans bloquer. Dis-moi si la limite doit revenir.
- **H0, cache d'images** : pas de hash dans la clé de cache comme demandé, car `cacheKey` n'atteint pas les images embarquées (`res:`). À la place, l'empreinte des sprites vide le cache quand elle change. Les 3 tests passent.
- **Check vectoriel en pixels : abandonné.** Aucun k ne sépare le vectoriel du peint : le pré peint a 27 à 93 % de blocs plats, le rack et les fanions vectoriels 0 à 60 %. G05, G06 et G08 reposent donc sur le check de code et les juges.
- **Calibration** : env réussit (5 défauts sur 6, 2 bons sur 3 gardés), il sera juge 1. Mara échoue au premier test (1 bon sur 3 gardé), puis réussit le retest avec ses notes : 3 labels justes sur 3, mais une cause fausse sur la route et la porte. Je la garde pour le juge 2, l'A/B à l'aveugle, qui ne demande pas de cause. Les deux ont manqué le même défaut : des arbres collés, qui ne se voient pas sur un seul extrait. Le dump le couvre.
- **Baseline** : 21 prises dans `baseline/`, faites une seule fois.
- **Écrans cibles** : le premier tour était trop timide, j'en ai relancé deux avec un prompt plus strict, d'où 2,03 $ au lieu d'environ 2 $ prévus.

## Estimations de la suite

| Poste | FLUX | Passages de sous-agents |
| --- | --- | --- |
| Déjà utilisé | 2,03 $ | 6 sur 80 |
| S-night | 0 $ | 10 à 15 |
| Coin de beauté | 8 à 12 $ | 20 à 30 |
| R1 | 5 à 8 $ | 15 à 20 |

Je m'arrête à 64 passages (80 %), et chaque lot FLUX reste sous 10 $.

## État de S-night

En cours, voir `s-night/` et `state.json`.
