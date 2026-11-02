# T41 point 2 : l'éclat de magie et l'onde dorée à la révélation (31/10)

Rôle : iso-engineer. Pas de commit, pas de build, rien touché dans assets/.

## Ce qui est fait
- `revelation.ts` (pur, testé) : ONDE_MS 900 (< REVELATION_MAX_MS 1000), plan de l'onde (`planOnde` : retard par bâtiment amélioré, les 4 plus proches avec fenêtres s'allument), `allumeOnde`, `flareOnde`, `anneauOnde`, `eclatMonte`, `eclatDe` (runes tour du mage, braises forge et dragon, lucioles bosquet, étincelles d'or par défaut ; aucun violet, `isoRune` est écarté), `RevelationContext`.
- `Revelation.tsx` : `EclatRevelation` (1 nœud, les particules de `Effets` en aplats, monte de 44 dp et s'éteint) et `AnneauRevelation` (1 nœud, anneau or et os qui part du pied du premier bâtiment monté et grandit jusqu'à 700 dp).
- `IsoCroissance.tsx` monte l'éclat pour chaque stade joué (2 au plus) et l'anneau pour le premier.
- `VeillesDessinees.tsx` : pendant la révélation, les fenêtres de vague et les lueurs de porte sont coupées ; les fenêtres du plan s'allument au passage du front (nœud `iso-fenetres-*` réutilisé, accroches existantes). `FeuxDessines.tsx` : les braseros (nœuds `iso-flamme-*` déjà montés) gonflent au passage du front. Aucun nœud ajouté pour eux.
- Silence : `Effets` (effets de métier), lueurs « prêt à évoluer » et éclats de bannière sont démontés dès le nouveau stade (`IsoVillage`, `IsoCarteDemo`). Famille d'animation : `iso-revelation-*` rejoint « croissance » (familles.ts).
- Minuterie propre : un `SharedValue` écrit une fois (`withTiming` linéaire 0 à 900 ms) au passage à l'étape 2. Rien au repos : hors de l'étape 2, le contexte est nul et rien ne se monte.
- Mouvement réduit et mode figé : `jouerRevelation` est faux, `IsoCroissance` n'est pas monté, rien ne s'affiche que le stade posé.
- Son du marteau et vibration de T37 : inchangés.

## Budget (iso-ciel)
- Pire cas à la révélation (deux montées, tous les bâtiments prêts, deux corbeaux, vague) : **62 mesuré**, contre 63 avant. Plafond 64 inchangé.
- Le nouveau test « T41 » : 2 éclats, 1 anneau, 0 porte/lueur/éclat de bannière/effet, fenêtres ≤ 4, total ≤ 64 et ≤ 63 ; après 25 s les 3 nœuds sont à opacité 0.
- Deux tests existants réécrits parce que leur prémisse a changé (la révélation est silencieuse) : `iso-ciel` « true worst case » (0 lueur au lieu de 3-4) et `iso-effets` « worst no-glow case » (0 effet de métier pendant la révélation, au lieu de 2 ; borne ≤ 63).
- Cliquets d'`iso-perf-compteur.test.tsx` : non touchés, verts. Pas d'opacité par image, pas de taille de décodage nouvelle.

## Commandes
- `rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Test Suites: 74 passed, 74 total`, `Tests: 775 passed`.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : 0 erreur.
- `npx biome check --write components/village/iso/ __tests__/iso-{ciel,effets,revelation}.test.tsx` : 0 avertissement.

## Le film que la qa doit faire (émulateur, build .perf, nuit, palier 12 avec bâtiments aux stades solid et grand)
1. Faire monter un bâtiment sans chantier (rang dans un stade) puis un avec chantier (changement de stade). Filmer à 60 images par seconde, de 0,5 s avant l'apparition du nouveau stade à 1,5 s après.
2. Voir : le ressort de T37 inchangé ; un éclat qui monte du sommet du bâtiment (étincelles d'or ; runes pâles pour la tour du mage ; braises au foyer pour forge et dragon ; lucioles vertes pour le bosquet) ; un anneau doré qui part du pied et traverse l'île en un peu plus d'une demi-seconde ; au passage, jusqu'à 4 bâtiments déjà améliorés allument leurs fenêtres (une fraction de seconde) et leurs braseros gonflent ; tout revient à l'état normal en moins de 1 s (aucune vague, aucun effet de métier, aucune lueur pendant ce temps).
3. Refaire avec deux bâtiments montés ensemble : deux éclats, un seul anneau.
4. Refaire avec mouvement réduit puis avec `?fige=1` : le stade posé, ni éclat ni anneau ni fenêtre allumée.
5. Mesurer : durée du plus long effet < 1 s, nombre d'images perdues pendant l'effet (gfxinfo) comparé à une montée d'avant, et un repos de 5 s après (aucun nœud animé, aucune écriture de valeur partagée).
6. Vérifier que l'anneau, grand, ne coûte pas de trame (c'est un Svg de 240 x 120 dp agrandi par transform, pas redessiné). S'il pique, réduire PORTEE_DP ou passer l'anneau en deux traits plus fins.

## Non fait ou à surveiller
- Les marcheurs de la vague (leurs 3 ombres) continuent : « pas de vague » vaut pour les lumières, effets, lueurs et éclats, pas pour les villageois qui marchent déjà. Pas dans le budget (62).
- « Déjà amélioré » = stade solid ou grand ; un bâtiment au stade rough ne s'allume pas.
- Anneau et éclat jamais vus sur écran : le rendu réel (taille, flou de l'agrandissement) est à juger par la qa.
