# perf-regression-audit3 : régression de perf de la carte (qa-audit3 contre qa-audit2)

Statut proposé : prêt pour revue (aucune cause prouvée par le code ; variantes A/B prêtes pour la qa)
Auteur : engineer
Tour de revue : 1

## Ce qui a changé entre 8b6b813f et 1d257429 (images et Svg)
`/usr/bin/git log --oneline 8b6b813f..1d257429` : un seul commit, `1d257429` (premier tour de l'audit Mara et Théo).
Côté images/Svg, il apporte : flaques de nuit (`lueurs.ts`, 2 `Path` par tuile touchée, `IsoCarteDemo.tsx` `Tuile`), bornes de rue (`rues.ts` + `RuesDessinees.tsx`, 1 `Path` par `Rues`, donc 2 par tuile), lanterne réduite (`reduit` + transform sur le Svg des verres), cadrage ×1,5 (`carteDemo.ts`, `useCameraIso.ts`), `ECART_RIVE` 240 -> 560 (`monde.ts`), bosquets (`lisiereChoix.ts`, `isoLisiere.json`), oiseaux de jour seulement, `EffetForceContext` (bouton dev), villageois de métier (`habitants.ts`).
`lisiere.ts` n'a PAS changé dans la plage : `ECHELLE_DECODE = 1` y est déjà à 8b6b813f (le passage 0,5 -> 1 date d'avant, entre 5ea86807 et 8b6b813f ; audit2 le portait déjà).

## 1. Causes classées (comptes mesurés sous jest, palier 12, 411x520 dp, densité 2,625)
Recensement de l'arbre monté (script jetable, supprimé) : 94 `Svg` (308 `Path`), 176 `Image`.
- Svg de tuile : 94 bitmaps logiciels, 15,8 Mo au total ; deux tuiles de 512x512 dp (7,2 Mo chacune) et une de 449x512 portent l'essentiel ; les autres font 0,05 à 0,3 Mo. Un Svg n'est rastérisé et envoyé au GPU qu'à son montage ou si ses props changent.
- Images : forêt du monde 63 images mais 8 sources partagées (dimensionnées à une seule taille, ~10 Mo décodés, le chiffre de `Monde.tsx`) ; lisière 18 pièces montrées (2,9 Mo à `ECHELLE_DECODE` 1), 10 assombris de rochers (1,6 Mo), 27 pièces de décor (4,4 Mo), bâtiments 0,4 à 0,8 Mo chacun.

Classement, du plus au moins probable :
1. **La variance entre vagues, pas une image en plus.** Sur le même build et la même session, qa-audit3 mesure 7,76 / 2,98 / 5,06 / 0,22 % (vagues 1 à 4 fraîches) et 0,22 / 0,56 % sur l'onglet. La vague 4 (0,22 %, 1 `Slow bitmap upload`) est au niveau d'audit2 (0,24 et 0,40 %). Le tirage du jour change à chaque vague (`numero` = le quart de minute, `useMarcheurs.lancer`) : effets, villageois qui marchent, animaux, lucioles ; chaque première apparition d'un bitmap (Svg d'effet monté par la vague, planche d'un métier) paie un `Slow bitmap upload`. Audit2 n'a que deux vagues mesurées : deux tirages favorables suffisent. Autre écart de protocole : audit3 a joué avec le bouton « Effet : <bâtiment> » (effets forcés) et « Tous debout », audit2 non. À trancher par plusieurs vagues par variante, voir le protocole.
2. **Flaques et bornes**, les seuls ajouts de dessin dans les Svg de tuile. Ils sont statiques (un seul rastérisage au montage, pas par vague) et se payent donc à l'ouverture, pas dans la vague. Surcoût de montage possible sur les deux grosses tuiles (7 Mo chacune re-rastérisées d'un coup). Variantes `flaques=0`, `bornes=0` pour le mesurer. Piste de coût en JS : `flaquesDe` rendait un tableau neuf à chaque rendu de `IsoCarte` (un rendu par pas de villageois), ce qui sortait les 94 `Tuile` de la mémoïsation ; corrigé (voir 3).
3. **`ECART_RIVE` 560** : une colonne de forêt de plus à droite (images à sources partagées, donc pas de décodage de plus) : faible.
4. **Cadrage ×1,5** : ne change que le zoom d'ouverture ; le plancher de zoom reste l'île entière (`cadrageComplet`), la mesure est faite au zoom mini et un Svg est rastérisé à sa taille de layout, pas à celle de l'écran : hors cause.
5. **Lisière** : exonérée. `ECHELLE_DECODE` inchangé dans la plage ; les pièces passent de 156 à 72 (arbre_a 51 -> 23, bosquet_a 28 -> 5, rochers 62 -> 28) et 18 sont montrées au palier 12 : moins d'images qu'avant. Le passage de 0,5 à 1 (+2 Mo mesuré le 31/10) est antérieur à audit2.
6. **Anneau de la révélation** : hors plage de ce commit côté fichiers que je tiens (Revelation.tsx, autre ingénieur).

### Mémoire : fuite ?
Les `meminfo` de qa-audit3 (`evidence/qa-audit3/mesures/`), frais contre session longue :
| | frais (frais-carte-1) | 25 min (carte-2) |
| --- | --- | --- |
| Views | 2 119 | 2 064 |
| Java Heap (PSS) | 38,6 Mo | 50,8 Mo |
| Native Heap (PSS) | 129,7 Mo | 249,3 Mo |
| Private Other | 49,4 Mo | 117,4 Mo |
| Stack | 960 Ko | 1 904 Ko |
| Ashmem | 19 Ko | 1 005 Ko |
| TOTAL PSS | 282,0 Mo | 493,6 Mo |
Le nombre de vues ne monte pas (2 119 -> 2 064) : l'arbre React ne s'empile pas. Le gain (+212 Mo) est dans le tas natif (+120 Mo) et « Private Other » (+68 Mo), la pile double (threads). Candidats natifs, non prouvés : bitmaps logiciels des Svg d'effets et de lueurs remontés à chaque vague et libérés seulement au GC, caches Glide. Rien à corriger côté JS.

Preuves sous jest (nouveau `__tests__/iso-fuite-vagues.test.tsx`, carte du palier 12 complète) :
- 50 vagues de suite (départ, horloge sur le repos, 25 s de minuteries) : 778 nœuds après chacune, de la 1re à la 50e (repos initial 774 ; +4 nœuds de la pose finale, constants). Aucune croissance.
- 50 montages/démontages : même compte à chaque fois.
- Caches : `MONTREES` (par île), `plans` de `quartiers.ts` (par graine), `EMPRISES`, `derniere` des flaques (une seule entrée) : tous bornés ; `planche` et `quartiers` ne sont pas recalculés par vague (le recensement des nœuds ne bouge pas).
- Mesuré aussi : le tas JS de jest monte d'environ 1 Mo par vague avec des vagues (175 -> ~230 Mo sur 50), plat sans vague. Ce n'est pas un nœud (compte constant) ; je ne l'impute ni à l'app ni au banc (React dev, mocks Reanimated) sans mesure sur appareil. Le test ne l'affirme pas.

## 2. Variantes de dev pour la qa (aucun choix fait, défauts = HEAD)
Drapeaux lus par `app/dev-iso.tsx` dans la requête du lien profond, via `VariantesContext` (`components/village/iso/variantes.ts`) :
- `ech=0.5` (ou `1`, défaut) : échelle de décodage des arbres de la lisière (`echelleLisiere(cle, decode)`) ; les rochers restent à 1.
- `flaques=0` : plus de flaques de lumière dans les tuiles.
- `bornes=0` : plus de bornes de rue.
Le bandeau `iso-compte` affiche `| ech 0.5 flaques 0 bornes 1` dès qu'une valeur n'est pas celle par défaut : à lire sur chaque capture pour prouver la variante. Hors dev-iso, le contexte garde le défaut ; la carte de l'onglet n'est pas touchée. Tests : `__tests__/iso-variantes.test.tsx`.
Non fait : un drapeau pour `ECART_RIVE` (constante lue à l'import par `COLONNE_RIVE`) et pour le cadrage ; à ajouter si les trois premiers ne tranchent pas.

## Protocole A/B exact pour la qa
Un seul build `.perf` de ce HEAD de travail, tous les variants par lien profond (pas de rebuild).
1. Fixe : émulateur, palier 12, nuit, zoom mini (même bouton qu'audit3), « Effet : auto » (jamais forcé), « Tous debout : non », sans ouvrir l'onglet. Même durée de passe : toucher en début de fenêtre de 15 s, `gfxinfo reset` juste avant, repos de 10 s entre deux.
2. Variantes : V0 défaut ; V1 `ech=0.5` ; V2 `flaques=0` ; V3 `bornes=0` ; V4 `flaques=0&bornes=0` ; V5 `ech=0.5&flaques=0&bornes=0`.
3. Par variante : `am force-stop`, lien `bati://dev-iso?ambiance=nuit&<drapeaux>` (par `scripts/iso/team/emu-adb.sh`), capture du bandeau, 2 vagues de chauffe écartées, puis **8 vagues** mesurées. Relever par vague : images, Janky %, p99, `Slow bitmap uploads`, `Slow UI thread`.
4. Ordre : V0 V1 V2 V3 V4 V5 puis V5 V4 V3 V2 V1 V0 (deux tours, miroir), pour annuler la dérive de l'émulateur et du tirage. Les vagues fraîches coûtent plus (tirage, chauffe) : ne comparer que des médianes de 8 et de 16 (deux tours), jamais une vague contre une vague.
5. Lecture : une variante n'est coupable que si sa médiane de Janky % (et de `Slow bitmap uploads`) baisse d'au moins moitié contre V0 sur les deux tours, avec le max (p99) qui baisse aussi. Sinon, la cause est la variance de tirage : demander 20 vagues de V0 seule et comparer à audit2 sur la même méthode.
6. Mémoire : après les 8 vagues de V0 puis de V5, `dumpsys meminfo` (Native Heap, Private Other, Views, TOTAL PSS). Puis 40 vagues de plus sans relance sur V0, même relevé à 10, 20, 40 : la pente du Native Heap par vague dit si ça s'empile ; un `am send-trim-memory <pid> COMPLETE` en fin de série sépare ce qui est libérable (cache) de ce qui est tenu (fuite). Les `Views` doivent rester stables.
7. Aucune conclusion de DA ici ; le choix (`ECHELLE_DECODE`, flaques, bornes) revient au chef d'équipe après mesure.

## 3. Correctif sûr appliqué
- `lueurs.ts` `flaquesDe` : renvoie le même tableau tant que les bâtiments montrés et leurs stades sont les mêmes (une entrée gardée, rien ne grandit). Avant, un tableau neuf à chaque rendu de `IsoCarte` recalculait les props des `Tuile`. Test d'identité dans `iso-variantes.test.tsx`. Aucune fuite prouvée : rien d'autre corrigé.

## Fait
- Nouveau : `components/village/iso/variantes.ts`, `__tests__/iso-variantes.test.tsx`, `__tests__/iso-fuite-vagues.test.tsx`.
- Modifiés : `lisiere.ts` (`echelleLisiere(cle, decode = ECHELLE_DECODE)`), `lueurs.ts` (mémo d'une entrée), `IsoCarteDemo.tsx` (`Tuile` : drapeau flaques ; `Piece` : échelle de décodage), `RuesDessinees.tsx` (drapeau bornes), `app/dev-iso.tsx` (lecture de la requête, bandeau). Pas touchés : CLAUDE.md, `iso-perf-compteur.test.tsx`, fichiers des deux autres ingénieurs, T44. Aucun nœud animé ajouté (64 au plus inchangé).

## Preuves
- `scripts/iso/team/heavy.sh rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Tests: 5 failed, 866 passed, 871 total ; Test Suites: 4 failed, 81 passed, 85 total`. Échecs : `iso-ciel` (corbeaux d'envol attendus 2, reçus 0), `iso-worklets` (`iso-corbeau-envol-farm` attendu 1, reçu 0), `iso-familles` (famille `oiseaux` absente la nuit, vient du commit 1d257429 `oiseaux: false`) : ce sont les fichiers corbeaux/oiseaux du troisième ingénieur, que je ne touche pas ; `iso-habitants-vue` : dépassement de 15 s sous charge, vert seul (10 passed). Mes deux suites étaient rouges dans cette passe pour une raison de test (une assertion de repos trop stricte et un `toJSON` après démontage), corrigées ensuite.
- `... jest iso-fuite iso-variantes iso-habitants-vue iso-perf-compteur` : `Tests: 1 failed, 18 passed` (le seul échec est `iso-habitants-vue` sous charge), puis `jest iso-habitants-vue` seul : `10 passed`. `iso-perf-compteur.test.tsx` vert et non modifié.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : aucune erreur. `npx biome check` sur mes 8 fichiers : « No fixes applied », aucune erreur.

## Douteux ou non fait
- Aucune cause prouvée de la régression de trames ni de la mémoire : le code ne peut pas la départager de la variance de tirage ; seule la mesure A/B le fait.
- La croissance du tas JS de jest (~1 Mo/vague) n'est pas expliquée.
- Les échecs de corbeaux/oiseaux dans la passe complète ne sont pas de mon fait, mais je ne les ai pas reproduits sur un arbre propre (pas de stash).

## Pour la suite
- Lien profond de la qa : `bati://dev-iso?ambiance=nuit&ech=0.5&flaques=0&bornes=0` (chaque drapeau optionnel). Le défaut est le HEAD.
- Si la qa conclut sur V1, le changement définitif tient dans `ECHELLE_DECODE` (`lisiere.ts`) ; sur V2/V3, retirer l'appel dans `Tuile` / `Rues`.
