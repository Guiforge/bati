# Plan perf du village iso (31/10)

Sources : `research/perf-moteur.md`, `research/perf-typescript.md`, `research/perf-jeux-classiques.md`,
`research/perf-jeux-react-native.md`, mesures de `reports/AUDIT-DA-cible-qa.md` et `reports/qa-3110.md`.

## Constat

- Régression nette entre `5ea86807` et `256b6db5` (lots DA 1 à 6) : vague p50 22-25 ms -> 61 ms,
  glissé 16 -> 61 ms, 95 % de trames en retard. Toujours là au HEAD (qa-3110 : vague p50 77 ms).
- Le GPU n'est pas en cause (p50 10-11 ms, plus bas qu'avant). Les compteurs qui explosent sont
  `Slow UI thread` (kSlowUI) et `Slow bitmap uploads` (kSlowSync, phase sync du RenderThread) :
  du travail CPU et des textures renvoyées au GPU à presque chaque trame.
- Suspect n°1, vu dans le code : la forêt de `Monde.tsx`. `monde.ts:226-227` tire par case une
  échelle (0,8 à 1,0) et une opacité (0,7 à 1,0) continues ; `Monde.tsx` les applique en
  `width`/`height` et `opacity` avec `contentFit="fill"`. La taille entre dans la clé de cache de
  Glide (un décodage et une texture par taille) et chaque `opacity < 1` coûte un tampon hors écran.
  Arrivé avec le lot DA 3 (`d877f194`).
- Suspects n°2 et 3 : le bord organique (`bord.ts`) et le pavage vectoriel (`pave.ts`), qui
  alourdissent les tuiles `<Svg>` du sol, rastérisées en logiciel sur le thread UI.
- Ouverture à froid : 1 002 ms contre 698 ms sans la carte (L3-T07). Tuile recalcule au rendu des
  chemins qui ne changent jamais, et `maquettes1..4` (index de 570 Ko) est évalué à l'import.

## Avancement

- 31/10, P0 fait (`reports/P0-perf-qa.md`) : la forêt explique toute la régression. Sans taille ni
  opacité par case (F1), retour au niveau de A (vague 22-25 ms, glissé 16 ms) ; taille fixe mais
  opacité gardée (F2), aussi mauvais que le HEAD. L'opacité par image est la cause prouvée.
- 31/10, P1 codé, non mesuré : `teinte` retirée du type `CaseMonde`, forêt à une seule taille de
  layout, échelle 0,8 à 1 gardée par `transform`. Compteur jest en cliquet
  (`__tests__/iso-perf-compteur.test.tsx`) : 0 opacité et 1 taille dans la forêt, plafonds sur la
  carte entière. Reste : une passe gfxinfo de cette version (l'échelle par transform n'a pas été
  mesurée en P0) et un regard DA sur la forêt sans variation de teinte.
- 31/10, P1 mesuré (`reports/P1-perf-qa.md`) : vague p50 22-24 ms, glissé 16 ms, 0,2-0,35 % de
  trames en retard, au niveau de A et de F1 ; l'échelle par transform ne coûte rien de mesurable.
  Revue DA neuve (type « Ensemble posé sur le sol ») : bloquant échoué (items 14, 15, 17, 18, 19,
  24, 25, 29), mais sur la forêt elle-même (tuiles vectorielles vert clair, sol de prairie, ombres
  droites sous les arbres), déjà visible sur la capture H d'avant la correction : un chantier DA
  de la forêt, pas une régression de P1. Si la forêt est repeinte, cuire la teinte de nuit dans
  les tuiles, jamais une opacité par image.
- 31/10, P2 commencé. Profil CPU du premier rendu de la carte complète sous jest (V8, React de dev :
  un rapport, pas un chiffre) : en tête `voileDe` -> `casesSousOmbre` (toutes les cases de la boîte
  de chaque ombre, construites pour chaque pièce) et `casesMonde` -> `distCases` (un tableau de
  ~400 distances alloué 9 fois par case). Les deux réécrits en boucles indexées, mêmes résultats
  (`__tests__/iso-p2-equivalence.test.ts`) : rendu de ~620 à ~460 ms sous jest, `voileDe` sort du
  profil. Ce qui reste en tête : `casesMonde` (~140 ms), l'import des maquettes (~130 ms), `Tuile`
  (~110 ms). Pas encore mesuré en `.perf` sur l'émulateur.
- P4 : le cliquet jest est en place. La règle « une passe gfxinfo à chaque fin de lot, lot bloqué
  au-delà de 5 % de trames lentes » doit entrer dans `CHECKLIST.md` et `PROMPT-EQUIPE-V1.md`, qui
  sont figés pour l'équipe : à écrire par Guillaume.

## Étapes, dans l'ordre

### P0. Trouver le coupable (qa, émulateur, une demi-journée)

1. Rejouer A (`5ea86807`) puis le HEAD dans le même démarrage, protocole d'AUDIT-DA-cible
   (vague 16 s, 9 glissés, `gfxinfo reset` avant chaque passe), puis A à nouveau pour exclure une
   dérive de l'émulateur.
2. Expérience avant bissection : HEAD avec la forêt à `echelle = 1` et `teinte = 1` (deux lignes
   dans `monde.ts`, build jetable, non commitée). Si les compteurs reviennent au niveau de A, c'est
   la forêt, on saute à P1.
3. Sinon, bissecter les 5 commits (3 builds `.perf`).

Critère de sortie : le commit ou le changement qui fait passer `Slow bitmap uploads` de ~0 à ~95 %.

### P1. Corriger la cause (engineer)

Si c'est la forêt (le plus probable) :
- une seule taille décodée pour tous les arbres, l'échelle passe par `transform: [{ scale }]` ;
- plus d'`opacity` par image : 2 ou 3 variantes de teinte cuites dans les webp de `mondeTuiles/`
  (ou un seul voile par-dessus, il existe déjà), indice de variante dans `casesMonde` ;
- retirer `echelle` et `teinte` continus du type de case : une case qui ne peut plus porter une
  taille libre ne peut plus régresser (un type plutôt qu'un test).

Si c'est le sol SVG : alléger les chemins du bord et du pavage (moins de lobes, une seule `d` par
couleur) avant de penser au bake, et vérifier qu'aucune prop d'une tuile ne change pendant une vue
(clés stables, parent inconditionnel ; un démontage jette le bitmap).

Critère : vague et glissé revenus à A ou mieux (p50 <= 25 ms vague, 16 ms glissé, < 1 % en retard,
`Slow bitmap uploads` < 1 %), 0 trame au repos, mode figé et mouvement réduit intacts.

### P2. Ouverture à froid (engineer, après P1)

1. Mesurer d'abord : deux `console.time` en `.perf`, autour de l'import des maquettes et d'un rendu
   de `Tuile`. Sans chiffre, ne rien toucher.
2. Maquettes : leur sortie du bundle est déjà due avant toute fusion (DECISIONS 28/10). La faire
   ici, elle règle aussi l'évaluation à l'import.
3. Tuile : précalculer au build les chaînes `d` statiques (diamants, blobs, galets, décalques,
   terrains par tuile) dans un JSON généré, sur le modèle de `constants/isoLisiere.json`, avec la
   même commande de régénération et un test qui compare le JSON au calcul.

Critère : ouverture à froid de l'onglet <= 850 ms sur l'émulateur, mesurée comme L3-T07.

### P3. Seulement si le Fairphone dit encore non

Cuire chaque tuile du sol en webp (pipeline Python existant) au lieu de la rastériser à
l'exécution. Coût : mémoire au zoom max et netteté vectorielle perdue, à juger en revue DA.
Ne pas le faire sans une mesure qui montre le sol comme coupable.

### P4. Garde-fous

- Mesure Fairphone de Guillaume (`scripts/iso/perf.sh`, critère 5) après P1 : c'est le verdict.
- À chaque fin de lot, `qa` rejoue la passe A/B gfxinfo contre le dernier commit mesuré bon, et le
  lot ne ferme pas si `Slow UI thread` ou `Slow bitmap uploads` dépasse 5 %. La régression de 61 ms
  est passée parce que personne ne l'a relue : la mesure doit bloquer, pas seulement s'écrire.

## Écarté

- Rust, Skia, GL : le goulot est la rastérisation et les textures, pas la logique ; Skia n'est pas
  prouvé acceptable pour F-Droid (binaires npm précompilés), expo-gl compile depuis les sources mais
  reviendrait à réécrire la carte.
- Culling par démontage des vues hors écran : un démontage jette le bitmap SVG et le recrée au
  retour, ce qui est exactement le symptôme.
- Plus de mémoïsation : le React Compiler la fait déjà, et elle n'accélère pas le premier rendu.
- Toucher au budget des 64 nœuds animés : il est sous le plafond conseillé (100) et n'est pas en cause.
