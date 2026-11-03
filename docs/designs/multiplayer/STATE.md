# Multijoueur, lot 0 : état

Branche `feat/multiplayer-lot0`, partie de `main` (`4150b9b4`). Commencé le 03/11 à 22:17.
Plan : section « Décisions du 03/11 » de l'audit. Format : [envelope.md](envelope.md). Scanner :
[qr-scanner.md](qr-scanner.md). Rapport : [reviews/LOT0.md](reviews/LOT0.md).

| Étape | Statut | Temps (environ) |
| --- | --- | --- |
| T1 Scanner QR, GO ou NO-GO | done, **GO** | 0 h 25 |
| T2 Affichage QR | done | 0 h 05 |
| T3 Règles partagées | done, avec les écarts ci-dessous | 0 h 10 |
| T4 Enveloppe v1 | done | 0 h 10 |
| T5 Lien scellé | done, sauf la clé Play et le vrai `autoVerify` | 0 h 10 |
| T6 Appairage | done | 0 h 10 |
| Porte du lot | done, voir [LOT0.md](reviews/LOT0.md) | 0 h 20 |

Total réel : 1 h 30, les étapes se sont chevauchées pendant les builds. Reste : ce qui dépend de toi, listé dans
le rapport.

## Écarts à trancher

### T3 : ce que le journal ne sait pas dire

**Atteint son objectif proposé : lisible, sauf en semaine légère.** `completed_exercises` a
`prescribedValue` (0070), `targetValue`, `resultValue`, `ladderNeutral` et `sides`. Une séance atteint son
objectif quand chaque série est au niveau proposé, sur ses deux côtés si le mouvement en a deux, et qu'aucune
n'est `ladderNeutral`. La limite : ce drapeau mélange « mouvement abandonné » et « quête allégée d'une semaine
légère ». En semaine légère on l'ignore, donc un mouvement sauté y passe inaperçu. C'est volontairement indulgent.

**Arrêt sur la règle de douleur : illisible.** Aucune colonne ne dit pourquoi une séance s'est arrêtée, et l'app
ne le demande pas : la règle n'est qu'un texte (`pain_rule`). Une telle séance tombe sous la règle d'objectif et
ne compte pas.

**Sortie importée : n'existe pas.** Bati n'importe aucune sortie (`src/gps/gpx.ts` ne fait qu'exporter) et
aucune colonne n'en marque une. Aucune ne peut arriver jusqu'à `countsForPlay`.

Ces deux règles restent en `TODO(r1-pain-stop)` et `TODO(r1-imported-outing)` dans `db/completed.ts`, avec un
`test.todo` chacune. Aucune migration n'a été ajoutée pour cela.

**Proposition de migration, à valider :**

```sql
-- Pourquoi la séance s'est terminée. NULL = fin normale, et toutes les lignes d'avant.
ALTER TABLE `completed_sessions` ADD `stopReason` text;      -- 'pain' pour commencer
-- D'où vient la sortie. NULL = mesurée par Bati.
ALTER TABLE `completed_sessions` ADD `importedFrom` text;    -- 'health_connect', 'gpx'
-- Séparer « abandonné » de « semaine légère » : un drapeau de plus sur la série.
ALTER TABLE `completed_exercises` ADD `lightWeekNeutral` integer NOT NULL DEFAULT 0;
```

Il faudrait aussi une façon de dire « j'arrête, j'ai mal » dans la séance. C'est une décision de produit : ce
bouton n'existe pas et je ne l'ai pas inventé.

**À régler avant le lot 1, pas après (audit, ligne rouge santé).** Tant que l'arrêt pour douleur n'existe pas,
brancher R1 sur un boss partagé paie le fait de finir malgré la douleur : un coéquipier attend ta frappe, le genou
tire à la série 2, et seule la séance finie compte. Sans danger aujourd'hui, puisque rien ne lit `countsForPlay`.

### Remplacer un mouvement en cours de séance ne compte pas

Le mouvement quitté est marqué abandonné, donc la séance tombe. Passer à la variante plus facile quand le genou
tire est pourtant le bon geste. Le journal ne sait pas dire « plus facile », et la règle dit « son objectif
proposé » : je l'ai laissé ainsi, épinglé par un test. **À toi de trancher.**

### Limites assumées de R1

- **R1 n'est pas un anti-triche.** Les reps se saisissent au stepper : taper + jusqu'au niveau proposé suffit,
  avec les 120 s d'horloge. Seul le plafond de dégâts du combat borne cela.
- **Un remplacement qui change d'unité** (reps vers maintien) n'a pas de `prescribed` : la règle retombe sur la
  cible, que le héros peut abaisser. Rare, et il faut déjà un remplacement.
- **Une marche sans GPS** n'a pas de distance et ne compte jamais : à dire au héros le jour où cela se voit.
- **La distance d'une sortie** repose sur le service GPS, qui refuse déjà les vitesses au-dessus du plafond de
  chaque mode. Une voiture ne fait donc pas un kilomètre à pied.

### T1 : « aucune classe com.google.* » ne peut pas tenir à la lettre

Le `main` d'aujourd'hui, sans aucun scanner, contient déjà **451 classes `com.google.*`**, toutes libres :
Material (163), Guava (201), Gson (87). Aucune Play Services ni ML Kit. Critère appliqué : zéro classe interdite
(signatures de code du scanner F-Droid, Play Services, ML Kit), et rien de nouveau venu du scanner. Mesuré par
`scripts/apk-no-google.py`, qui lit le mapping R8, puisque R8 renomme les classes.

### T5 : le bouton « Open in Bati » de la page de secours

Tu as demandé une page qui ne lit rien : elle n'a aucun script. Son bouton ouvre donc Bati sans le contenu du
lien, et le joueur doit rouvrir le lien depuis ses messages. Une ligne de script locale (`location.hash` recopié
dans le lien `bati://`, sans rien envoyer) le rendrait vraiment utile, surtout si l'App Link n'est pas vérifié.
Je ne l'ai pas ajoutée sans ton accord.

## À savoir

- **Une invitation n'est pas scellée, elle ne peut pas l'être.** Qui la lit peut lire les messages de cette paire,
  y compris ta messagerie si elle n'est pas chiffrée. Elle expire après 7 jours, et A n'apprend jamais qui l'a
  utilisée, puisque rien ne revient.
- **Restaurer une sauvegarde en clair efface les paires.** Le prix du secret qui ne sort jamais en clair. Il faudra
  le dire avant la restauration quand un joueur aura des compagnons.
- **Android Backup peut copier le secret**, là où le transport chiffre côté client (règle déjà en place pour toute
  la base). Le secret n'est donc pas strictement « seulement dans la synchro chiffrée », comme tu l'avais écrit.
- **Délier n'est immédiat que sur ce téléphone.** Un autre appareil du héros perd le secret à sa prochaine synchro,
  et l'autre joueur n'apprend rien, puisque rien ne revient.
- **Le drapeau `paused` de l'enveloppe dit au compagnon que le héros est en pause.** Il en a besoin pour geler la
  semaine des deux, et la pause peut vouloir dire malade. Le texte du lot 1 (« Le boss attend », sans nom) reste à
  écrire sans en dire plus.
- **La page `/d` et l'App Link partent au prochain merge.** La page n'annonce aucun jeu. Sans le drapeau, un lien
  ouvre l'accueil.
