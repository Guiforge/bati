# Multijoueur, lot 0 : état

Branche `feat/multiplayer-lot0`, partie de `main` (`4150b9b4`). Commencé le 03/11 à 22:17.
Plan : section « Décisions du 03/11 » de l'audit. Spec du format : [envelope.md](envelope.md). Scanner :
[qr-scanner.md](qr-scanner.md).

| Étape | Statut | Temps passé | Reste estimé |
| --- | --- | --- | --- |
| T1 Scanner QR, GO ou NO-GO | doing | 0 h 30 | 0 h 30 |
| T2 Affichage QR | doing | 0 h 05 | 0 h 10 |
| T3 Règles partagées | doing, écart ci-dessous | 0 h 10 | 0 h 05 |
| T4 Enveloppe v1 | doing | 0 h 10 | 0 h 05 |
| T5 Lien scellé | doing | 0 h 10 | 0 h 20 |
| T6 Appairage | doing | 0 h 15 | 0 h 30 |
| Porte du lot | todo | | 1 h 30 |

## Écarts à trancher

### T3 : ce que le journal ne sait pas dire

**Atteint son objectif proposé : lisible, sauf en semaine légère.** `completed_exercises` a
`prescribedValue` (0070), `targetValue`, `resultValue` et `ladderNeutral`. Une séance atteint son objectif
quand chaque série est au niveau proposé et qu'aucune n'est `ladderNeutral`. La limite : ce drapeau
mélange « mouvement abandonné » et « quête allégée d'une semaine légère ». En semaine légère on l'ignore,
donc un mouvement sauté y passe inaperçu. C'est volontairement indulgent.

**Arrêt sur la règle de douleur : illisible.** Aucune colonne ne dit pourquoi une séance s'est arrêtée, et
l'app ne le demande pas : la règle n'est qu'un texte (`pain_rule`). Une telle séance tombe aujourd'hui sous
la règle d'objectif et ne compte pas.

**Sortie importée : n'existe pas.** Bati n'importe aucune sortie (`src/gps/gpx.ts` ne fait qu'exporter) et
aucune colonne n'en marque une. Aucune ne peut donc arriver jusqu'à `countsForPlay`.

Ces deux dernières règles restent en `TODO(r1-pain-stop)` et `TODO(r1-imported-outing)` dans
`db/completed.ts`, avec un `test.todo` chacune. Aucune migration n'a été ajoutée pour cela.

**Proposition de migration, à valider :**

```sql
-- Pourquoi la séance s'est terminée. NULL = fin normale, et toutes les lignes d'avant.
ALTER TABLE `completed_sessions` ADD `stopReason` text;      -- 'pain' pour commencer
-- D'où vient la sortie. NULL = mesurée par Bati.
ALTER TABLE `completed_sessions` ADD `importedFrom` text;    -- 'health_connect', 'gpx'
-- Séparer « abandonné » de « semaine légère » : un drapeau de plus sur la série.
ALTER TABLE `completed_exercises` ADD `lightWeekNeutral` integer NOT NULL DEFAULT 0;
```

Il faudrait aussi une façon de dire « j'arrête, j'ai mal » dans la séance, ce qui est une décision de
produit : ce bouton n'existe pas et je ne l'ai pas inventé.

### T1 : « aucune classe com.google.* » ne peut pas tenir à la lettre

Le `main` d'aujourd'hui, sans aucun scanner, contient déjà **451 classes `com.google.*`**, toutes libres :
Material (163), Guava (201), Gson (87). Aucune Play Services ni ML Kit. Le critère appliqué est donc :
zéro classe interdite (les signatures de code du scanner F-Droid, Play Services, ML Kit), et **zéro nouvelle
classe `com.google.*` par rapport au `main`**. Mesuré par `scripts/apk-no-google.py`, qui lit le mapping R8,
car R8 renomme les classes et un simple listing du dex ne verrait rien.

## À savoir

- `CAMERA` était retirée de toute release par `withAndroidTrimPermissions`. Je l'en ai sortie, comme le
  commentaire du plugin le demande. La permission apparaîtra donc sur l'écran d'installation et dans Exodus
  **dès que ce lot sera fusionné**, même sans écran visible pour le joueur.
