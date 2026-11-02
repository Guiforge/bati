# qa-audit2-suites : effets de dernier stade, points flottants, villageois de métier, révélation

Statut proposé : prêt pour revue
Auteur : engineer
Tour de revue : 1

## 1. Effets de dernier stade : ils jouent, la qa ne les a pas vus pour une autre raison
Vérifié dans jest, sur la vraie carte de démo (`IsoCarteDemo`, palier 12, nuit, horloge réelle, dates de la qa) :
- les 6 effets se montent, chacun à son dernier stade (`dernierStade` vrai, décor `DECOR_GRAND` dessiné), chacun avec son siège (`signal`, `lucioles` pour le druide) ;
- les 6 bâtiments sont dans `montres` du palier 12 (21 sur 21), leurs sprites du dernier stade existent ;
- le tirage de 2 par vague donne, pour les fenêtres de la qa, les mêmes ensembles que son portage (20:08:45 : observatoire + fontaine ; 20:09:45 : tour du mage + observatoire). Sur 300 vagues chacun sort entre 77 et 135 fois : pas de biais ;
- `effetsPermis` : la démo n'a pas de `ReclamablesContext`, donc 0 lueur et 2 places libres : aucun effet n'est refusé ;
- jour/lueur : `lueurFeux` vrai de nuit seulement (la qa filmait de nuit) ;
- opacité mesurée dans l'application : 0 à 1 s, 0,6 à 1,5 s, 0,99 à 2,5 s (observatoire) : l'orbe, le faisceau et les yeux sont visibles quand l'effet joue.
Cause probable de la non-vue : l'effet ne joue que dans les 5 premières secondes d'une vague (siège `signal` au cycle 0 ; le druide au cycle 1), et `horloge.touche()` ne démarre une vague que si l'horloge est au repos. Un toucher à 15 s pile de la vague précédente arrive souvent un peu trop tôt : il la prolonge, la vague n'est pas nouvelle, le numéro (donc le tirage) reste l'ancien. Le portage de la qa prédit alors un tirage qui n'a pas eu lieu. La fontaine vue l'a été sur une fenêtre bien alignée. Non prouvé sur appareil.

**Contrôle de dev** : dans dev-iso (mode carte), le bouton `iso-effet-force`, « Effet : auto » puis « Effet : wizard_tower », « druid_grove », « dragon_lair », « observatory », « fountain », « forge », puis retour à auto. Appuyer force cet effet seul à la prochaine vague ET démarre une vague si la carte est au repos (si une vague court, elle est prolongée, et l'effet se voit au prochain cycle `signal`). Délai : l'orbe, le faisceau, les yeux, le jet, les étincelles se voient entre 1 et 4 s après l'appui ; les lucioles vertes du druide entre 6 et 9 s. Cadrer d'abord (zoom 1) sur le bâtiment. Il n'existe que dans l'écran dev-iso (`EffetForceContext`, défaut null, aucun autre écran ne le fournit), ne touche aucun cliquet ni réglage.
Fichiers : `effets.ts` (`EffetForceContext`, `effetsJoues`), `Effets.tsx`, `app/dev-iso.tsx`.

## 2. Points bleus et verts à gauche de l'observatoire
- Bleus : les lucioles ambiantes (`Lucioles`, couleur `isoLuciole` #6EC9E8, 10 points) flottent sur la zone `lieux.lucioles` de `constants/isoLayout.json` : gx 1 à 4, gy 1 à 6. L'observatoire est posé en (3,3) : la zone, restée de l'ancienne mise en page, recouvre l'observatoire. Les points sont dessinés par-dessus la carte, d'où « sans bâtiment dessous ». Ils jouent au siège `lucioles` (cycle 1 de la vague, 5 à 10 s). Pas un défaut de code ; si on ne les veut pas là, c'est la zone à déplacer (par exemple vers le bosquet du druide en (6,3)), décision de direction : non faite.
- Verts : seule source de `isoLucioleVerte` : l'effet du druide (grains verts à la cime du bosquet, siège `lucioles`, même cycle que les bleues). Je ne confirme pas l'emplacement « à gauche du dôme » : le bosquet est à l'est de l'observatoire. Non élucidé.

## 3. Villageois de métier : remplacés par des poses anonymes
Cause trouvée dans `habitants.ts` / `HabitantVue` : le rôle tiré arrive bien jusqu'au sprite (pas de repli vers le balayeur, les 7 rôles ont leur image `villageois_<rôle>_face`), mais `HabitantVue` dessine `poseDe(h.pose)?.image` à la place. Au palier 12, sur 6 jours : 72 habitants sur 72 ont une pose de repos (balayeuse 26, lit 17, dort 15...) et chaque pose est une figure unique (balayeuse, dormeur, porteur de caisse) : un forgeron près de la forge était dessiné en balayeuse. Les habitants près d'un bâtiment sont bien placés (il y en a près de la forge, de la ferme, de la tour de guet, de l'observatoire).
Correction : un habitant tiré d'un bâtiment qui a un métier (`metier` vrai) garde son sprite de métier, sauf pour une pose faite pour ce bâtiment (les caisses à la ferme et à la grange). La place et la porte gardent toutes les poses (paires, tonneau, panier). Sur 6 jours au palier 12 : un forgeron, un sage et un garde debout sont vus (test). Les poses restent pour les habitants sans métier.
Images manquantes ou à noter (rien ajouté) : pas de sprite d'archer (déjà noté, l'archerie retombe sur un métier tiré) ; les sprites de dos des 7 métiers viennent de `blockout/pieces/` (maquettes de dos), seuls les « face » sont peints ; pas de pose de repos propre à un métier (forge, observatoire...). Le sprite debout est petit sur son canevas (forgeron ≈ 250 px sur 768) : à juger sur appareil.
Fichiers : `habitants.ts`, tests `iso-habitants-voisin`, `iso-repos`.

## 4. Révélation : l'anneau d'or était un bitmap de 27 Mo redessiné à chaque image
Mesuré dans jest (IsoVillage palier 12, croissance de la tour du mage) : la révélation ajoute peu à l'arbre (de 983 à 990 nœuds, animés 55 à 54 ; un Svg pour l'anneau, un pour l'éclat). Ce ne sont pas les nœuds ni les grains. Le coût est l'anneau : un `Svg` de 1400 x 700 dp (PORTEE_DP), soit 3675 x 1838 px à 2,625, que react-native-svg dessine dans un bitmap logiciel et refait entièrement à chaque `animatedProps`, sur 0,56 s (la poussée d'anneau). Cela colle avec 18 à 20 images en retard et un p99 de 80 ms.
Correction (la moins chère, l'effet reste) : l'anneau est dessiné à 40 % de sa taille (`ECHELLE_BITMAP`, dans `revelation.ts`) dans un Svg à `viewBox` inchangé, et un `View` statique l'agrandit de 2,5 fois autour du même centre : bitmap 6,25 fois plus petit (4,3 Mo), même forme, même rayon, même trait en dp, bord un peu plus doux (anneau d'or, sans conséquence). Aucun nœud animé de plus (le `View` est statique), un `View` de plus dans l'arbre pendant la révélation seulement. Je n'ai rien touché au silence du village (`Effets` se tait déjà sous `RevelationContext`) ni aux grains (6 par éclat, un seul Svg de 64 dp).
À vérifier par la qa sur appareil : p99 et part en retard de la révélation, même protocole qu'en qa-audit2 (1,47 à 1,61 % avant). Si cela ne suffit pas : l'étape suivante est un sprite d'anneau (image) en place du Svg.
Fichiers : `Revelation.tsx`, `revelation.ts`.

## Commandes et résultats
- `scripts/iso/team/heavy.sh rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : 829 réussis, 3 échecs sur 832, tous hors de mes fichiers :
  - `iso-familles` « a plain wave » : la famille `oiseaux` n'apparaît plus ; `iso-ciel` (43 attendus, 42) s'est vu rouge aussi dans un passage antérieur, pour la même raison (un nœud d'oiseaux de moins) : travail en cours sur les corbeaux / `Monde` de l'autre ingénieur ;
  - `iso-dev-screen` : « image and pattern nodes at tiers 1 and 12 » et « the world around the island » : `Monde`, hors périmètre.
  `iso-perf-compteur` reste vert, non modifié.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre.
- `biome check --write` sur mes 10 fichiers : propre (un `biome-ignore` justifié de complexité dans `iso-repos.test.ts`).
- Tests ajoutés : `iso-dev-effet.test.tsx` (bouton, un effet à la fois, démarrage de la vague), `iso-effets.test.tsx` (les 6 effets joués sur la carte de démo du palier 12 avec opacité > 0,3 et moins de 64 nœuds), `iso-habitants-voisin.test.ts` (métier gardé, forgeron/sage/garde debout), `iso-repos.test.ts` (adapté), `iso-revelation.test.tsx` (`ECHELLE_BITMAP`).
- Rien commité. `CLAUDE.md` non touché. 64 nœuds animés : aucun nœud animé ajouté.

## Pour la qa
1. dev-iso, carte, zoom 1, de nuit : appuyer sur « Effet : … » (un bâtiment à la fois), cadrer dessus, filmer 6 s ; lucioles vertes du druide : 10 s. Dire dans le journal quel bâtiment était forcé.
2. Villageois : de jour, tous debout, palier 12 : un forgeron près de la forge, un sage près de l'observatoire et de la tour du mage, un garde près de la tour de guet doivent se voir debout (aucune pose, pas de balayeuse).
3. Révélation : « Prêt », deux passes comme en qa-audit2, comparer à 1,47 / 1,61 %.
