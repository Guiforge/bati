verdict: pass

Revue de code du tour 2 de L1-T07 (iso-code-reviewer, neuf). Chaque point du tour 1 est réglé : `contentFit="contain"` (stratégie `ContentFitDownsampleStrategy`, vue à taille non nulle au décodage, ratio vue = canevas vérifié sur les 46 webp), source nulle pour une image cachée, `shortcut:` sur la démo et sur les maquettes dans le bundle, calcul paresseux sans cache faux, test direct de `derriere`. 56 tests iso et tsc verts. Mineurs 1 et 2 (un test qui garde `contain`, un test qui compare la taille réelle du webp au `size` du sidecar) repris par le chef dans le tour 3 de L1-T07, avec la régénération de l'index au tier 4. Mineur 3 (décodage en double au changement de stade) : à regarder si L1-T09 montre un pic.

Sortie brute :

verdict: pass

Relance : `heavy.sh npx jest iso- --testPathIgnorePatterns=/node_modules/` 4 suites, 56 tests verts, index compris ; `heavy.sh npx tsc --noEmit` sans erreur ; `biome check` sur 9 fichiers sans remarque.

## Points du tour 1
- Bloquant (`fill`) réglé : `contentFit="contain"` (`IsoCarteDemo.tsx:210`, `:217`) ; `ExpoImageViewWrapper.kt:536-547` choisit `ContentFitDownsampleStrategy` pour `contain` (`allowDownscaling` vrai par défaut, `:168`) ; `ImageViewWrapperTarget.kt:245-300` prend la taille sur `view.width`/`view.height` ; image cachée de taille nulle, `cleanIfNeeded` (`:518`) ne charge rien, `onSizeChanged` (`:467-474`) relance à l'affichage ; ratio réel des 46 webp = `size` de l'index (ailes 768x768, castle_wall 1280x1216, tours 512x1280), `pose` et `poseAiles` le gardent (`carteDemo.ts:151`, `:160-165`).
- Mineur 1 réglé (`IsoCarteDemo.tsx:208`, `:215`).
- Mineur 2 réglé (`carteDemo.ts:118-119`).
- Mineur 3 réglé sans cache faux (`carteDemo.ts:101-112`, `etatCarte(p, false)`, constantes de build seulement, repli `?? 12`).
- Mineur 4 réglé (`iso-maquettes.test.ts:308-317` attrape `return avantX || avantY;`).
- Important 1 réglé (`carteDemo.ts:127-131`, conforme à DECISIONS).
- Important 2 : attribué à L1-T12.

## BLOQUANTS
Aucun.

## IMPORTANTS
Aucun.

## MINEURS
1. Rien ne garde le correctif : `__tests__/iso-dev-screen.test.tsx:203-208` ne vérifie pas `contentFit` ; ajouter `expect(screen.getByTestId("iso-maquette-forge").props.contentFit).toBe("contain")` et pareil pour `iso-ailes-windmill`.
2. « contain = fill » dépend d'un ratio non vérifié : `iso-maquettes.test.ts:159-164` compare l'index au sidecar, jamais au fichier ; un sprite peint du lot 2 à un autre ratio décalerait son pied sans test rouge. Lire largeur et hauteur dans l'en-tête RIFF (VP8X, VP8, VP8L) et comparer à `size`.
3. Décodage en double possible quand une image change de stade et de canevas avant la nouvelle mise en page ; pas une fuite, à regarder si L1-T09 montre un pic.

## Ce qui est juste
En-tête du composant corrigé (`IsoCarteDemo.tsx:17-23`) et rapport. Pas de régression dans `ombres.ts`, `isoSpec.ts`, `profondeur.ts`, Kahn. Rien n'anime, pas de `useMemo`, pas de couleur en dur, pas de texte visible. Arrondi Yoga sous 1 px. `ombreAiles(…, angle)` et clés `nomImage` intactes.

Non vérifié : appareil (L1-T09) ; `unzip` de l'APK.
