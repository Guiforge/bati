# Disposition : résumé de la session 1 (04/11/2026)

**La piste attend ton choix** : https://claude.ai/artifact/5L9wKWn3QuUJRyeWA8na28, 8 décisions, listées aussi dans `checkpoint.md`.

## Fait et fusionné dans `feat/village-iso`

- L'amendement v4.2, ajouté à la fin du prompt, seul dans son commit.
- Le hook pre-push : `deadcode` passe, les 7 fichiers de l'atelier sont sortis de knip.
- `check` vérifié à l'oeil. Le moulin à 67 % était juste, la cascade était une fausse alerte. Le test des accessoires ne pouvait rien voir : ils sont peints à pied fixe.
- `check` peut échouer : occlusion, ancres, accessoires, ordre de dessin, accroches, tap, mouvement. **La dernière ligne additionne les paliers lancés.**
- `hooks.json` : 102 boîtes. Aucun juge ne les a relues, et plusieurs couvrent presque tout le sprite (`img/hooks-controle.jpg`).
- La mesure des 12 paliers : `measure.md`.
- Les objets qui flottent : `flottants.md`. Les peintures sont hors de cause. Le chat de la ferme flottait, et il est posé, sauf un reste d'environ 8 px au palier 3. Les bâtiments ont maintenant une ancre par stade et aucun n'est à plus de 2 px.

## Fait sur `track-layout-proposition`, non fusionné

Sommet : voir `git log origin/track-layout-proposition`. Ton plan sur une grille de 29x29 cases, les paliers 1 à 12, deux rues, 9 emplacements de quartiers (`slots.md`), la comparaison des crops. Tout est dans `paliers.md` et `slots.md` de cette branche.

Au palier 12, plus haut stade : **aucun bâtiment sous 85 %** (6 avant), le pire à 85,6 %. Ordre de dessin et tap : 0 erreur.

## Pas fait, ou pas encore bon

- **La porte de `check` échoue encore** au palier 12 : 8 accroches couvertes, 8 accessoires à moins de 50 %. À traiter en appliquant.
- **Les tests sont en dette** : `tests-debt.md` de la branche liste ceux qu'on sait cassés, par déduction. Aucun lancé, sauf `iso-profondeur-ordre`, une fois, pour régénérer l'ordre de dessin.
- **La grille utilise des cases négatives stockées comme propriétés de tableau** : le moins de code, mais une boucle `forEach` sur une grille ne les voit pas. Les boucles passent par `CASES`. À faire relire au code-review avant la fusion.
- **Le sol** : coupe carrée au pied de la route sud, bord net à gauche, plaques à l'est, bruit en haut et en bas se voient encore au zoom 0,43, contrairement à ce que dit `paliers.md`. Page, question 8.
- **La nuit au palier 12** n'a pas été jugée. La question est à POLISH.
- **Les juges** (env, mara, theo) ne sont pas passés : ils viennent une fois le plan appliqué.
- **`lisiere` et `pieds`** ne sont pas reverrouillés, c'est après ton choix.
- **La route de l'est** est un ruban fin, ajouté en code, sans peinture.

## Chiffres

FLUX : 0,29 $ sur 5 $, pour les ponts. Registre : 109,06 $ sur 140 $. Sous-agents : 6 lancés, 12 passages environ sur 150.

## Pour toi

1. **Réponds aux 8 décisions**, c'est le seul blocage. GROWTH peut repartir sur sa bande F dès ta réponse.
2. **Regarde le palier 1** (question 3) : c'est là que ton plan coûte le plus.
3. **PROBE n'a pas tourné** : il donne le budget d'images de GROWTH, et il lui faut ton téléphone.
