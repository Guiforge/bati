---
title: Audit qualité — Bati
type: technical
status: active
updated: 2026-07-31
related: [AGENTS.md, DESIGN.md, PRODUCT.md, docs/architecture/performance.md]
---

# Audit qualité — Bati

## Verdict

La couche automatique est **verte** : `tsc` 0 erreur, `biome` 205 fichiers propres,
357 tests au vert, 0 `any`, 0 `@ts-ignore`, 0 chaîne non traduite détectée.

C'est précisément le problème. Les bugs que tu vois ne sont pas des bugs que la CI
peut voir : ce sont des **incohérences d'état** (récupération de séance, PV de boss)
et des **dérives visuelles** (couleurs recopiées à la main au lieu des tokens). Les
outils sont configurés pour attraper la syntaxe, pas la sémantique.

Trois causes racines expliquent la quasi-totalité des 17 constats :

1. **Les erreurs sont avalées** — 14 blocs `catch` sur 51 ne font rien. Un échec
   silencieux ne devient jamais un ticket, il devient un « tiens, c'est bizarre ».
2. **Les dégâts du boss sont écrits en base avant que la séance existe** — l'état de
   jeu et l'état journalisé peuvent diverger, et rien ne les réconcilie.
3. **Il n'y a pas de fonction unique pour « titre localisé » ni pour « couleur de
   difficulté »** — le même ternaire est recopié 14 fois, la même sémantique de
   couleur 2 fois. Une copie oubliée = une incohérence visible.

Couverture au moment de l'audit : 46,4 % lignes / 38,3 % branches.

---

## État après correction

Les 17 constats ont été traités en 5 commits. Deux d'entre eux étaient **faux ou
surévalués** à la première lecture et ont été corrigés dans ce document plutôt que
« corrigés » dans le code — c'est signalé à chaque fois.

| # | Constat | État |
|---|---|---|
| 1 | Écran blanc à la reprise d'un échauffement | ✅ corrigé |
| 2 | `restartRound` ne rend pas les PV | ✅ corrigé |
| 3 | `quitSession` conserve les dégâts | ✅ corrigé |
| 4 | `bossStartHp` non restauré | ✅ corrigé |
| 5 | `saveSession` non transactionnel | ⚠️ rendu idempotent, pas atomique — plafond écrit dans le code |
| 6 | Deux écrivains divergents du snapshot | ✅ corrigé |
| 7 | `completedSessionId` toujours `null` | ✅ corrigé |
| 8 | Catch silencieux | ✅ corrigé (14 → 0 non intentionnels) |
| 9 | `console.*` en production | 🔁 **constat surévalué** — les logs étaient déjà gardés ; plugin ajouté quand même |
| 10 | Titre anglais forcé à la reprise | ✅ corrigé |
| 11 | Onboarding à deux fonds | ✅ corrigé |
| 12 | Couleurs de difficulté divergentes | ✅ corrigé |
| 13 | `#101323` vs token `#101322` | ✅ corrigé |
| 14 | Reduced motion | 🔁 **constat faux** — tout était implémenté ; le vrai défaut (jamais activable) est corrigé |
| 15 | Hex codés en dur | ✅ corrigé pour graphiques et dégradés |
| 16 | Seuils de couverture sous le réel | ✅ corrigé |
| 17 | 8 suppressions « refactor planned » | ✅ corrigé (7 réécrites, 1 devenue inutile) |

Tests : **357 → 370**, tous au vert. Couverture : 46,4 → 48,6 % lignes,
38,3 → 39,4 % branches, avec les seuils calés juste dessous.

Les correctifs de fond, plutôt que ligne à ligne :

- **Les dégâts du boss ne sont plus écrits pendant la séance.** Ils sont accumulés
  en mémoire et commités une seule fois dans `saveSession`, où ils peuvent enfin
  porter l'id de la séance. Un seul changement règle les constats 2, 3 et 7.
- **Le snapshot de récupération a une source unique.** `SavedSessionState` dérive
  de `SessionState` par `Pick<>`, le subscriber est le seul écrivain, la
  restauration se fait par spread. Un champ ajouté à la séance ne peut plus être
  persisté à moitié — ce qui rend les constats 1 et 4 impossibles à réintroduire.
- **Une seule source par valeur.** `localizedTitle()` pour les 14 sites de titre,
  `constants/rawColors.ts` pour ce que les graphiques et dégradés ne peuvent pas
  prendre en token, `DIFFICULTY_COLORS` / `DIFFICULTY_COLOR_TOKENS` côte à côte.

Reste ouvert, volontairement :

- **`saveSession` atomique** — faire passer une transaction à travers dix modules
  `db/` est un chantier bien plus gros que l'idempotence, qui suffit à couvrir le
  bug réel (retry qui duplique). À faire si une séance à moitié enregistrée est
  observée en vrai.
- **Interrupteur reduced-motion dans les réglages** — l'OS est désormais respecté,
  ce qui honore l'exigence produit ; un contrôle explicite reste souhaitable.
- **Tout ce qui demande un appareil** (voir la dernière section).

---

## P0 — Corruption d'état ou blocage utilisateur

### 1. Reprendre une séance pendant l'échauffement donne un écran blanc

`stores/session.ts:653` · `hooks/useSessionRecovery.ts:111`

Le snapshot de récupération ne sérialise **jamais** `warmupSequence`, et
`recoverSession` ne le restaure pas. Or `prePauseStatus` peut valoir `"warmup"`
(ligne 118). Au retour : `status: "warmup"` avec `warmupSequence: []`.

`components/session/WarmupView.tsx:58-59` fait `warmupSequence[warmupIndex]` puis
`if (!step) return null` → **écran vide, aucun moyen d'avancer**. La séance est
perdue.

> Reproduction : lancer une quête avec échauffement, mettre en pause pendant
> l'échauffement, tuer l'app, rouvrir, « Reprendre ».

**Correctif** : ajouter `warmupSequence` au snapshot et à la restauration. Filet de
sécurité dans `WarmupView` : si `!step` et `warmupSequence.length === 0`, appeler
`skipWarmup()` au lieu de rendre `null`.

### 2. `restartRound()` ne rend pas les PV déjà retirés au boss

`stores/session.ts:289-312`

`completeExercise` appelle `dealDamage` (`db/bossFights.ts:332`) qui **écrit
`currentHp` en base immédiatement**. `restartRound` purge les `results` du round en
cours et remet `lastDamageResult: null`, mais ne touche ni à `bossFight.currentHp`
ni à la base.

Rejouer un round recompte donc intégralement ses dégâts. Un boss peut être tué en
répétant le même round. `resetBossFight` existe (`db/bossFights.ts:365`) mais n'est
jamais utilisé ici.

**Correctif** : `restartRound` doit annuler les dégâts du round. Le plus simple :
`bossDamageLog` a déjà les lignes — ajouter un `revertDamageSince(bossFightId,
timestamp)` qui les soustrait et les supprime, dans la même transaction.
**Aucun test ne couvre `restartRound`.**

### 3. Abandonner une séance conserve les dégâts infligés

`stores/session.ts:314-334`

`quitSession()` remet le store à zéro mais les dégâts sont déjà en base. On peut
donc entamer une aventure boss, faire les exercices, quitter avant l'écran de
victoire : **les PV du boss restent baissés, sans aucune séance journalisée**.

C'est la même racine que le point 2 : l'écriture précède l'engagement.

**Correctif** : soit différer `dealDamage` jusqu'à `saveSession` (dégâts calculés en
mémoire pendant la séance, persistés une fois), soit annuler au `quitSession`. La
première option est la plus propre et règle 2 et 3 d'un coup.

### 4. `bossStartHp` n'est pas restauré après récupération

`stores/session.ts:658` · `hooks/useSessionRecovery.ts:12-29`

Le champ que tu es en train d'ajouter (non commité) est bien écrit dans le snapshot
côté `subscribe`, mais l'interface `SavedSessionState` du hook ne le déclare pas et
`recoverSession` ne le relit pas. Après reprise, `bossStartHp` vaut `null` → la barre
d'arène n'a plus de référence pour mesurer les dégâts du jour.

**Correctif** : à traiter avec le point 6 (source unique du snapshot), sinon le champ
sera oublié à chaque ajout suivant.

### 5. `saveSession` n'est pas transactionnel

`stores/session.ts:485-608`

~12 `await` séquentiels : création de séance, étape d'aventure, records, échelons,
série, succès, serment, village. Si l'un échoue au milieu, la séance est **déjà
créée** mais la progression est partielle, et l'appelant reçoit une exception.

`VictoryView.tsx:69` documente déjà le risque :

```
// ponytail: saveSession isn't idempotent — a retry after a partial failure can
//           duplicate the session row.
```

Le bouton « réessayer » de l'écran de victoire peut donc **dupliquer la séance**.

**Correctif** : envelopper le bloc dans `transactionOrFallback` (déjà utilisé par
`dealDamage`), ou rendre `createCompletedSession` idempotent via une clé de séance
(`startTime + questId`).

---

## P1 — Fiabilité et maintenance

### 6. Deux écrivains concurrents du snapshot, aux schémas divergents

`stores/session.ts:613-678` (vivant) · `hooks/useSessionRecovery.ts:161-191` (mort)

| Champ | `subscribe` (utilisé) | `saveSessionState()` (mort) | Interface déclarée |
|---|---|---|---|
| `warmupIndex` | ❌ absent | ✅ | ✅ requis |
| `bossStartHp` | ✅ | ❌ | ❌ |
| `warmupSequence` | ❌ | ❌ | ❌ |

`saveSessionState` et `clearSavedSession` exportés par le hook ne sont **appelés par
personne** (vérifié sur tout le repo). L'interface `SavedSessionState` déclare
`warmupIndex` comme requis alors que le seul écrivain réel ne l'écrit jamais — d'où
le `?? 0` défensif ligne 120 qui masque le trou.

**Correctif** : supprimer le code mort, et dériver le type du store
(`Pick<SessionState, ...>`) pour que TypeScript casse à chaque champ oublié. C'est ce
qui aurait attrapé 1 et 4 tout seul.

### 7. `bossDamageLog.completedSessionId` est toujours `null`

`stores/session.ts:356` · `db/bossFights.ts:344`

Le seul appelant en production de `dealDamage` ne passe jamais `completedSessionId`
(la séance n'existe pas encore à ce moment). La colonne est donc morte en pratique et
`getBossDamageHistory` ne peut rattacher aucun dégât à une séance.

Se règle gratuitement si on adopte le correctif du point 3 (dégâts persistés au save).

### 8. 14 blocs `catch` silencieux sur 51

`stores/session.ts:374,629,673` · `hooks/useSessionRecovery.ts:190,199` ·
`hooks/useSound.ts:21` · `components/session/VictoryView.tsx:118` ·
`db/preferences.ts:210` · `app/(tabs)/journal/index.tsx:123` ·
`app/(tabs)/quests/[id].tsx:312` · `components/journal/MuscleBalanceCard.tsx:44`

Le plus grave : `stores/session.ts:374` avale l'échec de `dealDamage`. Le coup ne
compte pas, l'utilisateur ne le sait pas, la barre de PV ne bouge pas — sans trace.

Tous ne sont pas à corriger : `requestFlameWidgetUpdate` et `rescheduleOathReminder`
sont **délibérément** non bloquants et commentés comme tels. La distinction à établir
est : *silencieux volontaire* (widget, son, notification) vs *silencieux par défaut*
(dégâts, sauvegarde, préférences).

**Correctif** : un `reportError(e, context)` minimal (console en dev, no-op en prod
tant qu'il n'y a pas de télémétrie). Les 3 du chemin séance doivent en plus remonter
visuellement.

### 9. Les `console.*` ne sont pas retirés des builds de production

`babel.config.js` · `components/DatabaseProvider.tsx`

Nuance importante par rapport à ma première lecture : les 13 `console.log` de
`DatabaseProvider` sont **déjà doublement gardés** par
`__DEV__ && process.env.EXPO_PUBLIC_MIGRATIONS_DEBUG === "1"`
(`components/DatabaseProvider.tsx:231`), et ne partent donc jamais en production.
Les `console.error` restants sont de vrais chemins d'erreur, avec re-`throw` — ils
doivent rester.

Ce qui est réellement absent, c'est ce que note `docs/architecture/performance.md`
(règle 3) : `babel-plugin-transform-remove-console` n'est pas installé, donc
n'importe quel `console.*` ajouté ailleurs part en release, avec son coût sur le
thread JS.

**Correctif** : ajouter le plugin en env production, en excluant `error` — c'est le
puits de `reportError` (constat 8) et la dernière trace que laisse un crash.

### 10. La carte de reprise affiche toujours le titre anglais

`hooks/useSessionRecovery.ts:78` — `questTitle: saved.quest.enTitle`

C'est le **seul** des 14 sites du repo qui n'applique pas
`language === "fr" ? frTitle : enTitle`. En français, la carte « Reprendre la séance »
affiche un titre anglais.

C'est la conséquence directe du ternaire recopié 14 fois sans helper — cause racine 3.

**Correctif** : un `localizedTitle(row, language)` dans `src/i18n`, appliqué partout.
Une seule implémentation, plus d'oubli possible.

---

## P2 — Incohérences visuelles

### 11. L'onboarding alterne entre deux couleurs de fond

| Écran | Dégradé vers |
|---|---|
| `presentation.tsx:26,30` | `#101323` (surface) |
| `training-level.tsx:60,64` | `#0B0F19` (bgDark) |
| `village-setup.tsx:61,65` | `#101323` (surface) |
| `first-session.tsx:78,82` | `#0B0F19` (bgDark) |

Un écran sur deux dans le **même flux**. La couture est visible au swipe.

**Correctif** : choisir `$bgDark` pour tout l'onboarding.

### 12. Les couleurs de difficulté divergent entre deux écrans

| Niveau | `ProgressionChart.tsx:132-136` | `JournalStats.tsx:431-437` |
|---|---|---|
| easy | `#16A34A` (= token `$success`) | `#22C55E` ❌ hors token |
| medium | `#0D33F2` (= `$primary`) | `#0D33F2` ✅ |
| hard | `#FF1744` (= token `$error`) | `#EF4444` ❌ hors token |

Même sémantique, deux verts et deux rouges différents. `JournalStats` a inventé les
siens.

**Correctif** : `constants/difficultyColors.ts` exportant les 3 tokens, consommé par
les deux écrans. (À noter : `constants/exerciseColors.ts` fait déjà exactement ça
pour les exercices — le motif existe, il n'a pas été réutilisé.)

### 13. Le token `surface` est recopié avec une faute

`tamagui.config.ts:109` définit `surface: "#101322"`. L'onboarding utilise `#101323`
et `rgba(16, 19, 35, …)` (= `#101323`). Un digit d'écart.

Invisible à l'œil, mais c'est la preuve que la valeur a été recopiée à la main : la
prochaine dérive ne sera pas invisible.

### 14. Le *reduced motion* est implémenté mais impossible à activer

`hooks/useReducedMotion.ts` · `stores/settings.ts:57` · `app/settings.tsx`

La plomberie est **complète et correcte** : le hook existe, et les 7 composants
animés le respectent — `CountdownView`, `BossArena`, `VillageScene`,
`NewRecordsBadge`, `GrowthPulse`, `FlameFlicker`, et le `ConfettiCannon` de
`VictoryView.tsx:352` (`{!reducedMotion && result && …}`).

Le défaut est ailleurs : `reducedMotion` est un réglage applicatif qui vaut `false`
par défaut (`stores/settings.ts:57`) et qui n'est **exposé dans aucun écran** —
aucune occurrence dans `app/settings.tsx` ni dans les fichiers de `locales/`.
Il n'est jamais initialisé depuis la préférence système non plus.

Résultat : le drapeau est toujours `false`, et tout ce travail est mort en pratique.

`PRODUCT.md` demande de « respecter les préférences reduced-motion » — c'est-à-dire
celle de l'OS.

**Correctif** : initialiser le défaut depuis
`AccessibilityInfo.isReduceMotionEnabled()` au chargement des réglages. C'est ~5
lignes dans `loadSettings`, et ça honore l'exigence produit sans toucher à l'UI. Un
interrupteur explicite dans `app/settings.tsx` reste souhaitable, mais il est
secondaire : l'OS est la source d'intention.

### 15. 34 couleurs hex codées en dur

Répartition : `JournalStats` 12, `DatabaseProvider` 7, `ProgressionChart` 6,
`VillageScene` 2, puis 1 chacun sur `BossArena`, `CurrentAdventureWidget` et les 4
écrans d'onboarding.

Une partie est **légitime et déjà justifiée en commentaire** : `LinearGradient` et
`react-native-gifted-charts` prennent des couleurs brutes, pas des tokens Tamagui
(cf. `CurrentAdventureWidget.tsx:73`). Ce n'est pas à corriger à l'aveugle.

**Correctif** : exporter les valeurs brutes depuis `tamagui.config.ts`
(`export const rawColors = { … }`) et faire pointer graphiques et dégradés dessus.
Les tokens restent la source unique, les libs tierces sont servies.

---

## P3 — Garde-fous

### 16. Les seuils de couverture sont sous le réel

`package.json` — seuils : branches 30, fonctions 29, lignes 39, statements 38.
Réel : branches 38,3, fonctions 37,8, lignes 47,4, statements 46,4.

Le cliquet est **8 points sous le sol**. On peut supprimer des tests sans que la CI
bronche.

**Correctif** : caler les seuils sur le réel arrondi vers le bas (branches 38,
fonctions 37, lignes 47, statements 46).

### 17. 8 suppressions « refactor planned » jamais suivies

`app/(tabs)/quests/[id].tsx:100,494` · `app/(tabs)/adventures/[id].tsx:151` ·
`app/(tabs)/journal/[id].tsx:49,256` · `components/DatabaseProvider.tsx:61` ·
`components/session/ProgressionChart.tsx:45` · `components/home/useSmartAction.ts:31`

Toutes portent le motif `noExcessiveCognitiveComplexity` avec la mention « refactor
planned ». Ce sont les fichiers les plus longs du repo (632, 606, 542 lignes) — et
statistiquement ceux où les bugs P0 vivent.

Le repo a déjà une convention `ponytail:` pour la dette assumée
(`VictoryView.tsx:69`) : elle est meilleure, elle nomme le plafond et la sortie.

---

## Plan de stabilisation *(exécuté)*

Ordonné par **ratio bug évité / effort**, pas par sévérité brute. Chaque lot est
livrable et testable seul, et correspond à un commit.

L'ordre importait : le lot 1 commence par dédupliquer le snapshot **avant** de
corriger les bugs qu'il causait, pour que TypeScript casse de lui-même si le
problème est réintroduit.

### Lot 1 — Arrêter l'hémorragie d'état (P0 · ~1 j)

L'ordre compte : 6 avant 1 et 4, parce qu'il les rend impossibles à réintroduire.

1. **Source unique du snapshot** (constat 6) — supprimer `saveSessionState` /
   `clearSavedSession` morts, dériver `SavedSessionState` de `SessionState` via
   `Pick<>`, ajouter `warmupSequence` et `bossStartHp`. TypeScript casse dès qu'un
   champ manque.
2. **Filet dans `WarmupView`** (constat 1) — `skipWarmup()` sur séquence vide.
3. **Déplacer `dealDamage` dans `saveSession`** (constats 2, 3, 7) — les dégâts sont
   calculés en mémoire pendant la séance, persistés une seule fois au save, avec
   `completedSessionId`. Règle trois constats d'un seul changement.

*Tests à écrire* : reprise pendant l'échauffement ; `restartRound` ne double pas les
dégâts ; `quitSession` ne laisse aucun dégât en base.

### Lot 2 — Rendre les échecs visibles (P1 · ~0,5 j)

4. **`reportError(e, context)`** (constat 8) — remplacer les 14 `catch` muets.
   Marquer explicitement `// non-bloquant volontaire` les 3 qui doivent le rester.
5. **`babel-plugin-transform-remove-console`** (constat 9) — supprime aussi 7
   `biome-ignore`.

Ce lot ne corrige aucun bug. Il fait apparaître les suivants — c'est son intérêt :
sans lui, l'audit #3 repartira de zéro.

### Lot 3 — Une source par valeur (P1 + P2 · ~1 j)

6. **`localizedTitle(row, language)`** (constat 10) — 14 sites, 1 implémentation.
7. **`constants/difficultyColors.ts`** (constat 12) — sur le modèle de
   `exerciseColors.ts` qui existe déjà.
8. **`rawColors` exporté de `tamagui.config.ts`** (constats 13, 15) — graphiques et
   dégradés pointent sur les tokens.
9. **Fond d'onboarding unifié sur `$bgDark`** (constat 11).

### Lot 4 — Tenir l'accessibilité promise (P2 · ~0,5 j)

10. **`useReducedMotion()`** (constat 14) — confetti + 3 animations. C'est une
    exigence produit écrite, pas un confort.

### Lot 5 — Empêcher le retour en arrière (P3 · ~0,5 j)

11. **Remonter les seuils de couverture au réel** (constat 16).
12. **`saveSession` transactionnel ou idempotent** (constat 5) — le plus lourd, à
    faire une fois le lot 1 stabilisé.
13. **Convertir les 8 `refactor planned` en `ponytail:`** (constat 17) avec plafond
    et condition de sortie nommés, récoltables par `/ponytail-debt`.

---

## Ce que l'audit n'a pas couvert

- **Rendu réel sur appareil** — tout est lu depuis le code. Les incohérences
  d'espacement, de hauteur de ligne ou de zone tactile (< 44 px) demandent un passage
  écran par écran sur device.
- **Contraste WCAG AA** — `DESIGN.md` fixe 4,5:1 corps / 3:1 grand texte. Non
  mesuré ici. `$textSecondary` `#909ACB` sur `$surface` `#101322` est le couple à
  vérifier en premier.
- **Migrations SQLite** — `DatabaseProvider` a une logique de migration complexe
  (`noExcessiveCognitiveComplexity` supprimé ligne 61) qui mériterait son propre
  audit, sur base réelle mise à niveau depuis une version antérieure.
- **Performance mesurée** — `docs/architecture/performance.md` tient déjà sa propre
  liste de manques (WebP, `cachePolicy`, lazy-load) ; je ne l'ai pas dupliquée.
