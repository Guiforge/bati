# Design : l'échauffement montre avant de chronométrer

Conçu le 10/09/2026, implémenté le 11/09/2026.
Status: IMPLEMENTED
Code : `stores/session.ts` (`prepTimer`, `warmupPrep`, `loadWarmup`), `components/session/PrepView.tsx`,
`components/session/WarmupView.tsx`, `components/session/CountdownView.tsx`,
`components/quests/WarmupPreview.tsx`, `constants/warmup.ts` (`PREP_SECONDS`, `switchesSides`).

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

1. **Un réglage, deux modes** : « Avant chaque mouvement : 10 s / Attendre GO » dans les paramètres.
   Il vaut pour toutes les attentes, les transitions de l'échauffement comme l'écran de démarrage.
   10 s par défaut : un échauffement se fait téléphone posé. Le store de séance lit le réglage à
   chaque transition (`prepTimer()`), donc un changement en pleine séance vaut à l'attente suivante.
2. **L'épée disparaît** au profit d'un écran de démarrage : la peinture de la quête (ou du boss) en
   haut, le premier exercice, sa cible et sa description en dessous, puis 10 s ou GO.
3. **Les sons ne changent pas** : le même 3-2-1-go qu'un repos ou une série chronométrée, pour
   l'attente comme pour le mouvement. Pas de son pour « change de côté », seulement le texte et une
   vibration.

## Le parcours

1. **Page de quête** : section repliable « Échauffement · 6 mouvements · 4 min ». `loadWarmup` est
   la fonction qu'appelle `startSession`, sur la quête configurée : c'est la liste qui jouera.
2. **Démarrer** : attente du mouvement 1/6 (illustration, nom, description complète, 10 s ou GO).
3. **Mouvement**, 30 s. Pour les mouvements d'un côté, « Change de côté » à mi-temps.
4. **Attente du suivant**, et ainsi de suite. Suivant et Précédent mènent à une attente, jamais
   directement au chrono.
5. **Écran de démarrage** avec le premier vrai exercice.

## Coût en temps (mode 10 s)

| Échauffement | Avant | Avec l'attente |
|---|---|---|
| 4 mouvements (quête courte) | 2 min | 2 min 40 |
| 11 mouvements (quête longue + poignets) | 5 min 30 | 7 min 20 |

Reste dans les 5-10 min de la littérature (`docs/raw/bodyweight-app-research.md` §1). En mode
« Attendre GO », c'est le rythme du joueur.

## Laissé de côté

- Le snapshot de reprise ne s'écrit toujours pas quand l'échauffement change de mouvement, seulement
  à la pause. L'échauffement n'est pas journalisé, et une pause écrit un état cohérent.
- « Change de côté » vient d'une liste de noms en dur (`ONE_SIDED`, marquée `ponytail:`), en
  attendant un champ de latéralité sur les exercices.
