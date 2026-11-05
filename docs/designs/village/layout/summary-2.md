# Disposition : résumé de la session 2 (05/11/2026)

**Le plan est dans `feat/village-iso` (8adef3259).** Il reste une validation : les crops `lisiere` et `pieds`, et 2 questions dans `checkpoint.md`.

## Fait

- Tes 8 choix appliqués : rue nord, palier 1 sans maison, mannequin en [7, 0], pont B de jour et de nuit, zoom minimum à 0,43.
- Aux 12 paliers, aux deux stades : 0 bâtiment sous 85 %, 0 ancre, 0 accessoire sous 50 %, 0 erreur d'ordre, 0 tap (`portes-12-paliers.md`).
- La revue de code a trouvé des lectures limitées à l'ancienne grille, corrigées : quartiers, clairière, densité du sol, lisière.
- Les chemins des villageois, simulés : 0 pas interdit sur 480 vagues par palier.

## Pas bon, ou pas fait

- **La porte `check` échoue encore** : 8 accroches couvertes au palier 12. 6 par un bâtiment, passées à GAME, et 2 par un villageois.
- **Les juges** : env 5, mara 5, theo 6,5, sur l'état d'avant la dernière passe. Le pire : la nuit de la place, le sud des paliers 1 à 3, les chemins bruns. Mara ne trouve ni rue en S ni point focal, et voit l'oeil partir au moulin : c'est ton plan, je n'y ai pas touché.
- **8 accessoires retirés**, faute de place libre, et le camp du palier 1 n'a plus qu'une lanterne.
- **Le chariot couvert bouche la porte sud** : il est peint dans le sol verrouillé.
- **Écart à ta réponse** : les bouts de chemin près de la porte sont retardés aux paliers 7 et 8, pas supprimés.
- **Aucun test lancé** : `tests-debt.md` liste ceux que la grille casse, à payer avant `main`.
- **Pas vu** : les maisons de remplissage sur la nouvelle grille. Pas prouvé palier par palier : rien ne recule, seulement vérifié par construction.

## Chiffres

FLUX : 0,29 $ sur 5 $, rien de plus cette session. Sous-agents : environ 19 passages sur 150. PROBE n'a toujours pas tourné, il lui faut ton téléphone.
