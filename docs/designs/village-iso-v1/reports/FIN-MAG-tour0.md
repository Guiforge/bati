# FIN-MAG tour 0 : lecteur de planche, effets Svg moins grossiers, ancrages

Statut proposé : prêt pour revue
Auteur : engineer
Tour de revue : 1

## Fait
- `components/village/iso/planche.ts` (nouveau) : fonctions pures. `PLANCHE_ECLAT` (4 x 2 dessins, 12 images/s, 8 dessins tenus : `[0,0,1,2,2,3,4,5,5,6,7,7]`, 1 s), `dessinA(t, p)` (-1 hors du clip : rien au repos), `decalage(d, p, w, h)`, `dureePlanche`, et le drapeau `EFFET_PLANCHE = false` (le Svg reste le chemin par défaut).
- `components/village/iso/PlancheJeu.tsx` (nouveau) : une `View` qui coupe, une `Image` expo-image de la taille de la planche, un seul `useAnimatedStyle` qui ne porte que `transform` (translateX/Y). Le temps est `t` (valeur partagée du propriétaire, ici celle de la révélation) ou, sans `t`, l'horloge ambiante (`HorlogeContext`) modulo `boucle`. Mouvement réduit et mode figé : aucun nœud animé, une image fixe (`planche.fixe`). Une seule taille de layout (celle de la planche).
- `Revelation.tsx` : `EclatRevelation` prend `planche` (défaut = le drapeau). Allumé : `PlancheJeu` remplace le Svg et le nœud animé de l'éclat (1 nœud avant, 1 après ; la montée et le fondu sont peints dans les dessins, pas d'opacité sur une vue).
- `components/village/iso/planches/eclat-factice.png` + `scripts/iso/planche_factice.py` : planche factice 512 x 432 (8 dessins de 128 x 216, 36 Ko), étoiles à quatre pointes encrées, couleurs lues dans `rawColors.ts`. Sans prétention artistique.
- Svg moins grossiers : `Effets.tsx` (plus aucun cercle nu : `Grain` = forme irrégulière à contour d'encre `isoInk`, 6 formes en `FORMES_GRAIN` dans `effets.ts` : rune pleine, braise, luciole, goutte, étincelle, étoile ; rotation déterministe par position ; les halos et le faisceau translucides restent plats, sans encre, pour ne rien faire briller plus fort que sa source) ; `FeuxDessines.tsx` (les étincelles de flamme deviennent des éclats encrés ; la flamme avait déjà l'encre et la lueur étagée en 5 bandes sans blur) ; `Chantier.tsx` (volutes de poussière avec leur boucle intérieure, encre plus lisible, éclats de pierre à jointure ronde) ; `Revelation.tsx` (la bouffée est en `Particule` encrées). Une forme = un nœud Svg comme avant (les tests `iso-effets` comptent par différence).
- Non fait, volontairement : l'anneau d'or de la révélation reste un trait d'or sans contour. Un contour d'encre serait une seconde ellipse animée, donc 1 nœud animé de plus, et le budget (63 pour 64) l'interdit. Les traces (arcs du jet de la fontaine) restent des traits : un trait ne porte pas de contour sans second tracé.

## Ancrages (retour qa-audit1, pourquoi ça flottait)
Mesures : k = 0,125 dp par px de sprite pour repaire, tour et observatoire (`pose(...).w / size[0]`). La boîte d'effet fait 40 dp = 100 unités, son bas est posé sur l'ancre (`sommetDp` pour le faîte, `porte` pour le repaire), donc 1 unité = 0,4 dp = 3,2 px de sprite.
- **Repaire** : les yeux étaient à y = 48, soit 52 unités = 21 dp au-dessus de la porte, sur le toit ; le commentaire d'origine converti de travers (« 70 px au-dessus de la porte » = 8,75 dp = 22 unités, pas 52). Relu sur le sprite `dragon_lair/grand.nuit.webp` : la gueule sombre mesure environ 47 unités de large sur 35 de haut, son milieu 8 dp au-dessus de la porte. De plus le groupe montait de 8 dp pendant son cycle et la première braise (25 unités de large) recouvrait les yeux (dessinés avant). Corrigé : deux amandes de 20 unités à y = 70 (x 25-45 et 49-69), chacune avec une pupille fendue en encre, dessinées après les braises ; braises du dernier stade du repaire à 0,7 de leur taille ; montée `braise` 8 -> 3.
- **Tour du mage** : l'orbe était à cy = 76 (écart de 6,4 dp entre sa base et la pointe) puis le groupe montait de 10 dp. Corrigé : orbe cy = 90 r = 8 (pose sur la pointe), halo cy = 86 r = 14 (reste dans la boîte), montée `runes` 10 -> 3.
- **Observatoire** : le faisceau partait de la pointe du dôme alors que la fente est environ 40 px sous elle (5 dp). Ajout de `ENFONCE_PX = { etoile: 40 }` dans `boiteEffet` (la boîte descend de 40 x k dp quand l'ancre est le faîte), montée `etoile` 6 -> 2. L'étoile glisse donc plus bas avec le faisceau.
- Non vérifié sur appareil : les valeurs sont tirées des mesures de masque et du sprite, pas de captures de l'émulateur. Les captures qa-audit1 ne sont pas rejouées ici ; la qa doit refaire les trois plans serrés au zoom 1.
- `__tests__/iso-effets.test.tsx` : la montée braise passe de 8 à 3 ; le test des yeux attend deux amandes `isoEclat` plus deux pupilles `isoInk`.

## Preuves
Comptes (test temporaire de comptage, supprimé ; palier 12, tous les bâtiments), avant puis après mes changements, drapeau éteint :
- au repos : nœuds 964, animés 43, Svg 95, formes 400, images 194, tailles d'image 20, opacités 42 -> identique après (964 / 43 / 95 / 400 / 194 / 20 / 42).
- pendant une révélation (4 croissances, 2 jouées) : nœuds 1119, animés 59, Svg 127, formes 460, images 186, tailles 20, opacités 54 -> après : 1121, 59, 127, 462, 186, 20, 54 (deux formes Svg de plus : les boucles des volutes de poussière).
- pire cas des nœuds animés : 63 avant (iso-ciel), les tests `iso-ciel` (64 au plus, pire cas 63) passent sans modification.
- Planche allumée : `iso-planche` vérifie 1 nœud animé pour l'éclat avec ou sans planche, et aucun `RNSVG` dans l'arbre de la planche.
- `iso-perf-compteur.test.tsx` : non modifié, vert. Il compte la carte au repos, où la révélation n'est pas montée : il ne voit pas la taille de la planche. Tailles d'image 20 sur 20 tient donc sans rien retirer. Allumée, la révélation ajoute, le temps de l'effet, une taille de plus (256 x 216 dp, planche de 512 x 432 px), qu'aucun cliquet ne compte : à compter si on veut l'inscrire (ne pas ajouter 1 au plafond sans mesure).
- Commandes :
  - `scripts/iso/team/heavy.sh rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Test Suites: 77 passed, 77 total`, `Tests: 810 passed, 810 total`. Un premier passage a vu deux suites rouges (`iso-camera`, `iso-monde`) sur des fichiers que je ne tiens pas (`monde.ts`, `useCameraIso.ts` modifiés par ailleurs, et la charge) : vertes seules, puis dans le run complet.
  - `scripts/iso/team/heavy.sh npx tsc --noEmit` : sans erreur.
  - `npx biome check --write` sur mes fichiers : propre (`Checked 81 files ... No fixes applied`).
- Nouveaux tests `__tests__/iso-planche.test.tsx` (11) : image choisie à chaque tick du cycle, rien avant 0 et après 1000 ms, la bonne image à chaque instant rendu, horloge ambiante avec boucle, mouvement réduit = 0 nœud animé et une image fixe, mode figé, drapeau éteint.

## Douteux ou non fait
- Aucune mesure sur appareil : le coût de la planche contre le Svg est une hypothèse (la recherche le dit déjà).
- La planche allumée ne reprend pas le calage sur `HorlogeContext` pour la révélation : la révélation a sa propre durée (`ONDE_MS` = 900 ms, valeur partagée `revelation.t`), donc elle y est branchée. Le chemin « horloge ambiante » est prêt (prop `boucle`, testé) mais sans usage tant qu'un effet de boucle n'en a pas besoin.
- Le dernier dessin de la planche factice est presque vide (fondu peint) ; à 900 ms le lecteur est sur le dessin 7.
- Les yeux et l'orbe : nombres posés au calcul, pas sur capture.

## Pour la suite : ce que la qa mesure sur l'émulateur, build `.perf`
1. Pour passer la planche : changer `EFFET_PLANCHE` à `true` dans `planche.ts` (build à part), le Svg est le chemin du build normal.
2. `gfxinfo` pendant la révélation (croissance d'un bâtiment, 1 s), Svg contre planche, mêmes gestes, au moins 5 révélations chacun : trames lentes, 90e et 95e percentile, nombre de trames ratées, `reset` entre chaque série (`emu-adb.sh shell dumpsys gfxinfo ... reset`). Une trame au repos après la révélation doit rester à zéro (rien au repos).
3. Mémoire : `dumpsys meminfo` (Graphics et Native) avant, pendant et 3 s après la révélation, Svg contre planche. Attendu : planche décodée 512 x 432 x 4 = 0,9 Mo ; elle doit disparaître au démontage de la couche.
4. Au zoom 1, plans serrés : orbe de la tour du mage posé sur la pointe, faisceau de l'observatoire sortant de la fente, yeux du repaire lisibles (jour et nuit, vague active), de 0 à 3 s après le toucher.
5. Mouvement réduit et mode figé (`bati://dev-iso?fige=1`) : aucune planche ni effet qui bouge.
