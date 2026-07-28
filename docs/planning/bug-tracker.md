---
title: Bug Tracker
type: tracker
status: active
updated: 2026-07-29
related: [roadmap.md, ../architecture/database-api.md, ../gameplay/session-flow.md]
---

# Bug Tracker

> Résultat d'un audit de lecture du code (2026-07-29). `tsc` et les 274 tests passent :
> aucun de ces bugs n'est attrapé par la suite actuelle. Chaque entrée donne le symptôme
> visible, la cause exacte et la piste de correction.
>
> Statuts : `open` · `fixed` · `wontfix`

## P0 — fonctionnalités mortes

### BUG-001 · Le CTA « Start Quest » de l'accueil ne fait rien — `fixed`

**Symptôme** : sur l'accueil, quand aucune aventure n'est en cours, la carte propose une
quête ciblée sur les zones faibles. Le tap renvoie sur l'accueil.

**Cause** : [`components/home/useSmartAction.ts:76-81`](../../components/home/useSmartAction.ts#L76-L81)
pousse `/session` avec `params: { questId }`. [`app/session.tsx`](../../app/session.tsx#L46)
ne lit aucun paramètre : il lit le store, le trouve vide, et fait `<Redirect href="/" />`.
Le seul chemin qui remplit le store est `startSession()`, appelé depuis l'écran de détail
de quête.

**Fix** : router vers `/quests/${suggestion.id}` comme le fait l'écran aventure.

### BUG-002 · Aucun combat de boss ne se déclenche jamais — `fixed`

**Symptôme** : barre de HP, dégâts, taunts, image de phase, écran « victoire boss »,
bannières de boss au village et bâtiments tier 4 : rien n'apparaît jamais.

**Cause** : `startSession` ne charge le boss que si on lui passe `options.adventureId`
([`stores/session.ts:135`](../../stores/session.ts#L135)). Aucun appelant ne le passe.
[`app/(tabs)/adventures/[id].tsx:322`](../../app/(tabs)/adventures/[id].tsx#L322) construit
l'URL `/quests/{id}?level=…&runStepId=…` sans `adventureId`, et
[`app/(tabs)/quests/[id].tsx:256`](../../app/(tabs)/quests/[id].tsx#L256) appelle
`startSession(quest, level, { adventureRunStepId: runStepId })`. `bossFight` reste donc
`null` en permanence.

**Fix** : propager `adventureId` dans l'URL de l'étape d'aventure et jusqu'à `startSession`.
Alternative sans nouveau paramètre : résoudre l'`adventureId` depuis `adventureRunStepId`
dans `startSession`.

**Impact secondaire** : `db/bossFights.ts` est entièrement testé mais jamais exécuté en
prod ; `getBossBanners()` renvoie donc toujours `[]`, ce qui verrouille aussi les trois
bâtiments légendaires du village.

### BUG-003 · Le warm-up saute son premier mouvement — `fixed`

**Symptôme** : le warm-up démarre directement sur « Glute Bridge » (étape 2/4). Le Jumping
Jack n'est jamais affiché.

**Cause** : [`components/session/WarmupView.tsx:53-56`](../../components/session/WarmupView.tsx#L53-L56)
avance dès que `remainingSeconds <= 0`. `useSessionTimer` initialise cet état à `0`
([`hooks/useSessionTimer.ts:26`](../../hooks/useSessionTimer.ts#L26)) ; au premier commit
l'effet lit ce `0` périmé et appelle `nextWarmupStep()` immédiatement. Contrairement à
`CountdownView`, il n'y a pas de `clearTimeout` pour rattraper le coup.

**Vérifié** : au montage avec `warmupIndex: 0` / `timerDuration: 30`, le store est déjà à
`warmupIndex === 1` après le premier `act()`.

**Fix** : ne déclencher que si le timer a réellement tourné (garder `timerStartTimestamp`
dans la condition, ou n'avancer que sur une transition `>0 → <=0`).

## P1 — données fausses

### BUG-004 · Points du calendrier sur le mauvais jour hors UTC — `fixed`

**Symptôme** : une séance du soir (fuseaux UTC−) ou de la nuit (UTC+) s'affiche sur le jour
suivant / précédent dans le calendrier mensuel du journal.

**Cause** : [`components/journal/MonthlyCalendarCard.tsx:182`](../../components/journal/MonthlyCalendarCard.tsx#L182)
construit la clé avec `performedAt.toISOString().split("T")[0]` (date **UTC**), alors que la
grille est bâtie en local (`new Date(year, month, date)`, `getMonth()`).

**Fix** : `dayKey()` ([`db/dates.ts`](../../db/dates.ts)), la clé de jour **locale** partagée par
les six sites de cette famille. `toISOString()` ne doit plus jamais servir à faire un jour.

### BUG-005 · Même mélange UTC/local dans le cache de flamme — `fixed`

**Cause** : [`db/streaks.ts`](../../db/streaks.ts) calcule les jours avec `startOfDay()` (local)
mais écrit `lastWorkoutDate` et `streak_cached_on` avec `toISOString().split("T")[0]` (UTC).
Conséquences : `lastWorkoutDate` affiché peut être décalé d'un jour, et le cache s'invalide
en avance ou en retard selon le fuseau.

**Fix** : `dayKey()` ici aussi, et `startOfDay` réimplémenté à la main remplacé par celui de
date-fns.

### BUG-006 · La clé de semaine casse au passage d'année — `open`

**Symptôme** : fin décembre / début janvier, les barres hebdomadaires du journal se
réordonnent et la comparaison « cette semaine vs la précédente » compare les mauvaises
semaines.

**Cause** : [`db/completed.ts:430`](../../db/completed.ts#L430) utilise `format(weekStart, "yyyy-'W'ww")`.
`yyyy` est l'année civile, `ww` la semaine locale : le lundi 2025-12-29 donne `"2025-W01"`,
qui trie avant `"2025-W52"`. Le tri final par `weekKey.localeCompare` sort donc dans le
désordre. Le test existant
([`__tests__/db-completed-trends.test.ts:136`](../../__tests__/db-completed-trends.test.ts#L136))
n'utilise pas de dates à cheval sur une année.

**Fix** : `format(weekStart, "RRRR-'I'II")` (année ISO + semaine ISO), ou trier sur
`weekStart.getTime()` plutôt que sur la chaîne.

### BUG-007 · Les tendances ignorent les semaines sans séance — `open`

**Symptôme** : une semaine sans entraînement n'apparaît pas et le badge de tendance affiche
« stable » ou « ↑ » alors que l'utilisateur n'a rien fait.

**Cause** : `getWeeklyTrends` ne renvoie que les semaines **présentes dans les données**.
[`db/completed.ts:541-548`](../../db/completed.ts#L541-L548) prend ensuite les deux derniers
éléments du tableau comme « cette semaine » et « la semaine dernière ». Après deux semaines
de pause, la comparaison porte sur deux semaines vieilles d'un mois. Idem pour les mois.

**Fix** : remplir la fenêtre (`weeks` / `months`) avec des périodes à zéro avant d'agréger.

### BUG-008 · Les records mélangent répétitions et secondes — `open`

**Symptôme** : un gainage de 60 s remonte comme record de « reps ». Un exercice fait tantôt
en temps tantôt en reps compare deux unités dans le même max.

**Cause** : [`db/personalRecords.ts:207-248`](../../db/personalRecords.ts#L207-L248) et
`getExerciseMaxReps` ([:89](../../db/personalRecords.ts#L89)) agrègent `resultValue` sans
filtrer sur `resultType`, et poussent toujours `recordType: "exercise_max_reps"`. Le type
`exercise_max_time` est déclaré ([:14](../../db/personalRecords.ts#L14)) mais n'est jamais
produit.

**Fix** : grouper par `(exerciseId, resultType)` et choisir le `recordType` en conséquence.

### BUG-009 · L'équilibre musculaire additionne reps et secondes — `open`

**Cause** : [`db/muscleBalance.ts:88`](../../db/muscleBalance.ts#L88) fait
`data.volume += row.resultValue` quel que soit `resultType`. Un gainage de 60 s pèse six fois
un set de 10 pompes. `db/bossFights.ts` a déjà résolu exactement ce problème avec
`toRepEquivalent()` ([:52](../../db/bossFights.ts#L52)) — la logique existe, elle n'est juste
pas réutilisée ici.

**Impact** : fausse les zones faibles, donc la suggestion de quête de l'accueil, le village
(`getStyleVolumes`, overlay de sport dominant) et la carte d'équilibre du journal.

**Fix** : réutiliser `toRepEquivalent` (l'extraire dans un module partagé).

## P2 — comportements gênants

### BUG-010 · Le ressenti coché pendant la sauvegarde est perdu — `open`

**Cause** : [`components/session/VictoryView.tsx:125`](../../components/session/VictoryView.tsx#L125)
n'écrit que `if (result)`. Les boutons ne sont pas désactivés pendant le spinner : le choix
s'affiche sélectionné mais n'est jamais persisté (la session est créée avec `feedback: null`).

**Fix** : désactiver les boutons tant que `result` est nul, ou rejouer la sélection en
attente une fois `result` arrivé.

### BUG-011 · Le compteur de reps ne se réinitialise pas quand le repos vaut 0 — `open`

**Cause** : [`components/session/ActiveExerciseView.tsx:38`](../../components/session/ActiveExerciseView.tsx#L38)
initialise `adjustedReps` avec `useState(targetValue)`, sans effet de reset sur
`currentExerciseIndex`. Avec du repos, la vue est démontée (`status: "resting"`) et l'état
repart à zéro ; avec `restSeconds === 0` ([`stores/session.ts:387-399`](../../stores/session.ts#L387-L399))
elle reste montée et garde la valeur de l'exercice précédent.

**Fix** : `key={currentExerciseIndex}` sur la vue, ou un effet de reset.

### BUG-012 · La reprise après crash perd l'étape de warm-up — `open`

**Cause** : deux sérialisations divergentes du même état. `saveSessionState()`
([`hooks/useSessionRecovery.ts:169-186`](../../hooks/useSessionRecovery.ts#L169-L186)) inclut
`warmupIndex` ; l'auto-save réel, celui de l'abonnement du store
([`stores/session.ts:579-595`](../../stores/session.ts#L579-L595)), ne l'inclut pas. Le
`?? 0` défensif côté restauration ([:120](../../hooks/useSessionRecovery.ts#L120)) masque le
problème plutôt qu'il ne le corrige.

De plus, l'abonnement ne déclenche une sauvegarde que si le round, l'exercice ou le nombre de
résultats change, ou sur pause — rien de tout ça ne bouge pendant le warm-up.

**Fix** : une seule fonction de sérialisation, appelée par l'abonnement ; ajouter
`warmupIndex` aux valeurs surveillées.

### BUG-013 · Recommencer un round frappe le boss deux fois — `open`

**Cause** : [`stores/session.ts:249-272`](../../stores/session.ts#L249-L272) retire les
résultats du round courant, mais les dégâts ont déjà été écrits en base par `dealDamage`
(transaction immédiate à chaque exercice). Refaire le round réinflige les dégâts.

**Fix** : journaliser les dégâts en fin de session, ou annuler les entrées de
`bossDamageLog` du round au moment du restart. *(Bloqué en pratique par BUG-002.)*

### BUG-014 · « Lève-tôt » / « Oiseau de nuit » lisent l'heure de sauvegarde — `open`

**Cause** : [`stores/session.ts:493`](../../stores/session.ts#L493) passe
`performedAt: new Date()` à `checkForNewAchievements`, alors que la ligne de session est
écrite avec `new Date(startTime)`. `db/achievements.ts:614` compare donc l'heure de **fin**.
Une séance commencée à 6 h 40 et finie à 7 h 05 ne débloque pas « lève-tôt ».

**Fix** : passer `new Date(startTime)`.

### BUG-015 · Haptique de succès parasite au lancement du décompte — `fixed`

**Cause** : [`components/session/CountdownView.tsx:31-42`](../../components/session/CountdownView.tsx#L31-L42),
même `remainingSeconds === 0` périmé que BUG-003. Le `finishCountdown` est bien annulé par le
`clearTimeout` au re-render, mais `success()` a déjà vibré.

**Fix** : même garde que BUG-003.

### BUG-016 · Un serment sans `fulfilledAt` ne peut plus jamais être accompli — `open`

**Cause** : `isOath()` ([`db/oaths.ts:87-99`](../../db/oaths.ts#L87-L99)) ne valide pas
`fulfilledAt` et ne le normalise pas. Si le JSON stocké ne contient pas la clé,
`oath.fulfilledAt !== null` est vrai (`undefined !== null`) et `checkOathFulfilled`
([:268](../../db/oaths.ts#L268)) sort immédiatement : le serment est traité comme déjà
accompli, sans bonus ni écran de victoire.

**Fix** : normaliser à `fulfilledAt ?? null` dans `getOath()`.

## P1 — trouvés en cherchant la racine de BUG-004/005 (2026-07-29)

Le mélange jour UTC / jour local ne touche pas que le calendrier. Trois sites de plus, même
cause, même correctif (`format(date, "yyyy-MM-dd")` en local).

### BUG-017 · La quête du jour tourne à minuit UTC — `fixed`

**Symptôme** : la quête du jour, et avec elle son bonus XP ×1,5, change à 02:00 heure locale en
UTC+2 et à 19:00 en UTC−5.

**Cause** : [`db/quests.ts:606`](../../db/quests.ts#L606) — `pickDailyTemplate` hache
`new Date().toISOString().split("T")[0]`. `isDailyQuest` gouverne le multiplicateur dans
[`stores/session.ts`](../../stores/session.ts).

### BUG-018 · Le graphe 7 jours perd la séance du jour — `fixed`

**Cause** : [`components/journal/JournalStats.tsx:49`](../../components/journal/JournalStats.tsx#L49)
étiquette les barres depuis un minuit **local** converti en clé UTC, puis clé les séances en UTC
direct (ligne 58). Les deux chaînes ne coïncident pas hors UTC : la séance du jour ne trouve
aucune barre et disparaît du graphe.

### BUG-019 · Suggestions de repos comptées en jours UTC — `fixed`

**Cause** : [`db/restSuggestions.ts:94`](../../db/restSuggestions.ts#L94) clé les jours
d'entraînement en UTC puis les compare à un `today` local.

## P1 — remontés par l'utilisateur (2026-07-29)

### BUG-020 · L'avatar change tout seul après le démarrage — `fixed`

**Symptôme** : au lancement, l'avatar du header affiche une figure puis en change une seconde
plus tard.

**Cause** : deux valeurs par défaut différentes dans le même fichier.
[`stores/settings.ts`](../../stores/settings.ts) initialisait `avatarId: "guardian"`, alors que
`normalizeAvatarId(null)` — appliqué au retour de `loadFromDatabase()` — renvoie `avatarIds[0]`,
c'est-à-dire `"shadow"`. Un héros qui n'a jamais choisi d'avatar voyait donc `guardian` le temps
de l'hydratation, puis `shadow`.

**Fix** : le littéral du store utilise `avatarIds[0]`, une seule source de vérité.

### BUG-021 · La flamme disparaît de la barre de niveau — `fixed`

**Symptôme** : plus de flamme ni de compteur dans le header, et le header se réagence.

**Cause** : [`components/home/HomeHeader.tsx`](../../components/home/HomeHeader.tsx) rendait le
bloc sous condition `currentStreak > 0`. Depuis que la flamme mesure la régularité et non
l'assiduité ([`db/streaks.ts`](../../db/streaks.ts)), un héros sous son quota hebdomadaire est à
`current === 0` et tout le bloc s'évanouissait. La table `FLAME_SIZES` définit pourtant une
taille pour le niveau 0 : l'intention était de l'afficher éteinte.

**Fix** : bloc toujours rendu une fois la lecture arrivée, à `opacity 0.4` et sans animation
quand la flamme est éteinte. Une flamme éteinte est ce qu'on rallume ; une flamme absente n'est
rien.

### BUG-022 · L'onglet Quêtes ouvre sur une quête au lieu de la galerie — `fixed`

**Symptôme** (repro fournie) : accueil → « démarrer une quête » → l'écran de quête s'ouvre →
retour → taper l'onglet Quêtes ouvre directement sur cette quête, plus jamais sur la galerie.

**Cause** : l'onglet Quêtes est le seul qu'on ouvre depuis l'extérieur — le CTA de l'accueil et
chaque étape d'aventure poussent `/quests/{id}`, qui atterrit dans la pile de l'onglet
([`app/(tabs)/quests/_layout.tsx`](<../../app/(tabs)/quests/_layout.tsx>)). Revenir en arrière
sort de l'onglet sans dépiler : le détail reste au sommet, et taper l'onglet — qui n'a pas le
focus, donc ne déclenche pas le « pop to top » d'un onglet déjà actif — le réaffiche.

**Fix** : `popToTopOnBlur: true` sur l'onglet Quêtes
([`app/(tabs)/_layout.tsx`](<../../app/(tabs)/_layout.tsx>)). Sa pile revient à la galerie dès
qu'on quitte l'onglet. Posé sur ce seul onglet et pas dans `screenOptions` : c'est le seul qu'on
ouvre de l'extérieur, et Journal comme Aventures n'ont pas demandé à oublier où on en était.

## Ce qui a été vérifié et va bien

- `npx tsc --noEmit` : 0 erreur. `npm test` : 274 passent, 1 skip.
- Atomicité du bonus de serment (`checkOathFulfilled` + `addBonusXpToSession` dans la même
  transaction) et du calcul de dégâts (`dealDamage` en lecture-modification-écriture
  transactionnelle) : corrects.
- Comptabilité XP dans `saveSession` : `getTotalXp()` est bien lu **avant** l'insertion, le
  bonus de serment est ajouté à la ligne de session, le niveau est calculé après.
- Détection de PR par exercice : le dédoublonnage par round
  ([`db/personalRecords.ts:218-224`](../../db/personalRecords.ts#L218-L224)) est correct.

## Related

- [roadmap.md](roadmap.md) — où faire remonter les correctifs planifiés
- [../gameplay/session-flow.md](../gameplay/session-flow.md) — le flux que BUG-002/003/011 cassent
- [../architecture/database-api.md](../architecture/database-api.md) — API touchée par BUG-006/008/009
