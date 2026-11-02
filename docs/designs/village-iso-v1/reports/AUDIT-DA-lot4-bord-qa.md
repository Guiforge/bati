# AUDIT-DA-lot4-bord-qa : cadrages après le lot 4 (bord de l'île)

Statut proposé : prêt pour revue. Constats seulement, aucun jugement de DA. Auteur : qa.
Build `.perf` x86_64 du working tree (HEAD d877f194 plus modifs), INTEGRATION = true pour la build seulement, remise à false et relue (`constants/isoPoc.ts` ligne 29). `emulator-5554`, `bati://dev-iso?ambiance=<nuit|jour>&fige=1`, `install -r -d`. Écran 1080x2400, même cadrage que `AUDIT-DA-lot3-qa.md`. Pas de mesure de perf.

## Planches (`evidence/AUDIT-DA/apres-t3/`, colonnes : nuit t2, nuit t3, jour t2, jour t3 ; < 1 Mo chacune)
- `eau.jpg` : p12 et p6, cadre et zoom mini. `batiments.jpg` : p12 et p6, cadre et zoom 0,6. `palier1.jpg` : p1, cadre, mini, zoom 0,6.
- `statue-legendary.jpg` : `?animal=ours&stade=legendary`, p12, zoom 0,6 ; nuit à gauche, jour à droite.
- Les « avant » sont les colonnes « après » des planches `apres-t2/` (recadrées) : pas de brutes t2.

## Constats
- **Forme de l'île** : le contour est maintenant en lobes arrondis (nuages) avec falaise brune dessous, au lieu des échancrures en escalier de t2. À p12 cadre le contour reste proche d'un losange de lobes ; à p6 et p1 il est plus irrégulier. À p1 (cadre, z06) un arc fin translucide en forme de disque se dessine au-dessus de la partie nord de l'île, nuit et jour, plus large que les lobes.
- **Encoche p1** (bord droit, signalée au lot 3) : toujours là, un petit rectangle/arc détaché du contour à droite (visible p1 cadre et z06, nuit et jour).
- **Nuit** : l'eau et le fond passent du vert au bleu-vert sombre ; la forêt reste vert clair, plus saturée que le fond.
- **Jour** : le fond est plus sombre et grisé (vert-gris au lieu de beige), le dégradé du ciel/fond est visible à p12/p6 mini et cadre. L'île reste claire : l'écart île/sol est plus grand qu'en t2.
- **Ombres de contact** : à z06 (p12 et p6), une ombre sombre est posée sous les bâtiments (forge, moulin, fontaine, mur), nuit comme jour ; moins marquée sur le jour.
- **Palier 1** : le rocher bleu-gris est toujours collé sous le foyer, il touche la plateforme du feu (mêmes pixels qu'au lot 3).
- **Statue legendary (ours, p12, z06)** : la statue est dorée et translucide, posée juste à gauche du foyer. Elle touche la plateforme du feu : le bord droit de son socle chevauche le pilier gauche de la plateforme (nuit et jour). Le villageois rouge est derrière, au-dessus du socle.
- **Forêt** : au mini (p1, p6, p12), la forêt forme encore des bandes verticales d'arbres de même taille, avec des clairières ; pas de changement net par rapport à t2.

## Limites
Palier 6 et 12 seulement en détail au zoom 0,6 ; pas de passe « tous debout ». Captures brutes dans le scratchpad de session, non gardées. Scripts : `drive.sh`, `planches.py` (scratchpad).
