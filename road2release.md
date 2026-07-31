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

## Phase 1 — Config store — ✔ fait le 2026-07-31 (`2f1f878`)

Nom d'affichage, les deux fonds sombres, `supportsTablet`, et la preuve périmée du doc perf.
Détail dans le message de commit ; pas recopié ici, pour la même raison que la roadmap ne tient
pas de liste de cases cochées.

**Une conséquence à connaître** : `android/` est gitignoré, donc le `#101323` figé dans son
`colors.xml` est un prebuild local périmé. EAS le régénère depuis `app.json` ; en local il faut
`npx expo prebuild --clean` pour voir le nouveau splash.

---

## Phase 2 — Le dernier trou fonctionnel — ✔ fait le 2026-07-31 (`c485fa0`, `8f89121`)

`SessionRecoveryBanner` est monté en tête d'accueil, au-dessus de `HomeStage` : une séance
interrompue passe avant n'importe quelle suggestion, et la bannière ne rend rien quand il n'y a
rien à reprendre.

Le chemin a été vérifié de bout en bout, pas seulement le montage : « Reprendre » restaure le
store puis navigue vers `/session`, et `app/session.tsx:47` redirige vers l'accueil si aucune
quête n'est revenue — donc une restauration ratée ne laisse jamais sur un écran vide. La
navigation ne part plus que si la restauration a réussi.

---

## Phase 2 bis — Rendre le feedback facile (½ journée, avant la bêta copains)

Une bêta entre amis échoue presque toujours de la même façon : les gens l'utilisent, trouvent
ça « bien », et ne disent rien. Pas par politesse — parce qu'écrire un retour demande de sortir
de l'app, d'ouvrir un mail, de retrouver quoi dire. Chaque friction retirée multiplie le nombre
de retours.

### Ce qui existe déjà, et qui est bon

`src/crashLog.ts` fait exactement ce qu'il faut : capture locale, `mailto:` pré-rempli et
entièrement modifiable, **aucun envoi tant que la personne n'appuie pas sur envoyer dans son
propre client**. Pas de HTTP, pas de consentement déguisé. C'est la bonne architecture pour une
app offline-first, et il ne faut pas la remplacer par un SDK de feedback tiers.

`buildBugReportMailto` gère déjà le cas « aucun crash » (`No crash was recorded on this
device.`) — la fonction est prête, c'est l'UI qui bloque.

### Le blocage

`app/settings.tsx:478` — `disabled={crashCount === 0}`.

> **Quelqu'un dont l'app n'a jamais planté ne peut rien t'écrire depuis l'app.**

C'est l'inverse de ce qu'il faut pour une bêta : les retours les plus utiles viennent de gens
dont l'app fonctionne — « je n'ai pas compris à quoi sert le village », « le minuteur de repos
est trop court », « j'aurais aimé pouvoir… ». Aucun de ces messages n'est un crash.

### Les quatre changements, par rapport valeur / effort

| # | Quoi | Effort | Pourquoi |
|---|---|---|---|
| 1 | **Dégriser la ligne** et la renommer « Un retour, une idée, un bug » | ~10 lignes + 4 clés i18n | Débloque le seul canal existant pour 100 % des testeurs au lieu de ceux qui ont planté |
| 2 | **Ajouter appareil + OS** au bloc technique du `mailto` | 3 lignes dans `buildBugReportMailto` | « ça rame » sans le modèle de téléphone est inexploitable |
| 3 | **Traduire sujet et corps** du mail | 6 clés i18n | `buildBugReportMailto` écrit en anglais en dur ; tes copains écriront en français |
| 4 | **Remonter l'entrée** hors du bas des réglages | 1 ligne | Une entrée en bas d'écran de réglages ne se trouve pas ; pendant la bêta seulement, elle mérite d'être visible |

Les points 1 à 3 tiennent en une demi-journée et n'ont besoin d'aucun appareil.

### Les questions à poser, et où

Le corps du mail demande aujourd'hui « What were you doing when it broke? » — la bonne question
pour un crash, la mauvaise pour un avis. Pour la bêta, trois questions valent mieux qu'un champ
vide :

1. Qu'est-ce qui t'a fait ouvrir l'app aujourd'hui ?
2. Qu'est-ce qui t'a agacé ?
3. Qu'est-ce que tu as failli chercher sans le trouver ?

La troisième est celle qui remonte les vraies manques : personne ne signale spontanément une
fonctionnalité absente, tout le monde se souvient de l'avoir cherchée.

### Ce qu'il ne faut pas faire

- **Pas de SDK de feedback tiers** (Instabug, Sentry User Feedback, etc.). Ils ouvrent un canal
  réseau dans une app dont l'argument est « rien ne sort de ton téléphone », et la politique de
  confidentialité que tu viens d'écrire devient fausse le jour où tu en ajoutes un.
- **Pas de formulaire in-app avec envoi HTTP** : même problème, plus un backend à tenir.
- **Pas de pop-up « notez l'application »** pendant la bêta. Tu veux des phrases, pas des
  étoiles.

### Le canal, hors de l'app

- **TestFlight** (iOS) a un retour intégré : capture d'écran + commentaire, sans quitter l'app.
  Gratuit et déjà relié à ton build. C'est le meilleur canal de la bêta iOS, et il ne demande
  aucun code.
- **Play test fermé** n'a pas d'équivalent aussi bon : le retour passe par un lien de feedback
  optionnel. Le `mailto:` de l'app reste le canal principal côté Android.
- **Un groupe de discussion** (Signal, WhatsApp) avec les 12 testeurs vaut plus que n'importe
  quel outil. Les gens qui n'écriraient jamais un mail écrivent volontiers dans un fil, et tu
  as besoin de ces 12 personnes actives pendant 14 jours de toute façon (phase 0.1).

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
                 ├─ Phase 2 bis (½ j, canal de feedback)  ◄── avant la bêta copains
                 └─ Phase 3 (passe appareil, le vrai travail)
                        └─ Phase 4 (captures + listings)
                                └─ Phase 5 (sortie)
```

Le code n'est pas le chemin critique. L'administratif l'est, et il n'a pas commencé.
