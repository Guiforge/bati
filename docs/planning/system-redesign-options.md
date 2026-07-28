---
title: Refonte minimaliste — options à reviewer
type: planning
status: archived
updated: 2026-07-28
related: [roadmap-alignment.md, ../gameplay/progression.md, ../gameplay/coach-planning.md, ../gameplay/statistics-progress.md, ../product/vision.md]
---

# Refonte minimaliste du système de progression — options

> **But** : le système actuel est trop complexe (10 ressources, 21 bâtiments sur 4 tiers,
> XP par bâtiment, prestige, jetons, milestones, coach complet différé). Ce document propose,
> sous-système par sous-système, 2-3 options avec plus/moins. **Cochez vos choix**, puis les
> docs seront réécrits en conséquence (le code suivra dans un second temps).
>
> Équilibre visé : **sport focus · un peu d'amusement · sentiment de progression · stats · coach**.

## Constat clé

Les ressources sont des **stats musculaires avec un skin fantasy** : « bois » = total reps bras,
« pierre » = total reps dos, etc. Le journal de sessions (`completed_sessions` /
`completed_exercises`) est déjà la source de vérité
([roadmap-alignment.md](roadmap-alignment.md)). Tout le reste peut être **dérivé** par des
fonctions pures — c'est le levier principal de simplification : moins de tables, moins d'états
à synchroniser, zéro bug de désynchronisation possible.

---

## 1. Ressources

Aujourd'hui : 10 codes (`gold, wood, stone, fire, water, wind, grain, mana, leaf, boss_token`),
2 tables (`resource_inventory`, `resource_transactions`), calcul de loot par session avec
multiplicateur de difficulté ([db/resources.ts](../../db/resources.ts)).

### Option A — Supprimer totalement

Le village et les stats dérivent directement des totaux musculaires. Plus de notion de
ressource, plus d'écran Treasury.

- ➕ Le plus minimaliste : 2 tables supprimées, ~360 lignes de code en moins, zéro économie à équilibrer
- ➕ L'info « qu'a produit mon effort » vit dans les stats muscle (déjà prévues)
- ➕ Aucune contradiction possible avec le principe « dérivé, pas géré »
- ➖ Perd le moment « loot » chiffré sur l'écran de victoire (+3 bois, +2 feu) — il reste XP + réaction du village
- ➖ Perd un vecteur de fun/collection ; l'amusement repose alors entièrement sur village + flamme + boss

### Option B — 6 ressources en pur skin d'affichage

Pas d'inventaire ni de transactions : « bois » est un **alias visuel** du total reps bras,
calculé à la volée. L'écran de victoire peut afficher « +12 🪵 » (= reps bras de la session).
Treasury devient une vue fantasy des stats muscle (ou fusionne avec l'écran stats).

- ➕ Garde le moment loot et le vocabulaire fantasy sans aucune économie
- ➕ 2 tables supprimées quand même — c'est du renommage à l'affichage, pas un système
- ➕ Le lien 1 muscle = 1 ressource reste parlant (« je farme du bois » = je travaille les bras)
- ➖ Deux vocabulaires pour la même donnée (reps bras / bois) — risque de confusion dans l'UI et les docs
- ➖ Il faut trancher le sort de mana/feuille (calisthenics/yoga n'ont pas de muscle unique)

### Option C — 1 seule monnaie (or)

Un compteur unique gagné par session, réservé à une future customisation cosmétique du village.

- ➕ Un seul nombre, moment loot conservé, simple à comprendre
- ➖ Réintroduit une économie (inventaire, dépense, équilibrage) que la roadmap a explicitement différée
- ➖ Sans quoi dépenser, c'est un compteur mort ; avec quoi dépenser, ce n'est plus minimaliste
- ➖ Perd le lien muscle → récompense, qui est la promesse produit

**Recommandation : A** (avec B en repli si le moment loot chiffré vous manque à la review).

**Choix : ☐ A ☐ B ☐ C**

---

## 2. Village / bâtiments

Aujourd'hui : 21 bâtiments, 4 tiers, XP + 5 niveaux + bonus par bâtiment, score de prestige,
2 tables (`village_buildings`, `village_stats`), ~480 lignes
([db/buildings.ts](../../db/buildings.ts)) + un écran de gestion complet
([VillageScreen.tsx](../../components/village/VillageScreen.tsx)).

### Option A — 5 tiers visuels + overlays dérivés

Le village est **une seule illustration** dont le tier dépend du niveau global
(`hameau → village → bourg → cité → cité florissante`). Des overlays conditionnels s'ajoutent :
intensité de flamme (streak), PNJ du sport dominant (7 derniers jours), bannière par boss battu,
et quelques détails-milestones (ex. `500 reps bras → la forge apparaît`). Aucune donnée village
en base : tout est `f(journal)`.

- ➕ C'est déjà la cible écrite dans [rewards-and-progression.md](../gameplay/progression.md) — les docs et le code convergent enfin
- ➕ 2 tables et ~480 lignes supprimées ; l'écran village devient une vue, pas un gestionnaire
- ➕ Le village reste le miroir de l'entraînement (sport dominant visible) = la promesse produit
- ➖ Demande 5 illustrations de tiers + assets d'overlays (coût contenu/art, pas code)
- ➖ Moins de granularité : on ne « monte » plus un bâtiment précis niveau par niveau

### Option B — ~8 bâtiments à seuils, sans niveaux

On garde des bâtiments individuels (6 muscle + 2 style) mais chacun n'a que 2 états :
absent / apparu, déclenché par un seuil de volume (ex. 500 reps bras → Champ de tir). Pas d'XP
par bâtiment, pas de niveaux, pas de prestige, pas de tiers 3-4.

- ➕ Garde le plaisir de « débloquer » nommément des bâtiments un par un
- ➕ Encore dérivable du journal (pas de table nécessaire — un seuil est une fonction pure)
- ➖ 8 assets de bâtiments + états à composer dans la scène — plus de contenu que A
- ➖ Une fois les 8 débloqués, la progression village s'arrête (A continue via les tiers de niveau)
- ➖ Reste une liste de bâtiments à afficher/expliquer — plus de surface UI que A

### Option C — Statu quo (21 bâtiments gérés)

- ➖ Rejeté par principe : c'est le système que ce document cherche à remplacer (mini-jeu parallèle, contredit la roadmap « dérivé, pas géré », 2 tables + prestige + bonus à maintenir)
- ➕ Seul avantage : zéro travail de migration

**Recommandation : A.** Les milestones de A absorbent le meilleur de B (des détails nommés
apparaissent à des seuils) sans en faire le squelette du système.

**Choix : ☐ A ☐ B ☐ C**

---

## 3. XP / niveau

Aujourd'hui : XP par session → niveau global ([db/xp.ts](../../db/xp.ts), 23 lignes). C'est
déjà minimal et c'est la colonne vertébrale du sentiment de progression.

### Option unique — Garder tel quel

Un nombre, une courbe de niveaux, affiché sur l'écran de victoire et le home. Le niveau drive
le tier du village (§2-A). Variante possible mais non recommandée : supprimer aussi l'XP et
dériver le « niveau » du nombre de sessions — gain négligeable, perd le bonus de difficulté.

**Recommandation : garder.** **Choix : ☐ garder ☐ variante sessions**

---

## 4. Flamme (streak)

Aujourd'hui : 5 niveaux (3/7/14/30/100 jours), règle « la flamme faiblit, ne meurt pas »,
« Marche de repentance » pour la rallumer.

### Option A — Garder 5 niveaux

- ➕ Système déjà simple, purement dérivé, et le 100 jours « Éternelle » est un vrai objectif long terme
- ➖ 5 paliers à illustrer/nommer

### Option B — Réduire à 3 niveaux (3 / 7 / 30 jours)

- ➕ Moins de paliers à expliquer et illustrer
- ➖ Gain marginal : la complexité d'un streak ne vient pas du nombre de paliers
- ➖ Perd l'objectif long terme (100 j)

**Recommandation : A** — la flamme n'est pas la source de complexité du système ; on garde
la règle « dim, pas reset » qui est un bon choix de rétention.

**Choix : ☐ A ☐ B**

---

## 5. Boss / jetons

Aujourd'hui : `boss_token` est une ressource en inventaire, gagnée par boss battu, qui
« débloque » des bâtiments légendaires (tier 4).

### Option A — Supprimer le jeton, « boss battu » = fait du journal

Un boss vaincu est un événement du journal. Chaque victoire ajoute une **bannière permanente**
au village (§2-A). Pas de compteur à dépenser, rien à stocker hors journal.

- ➕ Cohérent avec tout le reste : dérivé, pas géré ; une ressource de moins
- ➕ La bannière est plus évocatrice qu'un compteur « 🏆 3 »
- ➖ Aucun réel — le jeton actuel ne se dépense nulle part de toute façon

### Option B — Garder le jeton en inventaire

- ➕ Prêt si un jour on veut « dépenser » des jetons
- ➖ Spéculatif (YAGNI) ; maintient l'inventaire que §1-A supprime

**Recommandation : A.** **Choix : ☐ A ☐ B**

---

## 6. Stats

Aujourd'hui : [statistics-progress.md](../gameplay/statistics-progress.md) décrit métriques
par session, agrégats, balance musculaire, graphiques hebdo/mensuels, records personnels,
3 tables dédiées (`personal_records`, `streak_data`, `daily_stats`).

### Option A — Périmètre minimal, tout dérivé

4 vues, toutes calculées depuis le journal (pas de tables d'agrégats en design ; un cache est
une optimisation d'implémentation, pas un concept produit) :

1. **Balance musculaire** (30 j) — barres par muscle + détection du muscle en retard
2. **Records personnels** — meilleur reps/tenue par exercice, plus longue session, meilleur streak
3. **Sessions par semaine** — le chiffre qui nourrit le coach (§7)
4. **Calendrier mensuel** — les jours entraînés (points sur un calendrier)

- ➕ Couvre le pilier « avoir ses stats » avec 4 vues lisibles ; alimente directement le coach
- ➕ Zéro table de plus en design ; les PRs se recalculent du journal
- ➖ Moins de graphiques que le doc actuel (courbes XP, résumés hebdo détaillés)

### Option B — Périmètre actuel complet

- ➕ Plus de profondeur pour les utilisateurs data
- ➖ 3 tables dédiées, plus d'écrans, plus de graphiques à maintenir — la complexité qu'on cherche à réduire

**Recommandation : A.** **Choix : ☐ A ☐ B**

---

## 7. Coach / algo de programme

Aujourd'hui : [coach-planning.md](../gameplay/coach-planning.md) décrit un système complet
différé — goals typés, génération de plans/aventures, scheduling, notifications, 3 tables.

### Option A — 3 règles simples dérivées du journal

Le coach est un **encart sur le home**, pas un système. Une seule donnée persistée :
l'objectif jours/semaine choisi par l'utilisateur (un réglage). Trois règles :

1. **Objectif hebdo** — « 2/3 sessions cette semaine » (journal vs objectif)
2. **Muscle en retard** — balance musculaire 30 j (§6) → « Tes jambes sont en retard, essaie [quête jambes] »
3. **Repos** — ≥ 5 jours consécutifs entraînés → « Pense à un jour de repos »

- ➕ Couvre le pilier coach avec ~0 infrastructure : 1 réglage + 3 fonctions pures
- ➕ Règles explicites et honnêtes — pas de faux « IA », validable par un pro du sport
- ➕ Chaque règle pointe vers une action (une quête à lancer) : sport focus
- ➖ Pas de plan structuré multi-semaines ; l'utilisateur choisit ses quêtes lui-même

### Option B — Règles + mini-programme hebdo

En plus de A : le coach propose chaque semaine 3 quêtes (issues de l'objectif + balance
musculaire), affichées comme suggestions ordonnées — sans scheduling ni notifications.

- ➕ Répond mieux à « dis-moi quoi faire » sans tables de plans
- ➖ Nécessite un algo de sélection de quêtes à concevoir, tester et défendre sportivement
- ➖ Frontière glissante vers le système complet (C) — risque de recomplexification

### Option C — Design complet actuel (différé)

- ➕ Vision long terme déjà écrite
- ➖ 3 tables, génération de plans, scheduling, notifications — l'opposé du but de ce document ; et le wiki produit exige une validation par des professionnels avant tout conseil auto-généré

**Recommandation : A maintenant, B comme évolution naturelle** si « quoi faire aujourd'hui »
ressort comme le besoin n°1 des retours utilisateurs.

**Choix : ☐ A ☐ B ☐ C**

---

## 8. Écrans impactés (si recommandations prises)

| Écran / composant | Aujourd'hui | Après |
| --- | --- | --- |
| Treasury ([treasury.md](../screens/treasury.md)) | Inventaire de ressources | **Supprimé** (ou fusionné dans Stats si §1-B) |
| Village ([village.md](../screens/village.md)) | Liste de 21 bâtiments par tier + modal détail + prestige | **Une scène illustrée** : tier + overlays, zéro gestion |
| Home — ResourcesOverview | Rangée horizontale de 7 compteurs | **Supprimé** ; remplacé par l'encart coach (§7) |
| Home — HeroStatusCard | Prestige + narratif | Tier du village + narratif (dérivé du niveau) |
| Header — ResourceHeader | or/mana/feuille/jeton | **Supprimé** |
| Victoire (session-flow.md) | +XP +ressources +village | **+XP, streak, réaction du village** (et PR si battu) |
| Stats | Dashboard riche | 4 vues (§6-A) |

## Le système final en 10 lignes (si toutes les recommandations)

1. Tu fais une séance → elle est journalisée. **C'est la seule écriture.**
2. L'XP monte, le niveau monte.
3. Le niveau fait grandir le village (5 tiers illustrés).
4. Ton sport dominant, ta flamme et tes boss battus s'affichent dessus en overlays.
5. Des détails du village apparaissent à des seuils de volume (milestones).
6. Ta flamme suit ton streak (5 paliers, elle faiblit mais ne meurt pas).
7. Tes stats = balance musculaire, PRs, sessions/semaine, calendrier — tout dérivé.
8. Le coach = ton objectif hebdo + « muscle en retard » + « pense au repos ».
9. Pas de ressources, pas d'inventaire, pas d'économie, pas de gestion.
10. **Une seule source de vérité : le journal. Tout le reste est une fonction pure.**

## Docs à réécrire/supprimer après votre review

- **Réécrire** : `economy/rewards-and-progression.md` (devient « Progression » : XP/village/flamme, ~60 lignes), `gameplay/statistics-progress.md` (§6-A), `gameplay/coach-planning.md` (§7-A), `product/vision.md` (tableau muscle→ressource→bâtiment), `screens/village.md`, `screens/home.md`
- **Supprimer** : `screens/treasury.md`, le dossier `economy/` (contenu fusionné dans gameplay/)
- **Inchangés** : `gameplay/session-flow.md` (sauf écran victoire), `gameplay/adventures.md`, `gameplay/boss-fights.md` (sauf référence jeton), tout `design/`
