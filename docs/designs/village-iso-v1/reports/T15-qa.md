# T15-qa : essai jour sur armory, barn, watchtower

Build `.perf` du working tree (INTEGRATION allumé pour la build, remis à false), émulateur `bati-bench`. Pas de rapport d'ingénieur (reports/T15.md absent) : lu T15.md et app/dev-iso.tsx.

Captures (palier 12, `bati://dev-iso?ambiance=nuit|jour`, force-stop entre les deux) dans `evidence/T15/` :
- `{nuit,jour}-mini.png` : cadrage de départ (zoom mini, île entière).
- `{nuit,jour}-z06-barn-guet.png` : zoom 0,6 (bouton 0,6) puis deux glissements vers la gauche : arène/grange et tour de guet.
- `{nuit,jour}-z06-armory.png` : zoom 0,6 puis glissement vers le bas-droite : forge, rempart/armurerie.
- `planche-jour-nuit.png` (412 Ko) : ligne du haut nuit, ligne du bas jour, colonnes mini / barn+guet / armory.

Limites : à 0,6 les trois bâtiments ne tiennent pas dans l'écran (écart de 312 dp à 4,2 px/dp), d'où deux cadrages. Je n'ai pas de légende de l'emplacement exact de chaque sprite sur l'écran, je les ai repérés par leur position calculée. Pas de mesure de contraste 4,5:1 des étiquettes (aucune étiquette de jour visible sur cette scène) ni de test de canal (hors périmètre de cette tâche de capture).

## Constat (regard neuf, à juger par le chef)
Le jour ne se lit pas : sur la planche, la ligne jour est presque identique à la nuit. Ciel, forêt, eau et sol restent sombres et verts ; seuls un léger voile et un sol un peu plus clair au bord de l'île changent. Les sprites de la tour de guet et de l'armurerie sont à peine éclaircis, et l'arène/grange garde ses fenêtres allumées. Un joueur gratuit verrait de la nuit, pas une lumière de jour. Verdict qa : pas pass.

## Tour 2

Build `.perf` neuve du working tree (INTEGRATION à true pour la build, remis à false et relu : `constants/isoPoc.ts` ligne 29 `false`), installée sur `bati-bench`. Palier 12, `bati://dev-iso?ambiance=nuit` puis `?ambiance=jour` (force-stop entre les deux), zoom mini, puis zoom 0,6 en deux cadrages (arène/grange/guet ; forge/armurerie/rempart). Fichiers `evidence/T15/t2-{nuit,jour}-{mini,z06-barn-guet,z06-armory}.png` et `planche-jour-nuit-t2.png` (1,4 Mo ; haut nuit, bas jour ; colonnes mini / barn+guet / armory). `t2-{nuit,jour}-z06.png` : zoom 0,6 de départ.

- **Le jour se lit enfin comme du jour** : fond jaune-vert clair, ciel et forêt éclaircis, ombres portées nettes au sol, moulin aux ailes déployées, fenêtres encore allumées sur le moulin. Passe.
- **Les trois bâtiments calqués jurent** : armurerie, grange et tour de guet sont rendus en beige pâle presque fantôme (grange et guet quasi sans contour), alors que l'arène, le moulin, le rempart et la forge gardent leurs pierres sombres saturées. Sur le sol lavé ils ne vont avec rien : ni avec le sol, ni avec leurs voisins.
- Limites : pas de mesure de contraste ni de lecture des étiquettes ; cadrages obtenus à la main (glissements), non strictement identiques d'une ambiance à l'autre, à quelques dizaines de pixels.
- Verdict qa : jour pass ; bâtiments calqués, pas pass (à retravailler vers la palette des autres).

## Tour 3

Build `.perf` neuve (INTEGRATION true pour la build, remis à false et relu : `constants/isoPoc.ts` ligne 29). Palier 12, `?ambiance=nuit` puis `?ambiance=jour`, zoom mini et 0,6 ; planche `evidence/T15/planche-jour-nuit-t3.png` (1,3 Mo ; haut nuit mini / 0,6, bas jour mini / 0,6 / onglet Village de jour). Fichiers `t3-*.png`.

- **Calque sur les sprites : plus aucun.** Armurerie, grange, guet, forge et moulin gardent la même palette de jour ; lavis du sol et du monde cohérents (sol clair jaune-vert, ombres nettes), lumières de nuit éteintes (feu du puits, lanternes) ; seules restent les fenêtres allumées et le feu de la forge, cuits dans les sprites. Arbres de la forêt opaques le jour (mini et bas de carte) ; des arbres fantômes translucides bordent l'île, présents aussi de nuit.
- **Contraste de l'onglet de jour** (horloge de l'émulateur mise à 12:00, remise à 20:50 ; l'onglet suit l'heure, pas le paramètre) : texte « Hamlet · Level 2 · Novice » 13,0:1, « A bear watches… » 14,5:1, « 7-day focus » 7,0:1, tous au-dessus de 4,5:1 (pixel du texte le plus clair contre fond médian, dégradé sombre sous la carte).
- Limites : cadrages à 0,6 non strictement identiques entre ambiances ; un seul cadrage à 0,6 (centre), pas toute la carte à ce zoom ; contraste mesuré sur trois lignes, pas sur chaque étiquette. Verdict qa : pass.

## Tour 4 (planche nommée `-t4` : `-t3` existe déjà, je ne l'écrase pas)
Build `.perf` neuve (INTEGRATION true pour la build, remis à false et relu : ligne 29 `false`). Palier 12, `?fige=1&ambiance=nuit` puis `jour` (force-stop entre), zoom mini puis 0,6. Fichiers `evidence/T15/t4-{nuit,jour}-{mini,z06}.png` ; planche `planche-jour-nuit-t4.png` (haut nuit, bas jour ; colonnes mini / 0,6).
- Jour sur toute la carte, sans calque : fond jaune-vert clair partout, forêt, île et sprites sans voile ; ombres nettes ; feu du camp et lanternes éteints ; fenêtres encore allumées (cuites dans les sprites).
- Arbres de la forêt opaques le jour. Persistent des silhouettes grises translucides (arbres fantômes) au bord de l'île et autour, en mini ; présentes aussi de nuit. À corriger si « arbres opaques » vaut aussi pour eux.
- Limites : un seul cadrage à 0,6 (centre) ; pas de mesure de contraste ni de test du canal. Verdict qa : jour pass ; arbres de forêt pass, fantômes du bord de l'île non pass.
