# todo-defauts : TODO section 3, défauts de code T31, T37, T40 et test des couvertures

Statut proposé : prêt pour revue
Auteur : engineer
Tour de revue : 1

## Fait
- T31 rare (`vieAnimaux.ts`) : un jour rare, `planVie` joue le comportement rare dans chaque vague (le rare s'il peut suivre, sinon l'étape qui y mène, la plus courte possible). Pour que la marche tienne encore, le rare peut précéder la marche (`chasse`, `croasse`, `ailes`, `dresse` ont la marche dans `suit`). Un jour sur dix reste rare (RARE_CHANCE), donc environ une session sur dix voit le comportement rare, sans dépendre du poids.
- T31 rat (`vivant.ts`, `petitsDetails.tsx`, `useMarcheurs.ts`) : `planifierRat(jour, numero, force)` planifie `VIES.rat` par `planVie`; le rat entre dans `betes` du hook (donc `AnimauxContext`). `courseRat(t, vie, segments)` : visible dans toutes les étapes sauf `cache`, immobile au départ de la course avant la marche, à l'autre bout après; la course est l'étape `file`. Une seule image, la pose n'est pas pilotée. Aucun nœud animé de plus (Rongeur garde son unique nœud). `RatForceContext` (dev-iso) passe par `useMarcheurs` (ref). `CHANCE_RAT` 0,5 gardé.
- T31 `Date.now()` : hook `useJour()` (useMarcheurs.ts, lu une fois au montage); `Animal` et `peuple` (habitants) ne lisent plus l'horloge murale au rendu.
- T37 : `pop()` de `chantier.ts` retombe (y de -14 vers 0) au lieu de monter. Mouvement réduit : `PopFin` ne lance rien, `t` reste 0, opacité 0 (inchangé).
- T40 : `reposTable.ts` porte `corps` (boîte de la figure sur sa toile, mesurée sur l'alpha des 10 images) et `boiteDePose(pose, rect, miroir, mini)` ; `CibleVillageois.boite` (habitants.ts) remplace la boîte debout dans `villageoisAuPoint`. `IsoCarteDemo` `cibleHabitant` : boîte de la pose, miroir de l'habitant retourné, au moins TOUCHE_L (24 dp) de côté ; une paire (une image) donne à chacun sa moitié par la position des pieds.
- Test Python : `test_couvre_fenetres.py` échoue maintenant pour un stade peint qui a des fenêtres allumées (pixels chauds) et aucun `couvre`. Les stades sans sprite peint (blockout, `observatory_rough`) sont encore passés, avec la raison écrite.

## Preuves
- Rouge avant : `iso-vie-animaux` (test « rare day », échec sur plusieurs bêtes, y compris le chat avec marche), `iso-animaux-vue` (4 appels à `Date.now` au rerender), `iso-chantier` (y du pop croissant), `iso-repos` (champ `corps` absent), `iso-habitants-vue` (tap hors boîte); le rat : l'API `courseRat(c, d, force)` remplacée, tests réécrits (`iso-petits-details`).
- `scripts/iso/team/heavy.sh rtk proxy npx jest iso- village-scene --testPathIgnorePatterns=/node_modules/` : `Test Suites: 74 passed, 74 total`, `Tests: 769 passed, 769 total`.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : sans sortie (vert).
- `npx biome check --write` sur mes fichiers : 0 erreur, 0 avertissement (dernier passage `No fixes applied`).
- `python3 -I scripts/iso/exports/test_couvre_fenetres.py` : code 0, aucune ligne « NO COVER ». Négatif : avec `couvre` vidé sur `windmill_solid`, `NO COVER: 1 window(s), 995 lit pixels`, code 1.

## Douteux ou non fait
- Boîte tactile des poses : la figure d'une pose est petite (10 à 25 dp), donc agrandie à 24 dp minimum autour de son centre. Taille de doigt non revue sur appareil.
- Une paire inversée par le miroir : la moitié gauche/droite suit les pieds, pas l'image ; au pire le toucher ouvre l'autre des deux bulles.
- Un jour rare le comportement rare est dans chaque vague du jour (pas « au moins une fois »), plus fréquent par session de ce jour-là ; la chance de jour est inchangée.
- Le rat ne pilote que course et arrêts (une seule image). Il apparaît dans les vagues décidées par la graine, plus longtemps et plus lentement qu'avant (étape `file` de 4,5 à 6,5 s au lieu de 1,5 s).
- Non traité : profondeur de la paire prise sur la case du premier (T40), reste du T39.

## Pour la suite
- qa à revoir sur appareil (build .perf) : (1) le rat : sort de son trou, renifle, court sur sa rangée, se cache; une seule bête animée, pas de saut visuel d'opacité gênant; (2) la poussière de fin de chantier retombe et ne monte plus, rien en mouvement réduit; (3) toucher un dormeur, un habitant assis, une paire qui discute : bulle du bon habitant, rien au-dessus de la figure couchée; (4) un jour rare (changer la date) : chat qui chasse, poule qui bat des ailes, corbeau qui croasse; (5) compteur de nœuds animés inchangé (Rongeur seul nœud du rat).

## Tour 2 (après relecture)

- Acte rare : un jour rare, une seule vague parmi les 5 premières planifiées après le montage, tirée par la graine (rareLe, vagueRare dans marcheurs.ts) ; test « exactement 1 vague rare sur les 5 premières un jour rare, aucune sinon ». Limite : une vague par montage de la carte, pas par jour.

- Rat : planifierRat reçoit le nombre de bêtes qui marchent et reste au trou à 2 ; test sur 400 vagues, jamais plus de BETES_PAR_VAGUE en mouvement.
