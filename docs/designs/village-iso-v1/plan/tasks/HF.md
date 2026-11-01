# HF : Porte finale (Guillaume)

Rôle : Guillaume. Dépend de : AUD.

## But
Critère 5 (perf.sh sur le Fairphone) et critère 11 (la vidéo et la carte en main).

## Contexte utile (chemins relatifs à docs/designs/village-iso-v1/ sauf mention)
- scripts/iso/perf.sh (réservé à Guillaume)
- page de porte à publier par le chef (comme evidence/L5-page.html)

## À faire
- Le chef publie la page de porte (artifact) : ce qui est fait, mesures, décisions ouvertes, ce que Guillaume lance.
- Avant toute fusion : ce que T35 a préparé (commandes du commit des fichiers figés, ligne BUDGET_FLUX_V1, texte de PROPOSITION-GRILLE.md), que Guillaume lance lui-même.
- Les décisions que la mesure Fairphone tranche (roadmap du village) : plafond d'animations à 64 ou 100 ; plan B Skia si le Fairphone rate 30 images/s ou le seuil mémoire du critère 7 au palier 12.

## Fini quand
- Réponse de Guillaume recopiée mot pour mot dans LOG.

## Règles communes (à lire avant d'écrire une ligne)
- Dépôt : AGENTS.md (règles du dépôt), docs/architecture/performance.md, docs/designs/village-iso-v1/KNOWLEDGE.md (pièges payés).
- Équipe : docs/designs/village-iso-v1/REPRISE.md § « Règles dures » (appareils, git, fichiers figés, FLUX). Jamais le Fairphone ; adb et maestro par scripts/iso/team/emu-adb.sh et emu-maestro.sh ; Gradle par `scripts/iso/team/heavy.sh --gradle scripts/iso/team/gradle-perf.sh` puis `cd android && ./gradlew --stop` ; pas de commit (le chef commite par scripts/iso/team/commit.sh).
- Code : pas de useMemo/useCallback (React Compiler) ; directive "worklet" sur toute fonction appelée d'un worklet (un plantage de ce type est déjà arrivé, jest ne le voit pas) ; couleurs dans constants/rawColors.ts ; copie dans locales/*.json, sans tiret cadratin, « tu » en français ; Tamagui 3 sans sigil `$` ; aucune dépendance sans accord écrit de Guillaume.
- Budget d'animation : plafond 64 nœuds animés (repos 48, pire 58 au 30/10, test __tests__/iso-ciel.test.tsx) ; rien d'animé au repos ; mouvement réduit respecté ; drapeau INTEGRATION (constants/isoPoc.ts) éteint : production inchangée.
- Checks de base : `npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` ; `scripts/iso/team/heavy.sh npx tsc --noEmit` ; `npx biome check --error-on-warnings <fichiers touchés>`.
- Livrable : un rapport court `docs/designs/village-iso-v1/reports/<id>.md` (quoi, fichiers, checks avec résultats, limites) ; réponse au chef en 6 lignes avec les chemins. Ne modifie dans plan/status.json que le champ `etat` de ta tâche (« pret_revue » à la fin), jamais `passes`.
