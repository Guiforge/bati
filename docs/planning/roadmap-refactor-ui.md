# Roadmap Refactor UI (NEW_STYLE) — BatiV3

> Objectif : refactoriser progressivement **l’UI** pour converger vers **un thème unique** inspiré de `NEW_STYLE/`, avec un Design System Tamagui réutilisable, et une migration écran-par-écran sans casser les features.
>
> Principes clés :

> - **Design System unique** (tokens + composants UI)
> - **Zéro hex dans les écrans** (tout via tokens Tamagui)
> - **i18n strict** (pas de strings hardcodées en écrans)
> - Refactor **par incréments** (1 PR = 1 écran / 1 composant majeur)
> - Expo Router / offline-first restent en place (l’objectif n’est pas de refaire l’architecture data)

---

## 🤖 System Prompt (référence d’exécution)

Cette roadmap suit le cadre suivant (résumé) :

- Rôle : **Lead Mobile Architect & UI Designer** (Expo/React Native, TypeScript, Tamagui)
- Vision : refactor UI complet vers **NEW_STYLE** (RPG dark, immersif, “juicy”)
- Qualité : TypeScript strict, composants UI isolés, i18n partout

Les sources de vérité UI sont les maquettes `NEW_STYLE/*.html`.

---

## Références

- Source UI : `NEW_STYLE/onboard.html`, `NEW_STYLE/quest.html`, `NEW_STYLE/details_adventure.html`, `NEW_STYLE/boss-battle.html`
- Stack actuelle : Expo / React Native, Tamagui, Zustand, SQLite + Drizzle, i18next, Jest, Biome

---

## Résultats attendus (Definition of Done UI)

À la fin de la roadmap :

- Tous les écrans “produit” ont un rendu **cohérent NEW_STYLE** (couleurs, typographies, surfaces, CTA).
- Aucun écran n’utilise de couleurs hardcodées (pas de `#...`) : uniquement des **tokens Tamagui**.
- Les composants `src/ui/*` sont la base (surfaces, boutons, headers, badges, états loading/error/empty).
- Les patterns UI sont unifiés : spacing, border, shadows/glow, icon buttons, listes.
- Les textes UI passent systématiquement par **i18n** (sauf Dev tools).
- Les tests passent : `npm test` et `npm run check`.

---

## Décisions UI à figer tôt

### A. Tokens NEW_STYLE (palette + typographies + effets)

Décision : l’UI suit les “intent” NEW_STYLE (dark immersive + primary bleu électrique + glow).

Contraintes de style (référence design, pas à hardcoder dans les vues) :

- Dark theme unique (pas de mode clair)
- Fonds profonds (ex: `#0B0F19` comme référence), jamais de blanc pur
- Formes : “Comic/Tech” (bordures nettes, coins arrondis mais marqués)
- Effets : glow sur éléments actifs + glassmorphism léger sur cartes
- Feedback : UI “juicy” (animations, haptics, feedback visuel immédiat)

Checklist tokens (à créer/ajuster dans `tamagui.config.ts`) :

- Surfaces : `$background`, `$surface`, `$surface2`
- Texte : `$color`, `$muted`
- Accents : `$primary`, `$primaryHover`, `$primaryPress`, `$primaryGlow`
- Contours : `$borderStrong` (outline “comic”) + `$shadowColor`

> Règle : les écrans/features n’utilisent pas de hex (`#101322`, `#0d33f2`, etc.). Seuls les tokens ont le droit d’avoir des valeurs brutes.

### B. i18n : politique “fallback”

- En écrans “produit” : pas de `t("key", "fallback")` (ou très limité). On privilégie des clés existantes (tests i18n).
- Exceptions tolérées : Dev tools (`app/dev.tsx`) et erreurs globales/splash.

---

## Stratégie de migration UI (sans “big bang”)

### 1) Construire un Design System minimal (Atomic Design)

Créer une base `src/ui/` et migrer l’UI via des composants de plus haut niveau.

Composants “obligatoires” (les plus rentables) :

- `ScreenContainer` (StatusBar, SafeArea, background, option background image)
- `GlassCard` / `SolidCard` (conteneurs principaux)
- `RPGButton` (Primary glow, Secondary, Ghost)
- `StatusBadge` et `ProgressBar` (XP/HP)
- `Typography` (titres RPG vs texte lisible)

Puis, composants de structure qui unifient les écrans :

- `HeaderNav` (titre + back + actions)
- `LoadingState` / `ErrorState` / `EmptyState`

### 2) Migrer écran par écran

Chaque écran suit la même recette :

1. Remplacer layout de base (SafeArea, paddings) par `ScreenContainer`
2. Remplacer boutons et cartes par DS (`RPGButton`, `GlassCard`/`SolidCard`)
3. Remplacer textes/labels par i18n (si non conforme)
4. Remplacer couleurs hardcodées par tokens
5. Valider : screenshot rapide + `npm test` (au minimum)
6. Vérifier souvent : `npm run check` (idéalement à chaque écran migré, et avant toute PR)

---

## Guardrails UI (règles anti-régression)

### 1) Zéro hex dans les écrans

- Les couleurs doivent venir de Tamagui tokens (`$primary`, `$background`, etc.).
- Les rares exceptions (assets SVG, libs externes) doivent être isolées.

### 2) Styles uniquement via tokens

- Les couleurs, rayons, ombres, spacing doivent être des tokens Tamagui.
- Éviter `style={{ ... }}` pour les propriétés de design (toléré pour layout ponctuel).

### 3) États UI standardisés

- Tous les écrans liste/detail réutilisent : `LoadingState`, `ErrorState`, `EmptyState`.

### 4) DRY helpers UI

- Les helpers (ex: résolution d’images, formatage de durée) doivent être partagés.

### 5) Composants “dumb” (UI)

- Les composants dans `src/ui/*` ne font **jamais** d’appels DB/Store.
- Ils reçoivent des `props` et émettent des événements.

### 6) TypeScript strict

- Pas de `any`.
- On corrige les types, on ne les ignore pas.

### 7) i18n partout

- Pas de texte en dur (sauf Dev tools).
- Utiliser `t("scope.key")`.

### 8) Fichiers petits et lisibles

- 1 fichier = 1 composant exporté.
- Éviter les fichiers géants (objectif : < 300 lignes, alerte au-delà de 500).

---

## Roadmap d’exécution (Phase 0 → 4)

Chaque phase a : scope, livrables, critères de validation, risques.

### 🔴 Phase 0 — Assainissement (priorité immédiate)

**But** : nettoyer le terrain avant de “peindre” l’UI.

Livrables :

- Analyser les erreurs de `npm run check`.
- Corriger les erreurs TypeScript (types manquants/cassés) et Biome.
- Valider que `tamagui.config.ts` peut porter les nouveaux tokens (couleurs, fonts, ombres/glow).

Validation :

- `npm run check` OK.
- `npm test` OK.

Risques :

- scope trop large → traiter en priorité ce qui bloque l’UI (types sur composants/UI).

---

### 🟠 Phase 1 — La Forge (Atomic Design)

**But** : créer les briques UI de base dans `src/ui/` (isolées, “dumb”).

Livrables :

- Tokens Tamagui alignés NEW_STYLE (background/surface/text/border/primary/glow)
- Composants atoms dans `src/ui/` : `ScreenContainer`, `Typography`, `RPGButton`, `GlassCard`, `SolidCard`, `IconButton`, `StatusBadge`, `ProgressBar`
- Composants de structure : `HeaderNav`, `LoadingState`, `ErrorState`, `EmptyState`

Validation :

- un écran “pilote” migré visuellement (ex: `treasury` ou `quests`) sans régression fonctionnelle
- `npm test` OK

Risques :

- sur-design trop tôt → rester minimal et incrémental

---

### 🟡 Phase 2 — Migration des molécules

**But** : assembler des composants métier (molécules) en n’utilisant **que** la Forge.

Cibles prioritaires :

- `QuestCard`
- `ResourceBar`
- `HeaderNav` (standardiser les entêtes)

Livrables :

- Molécules prêtes et réutilisables : `QuestCard`, `ResourceBar`, `HeaderNav` (versions NEW_STYLE)
- Réduction des styles inline (remplacés par tokens)

Validation :

- Audit rapide : 2–3 écrans majeurs ont exactement le même style de surface/boutons
- `npm test` OK

Risques :

- dettes “temp” (wrappers) → prévoir un cleanup en fin de roadmap

---

### 🟢 Phase 3 — Migration des écrans (pages)

**But** : remplacer écran par écran avec le DS (sans casser les flows).

Cibles :

- Onboarding (`NEW_STYLE/onboard.html`)
- Home
- Quests (list + details) (`NEW_STYLE/quest.html`)
- Boss battle (`NEW_STYLE/boss-battle.html`)

Travail :

- Adapter layout/spacing/typographies
- Uniformiser cards, chips, CTA
- Harmoniser les images (helpers partagés) et placeholders

Livrables :

- Un rendu cohérent NEW_STYLE sur les écrans cibles
- Un set de composants DS suffisant pour couvrir 80% des besoins

Validation :

- QA visuelle : comparaison avec `NEW_STYLE/*` (checklist)
- `npm test` OK

Risques :

- trop gros scope → migrer un écran à la fois

---

### 🔵 Phase 4 — Game Feel (polish)

**But** : donner le “feel” NEW_STYLE (sans ré-écrire la logique métier).

Livrables :

- Haptics cohérents (press / success / warning)
- Animations Tamagui (enter/press) et transitions list/detail
- États “reward” (XP, loot) lisibles et fun

Validation :

- aucune régression perf notable sur les listes
- retours UX internes (2–3 test sessions)

Risques :

- complexité état → utiliser machines d’état “light” (sans lib si pas nécessaire)

## Checklist PR (obligatoire)

Chaque PR UI doit confirmer :

- Pas de hex hardcodé dans les vues (tokens uniquement)
- Pas de `any` (TypeScript strict)
- i18n OK (pas de texte en dur)
- 1 fichier = 1 composant exporté
- `npm test` OK
- `npm run check` OK

---

## Format de livraison (pour chaque tâche / PR)

Quand vous implémentez un composant ou migrez un écran, la description (ou note de dev) doit suivre ce format :

1. **Analyse** : ce qui est changé et pourquoi (objectif UX + objectif tech).
2. **Code** : fichiers impactés (nouveau composant / migration écran) + points importants.
3. **Usage** : comment intégrer le composant dans un écran parent.
4. **Checklist Qualité** :

   - Pas de Hex
   - i18n OK
   - Types OK (pas de `any`)
   - Composants UI “dumb”
   - `npm test` OK
   - `npm run check` OK

---

## Quick Wins (à faire “à la volée” pendant les phases)

- Centraliser les helpers dupliqués (ex: `resolveQuestImage` / `resolveImage`).
- Remplacer les hex UI par tokens.
- Uniformiser les load-states.

---

## Suivi & livraison (cadence)

- Refactor en branches courtes : 1 PR = 1 écran/feature max.
- Chaque PR doit inclure : validation tests, captures avant/après (si UI change), note de migration (ce qui a bougé).

### Commandes à lancer souvent

- `npm run check` : le plus souvent possible (à chaque écran migré + avant PR) pour éviter d’accumuler les erreurs TypeScript/Biome.
- `npm test` : au minimum avant PR ; idéalement pendant la migration si vous touchez des composants transverses.

---

## Flows utilisateur à vérifier (liens entre pages)

Ces flows servent de **checklist QA** pendant la migration UI (éviter les régressions de navigation et de cohérence visuelle).

> Voir aussi la carte de navigation complète : `docs/PRODUCT_GUIDE.md`.

### Onboarding

- [Onboarding](../screens/onboarding.md) → [Home](../screens/home.md)

### Quêtes (workout rapide)

- [Home](../screens/home.md) → [Quests Gallery](../screens/quests.md) → [Quest Details](../screens/quest-details.md) → [Session](../screens/session.md) → [Journal](../screens/journal.md) → [Session Details](../screens/session-details.md)

### Adventures (campagne)

- [Home](../screens/home.md) → [Adventures Gallery](../screens/adventures.md) → [Adventure Details](../screens/adventure-details.md) → [Quest Details](../screens/quest-details.md) → [Session](../screens/session.md)

### Progression & récompenses

- [Home](../screens/home.md) → [Village](../screens/village.md)
- [Home](../screens/home.md) → [Treasury](../screens/treasury.md)

### Planification

- [Home](../screens/home.md) → [Goals](../screens/goals.md) → [Schedule](../screens/schedule.md)

### Préférences

- [Home](../screens/home.md) → [Settings](../screens/settings.md) → [Credits](../screens/credits.md)

---

## Notes (état actuel)

- `npm test -- i18n-keys.test.ts` est OK.
- `npm run check` a échoué récemment (à investiguer en Phase 0). L’objectif est qu’il redevienne vert en continu avant d’accélérer la migration UI.
