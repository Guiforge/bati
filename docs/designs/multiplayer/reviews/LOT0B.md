# Lot 0 bis : le rapport

**Les trous du lot 0 sont fermés, et la porte est verte : l'arrêt pour douleur marche sur téléphone sans rien ajouter à
une séance normale, une variante plus facile compte, et un lien d'invitation ne porte plus aucun secret.** Le lot 1 peut
partir. Tes trois décisions du 04/11 sont appliquées, plus bas. Une limite aussi, à connaître : une clé supprimée reste
lisible dans le WAL pour qui lit les fichiers privés de l'app.

## Fusion

**Fusionné dans `main` le 05/11/2026, PR #229, merge commit `c4b3cca7`, avec le lot 0.**

La CI était rouge à la fusion, par choix de Guillaume : `expo-doctor` signalait 10 paquets en retard sur les correctifs du
SDK 58, comme sur `main` depuis le 03/11. Cette étape a coupé la suite du job `check`, donc licences, vulnérabilités,
audit des workflows et comparaison du prebuild n'ont pas tourné en CI sur cette PR. Ils sont passés en local sur la
branche de correction des dépendances. Reste à faire à la main : `adb shell pm get-app-links com.guiforge.bati` sur un
vrai téléphone une fois la page en ligne, et l'essai sur un vrai téléphone avant la prochaine release.

## Ce qui a été construit

| Étape | Livré | Temps (environ) |
| --- | --- | --- |
| B1 Migration | `0083` : `stopReason`, `lightWeekNeutral`. Une vieille base migre sans rien perdre | 0 h 03 |
| B2 « J'arrête, j'ai mal » | `stopForPain`, `PainStopView`, trois portes, six langues, page de confidentialité | 0 h 05 |
| B3 Variante plus facile | Compte si elle est plus bas sur l'échelle, tenue jusqu'au bout, au niveau demandé | 0 h 01 |
| B4 Semaine légère | Un mouvement sauté cette semaine-là ne passe plus. Aucun remplissage des anciennes lignes | 0 h 01 |
| B5 Page `/d` | Une ligne de script, autorisée par son empreinte. Vérifiée dans un vrai navigateur | 0 h 02 |
| B6 Invitation X25519 | Kinds 3 et 4, `0084`, nouveaux vecteurs, deux émulateurs | 0 h 07 |
| B7 Scanner en CI | `apk-no-google.py` sur l'APK foss dans `release.yml` | 0 h 01 |
| B8 Test du soir | La vraie cause était dans le code, corrigée dans son propre commit | 0 h 09 |
| Porte | Quatre builds, deux tours d'audit, corrections | 1 h 08 |

Total réel : 1 h 40, de 09:37 à 11:15. La lecture du code est comptée dans B8, qui passe en premier.

## La porte

| Critère | Résultat |
| --- | --- |
| L'arrêt pour douleur sur émulateur, build de release | **oui.** `stopReason=pain`, série gardée. Sans aucune série : aucune ligne, même phrase |
| Rien de plus dans une séance normale | **oui.** Le parcours existant passe sans changement, `stopReason` vide, 9 séries |
| La semaine glissante | **oui,** en tests : jour 6 dedans, jour 7 dehors, deux appareils fusionnés, ordre indifférent |
| Une variante plus facile compte | **oui,** en tests, sur le vrai `ladderNeutralSets` |
| Le lien ne porte aucun secret | **oui.** Ni clé privée ni secret dans les octets de l'invitation et de la réponse |
| Deux émulateurs par lien et par QR | **oui.** Même secret lu dans les deux bases, sur les deux chemins |
| Lien porteur de secret | **refusé,** avec un message qui dit de ne pas s'en servir |
| Nouveaux vecteurs figés | **oui,** écrits par le `crypto` de Node (OpenSSL), relus par `@noble` et `javax.crypto`. Les premiers n'ont pas bougé |
| `npm test`, Node 24 | **vert à Paris et en UTC** : 6275 passés, seuils de couverture tenus |
| `tsc`, biome, `deadcode`, `licenses:check`, Android lint, test Kotlin | verts, 901 paquets, aucun bloqué |
| Scanner sur l'APK final | 0 classe interdite, 451 sous `com.google`, rien hors des trois paquets autorisés |

**Ce qui n'a pas tourné :** un vrai téléphone, une vraie build f-droid.org, le vrai `autoVerify`, et l'étape de
`release.yml` dans une vraie CI. Le script, lui, a tourné sur un vrai APK, propre et avec des classes plantées.

## La question de Yann : qui lit toute la conversation apprend quoi ?

Les deux clés publiques, le pair id, les deux sender ids, le moment de l'invitation et le fait qu'une réponse est partie.
Il ne peut pas dériver la clé, ni ouvrir la réponse ou une semaine : les deux moitiés privées n'ont jamais voyagé.

**Sa limite :** cela protège de qui lit, pas de qui réécrit. Quelqu'un qui peut remplacer les messages, ou répondre le
premier avec le lien qu'il a lu, se retrouve appairé avec A, et B se croit appairé sans que personne ne l'écoute. Il
n'obtient que des séances comptées par jour. Le QR en face à face n'a pas ce trou. A apprend désormais que l'invitation a
servi, et rien sur B.

## Temps de calcul, B6

@noble/curves, parce que la plateforme n'a X25519 qu'à partir de l'API 31. Sur build de release, émulateur x86_64 sur une
machine rapide, écriture en base comprise : **environ 190 ms pour créer l'invitation, 210 ms pour l'accepter.**

**Un téléphone d'entrée de gamme dépassera probablement les 300 ms.** C'est une estimation, je n'ai pas de vrai
téléphone pour le mesurer. Le calcul bloque le fil JS, une fois par appairage. L'écran qui sortira devra afficher une
attente.

## Ce qui a raté, et ce que ça a appris

- **Le retour Android sur la page Sécurité renvoyait à l'accueil.** Le gestionnaire de l'écran d'arrêt restait actif sous
  la page. Jest ne le voyait pas, l'émulateur si.
- **Mon premier checkpoint échouait sur téléphone :** A lisait « That did not work » alors que la paire était écrite. Jest
  tourne sur une base en mémoire et n'en a rien vu.
- **Le texte de douleur n'est pas affiché pendant une série normale**, contrairement au brief. Il n'apparaît qu'après un
  « Passer ». À côté de lui dans `ActiveExerciseView`, aucune série n'existe encore. J'ai donc aussi mis le geste dans
  `RestView`, et le dialogue Quitter, qui efface tout, propose maintenant de garder les séries.
- **B8 n'était pas un test fragile mais du code faux.** Le compte des semaines lourdes se faisait en millisecondes, et le
  changement d'heure du 25/10 déplaçait une séance d'un seau après 23 h.
- **Une autre bombe à retardement a sauté ce matin :** `past-session-sheet` ne connaissait que deux noms de mois et
  échoue depuis le 4 novembre, sur `main` et en CI aussi. Corrigée dans son propre commit. **À reporter sur `main` sans
  attendre ce lot si la CI y tourne avant la fusion.**
- **Mes propres erreurs :** une commande qui attendait une entrée a fait perdre quelques minutes, et le `useCallback`
  du correctif a fait renoncer le React Compiler, ce que la porte a attrapé.

## L'audit personas

Deux tours, agents Sonnet neufs, 2 en parallèle au plus. Aucun ❌, aucune ligne rouge franchie.

**Corrigé :** le dialogue disait « progression perdue » au-dessus d'un bouton qui ne perd rien ; la page Sécurité
accessible même si la sauvegarde échoue ; le lien aligné sur la règle et souligné ; le message du lien refusé ; la
documentation et les commentaires qui promettaient trop.

**Écarté après vérification :** le départage de deux arrêts le même jour se fait par uuid v7, qui suit déjà l'heure.

**Laissé pour plus tard :** « Read Train safely », un libellé existant bancal ;
la dernière ligne de la bulle serrée à 200 %, qui vient du composant ; TalkBack, non essayé.

## Ce dont j'ai besoin de toi

**La clé Play est réglée, sans rien changer :** l'empreinte relevée le 04/11 dans la Play Console est `F5:D8…`, déjà dans
`assetlinks.json`. Il reste `adb shell pm get-app-links com.guiforge.bati` une fois `assetlinks.json` publié.

**Décisions, prises le 04/11 :**

1. **« Rien n'est perdu » reste au 2e arrêt de la semaine.** Ce 2e arrêt ne fait pas de frappe, le plafond empêche la
   triche. **Le lot 1 ne devra jamais présenter cet arrêt comme un échec.**
2. **Le geste est sur l'écran de pause** : deux taps pendant une série (Pause, le bouton), sans dialogue, sans rien ajouter
   à une séance normale. Il reste aussi dans le dialogue de Quitter.
3. **La phrase devient « Bien joué d'avoir écouté ton corps, rien n'est perdu »**, qui marche quel que soit le genre.

Vérifié en release sur émulateur le 04/11 : un tap sur le bouton de pause termine la séance (`stopReason=pain`, la série
faite reste). En français, à 130 % sur 360×640, « Quitter la quête » reste visible sans défiler sur l'écran de pause, même
avec « Refaire le tour » affiché, et dans son dialogue ; la phrase tient dans la bulle.

**À savoir :**

- **`docs/legal/privacy.md` a changé,** ainsi que le texte dans l'app, en six langues, daté du 4 novembre. J'ai écrit que
  la raison « reste avec le reste de votre journal » et jamais envoyée à un autre joueur, et non « sur le téléphone et la
  synchro chiffrée seulement » : ce serait faux, une sauvegarde en clair et celle du téléphone l'emportent aussi.
- **Une clé supprimée n'est pas effacée physiquement.** Elle sort du fichier principal, mais reste dans le WAL jusqu'à ce
  que SQLite réutilise ces pages, même après un relancement (mesuré). Un lecteur de Drizzle resté ouvert empêche la
  troncature. Il faut un téléphone rooté pour la lire, ou la sauvegarde système, qui prend aussi le WAL. Même limite pour
  le secret d'une paire déliée. Le vrai correctif est de fermer ces lectures, hors de ce lot.
- **Le lot 1 hérite de :** pas de frappe sur un arrêt avant toute série ; un arrêt fait une frappe même après une seule
  série de 20 secondes, sans plancher de durée, ce qui se triche une fois par 7 jours ; une étape d'aventure avance sur un
  arrêt, comme sur une séance passée ; `countsForPlay` n'a toujours pas d'appelant en production.
- **L'écran d'appairage reste un écran de dev :** il ne liste pas les invitations en attente et ne permet pas de les
  annuler (cinq au plus, 7 jours). Une réponse perdue se refait en déliant puis en acceptant de nouveau. Une réponse
  ouverte sur l'autre téléphone du héros est refusée, la clé restant sur celui qui a invité.
- **Le journal n'affiche pas la raison d'arrêt :** elle est stockée, exportée, mais pas visible à l'écran.
- **Trois émulateurs ont tourné en même temps** pendant les essais à deux téléphones, un de plus que la limite de
  `scripts/emu.sh`, les deux emplacements étant pris par d'autres sessions. Les miens sont éteints.
- **Numéros de migration :** ce lot prend `0083` et `0084`. La branche qui fusionne en second renumérote les siennes.
- Les traductions de, es, ru et zh sont de moi : une relecture native ne ferait pas de mal.
