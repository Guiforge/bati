# Comment le chef d'équipe fait tourner le plan

Une nouvelle session Claude Code reprend le travail sans relire l'historique. Elle lit, dans cet ordre : `progress.md`, `INDEX.md`, `status.json`, puis seulement la fiche de la tâche qu'elle lance. Pour une règle ou une décision précise : `../REPRISE.md` (règles dures), `../KNOWLEDGE.md`, `../DECISIONS.md`, `../PLAN-SPEC-VI.md`.

## La boucle, une tâche à la fois

1. **Choisir** la première tâche de `INDEX.md` dont l'`etat` n'est pas `fait` et dont toutes les dépendances ont `passes: true` dans `status.json`. Une tâche `en_cours` héritée d'une session précédente se reprend d'abord : lire son rapport et `/usr/bin/git status`.
2. **Contrat** (tâches de code seulement) : le worker lit sa fiche et répond d'abord en 5 lignes ce qu'il va livrer et comment on le vérifiera ; le chef valide ou corrige, puis le travail commence. Une tâche simple saute cette étape.
3. **Lancer** le sous-agent du rôle de la fiche avec un brief court : « Lis docs/designs/village-iso-v1/plan/tasks/<id>.md et exécute. » Rien d'autre, sauf une correction de contrat. Le worker écrit ses livrables dans des fichiers et rend un rapport court avec les chemins.
4. **Juger** : celui qui produit ne se juge jamais. Un relecteur neuf (`iso-code-reviewer` pour le code, `iso-art-reviewer` ou `iso-design-reviewer` avec le texte figé de `../REVUE-PROMPT.md` ou `../REVUE-UI-PROMPT.md`), puis `iso-qa` sur l'émulateur pour tout ce qui se voit. Un test vert ne prouve ni une animation ni un rendu.
5. **Plafonner** : 3 tours au plus par tâche, ou arrêt après 2 tours sans progrès ; garder le meilleur tour, pas forcément le dernier. Au-delà, la tâche passe à Guillaume.
6. **Clore** : verdict collé dans `../reviews/<id>.md`, ligne dans `../LOG.md`, `status.json` mis à jour par le chef seul (`etat: fait`, `passes: true`, `tours`), `progress.md` mis à jour, puis **un commit par tâche** par `scripts/iso/team/commit.sh`.

Ne jamais déclarer la V1 finie : c'est la porte finale (HF), et seul Guillaume la valide.

## Modèles et coût

- Chef (cette session) : Opus, effort moyen, haut si la tâche est floue. Il ne délègue pas une chaîne de petites tâches dépendantes : il les fait lui-même.
- Workers (`iso-engineer`, `iso-artist`, `iso-blender`, `iso-qa`) : Sonnet, brief court.
- Relecteurs : Sonnet ; `iso-tech-auditor` au modèle du chef pour l'audit de fin de lot.
- Recherches et tri de journaux : Haiku si possible.
- **Trois sous-agents en parallèle au plus** (Guillaume, 31/10), jamais deux workers sur les mêmes fichiers ; au plus 2 commandes lourdes à la fois (jest complet, tsc, Gradle), une seule Gradle, toujours par `scripts/iso/team/heavy.sh`.
- Un sous-agent qui a fini se relance par `SendMessage` s'il garde un contexte utile ; sinon un neuf.

## Ce que Guillaume peut régler sans le chef (fichiers figés pour l'équipe)

- `.claude/agents/*.md` : champs `model` et `effort` par rôle (par exemple `effort: medium` pour les workers, `high` pour les relecteurs), `omitClaudeMd: true` pour les workers qui reçoivent tout dans leur fiche. Ne pas poser `CLAUDE_CODE_EFFORT_LEVEL` en global : il écrase ces réglages.
- Workflows (`ultracode`) : un workflow par phase est possible plus tard ; ce plan n'en suppose aucun.

## Relancer

Dans le worktree `.claude/worktrees/iso`, ouvrir Claude Code et taper :

> Tu es le chef d'équipe du village iso V1 de Bati. Lis docs/designs/village-iso-v1/plan/README.md et suis-le.

L'émulateur `bati-bench` doit tourner : `~/Android/Sdk/emulator/emulator -avd bati-bench` dans un terminal à part.
