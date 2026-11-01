# L6-T13 : amélioration de bâtiment à réclamer (plan, 30/10)

Écrit par un sous-agent Plan (lecture seule), recopié par le chef. Décisions du chef en fin de page.

## 0. Ce qui existe
- Le niveau d'un bâtiment est recalculé à chaque lecture par `getVillageBuildings()` (`db/village.ts`) ; le stade vient de `buildingStage(level)` (`constants/buildingLevels.ts`) : `rough` sous 3, `solid` à 3, `grand` à `BUILDING_STAGE_LEVEL`. Trois stades.
- `village_buildings` (`db/schema.ts`) n'est lue ni écrite par personne (`db/syncTables.ts` la dit « unused ») : on ne la réveille pas.
- Aucun « vu » ni « réclamé » pour le village. La croissance (L3-T05) est un paramètre de route éphémère `grown`, joué une fois par `VillageScene.tsx`.
- `user_preferences` (clé et valeur, `db/preferences.ts`) porte déjà les réglages et les indicateurs « vu ».

## 1. Où vit le stade réclamé
Recommandé : une clé `villageClaimedStages` dans `user_preferences`, JSON `{code: niveauRéclamé}`, sans migration. Écrite par une seule fonction de `db/village.ts` (`claimStage(codes)`), une seule écriture pour « Tout améliorer », jamais à la baisse (`max`). Clé ou code absent : le réclamé vaut le niveau dérivé actuel, par lecture, donc rien ne brille à tort le jour où le drapeau s'allume.
Écartés : colonne sur `village_buildings` (table morte à réveiller, migration 0080), une clé par bâtiment (pas atomique), journal (le réclamé est un choix, pas un fait des séances), nouvelle table (plus lourd pour rien). Si une migration devenait nécessaire : 0080, non destructive, quatre endroits à la main, jamais `db:generate`.

## 2. Ce que voient les surfaces
Un sélecteur pur dans `db/village.ts` (`claimable(buildings, claimed)`) est la seule source.
- Drapeau éteint : rien ne change, la clé n'est ni lue ni écrite.
- Drapeau allumé : la carte dessine `min(dérivé, réclamé)` (`IsoVillage.tsx`, `stade`) ; la liste garde le niveau dérivé et ajoute « Prêt à améliorer » ; `VillageDetailSheet` montre « Améliorer » ; TalkBack ajoute « amélioration prête » ; le widget reste sur le niveau dérivé.

## 3. Flux
1. Signal : les réclamables bougent et brillent pendant les vagues seulement, rien au repos ; au-delà du plafond de 64 nœuds, pastille fixe.
2. Toucher : fiche avec « Améliorer » ; « Tout améliorer » dès 2 réclamables.
3. Réclamer : chantier (L6-T02), fondu et ressort, puis écriture de la clé à la fin (rien n'est écrit avant que le nouveau stade soit affiché).
4. App tuée pendant le chantier : rien n'est écrit, le bâtiment reste réclamable, le chantier se rejoue.
5. Mouvement réduit : pas de secousse, pastille fixe, chantier réduit à un fondu.

## 4. Tests (état)
`village-claim.test.ts` : clé absente, passages de stade, une seule écriture pour plusieurs codes, jamais à la baisse, chantier interrompu sans écriture, bâtiment non construit jamais réclamable. `iso-village.test.tsx` : `min(dérivé, réclamé)`, plafond 64, rien au repos. Drapeau éteint : clé ni lue ni écrite. `golden-hero` ne doit pas bouger. `npm run deadcode`.
Copie à ajouter dans `locales/*.json` (« Améliorer », « Tout améliorer », « Prêt à être amélioré », « Ton {nom} peut passer au stade suivant. », « Amélioré ! », libellé TalkBack), sans tiret cadratin, en « tu ».

## 5. Risques
- `db/backup.ts` ne sauvegarde que des clés choisies : décider si la clé y entre (sinon une restauration remet tout à « réclamé », sans dommage). Non vérifié.
- Deux appareils : le réclamé est local.
- Trois stades seulement : deux réclamations par bâtiment dans toute sa vie.
- Ne pas monter d'enveloppe conditionnelle autour d'une tuile (issue #29).
- À coder après le chantier (L6-T02) ou avec un chantier minimal.

## Décisions du chef (autonomie du 30/10, à confirmer par Guillaume à la porte finale)
1. Pas de délai : le bâtiment attend le toucher. Seul le visuel attend ; les stats et le niveau du héros ne dépendent pas de la réclamation, donc rien ne bloque.
2. La croissance au retour de séance ne joue plus seule quand le drapeau est allumé : le signal la remplace, et la réclamation devient la fête.
3. Le niveau chiffré de la liste suit le niveau dérivé.
4. Le widget reste sur le niveau dérivé.
5. Améliorer est gratuit.
6. On réclame par stade (là où le dessin change), pas par rang. Ouvert à Guillaume : réclamer aussi chaque rang, pour un geste plus fréquent.
7. La clé entre dans la sauvegarde si `db/backup.ts` le permet sans changer de format.
