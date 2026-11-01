# Reprise du chef d'équipe (à lire en premier)

**Depuis le 30/10, le travail se reprend par le plan en wiki : lis `plan/README.md` et suis-le.** Il dit quoi lire (`plan/progress.md`, `plan/INDEX.md`, `plan/status.json`) et comment faire tourner une tâche. Ce fichier ne garde que les règles dures et les pièges, qui valent toujours.

## Comment on travaille (mode adapté, décidé le 28/10)

- Pas d'équipe d'agents. Les rôles sont des sous-agents lancés par le chef : `iso-engineer`, `iso-qa`, `iso-blender`, `iso-artist`, `iso-code-reviewer`, `iso-art-reviewer`, `iso-design-reviewer`, `iso-tech-auditor`, `iso-researcher`. **Au plus 2 en parallèle.**
- **Sonnet par défaut, brief court** avec seulement le contexte nécessaire (demande de Guillaume). Garder le modèle du chef pour l'audit de fin de lot et le jugement fin.
- Cycle de chaque carte : rapport `reports/<id>.md` → relecteur neuf → `reviews/<id>.md` → BOARD et LOG → commit. Les relecteurs n'ont pas d'outil d'écriture : le chef colle leur texte dans `reviews/`.
- Un sous-agent qui a fini se relance par `SendMessage` (il garde son contexte, moins cher qu'un nouveau).
- Seul Guillaume valide une porte (ligne dans VALIDATIONS, ou son message recopié mot pour mot dans LOG).
- Réponses à Guillaume en français, simples, sans tiret cadratin ; commits en anglais.

## Règles dures (la garde en bloque une partie, ne jamais la contourner)

- Appareils : jamais le téléphone. adb et maestro seulement par `scripts/iso/team/emu-adb.sh` et `emu-maestro.sh` ; Gradle par `gradle-perf.sh`, puis `cd android && ./gradlew --stop`. Interdits : `npm run android:release`, `expo run:android`, `installRelease`, `installDebug`, `pm clear`, `setprop`, désinstaller un Bati (sauf `com.guiforge.bati.perf` sur l'émulateur). `perf.sh` est réservé à Guillaume, même ses chemins de refus.
- Git : `/usr/bin/git` ; commit seulement par `scripts/iso/team/commit.sh <fichier-message> <chemins>` (le relancer une fois si un formateur a réécrit des fichiers) ; jamais `main`, merge, PR, `checkout --`, `restore`, `stash pop`. Pousser seulement par `push.sh`, depuis un worktree hors du dépôt.
- Fichiers figés, jamais écrits : le prompt, CHECKLIST, CRITERES-V1, REVUE-PROMPT, REVUE-UI-PROMPT, VALIDATIONS, `scripts/iso/team/**`, `.claude/**`, `iso_audit.py`, `audit-thresholds.json`.
- FLUX : seul `iso-artist` l'appelle, par le garde-budget ; clé dans `.env`, jamais affichée.
- Code : aucune dépendance nouvelle, couleurs dans `constants/rawColors.ts`, pas de `useMemo`/`useCallback` (React Compiler).

## Pièges vus pendant le lot 3 (en plus de KNOWLEDGE)

- **La garde lit le texte entier d'une commande Bash** : un mot comme `adb` suivi d'autre chose, même dans une regex, la bloque. Écrire les scripts dans le scratchpad et les lancer par `python3 <fichier>`.
- **Le hook de commit refuse tout avertissement Biome** (`--error-on-warnings`) : lancer `npx biome check --error-on-warnings <fichiers>` avant `commit.sh`.
- **Un test vert ne prouve pas une animation ni un décodage** : la croissance (L3-T05) et le niveau de détail (L3-T06) passaient en jest et ne marchaient pas sur l'émulateur. Toujours une mesure qa (film à 30 i/s, sonde `iso-charge-*`) avant de dire « fait ».
- **expo-image ne recharge pas quand seule la taille de la source change** ; le rechargement passe par `svgVariables` (commentaire `shortcut:` dans `IsoCarteDemo.tsx`), à revérifier à chaque montée d'expo-image.
- **Zooms des critères en unités de jeu** : 0,6 de jeu = bouton `iso-zoom-06` (1,6 en démo), 1,0 de jeu = zoom max (2,667).
- **Le village de l'émulateur n'a que des bâtiments rough** : `iso-grandir` retombe sur « apparition depuis rien ». Le fondu entre deux stades n'a jamais été vu sur appareil.
- **Commandes lourdes** : au plus 2 à la fois ; jest ciblé `npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` ; tsc par `scripts/iso/team/heavy.sh npx tsc --noEmit`.

## En attente côté Guillaume (hors H3)

- Le commit de lancement (fichiers figés non commités).
- Deux règles de garde : `budget ack` réservé au chef, blocage des 14 autres scripts FLUX.
- Une ligne dans `gradle-perf.sh` pour sortir les maquettes de l'APK avant tout merge vers `main` (l'index fait 565 Ko).
- Décisions d'art reportées : repeindre forge_solid, le prompt de palette Klein.
