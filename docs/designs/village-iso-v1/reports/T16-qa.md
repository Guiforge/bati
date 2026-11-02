# T16-qa : mode figé et vague sans saut, sur émulateur

Statut proposé : prêt pour revue
Auteur : qa
Tour de revue : 1

Même `.perf` que T23 (`evidence/T16/apk.sha256`). `bati://dev-iso?fige=1` est ouvert par `emu-adb.sh shell am start -W … com.guiforge.bati.perf`.

## Verdicts
1. **`?fige=1` : rien ne bouge.** Après un tap sur la carte : `Total frames rendered: 0`, `Janky frames: 0` (`fige-gfxinfo.txt`), et 0 pixel différent entre deux captures à 4 s d'écart (`magick compare -metric AE` : `0`).
2. **`iso-batiments.yaml` en figé : rouge au premier passage, vert 3 fois sur 3 après correction des points.**
   - Passage 1 (`maestro-fige-1.log`) : `Assertion '"Rises with your shoulders" is visible' failed`. Le point (264,783) tombe dans la forêt, au-dessus de l'île (`01-echec-point-264-783.jpg`). Le cadrage de l'onglet a changé depuis l'écriture du flux, et le village du héros a maintenant 13 bâtiments (deux séances jouées pour T14). Ce n'est pas un défaut du mode figé.
   - Le flux est mis à jour (`.maestro/iso-batiments.yaml`). Les 4 points sont relevés sur les bulles au cadrage actuel : moulin (épaules) 263,1110, forge (poitrine) 665,1100, carrière (dos) 796,1190, tour du mage (callisthénie) 859,975. La fermeture se fait par un tap dans la forêt (1000,330) plutôt que par `tapOn: "Close"` : le fond de la bulle porte ce libellé, mais Maestro appuie en son centre (540,1200), qui tombe sur l'île et peut ouvrir un bâtiment.
   - Passages 2, 3 et 4 : `rc=0`, aucune étape FAILED (`maestro-fige-{2,3,4}.log`). Les taps ouvrent toujours la bonne bulle, et la carte reste immobile entre deux taps.
3. **Vague sans le paramètre : pas de saut.** Palier 12, Carte seule, au repos (0 trame en 10 s), puis un tap et un film de 24 s (hors dépôt).
   - Différence d'une image à la suivante sur l'île entière (`vague-ile-diffs.txt`) : rien au-delà de 0,9 sur 255. Le seul pic tombe dans la rafale du moulin. Pas de pic aux limites de cycle (5 s et 10 s après le tap, images ~210 et ~360).
   - Moulin (`vague-moulin-diffs.txt`, `vague-moulin-debut-fin.jpg`) : une seule rafale, de 8 s à 15 s après le tap (cycle 2). La vitesse monte de 0,06 à 0,15, puis 7 en régime. À l'arrêt, elle redescend sur 8 images (4,0, 3,4, 1,6, 2,3, 1,7, 0,1, puis 0) : les ailes ralentissent puis s'arrêtent, sans sauter de pose.
   - Aucune animation après 17 s.

## Preuves
- `docs/designs/village-iso-v1/evidence/T16/` : `fige-gfxinfo.txt`, `maestro-fige-{1,2,3,4}.log`, `01-echec-point-264-783.jpg`, `02-etat.jpg`, `10-vague-avant.jpg`, `vague-ile-diffs.txt`, `vague-moulin-diffs.txt`, `vague-moulin-debut-fin.jpg`, `apk.sha256`, `films-lien.txt`.
- Hors dépôt : `~/.cache/bati-art-loop/iso/evidence/T16/t16-vague.mp4`.
- Coût FLUX : 0.

## Douteux ou non fait
- Le saut qu'annonçait l'ingénieur, quand une croissance démarre au milieu d'un cycle, n'a pas été provoqué.
- Lucioles et signal : non isolés dans le film (trop petits à ce zoom). Seul le moulin est mesuré.
- Le flux dépend du village du héros de cette `.perf` : un autre village demandera de relever les points à nouveau.

## Pour la suite
- `.maestro/iso-batiments.yaml` est modifié par qa (points et fermeture), à commiter avec T16.
