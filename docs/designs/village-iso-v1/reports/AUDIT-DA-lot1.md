# AUDIT-DA lot 1 : le sol et ses petits objets (défauts 4 à 11, 22)

Code seulement : pas de bitmap, pas de nœud animé en plus, couleurs dans `constants/rawColors.ts`, drapeau INTEGRATION inchangé. Le rendu n'a pas été vu sur appareil : les identifications ci-dessous viennent du code et de la lecture des captures (le 7 est une hypothèse).

| # | Ce qui le dessine | Correction |
|---|---|---|
| 4 | `IsoCarteDemo.tsx` (tuile du sol), plaques d'herbe `blob()` de `solOrganique.ts` (6 nœuds), variantes `isoPre*` de rawColors, décors de `solVarie.ts` | plaques à 9 nœuds (bords moins facettés) ; variantes d'herbe plus écartées (Profond, Clair, Sauge, Sec) ; touffes et herbes hautes encrées (trait 0,7 dans `isoSpec.json`), touffe plus sombre. Le « bord déchiré » reste un bord de blob lissé, pas une vraie déchirure : cela demanderait de la peinture ou un bruit de contour plus coûteux. |
| 5 | (a) le crépuscule du bord `sombres` de `IsoCarteDemo.tsx` (encre à 0,4/0,24/0,1 en blobs ronds, dessinée sur les rues) ; (b) la halo d'ombre sous chaque villageois et animal, `OmbreContact.tsx` | (a) dessiné sous les rues, il ne marque plus les pavés ; (b) variante b de Guillaume gardée : noyau (0,55, opacité 0,26) et halo plus petit et plus léger (0,8, opacité 0,10), ellipses 2:1 poussées de 0,2 de largeur vers la droite (direction de la lune, `isoSpec.json` `moon`) ; ombre plus petite (villageois 0,4 cellule, bêtes 0,24). |
| 6 | pas la lueur de `FeuxDessines.tsx` (éteinte le jour, `lueurFeux`) : le cercle est le bord fondu `PLACE_FONDU` de la place (`rues.ts`, `RuesDessinees.tsx`), copie plate pâle à bord net | `PLACE_FONDU` vide. La lueur chaude de la flamme (bandes `BANDES_LUEUR`) reste, la nuit seulement. |
| 7 | hypothèse, non prouvée : le sentier de porte à rue (`SENTIERS` de `rues.ts`, texture « terre » à bord fondu) quand il finit sur le pavé de la place (barres quasi horizontales qui rejoignent la place) | sentiers dont la rue d'arrivée est de rang 2 (pavé) non dessinés (`RuesDessinees.tsx`) ; la donnée `SENTIERS` est inchangée. À confirmer sur capture : si la barre reste, ce n'est pas lui (autre piste : ombre portée du pilier du foyer, `ombres.ts`). Le sentier du moulin, de rang 1, n'est pas touché. |
| 8 | texture bitmap `motifs.ts` / `paves.nuit.webp` tuilée par `RuesDessinees.tsx` | nouveau `pave.ts` : 5 pierres par case en appareil décalé, joints encrés fins (`BS.encre`, 0,9 dp), 30 % de pierres éclaircies et 30 % assombries (`isoPaveClair`, `isoPaveSombre`), 3 chemins par tuile clippés à la bande pavée (rang 2 et place), non-zero. Pierres posées par hash, pas de hasard. Les joints sont réguliers (pas de jitter par pierre). |
| 9 | « galets » de bord de chemin : `galetsDe` et `dessinGalet` (`solVarie.ts`), tracés dans `IsoCarteDemo.tsx` | 3 emplacements par côté au lieu de 5, un tiers gardé au lieu de 45 % ; cailloux à 7 sommets irréguliers au lieu d'ellipses parfaites ; couleur `isoRocaille` (pierre) au lieu de `isoCaillou`. |
| 10 | décor « feuille » : hexagone `FORMES.feuille` couleur `isoFeuille` (`solVarie.ts`) | retiré (poids 0 dans `isoSpec.json`, le genre reste typé). |
| 11 | décor « fleur » : tige et chapeau blancs `isoFleur` | fleur à 4 pétales sur tige courte, encrée, corail `isoFleur` (`#D9584A`, pas violet : test de teinte de `iso-monde`). |
| 22 | lavis de jour `iso-lavis-jour` de `IsoCarteDemo.tsx`, posé par-dessus les ombres à 0,5, qui les délavait ; plus les halos de `OmbreContact` (voir 5) | le lavis passe sous le groupe d'ombres, qui reçoit son propre lavis à moitié (`OMBRE_LAVIS`, `iso-lavis-ombre-i`) : les ombres de bâtiments gardent leur contraste le jour. Les ombres de villageois et de bêtes tombent à droite comme les autres (noyau et halo discrets). Non traité : l'ombre de socle peinte (`ombreSocle`), la « nappe floue » citée par l'audit n'a pas été identifiée autrement que comme (a) du 5 et le halo du 5. |

## Ajout : l'ombre du villageois reste au sol
- Avant : `OmbreContact` était enfant du nœud animé du corps (`Marcheur`, `IsoCarteDemo.tsx`) : elle montait avec le rebond, le saut et le geste.
- Maintenant : l'ombre est sœur du corps, posée avant lui dans le même rang de profondeur (donc sous tout ce qui est devant). Debout : dessin fixe, sans nœud. En marche : `OmbreMarcheur`, un nœud animé qui ne lit que la place sur la grille (`ecartGrille`, `ombreMarcheur.ts`) ; la hauteur (rebond + `leve` du geste) ne sert qu'à choisir un cran : échelle 1, 0,88, 0,76 et opacité 1, 0,82, 0,64 (deux crans, seuils 1,5 et 4 dp).
- Rebond de marche 2,5 puis 2 dp (`SAUT_PAS`).
- Budget : +1 nœud par marcheur en marche, donc +3 au pire (`MARCHEURS_PAR_VAGUE`) : repos 43 inchangé (nul debout), pire cas 57 puis 60 sur 64, `iso-ciel` ajusté (`NOEUDS_OMBRES_MARCHEURS`). Les marcheurs peuvent marcher encore au-delà des lumières de la vague : les comptes « au repos » de `iso-ciel` ajoutent les ombres mises en marche.
- Test : `__tests__/iso-ombre-marcheur.test.ts` (position identique pour toute hauteur de 0 à 40 dp, deux crans au plus).
- Limites : le coup d'un chantier (levée du corps debout, `LEVEE_COUP`) ne bouge pas l'ombre fixe : elle reste au sol mais ne rétrécit pas. Les bêtes gardent leur ombre dans le nœud de pose (elles ne sautent pas, leur nœud ne monte pas) ; les corbeaux n'ont pas d'ombre.

## Fichiers
`components/village/iso/` : `pave.ts` et `ombreMarcheur.ts` (nouveaux), `RuesDessinees.tsx`, `rues.ts`, `OmbreContact.tsx`, `IsoCarteDemo.tsx`, `solVarie.ts` ; `constants/isoSpec.json` ; `constants/rawColors.ts` ; tests : `iso-pave.test.ts` (nouveau), `iso-ombre-contact.test.tsx`, `iso-carte-couches.test.tsx`, `iso-ombre-marcheur.test.ts` (nouveau), `iso-ciel.test.tsx` (+3 nœuds d'ombre en marche), `iso-dev-screen.test.tsx` (palier 1 : 4 motifs au lieu de 6, le sentier de la tente n'est plus dessiné).

## Checks
- `npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : 52 suites vertes sur 54 avant les deux ajustements ci-dessus (le test de dev-screen et le test « pas de violet »), puis `iso-dev-screen iso-monde iso-pave iso-carte iso-ombre iso-sol` : 7 suites, 65 tests verts.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre.
- `npx biome check --write --error-on-warnings` sur mes 12 fichiers : propre (3 fichiers reformatés).

## Limites
- Rien vu à l'écran : qa doit comparer P1, P6, P12 en zoom maxi et mini, nuit et jour, sur le feu et la place.
- Le coût des pavés (3 chemins par tuile avec place) n'est pas mesuré ; les ids `pave` et `pave-ombre` sont par tuile.
- Le crépuscule du bord ne couvre plus les décors posés sur la pelouse du bord (il passe sous les rues, avant les décors) : le bord de l'île est un peu moins sombre sur les cailloux et touffes.
