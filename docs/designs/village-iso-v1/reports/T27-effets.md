# T27 point 4 : effets de métier sur les bâtiments

## Quoi
Cinq effets dessinés par l'app (aplats SVG, sans contour), un nœud animé chacun, seulement pendant une vague, 2 bâtiments à effet au plus par vague (graine jour + numéro de vague, comme les fenêtres de nuit). Rien au repos, en mouvement réduit ni en mode figé (pas de vague), rien de jour (`lueurFeux` faux).

| Bâtiment | Effet | `repere` d'isoSpec qui le justifie | Ancre | Siège T16 |
| --- | --- | --- | --- | --- |
| wizard_tower | runes violettes (trait) | tour fine coiffée d'un cône pointu | sommet de la peinture (masque de tap) | signal |
| druid_grove | lucioles vertes | cercle de pierres levées gravées, mangé de lierre | sommet de la peinture | lucioles |
| dragon_lair | braises | gueule de grotte dans un rocher, ossements devant | `foyer` des accroches | signal |
| observatory | éclat d'étoile | dôme fendu sur une tour basse | sommet de la peinture | signal |
| forge | étincelles (losanges) | enclume et foyer | `foyer` des accroches | signal |

Pas d'effet pour les autres : leur repère ne porte aucun geste (puits, ferme, mur, route, tente...). `iso-effets.test.tsx` garde le `repere` copié égal à celui d'isoSpec.
Dernier stade : 6 étincelles au lieu de 3, la dernière en or (`resourceGold`, l'or de T03). Couleurs : `isoRune`, `isoLucioleVerte` ajoutées dans `constants/rawColors.ts` ; le reste réutilise `isoFlamme`, `isoFlammeCoeur`, `isoEclat`. Les lucioles vertes sont une lueur froide, pas de lumière chaude nouvelle.

## Budget (preuve dans `__tests__/iso-ciel.test.tsx`, plafond 64 inchangé)
- Aucune famille ajoutée : les nœuds sont `iso-effet-signal-*` (famille signal) et `iso-effet-lucioles-*` (famille lucioles), deux sièges de la place tournante de T16. Ils ne jouent que dans le cycle de leur siège.
- Le siège « signal » tient `NOEUDS_RECLAMABLES` = 4 nœuds. Lueurs prêtes (jusqu'à 4) ou, sans lueur, éclats légendaires (2) ; l'effet prend le reste (`effetsPermis`) : 4 lueurs = 0 effet, 0 lueur = 2 éclats + 2 effets.
- Mesures : avec lueurs (2 croissances, 4 lueurs, 2 corbeaux), pire cas inchangé, `< 64`. Sans lueur, le siège passe de 2 nœuds (les éclats) à 4 (2 éclats + 2 effets) : +2 nœuds réels, 61 → 63, sous 64 (plafond du test de 61 à 63). `iso-effets.test.tsx` force les 2 effets (balayage de vagues, 2 croissances, 2 corbeaux) et mesure exactement 63. Premier essai avec 2 effets ajoutés en plus : 65, rejeté, d'où le partage du siège.
- Tests : aucun effet de jour (`lumiere="jour"`) ni en mouvement réduit ; 0 au repos, 1 à 2 en vague, 0 après, 0 en mode figé.

## Fichiers
`components/village/iso/effets.ts` (pur), `Effets.tsx` (dessin), `familles.ts` (2 règles), `veilleuses.ts` (champ `effets`), `useMarcheurs.ts` (choix à chaque vague), `IsoCarteDemo.tsx` (montage après les veilleuses), `constants/rawColors.ts`, `__tests__/iso-effets.test.tsx`, `__tests__/iso-ciel.test.tsx`.

## Checks
- `rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Test Suites: 65 passed, 65 total`, `Tests: 708 passed`.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre. `npx biome check --write --error-on-warnings` sur mes fichiers : propre.

## Film qa (30 i/s, émulateur, build `.perf`, `bati://dev-iso`, village palier 12, tous bâtiments niveau 5)
1. Ouvrir la carte, recadrer sur la forge (zoom 1) sans toucher : au repos, aucun effet (image fixe 3 s).
2. Toucher la carte (lance une vague) et filmer 20 s : sur les 2 bâtiments tirés, les étincelles/runes/braises/lucioles/éclat montent d'une trentaine de dp et s'effacent en moins de 5 s, dans un cycle sur trois (signal), les lucioles du bosquet dans le cycle des lucioles ; rien ne reste affiché entre deux cycles ni à la fin de la vague. Relancer 3 vagues pour voir d'autres bâtiments.
3. Même film sur un bâtiment au dernier stade : 6 éclats dont un or ; au stade rough : 3.
4. Mouvement réduit activé, puis `bati://dev-iso?fige=1` : aucun effet.
5. Regard neuf d'écran sur les captures : effet posé au sommet (tour, dôme, bosquet) ou au foyer (forge, antre), pas flottant ; lisible sur la peinture à 30 % ; pas de nouvelle lumière chaude hors foyer.

## Limites
- Un effet se monte ou se démonte si une lueur prête apparaît en pleine vague (dans le budget, sans fondu).
- Ancre au sommet du masque pour tour, dôme et bosquet : à vérifier à l'œil (l'artiste peut ajouter un point `faite`).
- Un effet joue un cycle de 5 s sur 15 ; le groupe d'étincelles monte d'un bloc (un seul nœud par bâtiment).
- Aucun effet de jour (pas de lumière chaude voulue) ; rien sur la build F-Droid tant que `INTEGRATION` est éteint.
- Pas de mesure d'appareil.
