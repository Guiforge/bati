# T22-qa : routes et ruisseau texturés, sur émulateur

## Tour 3 (qa)
Statut proposé : passe (palier 1 dans l'onglet seulement)
- Le ruisseau se lit comme de l'eau sombre bleutée avec berge douce, sans tirets blancs ; reflets rares ; pont raccordé (`evidence/T22/t3-p1-ruisseau-crop.png`).
- Méandre : courbe douce, visible mais modeste à ce zoom.
- Routes inchangées (pavés, bords doux).
- Non vu : palier 12, zoom maxi, cascade, mémoire.

## Tour 1 (historique)

Statut proposé : bloqué (le ruisseau se lit comme une route goudronnée à ligne blanche, et va presque droit)
Auteur : qa
Tour de revue : 1

Même `.perf` que T23 (`evidence/T22/apk.sha256`, `INTEGRATION` allumé pour la build puis remis à `false`), cache d'images vidé. Captures dans `bati://dev-iso`, Carte seule, et dans l'onglet Village.

## Verdicts
1. **Routes : conformes.** Aux paliers 1, 6 et 12, en zoom mini et maxi (`06-p1-mini.jpg`, `06-p1-maxi.jpg`, `06-p6-mini.jpg`, `06-p6-maxi.jpg`, `06-p12-mini.jpg`, `02-p12-ensemble.jpg`, `05-p12-rues-maxi.jpg`), il n'y a ni trait d'encre de contour, ni petits traits. Les pavés, les pierres et les dalles de la place sont texturés et se fondent dans l'herbe, avec des largeurs qui varient. Aucune répétition visible à l'œil sur les longues rues. Les petits cailloux le long des bords sont des décors, pas des traits.
2. **Raccord des motifs à une frontière de tuile : rien vu.** Sur les 5 captures au zoom maxi, aucune rupture de texture le long d'une ligne droite. Je n'ai pas repéré les frontières de tuile exactes (aucune sonde ne les montre) : le verdict tient à l'absence de couture visible, pas à une frontière vérifiée. La seule coupe droite vue sur une rue est une ombre au sol (`07-flou-raccord-maxi.jpg`, en haut), dessinée par l'app.
3. **Flou au zoom maxi : oui, visible.** Les pavés et les dalles sont doux, nettement moins nets que l'encre des sprites voisins (`05-p12-rues-maxi.jpg`, `07-flou-raccord-maxi.jpg`). Ça se lit encore comme des pavés. Le passage au `.512` de l'art serait à juger par le chef.
4. **Ruisseau : non conforme (défaut principal).**
   - Il se lit comme une **route goudronnée** : bande gris ardoise, avec une suite régulière de **tirets blancs au milieu**, ce qui fait une ligne blanche de chaussée (`04-p12-ruisseau-maxi.jpg`, `08-ruisseau-tirets.jpg`). Les tirets sont les reflets posés sur `centreEau`. Une seule tache bleue rappelle l'eau.
   - Il **ne serpente presque pas** à l'œil : sur la vue d'ensemble du palier 12 et en zoom moyen, il suit le bord ouest de l'île en ligne quasi droite (`02-p12-ensemble.jpg`, `03-p12-ruisseau-moyen.jpg`). L'amplitude de 0,13 case ne se voit pas à ces zooms.
   - En revanche, **aucune couture** : pas de trait noir ni de ligne entre deux cases d'eau, et la berge est continue.
   - Le pont (2,10) est vu au bord de l'île : boîte encrée posée sur le ruban doux, avec le contraste de style annoncé par l'ingénieur. La cascade (2,19) n'a pas été cadrée.
5. **Mémoire (`dumpsys meminfo`, démarrage à froid, 25 s, puis 3 passes à 10 s) :**

   | Écran | TOTAL PSS (Ko) | Native Heap (Ko) | Views | Référence L6-T20 |
   |---|---|---|---|---|
   | Carte seule, palier 12 | 278 567 / 268 137 / 268 182 | 128 921 / 128 469 / 128 469 | 2082 | 251 441 Ko PSS, 117 044 Native |
   | Onglet Village, palier 1 du héros, cadrage par défaut | 272 898 / 272 064 / 272 216 | 136 357 / 136 161 / 136 257 | 1794 | 278 456 Ko PSS, 138 428 Native |

   - Carte seule palier 12 : **+17 Mo de PSS et +11 Mo de Native** par rapport à L6-T20. Rien ne mesure entre-temps : on ne peut pas séparer ce qui vient des textures de T22 de ce qui vient de T23 (40 % du cadre en plus de terre au zoom 0,3).
   - Onglet : au niveau de L6-T20, voire un peu en dessous.
   - Une première série dans l'onglet a donné 339 398 / 346 507 / 354 590 Ko (Native 179 580 à 185 300, en hausse d'une passe à l'autre). Mais la carte s'était posée zoomée au plus près, sur un coin, sans que je l'aie touchée. Ce n'est pas le même écran : écartée, et ses fichiers ont été écrasés par la série retenue. La cause de ce zoom n'est pas trouvée (voir T14, la vague de focus déplace la caméra).
   - `Graphics: 0` partout (émulateur `-gpu host`, sans valeur ; à lire sur le Fairphone avec `perf.sh`).
   - Palier 12 dans l'onglet : impossible ici, le héros de la `.perf` est au palier 1.

## Preuves
- `docs/designs/village-iso-v1/evidence/T22/` : `01` à `08` (captures et recadrages), `meminfo-carte-{1,2,3}.txt`, `meminfo-onglet-{1,2,3}.txt`, `mem-carte-preuve.jpg`, `mem-onglet-preuve.jpg` (capture prise avant chaque série de mesures), `apk.sha256`.
- Coût FLUX : 0.

## Douteux ou non fait
- Cascade (2,19) pas cadrée ; les reflets sur la berge ne sont pas jugés.
- Frontières de tuile non localisées (voir verdict 2).
- Pas de 3 passes `gfxinfo` : la carte ne demandait que la mémoire.

## Pour la suite
- Pour l'ingénieur ou l'art : (a) reflets du ruisseau, à faire moins réguliers, moins blancs et moins alignés sur l'axe, sinon ils restent une ligne de chaussée ; (b) une texture d'eau plus bleue ou plus sombre que le gris pierre ; (c) une amplitude du méandre visible au zoom de l'onglet.
- Mémoire : pour savoir ce que coûte T22, il faudrait une mesure de la Carte seule au palier 12 avec et sans `TEXTURES` (motifs vides) sur une même build.

## Tour 4
Statut proposé : passe
Build : celle de T28-qa Tour 2. Captures `evidence/T22/t4-p12-zmin.png`, `t4-p12-zmin-ruisseau.png`, `t4-p12-z06.png`, `t4-p12-z06-gauche.png`, `t4-cascade-crop.png`.
- Palier 12, zoom mini : le ruisseau fait un S net du bord gauche vers le haut de l'île, passe derrière la ferme et le moulin, berges douces, eau sombre bleutée à rares reflets courts. Il serpente, il ne va plus droit.
- Cascade : un barrage de pierre à l'origine, au bord gauche près du colisée. Deux fils d'eau fins coulent le long du mur, le bassin se raccorde au ruisseau. Lisible à 0,6 ; à zoom mini ce n'est plus qu'un petit cadre de bois et d'eau.
- Routes : pavés continus aux bords doux, raccordés d'un tronçon à l'autre à 0,6 comme à zoom mini, sans couture vue.
- À regarder : un rocher flou à droite du barrage (hors foyer), peut-être voulu (lisière).
