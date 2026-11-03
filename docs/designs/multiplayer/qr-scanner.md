# Le scanner QR sans Google

Module : [`modules/bati-scanner`](../../../modules/bati-scanner). Choix : **zxing-cpp + CameraX**, dans un
module Expo à nous.

## La comparaison

| | zxing-cpp + CameraX (retenu) | zxing-android-embedded | Paquet RN existant |
| --- | --- | --- | --- |
| Licence | Apache-2.0 | Apache-2.0 | variable |
| Classes `com.google.*` ajoutées | aucune du scanner | **oui** : `com.google.zxing.*`, sa dépendance `core` | selon le paquet |
| Code Google propriétaire | non | non | **oui** pour les principaux |
| `.so` en 16 Ko | oui, `0x4000` mesuré | sans objet (Java) | |
| Caméra | CameraX, maintenu | sa propre pile, sur l'ancienne API | |
| Poids dans l'APK | +1,95 Mo (arm64 + x86_64) | non mesuré | non mesuré |
| Écarté parce que | | contredit à la lettre le critère `com.google.*` | voir ci-dessous |

**zxing-android-embedded** n'a pas été construit : son `pom` suffit, il tire `com.google.zxing:core`. Ce code
est libre et F-Droid l'accepte, ses signatures ne le visent pas. Il reste écarté parce qu'il ajoute des
classes `com.google.*` là où zxing-cpp n'en ajoute aucune.

**Les paquets RN.** `expo-camera` et `react-native-vision-camera` passent par ML Kit pour les codes. La
signature F-Droid `com.google.mlkit` vise aussi `io.github.g00fy2.quickie`.
`react-native-nitro-zxing` (MIT, publié le 31/10/2026) demande vision-camera, nitro-modules et nitro-image
en pairs, soit quatre paquets natifs pour une fonction. `react-native-qrcode-scanner` date de 2022 et
dépend de `react-native-camera`, abandonné. Aucun n'a été construit.

## Les critères de GO

Mesurés sur l'APK de release, build `.perf` sans modification de la recette F-Droid.

| Critère | Résultat |
| --- | --- |
| `npm run licenses:check` | passe, 900 paquets, aucun bloqué |
| Aucune classe Play Services, ML Kit ou visée par F-Droid | 0, `scripts/apk-no-google.py` avec `fdroid/suss-code-signatures.txt` |
| Aucune classe `com.google.*` | **pas à la lettre**, voir ci-dessous |
| `LOAD` arm64 à `0x4000` | oui, `libzxingcpp_android`, `libimage_processing_util_jni`, `libsurface_util_jni` et tous les autres |
| Lit un QR sur la caméra virtuelle | oui, sur APK de release x86_64, à 2 m d'un code affiché par un autre émulateur |
| Permission demandée à l'ouverture du scanner | `PermissionsAndroid.request` dans le seul bouton « Scan », aucun appel au lancement |

**`com.google.*`.** `main` en contient déjà 451 sans scanner, toutes libres : Material, Guava, Gson. Le
scanner en ajoute 0. La mesure en voit une nouvelle, `com.google.android.material.behavior.SwipeDismissBehavior$2`,
une classe interne de Material que R8 a gardée cette fois : même bibliothèque, déjà là, rien du scanner.

Le mapping R8 fait foi : R8 renomme les classes, donc un simple listing du dex ne verrait rien.

## Ce qui reste à prouver

Seul un vrai build de f-droid.org le prouvera : les `.so` de zxing-cpp et CameraX arrivent précompilés de
Maven, comme le reste de nos AAR, et aucune signature ne les vise aujourd'hui.

## Notes de mise en œuvre

- `CAMERA` reste retirée de ce qui part (`withAndroidTrimPermissions`) tant que le multijoueur est derrière
  son drapeau : aucune permission sur l'écran d'installation pour un écran que personne n'atteint. Le lot qui
  ouvre le scanner la rend, avec `fdroid/expected-permissions.txt`, le test des permissions et `privacy.md`.
  Pour tester : `EXPO_PUBLIC_MULTIPLAYER=1 npx expo prebuild -p android --no-install`, le même drapeau au build, et
  un `prebuild` sans lui avant de commiter.
- Les deux `uses-feature` en `required="false"` gardent installable un téléphone sans caméra.
- Le code de la caméra n'existe qu'à l'écran : liaison à l'attachement de la vue, déliaison au détachement.
- L'écran Crédits ne liste que l'arbre npm : zxing-cpp et CameraX n'y sont pas, comme tous les AAR Gradle.

## Tester sur émulateur

```bash
emulator -avd <avd> -read-only -camera-back virtualscene -virtualscene-poster wall=<qr.png>
```

`scripts/emu.sh start` accepte `EMU_EXTRA_ARGS` pour ces deux dernières options.
