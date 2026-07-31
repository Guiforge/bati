---
title: Road to release — chemin critique vers la v1
type: planning
status: active
updated: 2026-07-31
related: [audit.md, docs/planning/roadmap.md, docs/planning/ui-screen-audit-tracker.md]
---

# Road to release

## Ce que ce document est, et n'est pas

Ce n'est **pas** une deuxième roadmap. [`docs/planning/roadmap.md`](docs/planning/roadmap.md)
reste la source sur *ce qui reste à faire* (§1 Release & distribution, §2 UI refonte), et
[`audit.md`](audit.md) sur *ce qui a été corrigé et ce qui a été délibérément reporté*. Les
redire ici les ferait diverger — le travers que l'audit a passé la journée à retirer.

Ce document répond à une autre question : **dans quel ordre, et qu'est-ce qui bloque quoi.**
C'est un chemin critique, pas une liste de tâches.

## L'essentiel en trois lignes

Tout ce qui reste **de code** tient en une journée. Ce qui décide de la date de sortie, c'est
l'administratif chez Google et Apple, et il n'a pas commencé. **Lance la phase 0 aujourd'hui,
même si tu ne touches plus au code pendant deux semaines** — le reste du travail se fait pendant
que les comptes mûrissent.

---

## Phase 0 — Démarrer les horloges (aujourd'hui, ~1 h de travail, des semaines d'attente)

Rien ici n'est du code, et tout ici est sur le chemin critique. Chaque jour de retard sur cette
phase est un jour de retard sur la sortie, quoi qu'il arrive ailleurs.

### 0.1 — Google Play : le vrai goulot d'étranglement ⚠️

Si le compte Play est un **compte personnel** (par opposition à un compte d'organisation),
Google impose depuis fin 2023 : **12 testeurs minimum, inscrits en test fermé, pendant 14 jours
continus**, avant même de pouvoir demander l'accès à la production.

Ce n'est pas une formalité de fin de parcours — c'est deux semaines *incompressibles* qui ne
peuvent pas commencer avant d'avoir un build signé sur le canal de test. Concrètement :

> **Le premier build interne doit exister avant tout le reste, pas après.**

`eas.json` cible déjà `track: internal` sur le profil `submit.production` — la plomberie est
prête. Vérifie le type de compte en premier : si c'est un compte d'organisation, cette règle ne
s'applique pas et la phase 0 se raccourcit énormément.

### 0.2 — Apple Developer

Inscription, certificats, profils de provisionnement. La roadmap le note déjà comme « le plus
long délai du plan, à démarrer en premier » — c'est vrai, mais le point 0.1 le dépasse
probablement. Les deux se mènent en parallèle.

### 0.3 — Keystore Android

À générer et à **sauvegarder hors du dépôt**. Un keystore perdu = plus aucune mise à jour
possible de l'app publiée, jamais. C'est irréversible, contrairement à tout le reste de ce
document.

### 0.4 — `eas init` + `eas update:configure`

Laissé non fait volontairement (roadmap §1) : inventer un project id serait pire qu'un champ
vide. À faire une fois le compte Expo en place.

### 0.5 — Activer GitHub Pages

Le workflow existe, la policy est écrite et bilingue, `permalink: /privacy/` est en place. Il
manque une commande, parce que le `GITHUB_TOKEN` d'Actions n'a pas le droit de créer le site :

```bash
gh api -X POST repos/Guiforge/bati/pages -f build_type=workflow
```

**Bloquant store** : les deux plateformes exigent une URL de politique de confidentialité
fonctionnelle avant review, et le formulaire Data Safety de Google la consomme.

> Cette commande publie un site public sous ton compte. C'est l'intention du workflow, mais elle
> attend ton feu vert explicite.

---

## Phase 1 — Config store (½ journée, tout est du code)

Petits diffs, gros effet : c'est ce que voient les utilisateurs avant même d'ouvrir l'app.

| # | Quoi | Où | Pourquoi |
|---|---|---|---|
| 1.1 | `name: "bati"` → `"Bati"` | `app.json` | Nom sous l'icône et dans les stores. Le produit s'écrit « Bati » partout ailleurs. |
| 1.2 | `#101323` ×2 → valeur de token | `app.json` (adaptiveIcon, splash) | La valeur dérivée que l'audit traquait — `surface` vaut `#101322`, et un splash veut probablement `$bgDark` `#0B0F19`. Ma règle anti-hex ne voit pas le JSON. |
| 1.3 | `ios.supportsTablet: true` → `false` | `app.json` | Revendique iPad. Apple review sur iPad et rejette les mises en page cassées. `PRODUCT.md` dit « téléphone en main, en pleine séance ». |
| 1.4 | Vérifier `newArchEnabled` | `app.json` vs `docs/architecture/performance.md` | Le doc affirme `newArchEnabled: true` dans `app.json` ; la clé est **absente**. En SDK 57 la New Arch est active par défaut, donc le comportement est sans doute correct — mais le doc ment, et c'est lui qu'on relira dans six mois. |

Aucun de ces quatre points ne demande d'appareil. Ils peuvent être faits pendant que les comptes
sont en attente.

---

## Phase 2 — Le dernier trou fonctionnel (½ journée)

**Monter `SessionRecoveryBanner`.** `components/session/SessionRecoveryCard.tsx` n'est importé
par rien (`npm run knip` le dit en une seconde). Le store écrit les snapshots, le hook les relit,
la carte sait les afficher, quinze tests couvrent le tout — et l'utilisateur ne se voit **jamais**
proposer de reprendre une séance interrompue.

Ce n'est pas un bloquant store. C'est un bloquant qualité : perdre l'entraînement de quelqu'un
sans rien lui proposer est exactement ce qui fait désinstaller une app de sport.

Le choix de l'écran est un arbitrage produit. L'accueil me semble juste — c'est là que revient
quelqu'un qui a fermé l'app — mais c'est ton appel.

---

## Phase 3 — La passe sur appareil (le vrai travail : des jours, pas des heures)

**C'est la phase qui décide si « c'est de la qualité », et rien de ce qui précède ne la
remplace.** Tout le reste de ce document a été vérifié en lisant du code ; ceci ne peut pas
l'être.

La roadmap §2 la cadre déjà, avec un avertissement qu'il faut prendre au sérieux : les coches
par écran de `ui-screen-audit-tracker.md` **ont menti pendant des semaines**, parce que le
primitif `AppButton` partagé portait encore l'anti-pattern sous les écrans marqués verts.

À vérifier, dans l'ordre :

1. **Contraste WCAG AA** — non mesuré à ce jour. Premier couple à tester :
   `$textSecondary #909ACB` sur `$surface #101322`. Le bouton primaire passe déjà (6,45:1).
2. **Zones tactiles ≥ 44×44** — 168 éléments pressables dans le repo, aucun vérifié sur écran.
3. **Reduced motion sur appareil** — la plomberie est correcte et suit désormais l'OS, mais le
   comportement réel n'a jamais été observé avec le réglage système activé.
4. **Lisibilité en lumière vive** — `PRODUCT.md` l'exige explicitement (« variable gym
   lighting »), et une app dark-only s'y teste mal en intérieur.
5. **Les 10 scopes** de `ui-screen-audit-tracker.md`, un par PR.

**Méthode** : un scope par PR, `npm run check` + `npm test` verts, captures avant/après. Ne
jamais polir avant que P0/P1 soient partis.

---

## Phase 4 — Assets store (en parallèle de la phase 3)

Dépend de la phase 3 : les captures d'écran doivent montrer l'UI finale, pas celle d'avant la
passe appareil.

- Captures d'écran, aux formats des deux stores, en EN et FR.
- Fiches de listing bilingues (le ton dark-fantasy de `PRODUCT.md` s'y applique aussi).
- Formulaire Data Safety de Google — alimenté par l'URL de la phase 0.5.
- Classification par âge.
- Analyse de taille de bundle et profilage (démarrage, mémoire, framerate sous animation) —
  roadmap §1 le liste comme ouvert. À faire sur build **release**, jamais en dev :
  `docs/architecture/performance.md` règle 1.

---

## Phase 5 — Sortie

1. Build de production (`eas build --profile production`) → canal **internal**.
2. Les 14 jours de test fermé de Google courent ici, s'ils s'appliquent (0.1).
3. Correction de ce que le test fermé remonte.
4. Demande d'accès à la production, puis soumission aux deux stores.

---

## Portes de qualité

Ce qui doit être vert, et quand.

| Porte | Quand | État aujourd'hui |
|---|---|---|
| `npm run check` (biome + tsc) | Chaque commit (hook) | ✅ |
| `npm test` + seuils de couverture | Chaque push (hook) | ✅ 416 tests |
| CI GitHub Actions | Chaque push | ✅ (réparé — cassé sur 8 runs) |
| `npm run knip` | Avant la v1 | ⚠️ 1 fichier mort, 21 exports morts |
| Maestro, les 8 flows | Avant chaque build release | ⚠️ jamais lancés en CI |
| Passe appareil, 10 scopes | Phase 3 | ❌ non commencée |

Deux remarques sur ce tableau :

- **Maestro n'assère pas l'état.** `session-interruptions.yaml` exécutait deux bugs de dégâts de
  boss et passait, parce qu'il vérifiait la navigation. Les flows valent pour « l'app ne crashe
  pas sur le parcours », pas pour « les données sont justes ».
- **La couverture est un cliquet, pas une cible.** Les seuils sont calés juste sous le réel pour
  détecter une suppression de tests. Les monter est un effet de bord d'un travail utile, jamais
  un objectif en soi.

---

## Reporté volontairement, avec ses raisons

| Sujet | Pourquoi ça peut attendre |
|---|---|
| `saveSession` atomique | Rendu idempotent : le bug réel (retry qui duplique la séance) est couvert. Une transaction à travers dix modules `db/` est un chantier disproportionné. Plafond écrit sur `ensureSessionRow`. |
| Runner de migrations | Le code le plus risqué et le moins couvert du repo — **mais sans risque pour une v1** : personne n'a de base à migrer. ⚠️ **Devient critique à la v1.1**, et il faudra alors le tester contre une vraie base v1, pas contre une base neuve. |
| 21 exports morts (knip) | Aucun impact utilisateur. À nettoyer avant de mettre knip en CI, sinon la CI naît rouge — et une CI rouge se fait désactiver, pas réparer. |
| `db/index.ts` | Barrel de ~60 ré-exports dont un tiers sert. Exclu de knip en attendant. |
| Animations du village | Roadmap §3. Un village mieux animé ne fait s'entraîner personne. |
| Crashes natifs | `src/crashLog.ts` ne capture que le JS. `react-native-exception-handler` n'est plus maintenu depuis 2022 et n'a pas de plugin Expo. À rouvrir seulement si les retours pointent des crashes invisibles au JS. |

---

## Risques

| Risque | Impact | Ce qui le réduit |
|---|---|---|
| Les 14 jours × 12 testeurs de Google | +2 semaines minimum, découvert tard | Vérifier le type de compte **aujourd'hui** (0.1) |
| Keystore perdu | Irréversible : plus aucune mise à jour possible | Sauvegarde hors dépôt dès sa création (0.3) |
| `runtimeVersion` modifié après le premier build signé | Casse l'OTA | Déjà réglé — la policy est posée avant le premier build (roadmap §1) |
| La passe appareil trouve des P0 | Décale les captures d'écran et la sortie | Phase 3 avant phase 4, jamais l'inverse |
| iPad revendiqué sans être testé | Rejet Apple, cycle de review perdu | 1.3 |

---

## Le chemin le plus court

```
Aujourd'hui   Phase 0  ──────────────────────────────────► (attente comptes + 14 j Google)
                 │
                 ├─ Phase 1 (½ j, config store)
                 ├─ Phase 2 (½ j, bannière de reprise)
                 └─ Phase 3 (passe appareil, le vrai travail)
                        └─ Phase 4 (captures + listings)
                                └─ Phase 5 (sortie)
```

Le code n'est pas le chemin critique. L'administratif l'est, et il n'a pas commencé.
