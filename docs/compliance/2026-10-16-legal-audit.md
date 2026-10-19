# Audit légal et conformité, 16 octobre 2026 (L-01)

**Ce n'est pas un avis juridique.** C'est une revue technique du dépôt (commit `659479b5`) contre des sources publiques. Chaque point est classé :

- **conforme** : la preuve est dans le dépôt ou dans une source officielle citée ;
- **à corriger** : un écart constaté, avec une tâche proposée et son effort (S = moins d'une demi-journée, M = jusqu'à 1,5 jour) ;
- **avis juridique** : une question de droit qu'un avocat doit trancher, que le dépôt ne peut pas prouver.

Aucun code, aucune licence et aucun document légal n'a été modifié. Ce fichier vit dans `docs/compliance/` et non dans `docs/legal/`, que GitHub Pages publie.

Limite : les points qui dépendent de la Play Console (déclaration santé, sécurité des données saisie, IARC, public cible), de la vérification des développeurs, du statut micro-BIC, de l'accord de l'employeur et de data.inpi.fr / TMview ne sont pas lisibles depuis le dépôt. Ils sont classés « avis juridique » ou « à corriger » (vérifier à la main), jamais « conforme » sans preuve.

## Résumé

| Statut | Nombre |
|---|---|
| conforme | 26 |
| à corriger | 18 |
| avis juridique | 10 |

Les corrections les plus utiles avant le premier euro : la notice des dépendances dans l'APK (A1), le DCO et TRADEMARKS.md (B3, B4), les mentions légales et la page de conditions de Bati+ (F2, F3).

---

## A. Licences et crédits

| # | Point | Statut | Preuve | Tâche proposée |
|---|---|---|---|---|
| A1 | Notice des dépendances dans l'APK (MIT, BSD, ISC et Apache exigent de conserver l'avis de copyright et le texte de licence) | **à corriger** | `npx license-checker-rseidelsohn --production --summary` : 762 MIT, 92 MIT*, 46 ISC, 19 BSD-3, 13 Apache-2.0, 12 BSD-2, 9 BlueOak, etc. `app/credits.tsx` ne liste que Expo, React Native, Tamagui, Zustand et Drizzle en une phrase (`locales/en.json`, `credits.open_source_body` : « Built with Expo + React Native, Tamagui, Zustand... »). Aucun écran Licences, aucun texte de licence embarqué. Source : texte des licences MIT/BSD/Apache-2.0 (https://opensource.org/license/mit, https://www.apache.org/licenses/LICENSE-2.0 §4). | Générer au build un fichier de notices (nom, version, licence, texte) et l'afficher dans un écran Licences depuis Crédits. Déjà prévu dans P-03. **M** |
| A2 | Licences des dépendances compatibles avec MIT et F-Droid | conforme | Gate CI `.github/workflows/ci.yml:66-70` (`--failOn` GPL/AGPL/LGPL/SSPL/BUSL/UNLICENSED). Cas particuliers lus : MPL-2.0 (`lightningcss`, outil de build), CC-BY-4.0 (`caniuse-lite`, données de build), `node-forge` en double licence BSD-3 OU GPL-2.0 (on prend BSD-3), 5 paquets `@tamagui/*` en UNKNOWN (champ manquant, Tamagui est MIT). | aucune |
| A3 | Cas UNKNOWN et double licence : confirmer par écrit | à corriger | `@tamagui/context-menu`, `focus-guard`, `menu`, `native`, `toast` : `UNKNOWN` en 2.7.7. Le commentaire de CI l'affirme MIT sans le prouver. | Vérifier le `LICENSE` du dépôt tamagui/tamagui et ajouter une ligne dans `ci.yml` ou dans la notice A1. **S** |
| A4 | Polices (OFL-1.1) | à corriger | `@expo-google-fonts/{alegreya,inter,noto-sans}` : `MIT AND OFL-1.1`. Copies woff2 dans `docs/legal/assets/fonts/` (site). L'OFL exige de joindre le texte de licence et l'avis de copyright avec les polices redistribuées, et interdit de vendre la police seule. `app/credits.tsx` ne cite aucune police. Source : https://openfontlicense.org/ (conditions 1 et 2). | Ajouter les trois polices et le texte OFL à la notice A1 et au site. **S** |
| A5 | Art du dépôt : licence et provenance | conforme | `LICENSE` (section « NOTE ON THE ARTWORK ») : CC BY-SA 4.0 pour `assets/`. `scripts/provenance.json` consigne modèle, prompt, seed, référence, licence par image. NB : le brief citait `assets/images/**/provenance.json` ; il n'existe pas, le fichier est `scripts/provenance.json` (le `LICENSE` pointe bien celui-là). | aucune |
| A6 | Art IA : FLUX.2 via l'API, mention dans les Crédits, originaux gardés | conforme (partiel) | API directe : `scripts/provenance.json` (« Black Forest Labs (direct API) », « BFL Developer Terms §3.b »). Mention : `locales/en.json` `credits.illustrations_note` (« AI-generated with FLUX »). Originaux : `README.md:243-256` dit que les originaux signés C2PA sont gardés, hors dépôt. Les conditions BFL elles-mêmes sont à relire par un humain à chaque version (voir A7). | aucune |
| A7 | Conditions BFL : usage commercial et abonnement payant | avis juridique | Le dépôt cite le §3.b (UE §4.b) : le titulaire du compte API possède la sortie. La validité de cette chaîne (et le droit de relicencier en CC BY-SA des sorties d'IA, dont la protection par le droit d'auteur est incertaine en droit français et européen) est une question de droit. Source : https://bfl.ai/legal (conditions développeur). | Faire confirmer par un avocat avant la vente de Bati+. |
| A8 | Dérivés d'Everkinetic / workout-guide (CC BY-SA) | conforme | Dépôt Everkinetic : CC BY-SA 4.0 (https://github.com/everkinetic/data, vérifié le 16/10/2026). Crédits dans l'app : `app/credits.tsx:73-104` (Everkinetic, workout-guide, Mr. Yoga, texte de la licence), et `README.md:250-256`. Le partage à l'identique porte sur les images, pas sur le code (`LICENSE`). Les entrées dérivées sont marquées dans `scripts/provenance.json` (par ex. lignes 1360, 1377). | aucune |
| A9 | Attribution CC BY-SA : indication des modifications et lien licence | à corriger | La CC BY-SA 4.0 §3.a demande d'indiquer qu'on a modifié l'œuvre et de donner l'URL de la licence. Le lien est dans `credits.tsx`, et « redrawn by FLUX » est dans `provenance.json` et `credits.illustrations_note`, mais le texte affiché dit « start from a pose drawn by » sans écrire « modifié ». | Reformuler `credits.illustrations_note` dans les 5 locales : « adapté de », avec « modifié » explicite. **S** |
| A10 | Icônes game-icons.net (CC BY 3.0) | à corriger | Licence et auteurs : `assets/game-icons.net.svg-foreground-white/icons/license.txt`. Dans l'app : `credits.tsx:106-147`, `locales/en.json` `game_icons_note`, bouton « View authors » vers la page d'auteurs du site. Le CC BY 3.0 §4(b) demande le nom de l'auteur de chaque icône utilisée. L'app ne cite que « Lorc, Delapouite and contributors » de façon générique. Source : https://creativecommons.org/licenses/by/3.0/legalcode. | Lister les auteurs des icônes réellement utilisées (script qui lit les imports de `useGameIcon`) dans l'écran Licences. **S** |
| A11 | Attribution des cartes (OpenFreeMap, OSM) | conforme | `constants/mapStyle.ts:228-239` (`MAP_ATTRIBUTION = "© OpenMapTiles, © OpenStreetMap contributors."`), `components/session/MapFootnote.tsx`, `src/gps/mapThumb.ts` (le snapshotter peint l'attribution). OSM exige « © OpenStreetMap contributors » (https://www.openstreetmap.org/copyright) ; OpenFreeMap : https://openfreemap.org/ (attribution OpenMapTiles + OSM). | aucune |
| A12 | Carte partagée en image : l'attribution voyage avec | conforme | `components/share/ShareCard.tsx:71-77` imprime `MAP_ATTRIBUTION` dès que la carte est prête (commentaire ODbL), et `src/gps/mapThumb.ts:29-32` documente que chaque surface qui montre ces images imprime le crédit. | aucune |
| A13 | Sons générés | conforme | `scripts/generate-sounds.py` (sinus purs, `wave` de la stdlib) et `scripts/provenance.json:4446-4451` : aucun échantillon tiers, reproductible à l'octet près. Fichiers : `assets/sounds/{go,switch,tick}.wav`. | aucune |
| A14 | Badges F-Droid et GitHub | conforme | `LICENSE` : « each under its project's own brand terms ». | aucune |

## B. Open source et payant

| # | Point | Statut | Preuve | Tâche proposée |
|---|---|---|---|---|
| B1 | Fichiers LICENSE, CONTRIBUTING, SECURITY présents | conforme | `LICENSE` (MIT, Guillaume Pouyat, 2026), `CONTRIBUTING.md`, `SECURITY.md`, `.github/CONTRIBUTING.md` (pointeur). | aucune |
| B2 | Séparation MIT / module de paiement propriétaire (P-04) | conforme (rien à vérifier) | Aucun code de facturation dans le dépôt : recherche `billing\|subscription\|abonnement` hors locales et `node_modules` ne trouve aucun module ; permissions de `fdroid/expected-permissions.txt` sans `BILLING`. Le module propriétaire doit être tiré par Gradle et jamais copié ; ce sera à tester quand P-04 existera. | Quand P-04 arrive : ajouter un test qui échoue si `com.android.billingclient` ou le module apparaît dans l'arbre source ou dans l'APK F-Droid. **S** |
| B3 | Contributions : DCO / CLA | à corriger | Ni `DCO`, ni `Signed-off-by`, ni CLA dans `CONTRIBUTING.md`, `.github/CONTRIBUTING.md` et `.github/pull_request_template.md`. Une contribution MIT tierce finira dans la version payante : MIT le permet, mais l'auteur doit l'avoir accepté. Source : https://developercertificate.org/. | Ajouter la section DCO (Signed-off-by) à `CONTRIBUTING.md`, et un check CI. Déjà dans P-03. **S** |
| B4 | TRADEMARKS.md : ce qu'un fork peut faire du nom et du logo | à corriger | `TRADEMARKS.md` absent. MIT n'accorde aucun droit sur le nom ni sur l'icône. | Rédiger `TRADEMARKS.md` (nom « Bati », icône, nom de package `com.guiforge.bati`, ce qu'un fork doit renommer). **S** |
| B5 | Marque : recherche d'antériorité | avis juridique | Recherche data.inpi.fr et TMview non faisable ici (outils interactifs, aucun accès fait). À faire par toi, puis avis avocat sur le dépôt éventuel. | Tâche manuelle **S**, puis avis. |
| B6 | Marques du combat léger (K-01) | à corriger | Règle de la feuille de route : « Tae Bo » (déposée US et CA), « BODYCOMBAT » (Les Mills), « Boxercise » (déposée UK et UE). Recherche dans `locales/en.json` et `fr.json` : aucun de ces noms. Reste à garantir pour les futurs contenus. | Ajouter un test `content-invariants` qui refuse ces chaînes, « kickboxing class » et « self-defense » / « self-défense » dans les locales et `fastlane/`. **S** |
| B7 | F-Droid sans module propriétaire | conforme | `fdroid/fdroiddata-recipe.yml`, `scripts/strip-play-services.mjs`, `fdroid/expected-permissions.txt` (liste vérifiée en CI à la release). | aucune |
| B8 | Licence des traductions | à corriger | Les 5 locales (`locales/*.json`) sont sous la licence du code (MIT) par défaut ; aucune ligne ne le dit. La politique dit que l'allemand, l'espagnol et le russe sont traduits par IA. Un traducteur humain contribuant plus tard aurait besoin de savoir sous quelle licence. | Une ligne dans `CONTRIBUTING.md` : les traductions sont MIT. **S** |
| B9 | Fork : ce qu'il a le droit de faire de l'art | conforme | `LICENSE` : CC BY-SA 4.0, et `README.md` « fork away: the art comes with you ». | aucune |

## C. Google Play

| # | Point | Statut | Preuve | Tâche proposée |
|---|---|---|---|---|
| C1 | Déclaration santé (Health apps declaration) | à corriger | Non lisible depuis le dépôt. L'app est un suivi d'entraînement et de GPS ; la déclaration doit être remplie dans la Play Console. Source : https://support.google.com/googleplay/android-developer/answer/14738291. | Ouvrir la Console, relire la déclaration, noter la date dans `docs/`. **S** |
| C2 | Sécurité des données cohérente avec la réalité | à corriger | Réalité code : INTERNET, tuiles OpenFreeMap (position approximative), api.github.com, sync WebDAV chiffrée (`SECURITY.md`, `docs/legal/privacy.md`, `fastlane/metadata/android/en-US/full_description.txt`). La Console n'est pas lisible ici. Le formulaire doit déclarer : position (collectée et partagée de façon approximative avec l'hôte des tuiles, seulement si l'utilisateur active la carte, facultatif), pas de chiffrement en transit sauf HTTPS, suppression à la demande. Source : https://support.google.com/googleplay/android-developer/answer/10787469. | Rapprocher le formulaire de `privacy.md` ligne à ligne. **S** |
| C3 | Public cible et classification IARC | avis juridique | Aucune trace de ces réponses dans le dépôt. `privacy.md` dit « not directed at children under 13 ». Le public cible doit être « 18+ » ou « 13+ » en cohérence avec le texte ; IARC : sport, aucune violence réelle, mais des « combats de boss » à déclarer. | Relever les réponses de la Console dans `docs/`, vérifier la cohérence avec l'âge minimum (F4). **S** |
| C4 | Règles des abonnements (prix clair, essai, résiliation, lien Gérer l'abonnement) | avis juridique | Rien n'est vendu aujourd'hui. Exigences : prix et renouvellement clairs avant l'achat, durée de l'essai, résiliation simple. Source : https://support.google.com/googleplay/android-developer/answer/9900533. | À spécifier dans P-04 ; relecture avocat avant la mise en vente. |
| C5 | Services de premier plan et permissions justifiées | conforme | `fdroid/expected-permissions.txt` (liste exacte de l'APK, diff en CI), `__tests__/android-permissions.test.ts` (cliquet avec justification de chaque permission), `docs/legal/privacy.md` section « Permissions, and why » (`FOREGROUND_SERVICE_LOCATION`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, photos). Source : https://support.google.com/googleplay/android-developer/answer/9888170 (usage de la position en arrière-plan et services de premier plan). Le Play demande aussi une vidéo de démonstration pour `FOREGROUND_SERVICE_LOCATION` : à garder à jour dans la Console. | aucune |
| C6 | Vérification des développeurs 2027 | avis juridique | Dépend du compte Play et d'une identité de développeur ; non lisible ici. Source : https://developer.android.com/developer-verification. | Vérifier la date limite sur la page officielle, et si le sideload (APK GitHub) reste autorisé. **S** |
| C7 | Fiche sans « best » | conforme | `fastlane/metadata/android/*/{title,short_description,full_description}.txt` : aucune occurrence de « best » ou de superlatif de classement (recherche faite sur les cinq langues : de-DE, en-US, es-ES, fr-FR, ru-RU). Source : https://support.google.com/googleplay/android-developer/answer/9898842 (métadonnées). | aucune |
| C8 | Récompenses d'invitation (compagnons) | avis juridique | Fonction non codée (`docs/planning/roadmap.md`). La politique Play sur les incitations interdit de récompenser un avis ou une installation de façon trompeuse ; une récompense d'invitation est tolérée mais à relire. Source : https://support.google.com/googleplay/android-developer/answer/9898684. | Relire la règle avant de coder la fonction. |
| C9 | Tailles de listing, captures | conforme | `__tests__/play-screenshot-cap.test.ts`, `fastlane/metadata/README.md`. | aucune |

## D. Vie privée (RGPD)

| # | Point | Statut | Preuve | Tâche proposée |
|---|---|---|---|---|
| D1 | Politique exacte sur ce qui sort du téléphone | conforme | `docs/legal/privacy.md` (mise à jour 2026-10-04) décrit trois destinations : `tiles.openfreemap.org` (carte), `api.github.com` (version), serveur WebDAV choisi (sync chiffrée). Code : `src/updateCheck.ts`, `src/cloudSync.ts`, `constants/mapStyle.ts:31-35`, plugin `.biome/plugins/noJsNetwork.grit` qui interdit tout autre appel réseau JS. Le partage passe par la feuille de partage système (`components/share/sendCard.ts`) : rien n'est envoyé par l'app. Le courriel de retour est un `mailto:` édité par l'utilisateur. | aucune |
| D2 | Politique à jour des évolutions depuis le 4 octobre | à corriger | La date est 2026-10-04. Depuis, le Bilan de l'année (C-01) partage une image. La politique parle du partage de fichier, pas explicitement de l'image de partage (la capture est locale, sans réseau). À confirmer avec le code `components/share/ChronicleCard.tsx`. | Ajouter une phrase sur les images de partage dans les 2 langues de la politique, et mettre à jour la date. **S** |
| D3 | Données de séance comme données de santé (art. 9 RGPD) | avis juridique | L'historique d'entraînement est conservé uniquement sur l'appareil ; Bati ne le traite pas (aucun serveur). La sync chiffrée de bout en bout fait que l'hébergeur de l'utilisateur ne peut rien lire. Reste la question de savoir si Bati devient responsable de traitement dès que Bati+ ou un compte arrivent. Source : https://eur-lex.europa.eu/eli/reg/2016/679/oj (art. 4, 9). | Avis avocat avant tout compte ou serveur de Bati. |
| D4 | Droits des utilisateurs | conforme | `privacy.md` section « Your rights » : tout est sur l'appareil, export par la sauvegarde, effacement par la désinstallation. Contact : contact@getbati.app. | aucune |
| D5 | Position de l'hôte de tuiles : transparence | conforme | `privacy.md` section « The map » : dit explicitement que la position approximative et l'IP partent, et que la carte est désactivée par défaut. | aucune |
| D6 | Télémétrie opt-in si elle arrive | conforme (sans objet) | Aucune télémétrie aujourd'hui (`SECURITY.md`, `privacy.md` « What Bati never does »). Le jour où elle arrive : consentement préalable (ePrivacy art. 5(3)), mise à jour de la politique et de la sécurité des données Play. | aucune |
| D7 | Politique : traductions et langue faisant foi | conforme | Anglais et français complets ; allemand et espagnol renvoient vers l'anglais ; le russe n'est pas cité dans les encadrés. | aucune |

## E. Sport et santé

| # | Point | Statut | Preuve | Tâche proposée |
|---|---|---|---|---|
| E1 | Hors du champ du dispositif médical | conforme | Fiche : « NOT A MEDICAL DEVICE » dans les cinq `full_description.txt` (par ex. `en-US/full_description.txt:36-37`). Aucune fonction de diagnostic ou de traitement. Le règlement UE 2017/745 vise une finalité médicale déclarée (https://eur-lex.europa.eu/eli/reg/2017/745/oj, art. 2). | aucune |
| E2 | Écran Sécurité et avertissements | conforme | `app/safety.tsx`, `locales/en.json` bloc `safety` (avant, pendant, « Bati is not a coach ») et ligne d'accueil `onboarding.safety_line`, lien depuis `app/onboarding/training-level.tsx:175-186`. | aucune |
| E3 | Formulation : règle de la douleur, jamais « brûler » | conforme | Recherche `burn\|calorie\|kcal\|diagnos\|lose weight\|brûl` dans `locales/en.json` et `fr.json` : la recherche touche `locales/en.json:1477,2437,2449` et `locales/fr.json:2541,2553`, ce sont des répliques narratives (lanternes, boss), pas des promesses de dépense calorique, donc conforme. `safety.during_body` : « Sharp pain is not effort. Stop. » | aucune |
| E4 | Âge minimum | à corriger | `privacy.md` « Children » : « not directed at children under 13 ». Rien dans l'app ne le demande ni ne le mentionne ; la sécurité des données et le public cible Play doivent suivre. En France, l'âge du consentement numérique est 15 ans (loi Informatique et Libertés, art. 45), pertinent seulement dès qu'un traitement existe. | Décider l'âge (13 ou 16) et l'écrire dans la politique, la fiche et la Console. **S** |
| E5 | Avertissement pour les actions à risque (sorties GPS, circulation) | à corriger | `safety.tsx` couvre l'effort, pas la sortie en extérieur (circulation, attention au téléphone). | Ajouter une ligne dans `locales/*.json` `safety` (5 langues) sur la sécurité des sorties. **S** |

## F. Commercial

| # | Point | Statut | Preuve | Tâche proposée |
|---|---|---|---|---|
| F1 | Statut micro-BIC et accord de l'employeur | avis juridique | Hors dépôt (feuille de route : statut choisi le 12/10, accord reçu le 09/10). À relire avec un comptable et le contrat de travail (clause d'exclusivité, propriété des créations). | Tâche manuelle. |
| F2 | Mentions légales du site (avec un téléphone pro) | à corriger | `docs/legal/index.html` : aucune section de mentions légales (recherche `mentions\|éditeur\|hébergeur`, sans résultat). La LCEN (art. 6-III) impose l'identité de l'éditeur et de l'hébergeur ; un particulier peut rester anonyme chez l'hébergeur en donnant ses coordonnées à celui-ci. Source : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164. | Ajouter une page « Mentions légales » (éditeur, hébergeur GitHub Pages, contact). **S** |
| F3 | Page « Conditions de Bati+ » | à corriger | Absente. Doit dire notamment qu'un achat Play ne suit pas sur un iPhone, le prix, la résiliation, le droit de rétractation applicable aux contenus numériques. | Rédiger la page avant P-04, puis relecture avocat. **M** |
| F4 | Résiliation en 3 clics | à corriger | Sans objet tant que rien n'est vendu ; à spécifier dans P-04 (lien « Gérer mon abonnement » de Play, https://support.google.com/googleplay/answer/7018481). | Critère d'acceptation de P-04. **S** |

## G. Sécurité

| # | Point | Statut | Preuve | Tâche proposée |
|---|---|---|---|---|
| G1 | SECURITY.md | conforme | `SECURITY.md` : contact, périmètre, risque connu `decode-uri-component` expliqué. | aucune |
| G2 | Audit des dépendances en CI | à corriger | `ci.yml` vérifie les licences, `dependabot.yml` ouvre les mises à jour, `zizmor` audite les workflows. Aucun `npm audit` ni OSV dans la CI (recherche `audit\|osv` dans `.github`). Le risque `decode-uri-component` n'est connu que par `SECURITY.md`. | Ajouter `npm audit --omit=dev --audit-level=high` avec une allowlist de l'avis accepté. **S** |
| G3 | Revue du chiffrement (`modules/bati-crypto`) | conforme (revue externe à prévoir) | Argon2id vérifié contre RFC 9106 et Node (`BatiCryptoV3Test.kt`), PBKDF2 contre RFC 7914 (`BatiCryptoCoreTest.kt`), AES-256-GCM, clé dans le stockage protégé, exclue de la sauvegarde système (`privacy.md`). Cette revue ne remplace pas un audit cryptographique indépendant avant d'y mettre de l'argent. | Prévoir une relecture externe de `modules/bati-crypto` avant Bati+. **M** |
| G4 | Keystore de release sauvegardé ailleurs | avis juridique (hors dépôt) | `AGENTS.md` : « lose it and the published app can never be updated again ». Aucune preuve de copie hors machine ne peut se lire dans le dépôt. | Confirmer à la main deux copies hors ligne. **S** |
| G5 | Passkeys | avis juridique (sans objet) | Aucun compte aujourd'hui, donc pas de passkey. À reconsidérer si un compte Bati+ apparaît. | Aucune. |
| G6 | Permissions et cliquet | conforme | `fdroid/expected-permissions.txt` + `__tests__/android-permissions.test.ts`. | aucune |

## Liste des tâches proposées

| Tâche | Origine | Effort |
|---|---|---|
| Écran Licences avec notices générées au build (MIT, BSD, ISC, Apache, OFL) | A1, A4 | M |
| Vérifier la licence des 5 paquets `@tamagui/*` UNKNOWN | A3 | S |
| Reformuler « adapté / modifié » dans `credits.illustrations_note` (5 locales) | A9 | S |
| Auteurs des icônes game-icons réellement utilisées dans l'écran Licences | A10 | S |
| Section DCO et check CI | B3 | S |
| `TRADEMARKS.md` | B4 | S |
| Test qui refuse les marques du combat léger et « kickboxing class » | B6 | S |
| Ligne « les traductions sont MIT » dans `CONTRIBUTING.md` | B8 | S |
| Test anti-facturation dans l'arbre et l'APK F-Droid, à l'arrivée de P-04 | B2 | S |
| Déclaration santé, sécurité des données, public cible dans la Console (relevé daté dans `docs/`) | C1, C2, C3 | S |
| Vérification des développeurs 2027 : date et effet sur le sideload | C6 | S |
| Phrase sur les images de partage dans la politique, mise à jour de la date | D2 | S |
| Fixer l'âge minimum et l'écrire partout | E4 | S |
| Ligne de sécurité pour les sorties en extérieur (5 locales) | E5 | S |
| Page « Mentions légales » | F2 | S |
| Page « Conditions de Bati+ » | F3 | M |
| Résiliation : critère d'acceptation de P-04 | F4 | S |
| `npm audit` en CI avec allowlist | G2 | S |
| Relecture externe de `modules/bati-crypto` | G3 | M |

## Points pour l'avocat

A7 (conditions BFL et droit d'auteur sur l'art IA), B5 (marque), C3 (public cible), C4 et C8 (abonnements, invitations), C6 (vérification), D3 (données de santé et responsable de traitement), F1 (statut et employeur), G4, G5. Rien n'est à vendre avant que ces points soient vus.
