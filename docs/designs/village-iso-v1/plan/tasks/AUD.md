# AUD : Audit du lot 6

Rôle : iso-tech-auditor (modèle du chef). Dépend de : T06.

## But
Audit adversarial de fin de lot, puis corrections.

## Contexte utile (chemins relatifs à docs/designs/village-iso-v1/ sauf mention)
- reviews/L5-AUD2.md (modèle)
- git log depuis 5f54856f

## À faire
- Audit, corrections, revue neuve des corrections, suite complète verte.

## Fini quand
- Verdict pass ou corrections faites et relues.

## Règles communes (à lire avant d'écrire une ligne)
- Dépôt : AGENTS.md (règles du dépôt), docs/architecture/performance.md, docs/designs/village-iso-v1/KNOWLEDGE.md (pièges payés).
- Équipe : docs/designs/village-iso-v1/REPRISE.md § « Règles dures » (appareils, git, fichiers figés, FLUX). Jamais le Fairphone ; adb et maestro par scripts/iso/team/emu-adb.sh et emu-maestro.sh ; Gradle par `scripts/iso/team/heavy.sh --gradle scripts/iso/team/gradle-perf.sh` puis `cd android && ./gradlew --stop` ; pas de commit (le chef commite par scripts/iso/team/commit.sh).
- Code : pas de useMemo/useCallback (React Compiler) ; directive "worklet" sur toute fonction appelée d'un worklet (un plantage de ce type est déjà arrivé, jest ne le voit pas) ; couleurs dans constants/rawColors.ts ; copie dans locales/*.json, sans tiret cadratin, « tu » en français ; Tamagui 3 sans sigil `$` ; aucune dépendance sans accord écrit de Guillaume.
- Budget d'animation : plafond 64 nœuds animés (repos 48, pire 58 au 30/10, test __tests__/iso-ciel.test.tsx) ; rien d'animé au repos ; mouvement réduit respecté ; drapeau INTEGRATION (constants/isoPoc.ts) éteint : production inchangée.
- Checks de base : `npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` ; `scripts/iso/team/heavy.sh npx tsc --noEmit` ; `npx biome check --error-on-warnings <fichiers touchés>`.
- Livrable : un rapport court `docs/designs/village-iso-v1/reports/<id>.md` (quoi, fichiers, checks avec résultats, limites) ; réponse au chef en 6 lignes avec les chemins. Ne modifie dans plan/status.json que le champ `etat` de ta tâche (« pret_revue » à la fin), jamais `passes`.

## Points à vérifier en plus (audit externe, LOG 30/10)
- Pincement : `focalX`/`focalY` lus après activation du geste, et la relation pan/pincement (`simultaneousWith` ne compose pas) ; double toucher et inertie ensemble.
- Licences : chaque image FLUX a dans provenance.json la version datée des conditions BFL et la licence que le projet lui applique ; compatibilité avec F-Droid (aucun asset NC ou ND).
- Tap : sélection par masque alpha et emprise réelle, coins, bords, recouvrements et grandes emprises.
- Nœuds animés simultanés bien sous la règle indicative de Reanimated (~100 sur Android d'entrée de gamme) ; aucune lecture de SharedValue côté JS pendant une animation.
