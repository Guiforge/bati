# Atelier : décisions

- 04/11. **Prompt lu dans `~/Téléchargements`**, `~/Downloads` n'existe pas sur cette machine.
- 04/11. **Branche partie de `origin/feat/village-iso` (411e07853)**, pas du worktree iso local, en retard (f44f78ce6) : seule l'origine a LIFE et GAME fusionnés.
- 04/11. **Skia absent de l'appli : le découpage de l'item 3 attend Guillaume** (`checkpoint.md`, Q1). Une dépendance native neuve est à lui, et F-Droid est en jeu.
- 04/11. **Atelier par navigateur plutôt que Node et Skia.** Le prompt interdit un moteur React dans le rendu Node parce qu'il dessinerait autre chose que l'appli. Ici c'est l'inverse : les composants de l'appli eux-mêmes, donc pas de port à garder d'accord. Sert dans tous les cas : si Guillaume choisit B, il devient la référence du portage.
- 04/11. **`react-native-web` et `react-dom` étaient déjà là**, et Playwright vient de l'installation gstack, exigée par `CLAUDE.md`. Rien d'ajouté au dépôt. Limite : l'atelier ne tourne pas en CI sans ajouter `playwright-core`.
- 04/11. **`dev-iso` sert d'états de dev**, aucun lien neuf : le même lien dans l'appli et l'atelier. Il ne touche pas aux données de jeu, donc le prompt est plus exigeant que ce qu'il fait (rangs par bâtiment au palier entier). À ajouter si une piste en a besoin, en passant par `query`.
- 04/11. **Corrections côté atelier seulement**, derrière `ATELIER_WEB`, dans `scripts/atelier/web/` : teinte `expo-image` (Android garde l'alpha, le web le perdait), `rx`/`ry` des dégradés radiaux (ignorés par un navigateur), base de données et widget remplacés par des bouchons, pilote d'animation Tamagui, `Image.resolveAssetSource`. Aucun fichier du village changé.
- 04/11. **Réglage arrêté à 3 corrections** (règle 5) : l'écart du jour reste au-dessus de 2 %, écrit dans `PIPELINE.md`.
- 04/11. **Pas de lecture de temps d'image au calibrage.** `AGENTS.md` interdit un chiffre de perf en dev, et le build `.perf` de l'émulateur date du 02/11. Premier budget de mouvement : le plafond déjà tenu par `iso-ciel.test.tsx` (68 noeuds animés, 8 familles à la fois). PERF l'affine.
- 04/11. **Une seule visite émulateur.** La seconde servait à vérifier que le découpage n'a rien changé : sans découpage, l'appli n'a pas bougé. Si Guillaume choisit B, elle reste due.
- 04/11. **Fusion 1 sans le découpage**, pour ne pas bloquer DIRECTION : rien ne change dans l'appli, tout est derrière `ATELIER_WEB`.
- 04/11. **`scripts/life/status.py` prend un nom de piste** plutôt qu'une copie du script.
