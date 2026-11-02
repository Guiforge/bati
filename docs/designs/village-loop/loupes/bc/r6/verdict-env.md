# Tour 6, dernier verdict d'env, capture `captures-7`

**Verdict : NOTES.** Critères en échec : 2 et 3. Scores : ancrage au sol 8, variété 7, profondeur 7. Guillaume a verrouillé malgré ce verdict, avec des exceptions écrites.

| Critère | État |
| --- | --- |
| 1, 4, 5, 7, 8, 9, 11, 13, 14, 16, 17, 18 | PASS |
| 2 | FAIL : bouleaux jumeaux en miroir aux paliers 3 et 4, cellules -1,-4 et -2,7 |
| 3 | FAIL : racine nue en 13,-5, environ 45 px au bord droit du palier 6 |
| 6, 12 | NON VERIFIE par env (tests jest) |
| 10 | EXCEPTION, décision de Guillaume |
| 15 | PASS par décision de Guillaume |

Trois défauts les plus visibles : le pré du nord, le trait de la forêt du sud, le haut de la route (tache floue, et route qui s'arrête juste avant la porte).

Point de méthode d'env : le seuil de 300 de la garde laisse passer ces jumeaux à 320 unités. Un jest vert ne prouve donc pas le critère 2.
