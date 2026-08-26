# Prescription qui tient compte du barreau — plan

Issue [#33](https://github.com/Guiforge/bati/issues/33), déposée le 2026-08-25.

## Contexte

> *« Yesterday I did my first workout and selected the easiest level. I was suggested to do wall
> push ups. I thought them too easy and did inclined push-ups against a table. I did 5-6 reps.
> Today I was suggested "Chop Wood". It also had pushups in it, but it asked me to do classical
> push-ups. Of course I failed and put "1" (the lowest number I could) of repetitions in the
> field, and did my inclined push-ups instead for training. »*
> — Nokia 6.2, Android 11, 1.11.0 (F-Droid)

**Ce n'est pas déjà corrigé.** Rien entre `v1.11.0` et `6977e026` ne touche l'éligibilité, l'échelle
de variation ou cette navigation : la période est entièrement du contenu héros, du backup, la
largeur d'une tuile de village et la refonte XP.

La roadmap avait anticipé le trou dans son propre ré-audit
([`roadmap.md`](../../planning/roadmap.md), §4.4) : *« rep targets take no history at all
(template midpoint × {0.75, 1, 1.25}) […] `trainingLevel` from onboarding has exactly one effect,
hiding `advanced` quests from a `beginner`. That is the next large piece. »*

### Ce que le code fait aujourd'hui, vérifié

| Constat | Preuve |
|---|---|
| Le filtre débutant ne cache que `advanced` | [`db/quests.ts:709`](../../../db/quests.ts) — « Chop Wood » est Squat + Push-ups + Plank, trois mouvements `medium`, donc `questTrainingLevel` la classe `regular` et rien ne la filtre. **28 quêtes sur 34 sont proposées à un débutant déclaré.** |
| La difficulté multiplie les reps, jamais le mouvement | `generateTarget` = milieu du gabarit × `USER_LEVEL_MULTIPLIER`. En `easy`, 8-12 devient ~7. Sept pompes complètes au lieu de dix, pour quelqu'un qui fait des pompes au mur, c'est toujours zéro. |
| Le swap existe, mais pas là où il faut | `rankSwapCandidates` n'est appelé que depuis [`app/(tabs)/quests/[id].tsx`](<../../../app/(tabs)/quests/[id].tsx>) — l'écran de configuration, **avant** de commencer. Aucune référence dans `components/session/`. |
| Aucune sortie honnête | `CHECK (resultValue > 0)` dans `drizzle/0000_schema.sql`. Le minimum saisissable est 1. Le héros **doit** mentir pour avancer. |

### L'échelle, elle, est complète et correcte

```
Wall Push-Up (easy, aucun prérequis)
  └─ Knee Push-Up (easy)
       └─ Push-ups (medium)
            └─ Diamond Push-Up / Pike Push-Up (hard)
```

Le mouvement que le rapporteur attendait est **littéralement le prérequis enregistré** de celui
qu'on lui a servi. `getChainTo(exerciseId)` ([`db/exercises.ts:363`](../../../db/exercises.ts))
rend déjà cette chaîne du plus facile au mouvement demandé, avec `isEarned` par barreau et
`position` = le barreau où le héros se tient. La donnée est là ; rien ne la consulte au moment de
mettre une quête devant quelqu'un.

### Le vrai dommage

L'app n'apprend que de ce qu'elle prescrit. Elle a prescrit des pompes complètes, elle a reçu
« 1 », et ce « 1 » nourrit désormais `getMuscleBalance`, les cibles futures et les records.
**La prescription fausse produit la donnée fausse qui rendra la prochaine prescription pire.**

Et le rapporteur *savait* son barreau — 5-6 pompes inclinées. Il n'avait aucun moyen de le dire.

## Pourquoi cet ordre

Phase 1 rend atteignable une fonctionnalité qui existe déjà ; Phase 3 construit une inférence
nouvelle. **Après la phase 1, l'app sait ; avant, elle devine.** Livrer la substitution automatique
en premier, c'est calibrer un capteur sur des données que le capteur lui-même a corrompues.

Chaque phase est livrable seule et referme une partie du rapport.

## Contraintes globales

- **Le choix explicite du héros gagne toujours.** Aucune substitution automatique ne doit écraser
  un `QuestConfig.swaps` posé à la main.
- **Jamais vers le haut.** L'app propose plus facile, jamais plus dur.
- **Visible et réversible en un tap.** Une substitution muette fait croire que la quête est cassée.
- **Ne pas toucher `toRepEquivalent` ni les pools de boss** (`0026`, tenus par
  `__tests__/content-invariants.test.ts`).
- `ExercisePickerSheet` porte déjà `disableDrag` — le piège Tamagui de la feuille fantôme est réglé,
  ne pas le retirer.

---

# Phase 1 — Changer de mouvement pendant la séance

Ferme le besoin réel du rapporteur : il *a* fait des pompes inclinées, il voulait le dire.

### Tâche 1 — l'action du store

`stores/session.ts`, un `swapCurrentExercise(exercise: Exercise)` :

- remplace `quest.exercises[currentExerciseIndex].exercise` ; la cible reste celle du **slot**,
  pas du mouvement — c'est déjà la sémantique de `applySwap`.
- **abandonne l'override de cible du slot**, exactement comme
  [`applySwap`](<../../../app/(tabs)/quests/[id].tsx>) le fait, avec le même raisonnement : « 20 »
  hérité des pompes posé sur une pompe à un bras est une mauvaise prescription.
- persiste dans `QuestConfig.swaps` pour que le choix tienne la prochaine fois. Asynchrone et
  non bloquant : `reportError("session.swap", e)` en cas d'échec, jamais faire tomber une séance
  pour une préférence.
- **ne touche pas `results`.** Les sets déjà enregistrés gardent leur `exerciseId` — ils sont vrais.
- `quest` est déjà dans `SavedSessionState`, donc le swap survit à un crash sans champ nouveau.
- les dégâts de boss suivants liront les muscles du nouveau mouvement, ce qui est correct.

### Tâche 2 — l'atteindre depuis l'écran actif

`components/session/ActiveExerciseView.tsx` : une action discrète, et `ExercisePickerSheet` monté
avec `rankSwapCandidates(pickableExercises(catalogue), currentEx.exercise, owned)`.

L'écran de séance ne lit pas le catalogue aujourd'hui : `listExercises()` est en cache de promesse,
et `preferences.getOwnedEquipment()` donne `owned`. Charger au montage de la séance, pas à
l'ouverture de la feuille — une attente au moment où le héros est bloqué est le pire moment.

Réutiliser `swapReasonLabel` (« un barreau plus facile ») plutôt que d'en écrire un second.

### Tâche 3 — i18n et tests

- `locales/{en,fr}.json`, parité obligatoire (`__tests__/i18n-keys.test.ts`).
- `__tests__/store-session.test.ts` : le swap change le mouvement à venir, laisse `results` intact,
  et persiste. Le mock de `@/db/xp` est plat — passer en `jest.requireActual` étalé, l'idiome déjà
  utilisé pour `@/db/bossFights`, sinon toute constante nouvelle arrive `undefined` sans bruit.
- un test d'écran : la feuille s'ouvre, le choix applique.

**Livrable seul.** Après cette phase, le rapporteur aurait tapé « 6 » sur *Incline Push-Up* au lieu
de « 1 » sur *Push-ups*.

---

# Phase 2 — Pouvoir dire « je n'ai pas pu »

Arrête la corruption du journal, et ouvre le canal que la roadmap dit manquant :
*« regression-on-form-breakdown has no input channel »*.

### Tâche 4 — décider la forme, puis migrer

Deux options, à trancher avant d'écrire :

- **Pas de ligne du tout.** Un set sauté n'écrit rien. L'index unique
  `(sessionId, roundIndex, sortOrder)` tolère les trous, et **tout agrégat devient juste sans que
  personne ne pense à filtrer** — volume musculaire, niveaux de bâtiment, records, barreaux.
  Prix : une séance dont tout est sauté n'a plus d'exercice, et `createCompletedSession` lève
  (`"A completed session must have exercises"`). À traiter explicitement.
- **Une colonne `skipped`.** Distingue « sauté » de « crash », mais le `CHECK (resultValue > 0)`
  force à écrire un 1 factice, et **chaque lecteur d'agrégat doit se souvenir de le filtrer** —
  précisément le genre d'oubli que `db/workUnits.ts` documente comme ayant déjà faussé quatre
  surfaces d'un coup.

Recommandation : **pas de ligne**, plus un garde nommé pour la séance entièrement sautée.

### Tâche 5 — l'action, et ce qu'elle ne fait pas

`skipExercise()` avance comme `completeExercise` mais n'enregistre rien : aucun résultat, aucun
dégât de boss banké. Un set sauté n'est pas une session sur cible, donc `recentMetFlags` ne le
comptera pas — l'échelle reste juste **par construction**, sans code dédié.

### Tâche 6 — l'UI et les tests

L'action vit à côté de « DONE », visuellement plus discrète. Tests : le journal ne contient pas le
set, le boss n'a rien pris, `checkForNewRungs` ne l'a pas compté.

---

# Phase 3 — Substituer vers le bas automatiquement

Ce que le rapporteur a demandé littéralement.

### Tâche 7 — brancher `getChainTo`

Dans `getQuestById(id, userLevel)`, après la résolution de chaque slot : si
`chain.position < chain.rungs.length`, servir `chain.rungs[chain.position - 1].exercise`.

**Coût à mesurer avant d'écrire.** `getChainTo` fait un `recentMetFlags` par barreau ; une quête de
trois slots à trois barreaux vaut neuf lectures du journal, sur un chemin que Home touche à chaque
montage. Une passe groupée existe déjà — le commentaire de `db/exercises.ts:403` décrit
« every ladder movement's sessions, oldest first, in one pass over the journal ». S'en servir, ou
mesurer d'abord et ne rien optimiser si c'est sous le seuil.

### Tâche 8 — l'ordre par rapport à la config

La substitution passe **avant** `applyQuestConfig`, ou saute les slots qui portent déjà un
`swaps[id]`. Un slot que le héros a choisi à la main n'est jamais retouché. C'est la contrainte
globale, et c'est le test qui la garde.

### Tâche 9 — le dire

L'écran de quête et l'écran de séance annoncent la substitution et offrent le retour en un tap,
avec le vocabulaire de `swapReasonLabel`. Une quête qui affiche silencieusement un autre mouvement
que celui de sa fiche est un bug du point de vue du héros.

### Tâche 10 — décider la porte

Un compte neuf n'a aucun historique, donc `position` vaut 1 partout et **tout** descend au barreau
le plus bas. Pour un débutant déclaré c'est juste ; pour quelqu'un de sportif qui vient d'installer,
c'est vexant — et le rapporteur lui-même a trouvé les pompes au mur *trop faciles* le jour 1.

Options : appliquer toujours ; appliquer sauf `trainingLevel === "advanced"` ; ou plafonner la
descente à un barreau sous le mouvement écrit. **À trancher avec des chiffres**, pas au jugé — la
refonte XP de cette semaine a montré deux fois qu'une supposition de calibrage survit mal à la
mesure.

### Tâche 11 — les tests

Un héros neuf reçoit le barreau du bas ; un héros qui a gagné le prérequis reçoit le mouvement
écrit ; un swap explicite gagne toujours ; jamais de substitution vers le haut.

---

## Hors périmètre

- **Durcir `getEligibleQuestIds`** pour qu'un débutant ne voie que les quêtes `beginner`. Une ligne,
  mais il ne lui resterait que 9 quêtes sur 34, et surtout ça ne répond pas à la demande : il
  voulait le bon mouvement, pas moins de choix. Après la phase 3, c'est sans objet.
- **Le second bug du rapport** — « swipe through the progressions » cassé dans le catalogue.
  Hypothèse : `NextStepCard` fait `router.push('/exercises/:id')` depuis la page exercice, donc
  chaque barreau empile la même route et le retour rejoue tout le chemin. Non confirmé sans
  reproduction sur appareil. Sa propre issue.

## Vérification

Par phase, et sur appareil — c'est un défaut que seul un vrai parcours a trouvé :

1. `npm test`, `npm run check`, `npm run deadcode` verts à chaque phase.
2. **Phase 1** : dev build, base vierge, lancer « Chop Wood », changer les pompes pour des pompes
   inclinées en pleine séance, vérifier que le choix tient au lancement suivant.
3. **Phase 2** : sauter un set, vérifier qu'il n'apparaît ni dans le journal, ni dans le volume
   musculaire, ni dans les dégâts de boss.
4. **Phase 3** : rejouer le parcours exact du rapport — compte vierge, niveau débutant, une séance
   avec des pompes au mur, puis « Chop Wood » le lendemain. Le mouvement servi doit être un barreau
   que le héros a réellement atteint.
5. Répondre sur l'issue #33 quand la phase qui le débloque est publiée.

## Décisions ouvertes

- Tâche 4 : pas de ligne, ou colonne `skipped` ?
- Tâche 10 : quelle porte pour la substitution automatique ?
- Portée à livrer : phase 1 seule, 1+2, ou les trois ?
