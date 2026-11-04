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

## Lot 0 bis

Décidé le 04/11, commencé à 09:37. Même branche, fusionné avec le lot 0 une fois la clé Play reçue.

**Numéros de migration :** le lot 0 a pris `0082`, ce lot `0083` et suivants, `feat/village-iso` est à `0081`. La
branche qui fusionne en second renumérote ses migrations.

| Étape | Statut | Temps | Reste (estimé) |
| --- | --- | --- | --- |
| B1 Migration | done, `0083` | 0 h 03 | |
| B2 « J'arrête, j'ai mal » | code et tests done, reste l'émulateur | 0 h 10 | 0 h 10 |
| B3 Variante plus facile | done | 0 h 02 | |
| B4 Semaine légère | done | 0 h 01 | |
| B5 Page `/d` | à faire | | 0 h 10 |
| B6 Invitation X25519 | à faire | | 0 h 30 |
| B7 Scanner en CI | à faire | | 0 h 15 |
| B8 Test du soir à Paris | done | 0 h 02 | |
| Porte | à faire | | 0 h 45 |

### B2 : comment une séance s'arrête aujourd'hui, avant ce lot

- **Pause, puis « Quitter la quête », puis confirmation** : `quitSession` efface tout. Rien n'est écrit, aucune
  série n'est gardée. C'est la seule vraie sortie avant la fin.
- **« Passer »** (`skipExercise`) n'arrête rien : il va à la série suivante sans écrire de ligne, et il est refusé sur
  la dernière série d'une séance vide.
- **Le texte de la règle de douleur n'est pas affiché pendant une série normale**, contrairement à ce que dit le
  brief. Il n'apparaît qu'à deux endroits : sur `ActiveExerciseView` après un « Passer » refusé, donc quand aucune
  série n'existe, et sur `RestView` après un « Passer ».
- **Finir une séance** passe par `status: "finished"`, puis `VictoryView`, qui sauvegarde à l'ouverture.

### B2 : ce qui a été ajouté

- Le geste apparaît à trois endroits, tous déjà hors du chemin normal : le dialogue de confirmation de Quitter (bouton
  du milieu), à côté du texte de douleur dans `ActiveExerciseView`, et à côté de celui de `RestView`. J'ai ajouté
  `RestView`, que le brief ne citait pas : sinon le geste n'existerait à côté du texte que sans aucune série à garder.
- `stopForPain` termine la séance, `PainStopView` remplace la victoire : la bulle de l'herboriste, le lien vers la page
  Sécurité, Continuer vers l'accueil. Aucune question, y compris « c'était court ».
- **Arrêt avant toute série : aucune ligne.** Une séance vide ne peut pas exister et allumerait la flamme. Le héros voit
  la même phrase. Conséquence pour le lot 1 : cet arrêt-là ne fait pas de frappe.
- **Une séance arrêtée n'a pas de plancher de durée pour R1.** Une série et 20 secondes comptent, une fois par 7 jours.
  C'est le but, et c'est aussi la limite : voir « Limites assumées ».
- **Une étape d'aventure avance sur un arrêt**, comme aujourd'hui sur une séance où tout le reste est passé. Le brief
  dit « inchangé » : je n'y ai pas touché.
- **Les sorties n'ont pas le geste** : leur « Terminer » garde déjà la trace.

### B3 et B4 : ce que les lignes disent

- **Le niveau proposé d'un mouvement remplacé** est ce que le créneau lui demande sur sa ligne (`prescribedValue`,
  sinon `targetValue`). Rien n'est lu en base en pleine séance, par conception : à unité égale, c'est le nombre du
  mouvement quitté. Prudent, puisqu'il faut faire autant de répétitions du mouvement plus facile.
- **Un remplacement fait avant la première rep** ne laisse aucune ligne du mouvement prévu, et la séance comptait déjà
  sur ses propres lignes, plus dur ou plus facile. Le journal ne peut pas le distinguer. Inchangé.
- **Anciennes lignes de semaine légère :** aucun remplissage. Une séance allégée d'avant `0083` a `ladderNeutral` à 1 et
  `lightWeekNeutral` à 0, donc elle se lit comme un mouvement sauté et ne compte pas pour R1. Rien ne lisait R1 avant ce
  lot, personne n'y perd.
- **`countsForPlay` n'a toujours pas d'appelant en production.** Le lot 1 lira les lignes, l'échelle
  (`fetchLadderRows`) et les arrêts du journal pour lui donner son contexte.

## Écarts à trancher

### T3 : ce que le journal ne sait pas dire

**Atteint son objectif proposé : lisible, sauf en semaine légère.** `completed_exercises` a
`prescribedValue` (0070), `targetValue`, `resultValue`, `ladderNeutral` et `sides`. Une séance atteint son
objectif quand chaque série est au niveau proposé, sur ses deux côtés si le mouvement en a deux, et qu'aucune
n'est `ladderNeutral`. La limite : ce drapeau mélange « mouvement abandonné » et « quête allégée d'une semaine
légère ». En semaine légère on l'ignore, donc un mouvement sauté y passe inaperçu. C'est volontairement indulgent.

**Arrêt sur la règle de douleur : réglé par le lot 0 bis, ci-dessus.** Au moment du lot 0 : aucune colonne ne dit pourquoi une séance s'est arrêtée, et l'app
ne le demande pas : la règle n'est qu'un texte (`pain_rule`). Une telle séance tombe sous la règle d'objectif et
ne compte pas.

**Sortie importée : n'existe pas.** Bati n'importe aucune sortie (`src/gps/gpx.ts` ne fait qu'exporter) et
aucune colonne n'en marque une. Aucune ne peut arriver jusqu'à `countsForPlay`.

Seule la sortie importée reste en `TODO(r1-imported-outing)` dans `db/completed.ts`, avec son `test.todo`. La colonne
attendra la fonctionnalité.

### Limites assumées de R1

- **Un arrêt pour douleur se triche**, une fois par 7 jours : une série et un tap suffisent, sans plancher de durée.
  Le plafond hebdomadaire est la seule borne. Le contraire ferait payer le fait de continuer malgré la douleur.
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
