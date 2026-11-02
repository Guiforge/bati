# qa-peinture-fix : fenêtres de la salle des héros, villageois vert-bleu

Statut proposé : prêt pour revue (le point 1 n'est pas résolu, voir ci-dessous)
Auteur : engineer

## 1. Fenêtres de la salle des héros au stade grand (non résolu, cause non trouvée dans le code)
Vérifié, tout est juste côté données et rendu :
- `constants/isoAccroches.json` : les 9 fenêtres de `heroes_hall_grand` ont une ligne `couvre`, identique à celle des `.anchor.json`, non périmée (recalculée sur `grand.nuit.webp`).
- Balayage de TOUTE l'image (pas seulement les boîtes de halo) : 1 pixel allumé hors couverture sur 4376, pour les 3 stades de la salle.
- Rendu : `IsoCarte` palier 12 en `lumiere: jour` monte bien `iso-fenetres-eteintes-heroes_hall`, avec le bon placement (corps 160x200, boîte à `left` 745,4 = 712 + 273 x 0,125). Aucune autre couche ne peint ces fenêtres de jour (Fierte, Veilles, Feux, Effets, Reclame sont toutes gardées par `lueurFeux`).
- Constat clé : sur la capture, la salle a le toit ROUGE et les murs BLEUS, c'est l'ancien sprite (commit 52d2e3e9). Le sprite de HEAD (dc930e1a) a un toit brun et des murs gris. L'appareil n'affichait donc pas les fichiers de HEAD pour cette salle. Mais les pixels de l'ancien sprite sont aussi couverts par les nouvelles coques (2 px dehors), donc cela n'explique pas seul l'absence du panneau sombre.
- Correction faite : `scripts/iso/exports/test_couvre_fenetres.py` lit désormais `constants/isoAccroches.json` (ce que l'app lit) et le `*.nuit.webp` affiché, et vérifie la taille de l'index contre celle de l'image. Résultat : 25 stades, 0 dehors, 0 trop grand, 0 périmé, code 0.
- Garde ajoutée : `__tests__/iso-veilleuses-vue.test.tsx` (salle grand, jour : panneau monté, 9 fenêtres couvertes).

À revoir par la qa : reconstruire la `.perf` en forçant les assets (supprimer `android/app/build/generated` et `android/app/build/intermediates/merged_res` ou `--rerun-tasks` sur la tâche d'assets), vérifier que la salle a le toit brun, puis recapturer `p12-jour-zoommax`. Si la salle est brune et les fenêtres encore vives, rapporter la capture : le défaut est alors propre à l'appareil (Svg non rendu pour ce nœud) et je n'ai pas de piste dans le code.

## 2. Villageois vert-bleu
Cause : la teinte `isoHabitantSapin` (#2F6B58) était un aplat de la silhouette, et le sprite peint par dessus n'était posé qu'à 55 % d'opacité : l'aplat dominait un habitant à moitié transparent. Sur `p6-jour-tousdebout-z06b` c'est le personnage vert-bleu près du puits.
Correction : `DESSIN_HABITANT` 0,55 -> 0,8 (l'encre et le tissu peints restent lisibles, l'aplat n'est plus qu'une teinte) ; `isoHabitantSapin` -> #5F6B3A (olive, plus de vert-bleu). Aucun nœud ajouté. Fichiers : `components/village/iso/IsoCarteDemo.tsx`, `constants/rawColors.ts`.
À revoir par la qa : habitants des paliers 6 et 12, de jour et de nuit, les quatre teintes (rouille, prune, olive, moutarde) lisibles avec l'encre.

## Commandes
- `python3 -I scripts/iso/exports/test_couvre_fenetres.py` : 25 stades, tout à 0, code 0.
- `rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Test Suites: 3 failed, 68 passed, 71 total`. Les 3 rouges (`iso-pieces`, `iso-profondeur-ordre`, `iso-lisiere`, selon les passes aussi `iso-maquettes`) viennent des variantes `decor/arbre_*` en cours de peinture par l'artiste, pas de ce changement.
- `heroes.sh npx tsc --noEmit` : propre. `biome check --write` sur mes 3 fichiers : seulement un avertissement de complexité déjà présent.
