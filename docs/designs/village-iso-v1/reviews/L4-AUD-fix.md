verdict: pass

Revue neuve (iso-code-reviewer, Sonnet) des corrections de L4-AUD (I6, I7, mineurs) et de L4-T03 (I-A, I-B, M1, M2), non commitées, base 85a86766. Texte brut du relecteur, mise en forme seulement.

Contrôles : jest iso- et village-scene, 18 suites, 254 tests verts ; `heavy.sh npm run deadcode` : seulement les deux `@legacy` de `db/bossFights.ts` ; Biome propre ; ni useMemo ni useCallback. Aucune mutation rejouée (raisonnement sur le code pour le point 5).

1. JSON d'ordre et de lisière : `__tests__/iso-profondeur-ordre.test.ts:81-97` recalcule `ordreProfondeur(EMPRISES_CARTE)` et compare au JSON ; la commande de régénération est dans l'objet comparé. `__tests__/iso-lisiere.test.ts:192-` compare le JSON de lisière à `choisir(...)` avec `famille` et `nom`. Au chargement, `carteDemo.ts` (~358) lit le JSON et fait un `flatMap` dans `ELEMENTS` ; `elementsCarte()` reste linéaire.
2. `MONTREES` (`carteDemo.ts:480-489`) : une entrée par île distincte, bornée en pratique (palier et bâtiments debout) ; pas de fuite, `.filter` ne modifie pas le cache ; limite documentée par `shortcut:`.
3. Rendu par défaut : `clePiece(famille, nom)` avec `nuit` par défaut reproduit l'ancien `decor/arbre_a.nuit.webp` ; le test compare défauts implicites et explicites, pas la base.
4. `touche` (`horloge.ts:81-96`) : `actifSv.set(actif)` dans l'effet avant `touche()`, effet seulement au changement d'`actif`, cas couvert par un test.
5. I-A : `r.x > r.w` et `r.y > r.h` avec une zone posée sur le sprite échouent sans `ancre`. I-B : `mockDetail` passe par le `useCameraIso` d'IsoVillage, la sortie du Provider se verrait. `finally` remet mocks et timers.

BLOQUANTS : aucun. IMPORTANTS : aucun.

MINEURS
- Test « draws the same tree… » : pas de comparaison au rendu de la base ; un golden de `clePiece` sur quelques clés rendrait l'équivalence explicite.
- `carteDemo.ts:~358` : le `flatMap` ignore sans bruit une clé absente de `ELEMENTS` (couvert par l'écart de longueur).
- `lisiereChoix.ts:~126` : `slice(0, indexOf("."))` perd un caractère si `indexOf` vaut -1 ; inatteignable aujourd'hui.

Non vérifié : mutations non rejouées ; rendu non comparé octet à octet à 85a86766.
