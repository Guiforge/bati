# T38-maestro : build .perf du HEAD 256b6db5 et flux Maestro du village iso

Statut proposé : prêt pour revue
Auteur : qa
Tour de revue : 1

## Fait
- Aucun code modifié. Build, installation, 5 flux, 2 captures.

## Preuves
- Émulateur `bati-bench` (emulator-5554) démarré (`sys.boot_completed=1`).
- Build : `scripts/iso/team/heavy.sh --gradle scripts/iso/team/gradle-perf.sh` : BUILD SUCCESSFUL in 1m 24s (63 tâches exécutées), APK 64 Mo daté 09:48, puis `android/gradlew -p android --stop`. Journal : `~/.cache/tmp/t38-build.log`.
- `scripts/iso/team/emu-adb.sh install -r android/app/build/outputs/apk/release/app-release.apk` : Success. Rien désinstallé.
- Carte ouverte avant les flux : `emu-adb.sh shell am start -W -a android.intent.action.VIEW -d "bati://dev-iso?fige=1" com.guiforge.bati.perf` (attention : un `&` dans l'URL coupe la commande côté appareil, `ambiance=nuit` est inutile, la nuit est le défaut).

Flux (`scripts/iso/team/emu-maestro.sh test <flux>`) :

| Flux | Résultat |
|---|---|
| `.maestro/iso-perf-onboarding.yaml` | vert (onboarding déjà fait, bloc sauté) |
| `.maestro/iso-batiments.yaml` | **rouge**, étape 20 |
| `.maestro/iso-rotation-gestes.yaml` | vert (rotation elle-même non jouée, le flux ne couvre que les gestes) |
| `.maestro/iso-perf-sessions.yaml` | vert (deux séances jouées, a ajouté des séances au héros .perf) |
| `.maestro/village-sheet-check.yaml` | **non lancé** : `appId: com.guiforge.bati.dev`, il exige le client dev et Metro, pas la build .perf |

Rouge `iso-batiments` : 3 bulles sur 4 passent (épaules, poitrine, dos ouvertes puis fermées par un tap en 1000,330). Échec à l'étape `assertNotVisible "Rises with your back"` (après le tap de fermeture en 1000,330 sur la bulle de la Carrière). Capture : `evidence/T38/maestro-batiments/.maestro/tests/2026-10-31_095051/iso-batiments/screenshots/step-020-assertCondition-Rises_with_your_back.png`. Cause lue sur la capture : la bulle de la Carrière est plus haute (liste « Sessions that raised it », 3 lignes) et couvre le point 1000,330 (bulle d'environ x 222-1056, y 228-1100 en pixels réels) : le tap tombe dans la bulle, qui reste ouverte. Le flux n'a pas été mis à jour avec cette hauteur ; l'appli ne semble pas en cause. Le 4e bâtiment (859,975, calisthénie) n'a pas été atteint.

Captures (dans `docs/designs/village-iso-v1/evidence/T38/`) :
- `p12-nuit-depart.png` : mode « Carte seule », palier 12, 21 terrains, nuit, cadrage de départ (après le tap sur « Carte seule »). L'île tient entièrement dans l'écran avec marge (bord gauche vers x=40, droit vers x=1060 sur 1080).
- `onglet-p12-nuit-depart.png` : mode « Onglet Village » de dev-iso. Il montre le village réel du héros (palier 1 sur 12, 13 bâtiments), pas le palier 12 : le palier 12 n'existe que dans « Carte seule ». Là, le cadrage à 1 déborde : la pointe gauche de l'île (chemin) et le bord droit sont coupés par les bords de l'écran.
- Logs lourds (> 2 Mo) : `~/.cache/bati-art-loop/iso/evidence/T38/` (`maestro-sessions/`, `maestro-batiments/logs`, `maestro-rotation/device-logcat.txt`).

## Douteux ou non fait
- Palier 12 dans l'onglet réel : non capturé, le héros .perf est au niveau 2 (palier 1). Pour le voir, il faudrait un héros de niveau élevé.
- `village-sheet-check` non exécuté (build .dev + Metro).
- Pas de mesure de perf dans cette tâche.

## Pour la suite
- Corriger `iso-batiments.yaml` : le point de fermeture 1000,330 n'est plus sûr (bulle haute) ; fermer par Back ou un point hors bulle.
- Vérifier le cadrage à 1 dans l'onglet au palier bas : l'île touche les deux bords de l'écran.
