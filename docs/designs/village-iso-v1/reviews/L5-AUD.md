verdict: fail

Audit du lot 5 (iso-tech-auditor, neuf, modèle du chef), plage 6b5ef155..cba2f90f. Texte de l'auditeur collé par le chef, mise en forme seulement.

## BLOQUANT
B1. Jest rouge sur cba2f90f : `Test Suites: 1 failed, 1 skipped, 435 passed, 436 of 437 total`. `__tests__/iso-village.test.tsx:497-513` (« draws the same tree by default and with the defaults passed ») échoue 4 fois sur 4, Node 26 et Node 24.19 : l'élément 143 est `iso-marcheur-minstrel-noeud` au premier montage et `-fixe` au second ; le plan des marcheurs diffère entre deux montages (numéro de vague par `Date.now()`, `useMarcheurs.ts:69`, ou moment de `scheduleOnRN(lancer)`). Aucun run complet après 7fba7615 et cba2f90f. Correction : date fixe et même avance dans le test, ou sortir les marcheurs de `dessin()` ; run complet sous Node 24, ligne recopiée dans LOG.

## IMPORTANTS
I1. Le « pire cas » du budget ne l'est pas : la croissance de campfire et de forge masque leur feu (-6) ; chaque bâtiment qui croît monte 2 nœuds (`IsoCroissance.tsx:48-52`) sans plafond (`IsoVillage.tsx:170-181`, `db/village.ts:749`). 4 bâtiments sans feu : 50 + 8 + 10 = 68 > 64. Correction : ce cas dans le test ; n'animer que 2 ou 3 croissances, les autres basculent directement.
I2. Plafond relevé de 60 à 64 par le chef au milieu du lot (`DECISIONS.md:80`) : à faire trancher par Guillaume avec la mesure du Fairphone.
I3. Auto-validation : pas de `reviews/L5-T05.md` ; le tour 2 (cba2f90f, correctif du plantage compris) n'a eu aucune revue de code.
I4. BOARD surestime : L5-T05 « fait » alors que les animaux ne marchent pas ; L5-T08 « fait » sans corbeaux sur les toits ; L5-T07 « réduite » sans rien de fait (`porte` et `fenetres` sans lecteur, `feux.ts:23-29`, `:46-47`).
I5. Rien du lot 5 n'est mesuré pour les critères 4, 6 et 7 (pas de dump, pas de Maestro, pas de PSS) ; marge mémoire estimée à 3 à 4 Mo.
I6. §7 recule : `Ciel`, `Oiseaux`, `Lucioles`, `Rongeur`, `Feux`, `solVarie` ne lisent que `biome` ; une ambiance « jour » afficherait lune, étoiles et lucioles. `ZONE_LUCIOLES` (`vivant.ts:82`) et `RAT` (`vivant.ts:126`) en dur. Correction : tables par ambiance dans isoSpec.json, test « jour : ni lune ni lucioles », zones dans isoLayout.json.
I7. Critère 8 hors d'atteinte : bannières absentes, chantier (`echafaudage`) inutilisé, `agir` immobile (`marcheurs.ts:488-520`).

## MINEURS
`IsoCarteDemo.tsx:735` lit `horloge.get()` au rendu ; deuxième horloge sans lecteur en dev-iso mode village ; `isoAccroches.json` (15 Ko) porte fenêtres et portes sans lecteur ; fraîcheur des anchors par `test_accroches.py`, hors jest et CI ; ~53 Mo de preuves du lot 5 dans git, à sortir avant main ; `accroches.py:123` slug non validé ; rat à peine visible au cadrage, corbeaux fixes au glissé non prouvés ; test de dev-iso porté à 15 s.

## Ce qui est solide
Worklets : tous les corps propres, chaque fonction appelée porte `"worklet"` (vérifié sur la sortie Babel, `__workletHash`). Garde proposée : un test `iso-worklets` qui espionne `useAnimatedStyle`, `useAnimatedReaction`, `useDerivedValue`, rend IsoVillage et dev-iso, parcourt `fn.__closure` et échoue sur toute fonction sans `__workletHash` hors liste blanche (`scheduleOnRN`). Transform et opacity seulement, ni `withRepeat` ni `setInterval` ni `useFrameCallback`, focus et mouvement réduit, une seule horloge dans l'onglet, drapeau éteint strictement inchangé ; tsc, deadcode, Biome verts ; sha256 figés justes ; chaque JSON précalculé a son test de régénération ; ~17 Ko de JSON ajoutés ; 0 $ FLUX au lot 5, V1 à 2,008 $.

## Non mesuré, à faire sur le Fairphone
gfxinfo sur la vague la plus chargée et sur une croissance de 4 bâtiments sans feu ; PSS au palier 12 contre Village + 80 Mo ; 0 image 10 s après la vague et dump en moins de 3 s ; Maestro iso 3/3 ; mouvement réduit ; lisibilité des corbeaux, du rat, des lucioles ; coût d'une vue en opacité 0 et d'un SVG sous transform.

## Idées restantes (research/L5-T00)
1. Pause, regard et croisement, et le villageois le plus proche qui se tourne vers le toucher (0 nœud). 2. Lueur de porte au passage (reste de L5-T07, 1 nœud par porte active, 3 au plus). 3. Traces de vie statiques (bois et hache, seau, outils, linge ; 0 nœud). 4. Corbeaux sur les toits qui s'envolent au toucher (2 nœuds par oiseau, après récupération : reflets en 5 parents -13, animaux par pose -6). 5. Étoile filante et ronds dans l'eau (1 nœud chacun).

## Liste pour Guillaume à la porte de fin de lot 5
1. Suite complète sous Node 24 verte. 2. Fairphone, gfxinfo sur la vague la plus chargée et sur 4 croissances sans feu. 3. PSS au palier 12. 4. 0 image 10 s après la vague, dump en moins de 3 s. 5. Mouvement réduit : rien ne bouge. 6. À l'œil : corbeaux, rat, lucioles. 7. À trancher : plafond 64 (ou 100) ; L5-T07, corbeaux sur les toits, animaux qui marchent ; bannières, chantier, « travaillent » (critère 8). 8. Maestro iso 3/3.

Non vérifié par l'auditeur : la cause exacte de B1 ; le cas à 68 nœuds (calculé) ; la garde des worklets (proposée) ; aucun build ni appareil ; les tests Python ; A* en détail ; les nœuds animés hors IsoVillage.
