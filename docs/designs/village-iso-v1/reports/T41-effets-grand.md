# T41 point 3 : effets de métier du dernier stade (31/10)

## Fait
Les effets de T27 (effets.ts, Effets.tsx) gagnent un décor au dernier stade du bâtiment (`dernierStade`), dessiné dans le MÊME nœud animé (formes statiques dans le Svg du groupe : aucun nœud ajouté, le pire reste 63/64). Aux stades d'avant : inchangé (3 grains).
- antre du dragon : deux yeux ambre (`isoLueur`) à la gueule (ancre foyer) + deux bouffées `isoFumee` ; le groupe ne monte que de 8 dp (`montee`) pour que les yeux restent à la gueule. Les yeux "s'ouvrent" avec le fondu du groupe.
- tour du mage : orbe pâle (`isoEclat` + halo à 30 %) qui flotte avec les runes. Pas de violet nouveau.
- fontaine : NOUVEL effet (genre `gouttes`, siège signal, repère « bassin rond autour d'une colonne ») : gouttes + jet `isoEauNuitCoeur`. Dernier stade de la fontaine = solid. Il prend la place d'un des 2 effets de la vague (EFFETS_MAX inchangé).
- observatoire : faisceau (aplat 22 %) + 2 étoiles en plus de la principale.
- forge : jet de flamme `isoFlamme` sous les 6 étincelles (la dorée reste).
Opacité : `fillOpacity` sur les formes ; l'opacité du groupe de 40 dp est celle déjà en place. Aucun scale sur grand SVG. Gates inchangés (vague seulement, pas de jour, pas de mouvement réduit, pas de mode figé, silence pendant la révélation). Couleurs : tokens existants, rien ajouté à rawColors.

## Budget
Un effet = un nœud, quel que soit le stade. Le test pire cas existant (12 vagues, tout en niveau 5, nœuds animés ≤ 63) tourne pendant la révélation, donc sans effet actif : il ne mesure pas les stades grands. Mesuré par le bloc « T41: the last-stage decor, rendered » d'iso-effets : pour chacun des 5 genres décorés, `<Effets>` au dernier stade et au stade d'avant donne 1 effet et 1 nœud animé dans les deux cas, et l'écart de nœuds rendus vaut exactement les formes de `DECOR_GRAND` plus les 3 grains en plus (0 pour l'observatoire) ; `montee` de la braise vaut 8 au dernier stade ; village palier 12 tout en niveau 5 pendant une vague (hors révélation) : 1 à 2 effets, ≤ 64 nœuds animés. Cliquets d'iso-perf-compteur non touchés. Non mesuré : l'ancrage des yeux, de l'orbe, du jet et du faisceau (constantes dans la boîte de 40 dp, qui montent avec le groupe), à juger sur appareil.

## Tests
- `rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : Test Suites: 74 passed, 74 total (777 tests).
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : 0 erreur.
- `npx biome check --write` sur les 3 fichiers : 0 avertissement.
- iso-effets : 6 effets (au lieu de 5), `DECOR_GRAND` couvre 5 genres, tokens existants, pas d'isoRune, cercles dans la boîte.

## Film pour la qa (build .perf, nuit, zoom 1)
1. Village palier 12 avec antre du dragon (grand), tour du mage, fontaine, observatoire, forge au dernier stade ; attendre une vague (adb via emu-adb.sh).
2. Repérer les 2 bâtiments à effet de la vague (les autres se tairont) ; plusieurs vagues pour voir chacun. Capture mi-cycle : yeux ambre + fumée à la gueule du dragon ; orbe au-dessus du cône ; jet d'eau sur la colonne ; faisceau et étoiles sur la fente du dôme ; jet de flamme à la cheminée.
3. Lisibilité au zoom 1 (taille de la boîte : 40 dp ; les petits détails, ex. fumée à 40-55 %, à juger).
4. Même bâtiment à un stade plus bas : seulement 3 grains, pas de décor.
5. Rien au repos, rien de jour, rien en mouvement réduit, rien en mode figé, rien pendant la révélation. gfxinfo : médiane pendant une vague ≤ valeur P1, nœuds ≤ 64.

## Non vérifié
Le rendu visuel (position des yeux/orbe sur chaque sprite, ancre approximative `foyer`/sommet du masque) : à juger sur appareil. Tout le groupe se fond en même temps (yeux, fumée et jet apparaissent et disparaissent ensemble).
