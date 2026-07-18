# 🧭 Bati — Roadmap d'alignement (codebase ↔ vision wiki)

> **But de ce document.** Réaligner le code existant sur la **vision produit consolidée**
> décrite dans le wiki (`proj/wiki/projets/bati*.md`), **re-validée en 2026-07**.
> Le code a accumulé de la **scope creep** (exactement le risque n°1 anticipé par le wiki) :
> systèmes d'or, d'économie de bâtiments, de goals/planning construits comme des mécaniques
> à part entière, alors que la doctrine MVP dit de **couper, fusionner ou différer**.
>
> Ce document **remplace** [ROADMAP.md](roadmap-archive.md) comme source de vérité de priorisation.
> `ROADMAP.md` reste un historique de ce qui a été construit (utile pour savoir *quoi* nettoyer).

**Sources (north star) :**
[bati.md](../../../proj/wiki/projets/bati.md) ·
[bati-strategie.md](../../../proj/wiki/projets/bati-strategie.md) ·
[bati-gameplay-audit.md](../../../proj/wiki/projets/bati-gameplay-audit.md) ·
[bati-boucle-et-parcours.md](../../../proj/wiki/projets/bati-boucle-et-parcours.md) ·
[bati-mecaniques.md](../../../proj/wiki/projets/bati-mecaniques.md) ·
[bati-direction-artistique.md](../../../proj/wiki/projets/bati-direction-artistique.md) ·
[bati-ecrans.md](../../../proj/wiki/projets/bati-ecrans.md) ·
[bati-anti-triche.md](../../../proj/wiki/projets/bati-anti-triche.md)

---

## ⭐ North Star — ce que Bati DOIT être (rappel condensé)

**Une app de sport** dont la couche RPG est une **peau en lecture seule** : le journal de
séances (append-only) est **la seule source de vérité**, tout le reste est **dérivé** par
des fonctions pures. « Le village ne se gère pas, il se **calcule**. »

### Le set MVP = 6 mécaniques (et pas une de plus)

1. **Start Quest** ultra-facile (2 taps) — levier n°1 (Fogg).
2. **Loot** = **XP** + réaction du village (léger aléatoire) — feedback de compétence.
3. **Flamme / streak** bienveillante — rétention douce (une seule méca de perte).
4. **Village-signature** qui grandit et te ressemble — dérivé, lecture seule.
5. **Aventures narratives** (1 boss en fin) — sens + autonomie + le *pourquoi*.
6. **Stats** — feedback de compétence.

### Décisions dures actées par le wiki (2026-07)

- ❌ **Pas d'Or au MVP** (ni monnaie, ni boutique, ni Or **idle/passif**). L'Or revient en
  **Phase 2-3** avec un **seul usage : customisation du village**.
- 🔀 **1 monnaie/compteur au MVP = XP.** Les « 4 ressources » deviennent du **flavor visuel
  dérivé**, pas une économie à dépenser.
- 🔀 **Village = dérivé, lecture seule.** Pas de « XP par bâtiment » ni de système d'upgrade
  parallèle. Le village se **rend** depuis l'état (`état → liste d'images → affichage`).
- 🔀 **Achievements/badges = fusionnés** dans les **milestones du village**.
- ✅ **Règle « aucune séance n'est perdue »** : toute séance nourrit **toujours** XP + village
  + flamme ; l'aventure avance **en bonus** si c'est la quête du jour.
- ⏭️ **Différés (backlog assumé)** : Or/customisation, talismans/totem, social/multi,
  saisons & jour-nuit, coach IA, wearables, boss saisonniers, animaux, attaque du village.
- ❌ **Coupé définitivement** : attaque du village (redondant avec la flamme = double punition).

### DA & techno

- **Stack réelle : Expo / React Native + Tamagui + Zustand + SQLite/Drizzle + i18next.**
  (Le wiki proposait Tauri v2 ; le repli **Expo** a été retenu — **décision figée, on garde Expo**.)
- **Rendu : cartes-first + 1 panneau village illustré** (5 paliers + overlays), flat 2D dark
  fantasy. *Juice* déclaratif (animations RN/Reanimated + Lottie). **Zéro moteur de jeu.**
- Village MVP = **1 image par palier + overlays** (flamme, PNJ dominant, bannière boss).

### Navigation cible

Barre à **3 onglets** : **Village · Aventures · Stats** + bouton pleine largeur
**« Commencer une quête »** ancré bas sur le Village.

### Anti-triche (doctrine « miroir, pas trophée »)

Solo/local-first, **zéro classement**, **zéro échange** de récompense. Garde-fous MVP
peu coûteux : **bornes de plausibilité**, **plafonds journaliers** XP, **saisie à friction
réelle** (2 taps), **journal append-only** (déjà en place). Anti-triche « sérieux » =
seulement **le jour d'un social compétitif**.

---

## 🔍 Audit de l'écart (codebase actuel vs vision)

Légende action : **KEEP** = garder · **SIMPLIFY** = garder mais réduire/dériver ·
**DEFER** = retirer de la surface MVP (données/écrans mis en veille) · **CUT** = supprimer.

| Domaine (code) | État actuel | Verdict wiki | Action |
| :--- | :--- | :--- | :--- |
| **Journal de séances** (`db/completed.ts`, append-only) | ✅ En place | Source de vérité unique | **KEEP** ✅ (déjà aligné) |
| **XP / niveaux** (`db/xp.ts`, `db/userLevel.ts`) | ✅ En place | Compteur MVP n°1 | **KEEP** |
| **Flamme / streak** (`db/streaks.ts`) | ✅ En place | Cœur rétention | **KEEP** + ajouter « Marche de repentance » |
| **Start Quest / session** (`stores/session.ts`, `app/session.tsx`) | ✅ En place | Cœur (Fogg 2 taps) | **KEEP** + audit « 2 taps » |
| **Aventures** (`db/adventures.ts`, `app/(tabs)/adventures/`) | ✅ En place | Cœur (le *pourquoi*) | **KEEP** + appliquer « aucune séance perdue » |
| **Boss** (`db/bossFights.ts`, `bossDamageLog`) | Complet (weakness/resist/crit) | ✅ Garder 1-2, difficulté adaptative | **SIMPLIFY** → fin d'aventure, moins de sous-systèmes |
| **Or / monnaie** (`resourceTransactions`, `app/treasury.tsx`) | Monnaie + écran Trésor | ❌ Pas d'Or au MVP | **DEFER** (retirer surface, geler données) |
| **4/7 ressources** (`db/resources.ts`, `resourceInventory`, `ResourcesOverview`, `ResourceHeader`) | Économie affichée en header | 🔀 XP seul ; ressources = flavor dérivé | **SIMPLIFY** → dérivé visuel, hors header/économie |
| **Bâtiments village** (`db/buildings.ts`, `villageBuildings`, 19 types, XP/upgrade par bâtiment) | Système de progression parallèle | 🔀 Fusionner dans « le village grandit », lecture seule | **SIMPLIFY** → rendu dérivé (paliers + overlays), supprimer XP-par-bâtiment |
| **villageStats** (`village_stats`) | Agrégats | Dérivés OK | **SIMPLIFY** → recalcul dérivé (pas d'état muté) |
| **Achievements** (`db/achievements.ts`) | Système séparé | 🔀 Fusionner avec milestones village | **SIMPLIFY** → milestones dérivés |
| **Goals** (`db/goals.ts`, `app/goals.tsx`, `goalProgress`) | Objectifs hebdo + suivi | ⏭️ Coach = règles simples plus tard | **DEFER** |
| **Planning / scheduling** (`db/plans.ts`, `db/scheduling.ts`, `app/schedule.tsx`, `scheduledSessions`) | Planificateur | ⏭️ Différé | **DEFER** |
| **Personal records** (`db/personalRecords.ts`) | Système PR | Non prévu au MVP | **DEFER** (ou fondre dans Stats plus tard) |
| **Muscle balance** (`db/muscleBalance.ts`, cartes) | Analyse | Peut vivre dans Stats | **SIMPLIFY** → sous-section Stats optionnelle |
| **Rest suggestions** (`db/restSuggestions.ts`) | Suggestions repos | Non prévu MVP | **DEFER** |
| **Difficulty suggestion** (`db/difficultySuggestion.ts`) | Ajuste difficulté | ✅ Sert la « difficulté adaptative » boss | **KEEP** (règle simple) |
| **Or idle / revenu passif** | ❌ **Absent du code** | ❌ Interdit | ✅ Déjà conforme (rien à faire) |
| **Attaque du village** | ❌ Absent du code | ❌ Coupé | ✅ Déjà conforme |
| **Navigation** : 5 onglets (`index`, `adventures`, `quests`, `village`, `journal`) | 5 onglets + Home + Treasury | 3 onglets (Village/Aventures/Stats) + bouton Start Quest | **SIMPLIFY** → restructurer nav |
| **Onboarding** (`app/onboarding/`) | Langue + avatar + nom village | 1 question objectif → 1re quête < 2 min → village apparaît | **SIMPLIFY** → réduire friction avant 1er loot |

> **Constat clé :** le code traite **Or, ressources et bâtiments** comme des **mécaniques
> gérées** (état muté, transactions, upgrades). La vision les veut **dérivés/en lecture seule**
> (ou différés). C'est **le** chantier d'alignement central.

---

## 🧹 Plan de nettoyage (cleanup)

Objectif : réduire la surface aux **6 mécaniques**, **sans casser** l'archi data (offline-first).
Principe : on **désactive la surface** (écrans, header, économie) avant de toucher au schéma ;
on garde les données historiques, on ne détruit rien d'irréversible sans validation.

### C1 — Retirer l'Or de la surface MVP
- Retirer l'onglet/écran **Treasury** ([app/treasury.tsx](../../app/treasury.tsx)) de la navigation.
- Retirer l'affichage Or du **Home** et de `ResourcesOverview` / `ResourceHeader`.
- Cesser d'**attribuer** de l'Or à la validation de séance (loot = **XP** + réaction village).
- Geler (ne pas supprimer) `resourceTransactions` : données dormantes, réactivables en Phase 2-3.

### C2 — Démoter les ressources en flavor dérivé
- Sortir les 7 ressources de l'**économie** : plus de « dépense », plus de header d'inventaire.
- Recalculer les totaux par sport **à la volée** depuis le journal (pas d'inventaire muté).
- Les ressources ne servent qu'à **piloter le visuel** (PNJ/sprites dominants).

### C3 — Rendre le village dérivé et en lecture seule
- Remplacer la logique **XP-par-bâtiment / upgrade** (`db/buildings.ts`) par un **rendu dérivé** :
  `palier = f(niveau)` + overlays conditionnels (flamme, PNJ dominant, bannière boss vaincu).
- `processSessionBuildings` → supprimé de la boucle de séance (plus de mutation d'état village).
- `villageStats` → vue dérivée, pas une table mutée.

### C4 — Fusionner Achievements dans les milestones du village
- Les « déblocages » deviennent des **seuils dérivés** (ex. `totalForceReps >= 500 → Forge`).
- Un seul concept « milestone » = ce que le village **montre**, plus de système de badges séparé.

### C5 — Différer Coach / Goals / Planning
- Retirer de la nav/surface : `app/goals.tsx`, `app/schedule.tsx`.
- Mettre en veille `db/goals.ts`, `db/plans.ts`, `db/scheduling.ts`, `db/restSuggestions.ts`,
  `db/personalRecords.ts` (code conservé, non câblé à la boucle MVP).

### C6 — Restructurer la navigation (3 onglets)
- Onglets cibles : **Village · Aventures · Stats**.
- Fusionner `index` (Home) et `village` → **un** écran Village (identité + bouton Start Quest ancré bas).
- `quests` → **flux Start Quest** (déclenché par le bouton), pas un onglet permanent.
- `journal` → **Stats** (feedback de compétence).

### C7 — Documentation
- Marquer [ROADMAP.md](roadmap-archive.md) comme **archive historique** (ce document devient la référence).
- Aligner [VISION.md](../product/vision.md) / [PRODUCT.md](../product/positioning.md) sur « pas d'Or au MVP, village dérivé ».

> ⚠️ **Aucune suppression de schéma / migration destructive sans validation explicite.**
> Étape « geler les données » d'abord ; nettoyage du schéma seulement une fois l'UI stabilisée.

---

## 🔧 Plan d'amélioration (align & polish)

### I1 — Boucle « aucune séance n'est perdue »
Garantir que **toute** séance (quête libre **ou** aventure) écrit XP + met à jour flamme +
recalcule le village. L'aventure n'avance que si c'est sa quête du jour, **sans jamais**
gâcher une séance faite « à côté ».

### I2 — Loot recentré sur XP + réaction village
Overlay de loot = **coffre + XP** + (si seuil franchi) toast « le village s'agrandit » +
(si aventure) carte narrative. Tap = skip. `prefers-reduced-motion` → crossfade.

### I3 — Village illustré par palier (DA MVP)
Implémenter le patron `VILLAGE_TIERS` (5 paliers) + overlays conditionnels, façon
[bati-direction-artistique.md](../../../proj/wiki/projets/bati-direction-artistique.md).
Assets : Kenney/itch/IA **style verrouillé** (1 pack, 1 palette, unification par filtre).

### I4 — Flamme bienveillante complète
Intensité 0-3, **Bûche magique** (freeze), **Marche de repentance** (15 min) au retour,
**aucune cascade de punition**. Bandeau doux quand éteinte (jamais culpabilisant).

### I5 — Aventures = sens + boss adaptatif
Une aventure active à la fois, cartes narratives par jour, **1 boss** en fin, difficulté
**adaptative** (réutiliser `db/difficultySuggestion.ts`).

### I6 — Stats lisibles
Streak, totaux par famille de sport, niveau, séances/semaine, sport dominant (explique le
village). États vides pédagogiques.

### I7 — Anti-triche MVP (peu coûteux)
Bornes de **plausibilité** (refuser « 5000 pompes en 2 min »), **plafonds journaliers** XP,
saisie **2 taps réels** (pas de champ « 9999 »). Journal append-only déjà auditable. **Zéro
classement, zéro échange.**

### I8 — Onboarding < 2 min
1 question objectif → 1re quête guidée → **1er loot** → le village apparaît. Aucune inscription,
aucun mur avant la 1re récompense.

---

## 🎨 Rituel qualité design — skill `impeccable` (à chaque étape)

> **Règle transverse :** **aucun commit / push** d'une étape n'est fait tant que le **design
> gate** n'est pas passé. Chaque phase **ouvre** par une commande de cadrage design et
> **ferme** par une commande de contrôle, via la skill `impeccable`
> ([SKILL.md](../../../.agents/skills/impeccable/SKILL.md)). Plateforme = `adaptive` (Expo/RN)
> → les variantes **natives** des commandes (`audit`, `adapt`) s'appliquent.

**Boucle par étape (ouvrir → construire → contrôler → gate → commit) :**

1. **Ouvrir** — `$impeccable shape <écran/feature>` (plan UX/UI avant de coder) ou
   `$impeccable distill <cible>` quand l'étape est un **nettoyage** (retirer de la complexité).
2. **Construire** — `$impeccable craft <feature>` pour bâtir end-to-end sur le design system Tamagui.
3. **Contrôler** — `$impeccable critique <écran>` (revue UX notée) **et**
   `$impeccable audit <écran>` (a11y, responsive, reduced-motion — variante native).
4. **Design gate (avant commit/push)** — corriger tout P0/P1 remonté, puis
   `$impeccable polish <écran>` (passe finale). **Vert requis pour committer.**
5. **Commit / push** — uniquement une fois le gate vert + `npm run check` + `npm test` OK.

**✅ Design gate — checklist commune (avant chaque commit) :**

- [ ] `$impeccable critique` : score OK, **zéro P0**, P1 traités ou justifiés.
- [ ] `$impeccable audit` (natif) : contraste ≥ 4.5:1, cibles ≥ 44px, `prefers-reduced-motion` géré.
- [ ] **Tokens only** : zéro hex en écran, tout via tokens Tamagui (`$bgDark`, `$primary`, …).
- [ ] **i18n strict** : aucun texte en dur (`t()` partout, sauf Dev tools).
- [ ] **Icônes** via `@/hooks/useGameIcon` (jamais d'import direct `lucide-react-native`).
- [ ] **Dark-only** : aucune logique de thème clair.
- [ ] États **loading / empty / error** présents et pédagogiques.
- [ ] `npm run check` + `npm test` verts.

---

## 🪜 Roadmap séquencée

Chaque phase liste les commandes `impeccable` d'**ouverture** et de **gate** (contrôle avant commit).

| Phase | Nom | Contenu | Impeccable (design) | DoD (gate compris) |
| :--- | :--- | :--- | :--- | :--- |
| **0** | Cadrage | Valider ce doc, geler « pas d'Or MVP / village dérivé », marquer ROADMAP.md archive | `$impeccable critique` (état actuel, baseline) | Décisions ci-dessous cochées + baseline UX notée |
| **1** | Nettoyage surface | C1, C5, C6 (retirer Or/Treasury/Goals/Schedule, passer à 3 onglets) | ouvre `distill` (nav) → gate `critique` + `audit` + `polish` | Nav = 3 onglets ; plus d'Or affiché ; **design gate vert** ; `check`+`test` OK |
| **2** | Village dérivé | C2, C3, C4 (ressources flavor, village lecture seule, milestones fusionnés) | ouvre `shape` (panneau village) → gate `critique` + `audit` + `polish` | Village calculé depuis le journal ; plus de XP-par-bâtiment ; **gate vert** |
| **3** | Boucle & loot | I1, I2, I4 (aucune séance perdue, loot XP, flamme bienveillante) | ouvre `craft` (loot) → `animate` (coffre/flamme) → gate `critique`+`audit`+`polish` | Séance libre & aventure nourrissent tout ; repentance ; motion + reduced-motion ; **gate vert** |
| **4** | DA village + onboarding | I3 (5 paliers illustrés + overlays), I6 (Stats), I8 (onboarding court) | ouvre `shape` → `craft` → `onboard` (1er run) → `typeset`/`colorize` → gate `critique`+`audit`+`polish` | Village illustré ; onboarding < 2 min ; **gate vert** |
| **5** | Boss & anti-triche | I5 (boss adaptatif fin d'aventure), I7 (garde-fous) | ouvre `craft` (boss) → `clarify` (copy garde-fous) → `harden` (edge cases/i18n) → gate `critique`+`audit`+`polish` | 1 boss jouable ; plausibilité + plafonds ; **gate vert** |
| **6** | Hygiène schéma | Nettoyage/migration des tables gelées **après** stabilisation (validation requise) | `$impeccable adapt` (natif) : re-vérifier écrans post-migration | Schéma réduit sans perte de données ; **gate vert** |
| **Backlog** | Post-MVP | Or + customisation, talismans, social, saisons, coach IA, wearables | `shape` avant chaque nouveau chantier | — |

> Chaque phase est **livrable seule**. On ne descend pas dans le schéma (Phase 6) avant que
> l'UI et la boucle soient stables (évite les migrations destructives prématurées).
> **Et surtout : pas de commit/push d'une phase sans son design gate vert.**

---

## ✅ Décisions à confirmer (Phase 0)

- [ ] **Garder Expo/RN** comme stack (le wiki mentionnait Tauri v2 — repli Expo retenu). → *confirmer figé*
- [ ] **Retirer l'Or de la surface MVP** (Treasury + attribution + affichage). Données **gelées**, pas supprimées.
- [ ] **Village dérivé / lecture seule** : abandonner XP-par-bâtiment au profit du rendu par paliers.
- [ ] **Différer** Goals / Scheduling / Rest / PR (code conservé, hors boucle MVP).
- [ ] **Nav à 3 onglets** (Village/Aventures/Stats) + bouton Start Quest ; fusion Home↔Village.
- [ ] **Ne pas** lancer de migration destructive avant la Phase 6 (validation explicite requise).

> Une fois ces cases cochées, on attaque la **Phase 1**. Dis-moi lesquelles tu valides
> (ou ajuste), et j'enchaîne l'implémentation phase par phase.

---

## 📎 Voir aussi

- Historique de ce qui a été construit : [ROADMAP.md](roadmap-archive.md)
- Refactor UI (NEW_STYLE) : [ROADMAP_REFACTOR.md](roadmap-refactor-ui.md)
- Vision produit : [VISION.md](../product/vision.md) · [PRODUCT.md](../product/positioning.md)
