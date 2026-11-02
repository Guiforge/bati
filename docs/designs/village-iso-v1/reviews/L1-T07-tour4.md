verdict: pass

Revue de code du tour 4 de L1-T07 (iso-code-reviewer, neuf). Aucun bloquant ; 65 tests iso, tsc, biome du dépôt (0 erreur, plugin élargi sans fausse alerte) verts. Règle d'affichage des décors juste et plus stricte que le polygone ; pièces d'eau justes sur la vraie carte ; miroir et ordre de profondeur commun justes ; mémoire de 15,5 Mo retrouvée. Importants repris par le chef au tour 5 (après la build de qa, pour ne pas changer l'arbre pendant qu'elle se fait) : l'ombre de la tour du sorcier coupée net par les images de canal opaques ; branchement de la règle d'affichage non testé dans l'écran. Mineurs 1 à 5 avec.

Sortie brute (texte intégral des points) :

verdict: pass

Vérifié : jest iso- par heavy.sh 5 suites, 65 tests verts ; tsc statut 0 ; `biome check . --max-diagnostics=5` 1408 fichiers, 0 erreur, 33 infos (même compte) ; seuls les fichiers de la carte modifiés (`??` pour `pieces.ts`, `iso-pieces.test.ts`, `noMissingHermesApi.grit`) ; pas d'`useMemo`, de hex, de `toSorted`, `structuredClone`, ni d'appel `git`, `adb`, Gradle, sous-processus.

## Bloquants
Aucun.

## Importants
1. L'ombre de la tour du sorcier disparaît sous le canal : `IsoCarteDemo.tsx:296-304` dessine les pièces d'eau comme des sprites, au-dessus de la couche d'ombre (`isoSpec.ts:190`) ; `renders/pieces/eau_canal_droit.png` est opaque. Tour en (4,13) 1x1, ombre jusqu'à gx 6,23 et gy 11,77 au grand (1,95 au solid), cases (5,12) et (5,13) : coupée net au bord du canal. Correction : eau sous l'ombre avec un voile d'ombre translucide au-dessus des images d'eau, ou au minimum un `shortcut:` qui renvoie le calque d'eau au lot 2.
2. Branchement de la règle d'affichage non testé : `iso-dev-screen.test.tsx:199-213` ne vérifie les `iso-piece-*` qu'au palier 12 ; remplacer `pieces.has(e.piece)` par `true` (`IsoCarteDemo.tsx:302`) ou retirer `pieceMontree` (`:277`) laisse tout vert ; ombres des pièces ajoutées à la découpe (`:282`) non testées. Correction : dans la boucle par palier (`iso-dev-screen.test.tsx:186`), comparer les `iso-piece-*` à `PIECES.filter((p) => pieceMontree(p, etatCarte(p, false).visible))` ; le palier 7 a un arbre caché en (18,5).

## Mineurs
1. `iso-pieces.test.ts:97-121` refait la règle avec `casesSousOmbre(ombresPiece(p))`, comme `pieceMontree` (`carteDemo.ts:180-183`) ; une erreur de décalage dans `ombresPiece` (`carteDemo.ts:167-176`) passerait. Ajouter le cas en dur de l'arbre (18,5), caché des paliers 7 à 11, montré au 12.
2. Gabarit `.nuit.webp` des pièces en dur à trois endroits (`pieces.ts:12`, `pieces.ts:23-24`, `iso-maquettes.test.ts` `cleMaquette`) à côté de `isoSpec.nomImage` ; dériver de `NOM_IMAGE` avec l'ambiance en paramètre, ou `shortcut:`.
3. Commentaire périmé `IsoCarteDemo.tsx:73` (« Decor and foam never sit in a shadow »).
4. `pieces.ts:46-51` renvoie `cascade_bord` quelle que soit l'orientation ; le `shortcut:` (`:36-37`) ne le nomme pas.
5. Ancre des villageois `[384, 704]` au centre de la case (`maquettes.ts:2530-2533`), que la doc de `SpriteIso.anchor` (`isoSpec.ts:63`) ne prévoit pas ; le `pxScale 2` de L1-T06 n'est porté par aucun champ ; le lot 5 les poserait à double taille.

## Ce qui est juste
Règle d'affichage : `s.ombre` est l'ombre de la lune exportée, en grille depuis le coin arrière de la case, vers +gx et -gy ; `casesSousOmbre` en boîte englobante, `floor`/`ceil` corrects ; elle mord sur la carte (arbres (18,5) et (1,1)). Pièces d'eau (gx 5, gy 1 à 19) : (5,1) `canal_berge`, (5,6) et (5,11) `canal_pont`, (5,19) `cascade_bord`, le reste canal droit, aucun miroir. Miroir : ancres centrées en x, `scaleX: -1` garde l'ancre ; ordre d'une pièce 1x1 inchangé. Ordre commun : tour (4,13) avant canal (5,13), bosquet (6,16, 2x2) avant l'arbre (8,18). Herbe sous les décors (`IsoCarteDemo.tsx:93`). Clé `decor/arbre_a.nuit.webp` conforme à L1-T06. Ombre unique des villageois. Mémoire : environ 4,7 Mo de pièces + 10,9 Mo. `shortcut:` sur `pieceEau` et le bundle. Pas de dépendance nouvelle.

Non vérifié : sonde rouge du plugin (pas d'écriture permise) ; écran (nappe, ombre coupée : captures de qa) ; mutations.
