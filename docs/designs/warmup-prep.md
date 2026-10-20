# Design : l'échauffement montre avant de chronométrer

Conçu le 10/09/2026, implémenté le 11/09/2026, révisé le 03/10/2026 (seul le premier mouvement
attend) puis le 19/10/2026 (une transition courte entre les mouvements, issue #198), voir
« Révisions ».
Status: IMPLEMENTED
Code : `stores/session.ts` (`prepTimer`, `toStep`, `warmupPrep`, `loadWarmup`), `components/session/PrepView.tsx`,
`components/session/WarmupView.tsx`, `components/session/CountdownView.tsx`,
`components/quests/WarmupPreview.tsx`, `constants/warmup.ts` (`PREP_SECONDS`, `transitionSeconds`),
`db/preferences.ts` (`PrepMode`, `WarmupTransition`), `app/settings.tsx`, `hooks/useSideSwitch.ts`.

## Le problème en une phrase

Le chrono d'un mouvement tournait avant qu'on sache ce qu'était le mouvement.

## Les retours (4 personnes, août-sept. 2026)

- **Utilisateur Qi Gong** : ne connaissait pas le « dead bug », le chrono tournait pendant qu'il cherchait.
- **Retour « warm-up » (Superman)** : « no details until I'm actually supposed to be doing them, there
  is no time to look them up beforehand ». Veut la liste des échauffements, consultable avant.
- **Retour « hectic »** : « the warm-up feels hectic, I can't prepare for it, I waste warm-up time
  reading the description ».
- **Retour « petit timer »** : veut un petit timer avant chaque mouvement. Contournement : pause vers
  la fin du mouvement pour lire le suivant, puis reprise. Il fabriquait à la main la transition.
- À rapprocher de **Fabio**, qui demandait déjà 3 à 5 s entre les exercices.

## Ce que faisait le code (commit `bd84b6b`)

- Au tap sur Démarrer, les 30 s du premier mouvement partaient tout de suite.
- À 0, le mouvement suivant démarrait avec 30 s pleines : **zéro seconde de transition**.
- La carte « À suivre » existait, mais la lire mettait en pause.
- La liste n'était visible nulle part avant de lancer.
- Le 3-2-1 à l'épée avant le premier exercice ne disait jamais lequel.
- Thread the Needle et World's Greatest Stretch se jouaient 30 s d'un seul côté.

Référence : le 7-minute workout (Klika & Jordan, ACSM's Health & Fitness Journal, 2013), pourtant
conçu pour aller vite : « 30 seconds, with 10 seconds of transition time between bouts ».

## Le principe

L'app te dit tout **avant** que le chrono tourne, jamais pendant.

## Décisions (11/09/2026)

1. **Un réglage, deux modes** : « Avant de commencer : 10 s / Attendre GO » dans les paramètres
   (« Avant chaque exercice » jusqu'au 19/10). Il vaut pour l'attente du premier mouvement de
   l'échauffement et pour l'écran de démarrage. Les transitions entre deux mouvements ont leur
   propre réglage depuis le 19/10 (voir « Révisions »).
   10 s par défaut : un échauffement se fait téléphone posé. Le store de séance lit le réglage à
   chaque transition (`prepTimer()`), donc un changement en pleine séance vaut à l'attente suivante.
2. **L'épée disparaît** au profit d'un écran de démarrage : la peinture de la quête (ou du boss) en
   haut, le premier exercice, sa cible et sa description en dessous, puis 10 s ou GO.
3. **Les sons ne changent pas** : le même 3-2-1-go qu'un repos ou une série chronométrée, pour
   l'attente comme pour le mouvement. Pas de son pour « change de côté », seulement le texte et une
   vibration.

## Le parcours

1. **Page de quête** : section repliable « Échauffement · 6 mouvements · 4 min ». La liste affichée
   est celle qui jouera : `startSession` passe par `loadWarmup`, l'aperçu lit `loadWarmupContext`
   une fois au montage puis appelle le même `buildWarmup` à chaque rendu, sur la quête configurée.
   Les deux moitiés sont séparées parce que la moitié coûteuse (préférence, compteur de séances,
   matériel manquant) ne dépend pas de la quête : l'aperçu la relisait à chaque tap de niveau.
2. **Démarrer** : attente du mouvement 1/6 (illustration, nom, description complète, 10 s ou GO).
3. **Mouvement**, 30 s. Pour les mouvements d'un côté, « Change de côté » à mi-temps.
4. **Transition** vers le mouvement suivant (`toStep` dans `stores/session.ts`) : le même écran
   d'attente, 5 s par défaut (10 s pendant les 3 premières séances tant que le héros n'a rien
   choisi), puis le mouvement, et ainsi de suite. Suivant, Précédent (jusqu'au premier mouvement compris) et
   « Pas pour moi » mènent tous à la transition du mouvement visé.
5. **Écran de démarrage** avec le premier vrai exercice.

## Coût en temps (mode 10 s)

| Échauffement | Avant | Une attente par mouvement (11/09) | Une seule attente (03/10) | 3 premières séances, rien choisi (19/10) | Défaut 5 s (19/10) |
|---|---|---|---|---|---|
| 4 mouvements (quête courte) | 2 min | 2 min 40 | 2 min 10 | 2 min 40 | 2 min 25 |
| 11 mouvements (quête longue + poignets) | 5 min 30 | 7 min 20 | 5 min 40 | 7 min 20 | 6 min 30 |

L'aperçu de la quête et la ligne « encore X » de l'échauffement comptent les transitions à
venir, donc annoncent la même durée. La ligne ne compte jamais l'attente affichée à l'écran
(audit du 11/10, F3).

Reste dans les 5-10 min de la littérature (`docs/raw/bodyweight-app-research.md` §1). En mode
« Attendre GO », c'est le rythme du joueur.

## Révisions

### 03/10/2026

L'audit du 03/10 a trouvé l'inverse du retour « hectic » : une attente avant chaque mouvement d'un
échauffement continu faisait des minutes debout à attendre. Seul le premier mouvement garde son
attente (10 s ou GO). Les suivants démarrent sur leur chrono dès la fin du précédent ; leur nom,
leur illustration et leur description sont à l'écran pendant le mouvement, et la liste reste
consultable avant de lancer sur la page de quête. L'aperçu et le « reste » de l'échauffement ne
comptent plus qu'une attente.

### 19/10/2026 (issue #198)

Zéro seconde entre deux mouvements a ramené le contournement du retour « petit timer » : le joueur
met pause pour passer de la planche au sol à la chaise contre le mur. La révision du 03/10 avait
raison de retirer les 10 s de lecture, pas de ramener le changement de position à zéro.

La règle : une transition sert à **changer de position**, pas à lire (la description reste à
l'écran pendant le mouvement) ni à se reposer (un échauffement RAMP doit rester continu). D'où
5 s une fois les mouvements connus, le haut des 3 à 5 s que demandait Fabio. Pendant les
3 premières séances (`LEARNING_SESSIONS`), les mouvements sont neufs et il faut aussi les lire :
10 s, celles du 7-minute workout, qui servaient aussi à lire. Priorité : le choix du héros,
puis les 3 premières séances, puis 5 s.

- Réglage « Transitions d'échauffement » (`warmupTransition`) : 5 s → 10 s → Attendre GO →
  Enchaîner, au tap, masqué quand l'échauffement est coupé. Tant que le héros n'a rien choisi
  (valeur stockée `auto`), la ligne affiche 5 s et une note dessous dit « 10 s pendant tes
  3 premières séances » ; le premier tap est un choix, et il gagne sur tout. Préférence par appareil, jamais
  fusionnée (R11 de `docs/testing/data-rules.md`).
- Le cas « rien choisi » lit le nombre de séances du journal au démarrage de la séance (le même compteur que la
  rotation des mouvements), le garde pour tout l'échauffement et dans le snapshot de reprise
  (`warmupSessionsBefore`).
- Jamais choisi : `auto`, écrit en base au premier lancement, sauf si « Avant de commencer » est
  sur « Attendre GO ». Un héros qui avait
  demandé à garder la main ne découvre pas un chrono entre les mouvements.
- L'écran est celui de l'attente du premier mouvement (`PrepView`), mêmes bips (3-2-1 puis go).
- Audité avec les personas le 19/10 (Kevin : libellés d'après le glossaire et deux réglages qui
  disent chacun ce qu'ils règlent ; Yann : une seule durée annoncée ; Martine : son choix de GO
  respecté).

## Laissé de côté

- Le snapshot de reprise ne s'écrit toujours pas quand l'échauffement change de mouvement, seulement
  à la pause. L'échauffement n'est pas journalisé, et une pause écrit un état cohérent.
- « Change de côté » venait d'une liste de noms en dur (`ONE_SIDED`). Depuis `0068`, il lit
  `exercises.perSide`, la même colonne que les quêtes, via `useSideSwitch` : vibration et deux
  bips courts à mi-parcours.
