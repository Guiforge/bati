# AUDIT-DA sortie : onglet Village (22, 21, 23)

## 22 île coupée
`cadrage` (carteDemo.ts) : facteur 1,08 retiré (1,0) : la boîte de l'île tient dans la largeur de la zone, pointes comprises. Test `iso-dev-screen` : 3 aires (dev-iso 390x600, onglet 390x644, onglet 412x760), l'île entière dans la zone. Tests existants mis à jour (largeur = AIRE.w ; zoom 0,40625 dans iso-village).

## 21 carte sous la barre
`VillageScene.tsx` : en mode iso, `paddingBottom` de la liste = inset bas + 24 + `HAUTEUR_BARRE` (60). Non vérifié sur appareil : la barre n'est pas en position absolue dans `app/(tabs)/_layout.tsx`, la capture montre peut-être seulement la liste non défilée. qa : défiler jusqu'en bas et lire la dernière carte.

## 23 ferme
Cause trouvée côté qa, pas côté code : le centre du rectangle du sprite de la ferme est transparent (masque vide), et qa touche le centre du nœud `iso-maquette-farm`. Un tap sur les pixels dessinés de la ferme (niveaux 1, 4, 8, 100 % des points opaques attribués à la ferme, sauf 84 de la tente au niveau 8) ouvre la bulle. Test ajouté dans `iso-village.test.tsx` : tap réel (geste) au centre de la ferme, de la grange, du moulin, de la forge avec la taille de l'onglet et la marge basse, `onBulle` appelé avec le bon code. Une tolérance par boîte du masque a été essayée et retirée : elle casse le critère 4 (`iso-tap-precision`, 307 erreurs).
qa : toucher la ferme à (396,162) en coordonnées carte (le toit/la façade), pas le centre du nœud.

## Checks
- `npx jest __tests__/iso- village-scene --testPathIgnorePatterns /node_modules/` : 58 suites, 633 tests verts.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : sans erreur.
- `npx biome check --write` sur les 4 fichiers touchés : propre.
