# Design: Un village qui te ressemble

Date : 2026-10-09
Repo : Guiforge/bati
Status : APPROVED (audits design + 6 personas + technique + contre-audit, 09/10)
Maquettes : https://claude.ai/artifact/VeMJ5Bsj6JTCnp8kP3m7zC (version 3), exportées en WebP dans `~/bati-design/village-personnalisation/` (hors du dépôt) : 0-plan, 1-ecu, 2-revelation, 3-fetes, 4-cinq-ans, 5-pieces-et-audits
Sources : notes Claude du projet « Bati » : `village-personnalisation-v4.md`, `village-gardien-design-prompt-v4.md`, `village-personnalisation-v3.md`, `village-gardien-plan-v2.md`

## Problème

1. Tout le monde a le même village : deux héros du même niveau voient la même peinture au pixel près. Un coureur pur voit un village presque vide.
2. Après deux ans, plus rien ne bouge à l'écran : le titre reste « Divin » après le niveau 20, le dernier palier arrive entre 1,8 et 3,9 ans. Un joueur calme peut passer 52 semaines sans un seul changement visible.

## La solution en une phrase

Un animal qui sort de tes séances, un écu qui grandit avec toi, des fêtes rares qui disent un fait, et des repères pour les années longues. Rien à gérer, tout vient du journal.

## Le test « esprit Bati » (chaque élément doit le passer)

1. Sport d'abord : aucun avantage de jeu, rien ne pousse à en faire plus que la séance prévue.
2. Rien ne se gère : un choix reste optionnel.
3. Tout vient du journal : même résultat sur deux téléphones, recalculable.
4. Jamais punir : rien ne recule, rien ne manque, aucune case vide.
5. Simple en surface : au plus un concept nouveau le 1er mois.
6. La compétence plutôt que le volume.
7. Rare et informatif : chaque fête dit un fait.

## Les lots

| Lot | Contenu | Images | Estimation |
|---|---|---|---|
| **V-01** (avant la Chronique) | L'animal et sa révélation, l'écu, le choix dans les Réglages, les 3 tailles de fête et « Ce soir », la barre « faits / plus que », le prochain jalon en séances | aucune | 7 à 9 jours |
| **V-02** (étendu) | Les portraits héroïques des animaux : 4 stades dont le légendaire, pelages rares (flamme Brasier) et d'hiver, test de l'Ours d'abord. Voir « V-02 étendu » plus bas | 60 (FLUX), environ 18 € à 0,30 € le portrait réussi, 30 € de budget, arrêt à 25 € (2,20 € déjà dépensés) | 4 à 6 jours |
| **V-03** (après la prod Play) | Rangs 6 à 10, pierres gravées sur les Remparts, saisons, anniversaire, Âges, devise | 0 à 4 (FLUX, si besoin) | 7 à 10 jours |
| Après | Le quartier de la route (après K-00), les menhirs (après E-04), le réveil animé (après mesure de la perf) | | |
| Parking | La pièce honorable, le village isométrique | | |
| Retiré | Les marques en trop sur l'écu (besants), les étoiles d'Âge, les bannières aux couleurs à part | | |

La taille de l'APK n'est pas un critère pour ce chantier (choix de Guillaume) : elle est mesurée avant et après pour info. Si elle dépasse le plafond de release.yml, c'est Guillaume qui l'ajuste.

## Décisions prises avec Guillaume

- Direction BD : titres et noms en Alegreya (`$heading`), jamais un chiffre en Alegreya ; chiffres en Noto Sans (`$body`, tabulaires) ; braise = action ; or = gagné ; pas d'ombre, pas de glow.
- La grande fête s'ouvre seule en plein écran après « Continuer », se ferme par son bouton ou le geste retour. Une seule par séance, une fois par téléphone.
- Couleurs des animaux (tokens de forme, jamais de texte) : `animalBear #8A672C` (brun ocre, pour le daltonisme), `animalStag #178485`, `animalHorse #599AE2`, `animalSalmon #FFAAAB`, `animalErmine #5EDBFA`. Le sanglier n'a pas de token. Les noms `guardian*` sont interdits (l'app a déjà un avatar « Gardien »).
- Les pierres gravées vont sur le bâtiment Remparts (`castle_wall`), pas dans un lieu à part.
- Une séance mixte compte pour la pratique qui a le plus d'exercices faits.
- « Ce soir » se place sous la jauge de niveau, au-dessus de « Comment c'était ? ».
- Dans les Réglages : « Ton animal : l'ours ». Jamais « l'ours de {{village}} » (casse sur une voyelle et sur un nom vide).
- Le plan est gardé en entier, avec les estimations revues.

## Règles produit

### L'animal
- Révélé à la 8e séance qui compte (`countsAsSession()`, `db/completed.ts`). L'import d'historique n'existe pas encore : quand il arrivera, ses séances ne compteront pas dans ce prédicat, et l'animal en héritera.
- Table style → animal (`db/schema.ts`, style de l'exercice ; `outing` de la séance) : `strength` = Ours, `calisthenics` = Hermine, `yoga` = Saumon, `cardio` = Cerf, sortie `walk` ou `run` = Cerf, sortie `ride` = Cheval.
- Pratique d'une séance = celle qui a le plus d'exercices faits ; égalité : force, callisthénie, yoga, course, vélo.
- Le 1er animal se calcule sur les 8 premières séances qui comptent : la pratique qui en fait au moins 40 % (4 sur 8 au moins), sinon le Sanglier. Égalité : la plus récente, puis l'ordre fixe. Ensuite il est figé.
- Un 2e animal rejoint quand une autre pratique atteint 30 % des séances et au moins 20 séances. Une fois entré, il reste, même si sa pratique retombe (exemple C : le Cerf est à 17 %). Deux au plus. Un Sanglier n'a jamais de 2e animal (ses quartiers montrent déjà ses 2 pratiques).
- Rejeu chronologique (`performedAt`, puis `uuid`) : le 1er animal est figé à la 8e séance, le 2e au passage du seuil. Seuils en entiers (`n*100 >= 40*total`). Si une fusion, une suppression ou un style d'exercice modifié change l'histoire, l'écu suit le nouveau rejeu.
- Stades : jeune, adulte à 40 séances de sa pratique, vénérable à 200 (« ancien » est déjà un avatar). Sanglier ou animal choisi à la main : stade sur toutes les séances qui comptent.
- Il n'a jamais faim, n'est jamais triste, ne part jamais, ne donne aucun bonus.
- Choix manuel optionnel (Réglages et fiche). Clés proposées : `crestAnimal` et `crestMotto` dans `MERGED_PREFERENCES` (`db/backup.ts`), `bigFeastsShown` en clé locale non fusionnée. Ne jamais écrire une valeur par défaut (sinon deux appareils divergent dans `db-peer-compare`) ; mettre à jour la règle R7 de `docs/testing/data-rules.md`. `countsAsSession` est un fragment SQL : le réutiliser, ne pas le réécrire en JS. Revenir à l'animal des séances écrit `auto`, jamais une suppression (une préférence n'a pas de tombstone). Valeur inconnue : `auto`. Choisir son 2e animal : il passe au centre, l'autre en bordure. Un animal choisi à la main porte un losange d'encre sur l'écu.

### L'écu (`Crest`)
- Fond = 1er animal ; l'animal à l'encre (`bgDark`, 3:1 au moins sur chaque fond, 3,75 au pire) ; bordure = 2e animal.
- Un filet d'encre sépare toujours deux couleurs d'animaux (bordure/fond, quartiers du sanglier) : 1 px en 24, 2 px au-delà, calé au pixel en 24.
- La plus longue flamme (1 à 5) en or dans une bande d'encre en haut, DANS la bordure et sous le filet : la silhouette de l'écu reste entière, et un animal seul garde un liseré de sa couleur au-dessus de la bande (l'encre est la couleur du fond de l'app). Les anneaux (un par année du village, même une année sans séance) sont des cercles creux, tracés en or, sur une pastille d'encre : 5 par rangée, 2 rangées au plus, un espace visible entre deux ; au-delà de 10 la taille des anneaux baisse, jamais leur nombre (lisibles jusqu'à 14).
- Paliers de détail : 24 = fond, animal, bordure ; 48 = + flamme ; 96 = + anneaux.
- Hermine : une grande moucheture d'hermine à l'encre à la place de l'animal, dès 24 ; en bordure, sa couleur unie.
- Sanglier : 4 quartiers aux couleurs des 2 pratiques en tête, recalculées depuis le journal, sanglier à l'encre par-dessus, détouré d'un halo os (le même glyphe, plus grand) pour ne pas se fondre dans la croix d'encre. Glyphes : cerf = `deer-head` (Caro Asercion), sanglier = `boar-tusks` (Lorc).
- Toujours sur sa pastille (`bgDark`, 1 px `glassBorder`) quand il est posé sur une peinture.
- Coût : 12 nœuds SVG au plus, borné (flammes en une path, anneaux en une path, animal en glyphe game-icons teinté comme `GameIcon`).
- Écarts mesurés (Machado 2009, ΔE OKLab ×100, seuil 10) : minimum 10,9 entre animaux dans les 4 vues (cerf et cheval en tritanopie) ; minimum 11,9 avec les tokens interdits.

### Les fêtes
- Petite = une ligne dans « Ce soir ». Moyenne = une carte. Grande = plein écran, route modale (la victoire se démonte à « Continuer » : `VictoryView.tsx` `handleContinue`).
- « Voir Brumeval » passe par le même chemin que « Voir ton village » (`handleViewVillage`, paramètre `grown`).
- Une seule grande par séance. Ordre : l'épilogue de campagne (déjà plein écran aujourd'hui), la révélation, un Âge, l'anniversaire, un palier. Les autres deviennent des cartes. Boss vaincu et serment tenu restent des cartes.
- Une fête vient après la séance, jamais avant la 1re rep, et dit un fait. Jamais une comparaison qui peut baisser. Chaque fait n'est dit qu'une fois sur l'écran (la réplique du villageois ne répète plus le record).
- Une clé locale non fusionnée (comme les caches `streak_*`) dit quelles grandes fêtes ont été montrées. Elle ne décide que de l'affichage. À la mise à jour, un héros qui a déjà 8 séances voit la révélation une fois, à sa 1re victoire.
- « Ce soir » (`TonightList`) remplace `SessionRewards` et les blocs « Ton village a grandi ! », « Ton village grandit ». Les confettis sont retirés, et la dépendance `react-native-confetti-cannon` sort de package.json (sinon knip passe au rouge). Tests aussi touchés : `session-rewards-achievement-icon.test.tsx`, `rung-fork-screens.test.tsx`.
- Animation : Reanimated, transform et opacité seulement, environ 1,6 s, jamais de boucle. Reduced motion via `@/hooks/useReducedMotion` (OS et réglage de l'app), pas celui de Reanimated : directement l'image finale.

### Les chiffres
- Barre « faits / plus que » : « 320 XP faits » avant la moitié, « plus que 410 XP » après, toujours avec ses deux bouts (sur deux lignes à 130 %).
- Aucun nombre de reps à faire nulle part. Une barre de bâtiment dit « 3 880 reps faites » avec ses bouts 3 000 … 4 000 : 4 000 est le palier, jamais « il reste 120 ».
- Prochain jalon en séances ou en sorties. Estimateur par bâtiment (n'existe pas), selon ce qui le fait avancer (`relatedMuscle`, `relatedStyle` ou haut fait) : moyenne des 5 dernières séances qui l'ont nourri, arrondie vers le haut. En V-01 le rang max est 5 (`MAX_BUILDING_LEVEL`) : au rang max, pas de ligne de jalon. Exemple V-01 : « La Forge, rang 4 dans environ 2 séances de pectoraux » (la Forge avance avec le muscle chest). Les maquettes montrent des rangs 6 et 7 : ce sont des écrans V-03.

### V-03
- Rangs 6 à 10, pondérés comme l'XP, écrits « rang 7 » (LevelPips pleins puis le chiffre en or).
- Une pierre gravée par niveau après 20, sur les Remparts : ton plus beau record battu à ce niveau, sinon le nombre de séances. Pierres 44×44 en forme de pierre, 6 par ligne, un seul Svg ; au-delà de 60, rangées par dizaines de niveaux.
- Saisons : une bannière par saison entraînée, à la couleur du 1er animal (sanglier : pratique en tête), avec son record. Rangées par année. Aucun emplacement réservé, aucun trou.
- Anniversaire : date = jour de la 1re séance qui compte ; une grande fête à la 1re victoire après la date ; ne dit rien de l'absence ; plusieurs années d'absence = une fête, tous les anneaux d'un coup ; une année sous 10 séances = l'âge du village et le meilleur record, pas le compte.
- Âges : tous les 10 niveaux dès 50, nommés d'après le plus haut échelon de voie atteint depuis l'Âge d'avant (le 1er : depuis le niveau 40). « L'Âge de la pompe diamant ».
- Devise : facultative, « aucune » par défaut, visible seulement sur l'écu en 96.

## Copie
- Tu, apostrophe droite, aucun tiret long (tests `__tests__/locale-style.test.ts`).
- Phrases entières par animal en fr, en, de, es (articles, élisions, genres) : environ 190 chaînes.
- Mots interdits dans toute valeur de copie de la fonction, en 4 langues : gardien/guardian/Wächter/guardián, totem, lignée, chef, meuble, besant, annelet, écartelé, et « ancien » pour le stade.

## Données d'exemple (celles des maquettes)
- Jour 1 : Hameau, niveau 1, aucune séance. La lueur, « Quelque chose observe Brumeval. »
- A : Village, niveau 5 « Guerrier », Étincelle 4 j. 8e séance : 5 force, 2 course, 1 yoga. Ours. « Pompes 14, était 12 », +118 XP (1 000 XP avant).
- B : niveau 21 « Divin », Cité florissante, Braise 9 j. 130 séances : 78 force, 39 course, 13 yoga. Ours adulte, le Cerf rejoint (39/130 = 30 %). Forge rang 6 en V-03 (rang 5 au plus en V-01).
- C : niveau 52, Capitale éternelle. 416 séances : 320 force, 70 course, 26 yoga. Ours vénérable, Cerf adulte. 3 anneaux, 32 pierres, 12 bannières. « L'Âge de la pompe diamant » (atteint au niveau 50 ; 1re pompe diamant au niveau 47).
- E (coureur) : niveau 14 « Titan », Ville franche. 60 sorties (40 courses, 20 vélos). Cerf bordé de Cheval.
- Sanglier : niveau 9 « Élite », Carrefour. 40 séances (14 force, 13 course, 13 yoga), quartiers force et course (course et yoga à égalité : la course est la plus récente).

## Fini quand (V-01)
- Tests verts dans `db-peer-merge` : deux bases fusionnées dans les deux sens donnent le même écu, sanglier et égalités compris ; l'écu est ajouté à `measureHero` et le JSON golden mis à jour.
- Une séance qui ne compte pas pour `countsAsSession()` ne compte pas pour l'animal.
- `auto` survit à la fusion.
- Mise à jour : un héros à 300 séances voit la révélation une fois.
- Classement des grandes fêtes : fonction pure testée, une seule large.
- Aucune copie ne contient un nombre de reps à faire ni un mot interdit, en 4 langues.
- Tokens `animal*` dans `constants/rawColors.ts` avec leurs contrastes en commentaire ; `ACCENT_TOKENS` et paires « encre sur fond » dans `__tests__/color-contrast.test.ts`.
- Reduced motion, aucune boucle infinie, `react-compiler-coverage` vert.
- Maestro : un flux qui lit la clé « déjà montrée » (l'état, pas la navigation).
- À 130 % sur 360×640 : rien ne se coupe ni ne chevauche (captures sur émulateur, skill `device-check`).
- Les tests de la victoire réécrits (environ 38 : `victory-view`, `victory-expedition`).

## V-02 étendu : des animaux dont on est fier

Demande de Guillaume : « fais en sorte d'avoir l'impression que c'est cool d'avoir les animaux, il faut l'effet waou et qu'on puisse être content fier de ses animaux ; prends aussi en compte plusieurs niveaux et/ou variants ». L'effet « waou » passe par des portraits HÉROÏQUES. Hors lot : révélation animée, bestiaire, partage.

### Les règles

- **Légendaire** : un 4e stade, à 500 séances de la pratique de l'animal (`LEGENDARY_AT = 500`, à côté de `ADULT_AT` et `VENERABLE_AT` dans `db/crestRules.ts`). Même compte que l'adulte (40) et le vénérable (200) : séances de la pratique, ou toutes les séances qui comptent pour un sanglier ou un animal choisi à la main. `CrestStage` gagne `"legendary"` et `stageOf` un seuil. Il déclenche une grande fête, comme un passage de stade. Une seule grande fête par soir tient toujours (classement de V-01).
- **Pelage rare** : il se débloque quand la plus longue flamme du héros, calculée avec `DEFAULT_WEEKLY_QUOTA` comme pour l'écu (`longestFlame`, `db/crest.ts`), atteint Brasier (niveau 3, 14 jours, `getFlameLevel`). Les paliers : Étincelle 3 j, Braise 7 j, Brasier 14 j, Fournaise 30 j, Éternelle 100 j. Il ne se perd jamais : il est dérivé du journal, et la plus longue flamme ne baisse pas, sauf si on supprime des séances. Une fois gagné, il est montré par défaut à partir de l'adulte (le jeune n'a pas de pelage rare).
- **Choix du pelage** : la fiche propose « pelage habituel » ou « pelage rare » (seulement une fois le rare gagné). Le choix est enregistré dans une préférence fusionnée `crestCoat`, valeurs `auto` ou `usual`. Même discipline que `crestAnimal` : jamais de valeur par défaut écrite, revenir au rare écrit `auto`, valeur inconnue = `auto`, règle R7 de `docs/testing/data-rules.md` mise à jour.
- **Annonce du pelage rare** : une carte dans « Ce soir », pas une grande fête. Le fait dit : la flamme qui l'a gagné. Rien de plus.
- **Pelage d'hiver** : décembre, janvier et février, selon le calendrier de l'appareil, à partir de l'adulte. `ponytail:` hémisphère nord seulement, à revoir avec les saisons de V-03. Il ne se gagne pas, il passe : aucun manque, rien ne se perd (règle 4 du test « esprit Bati »).
- **Priorité des pelages** : le rare l'emporte sur l'hiver. Avec `crestCoat = usual`, l'hiver s'applique en saison, sinon le pelage de base. Les 3 combinaisons (base, hiver, rare) sont une fonction pure de (animal, stade, mois, flamme, `crestCoat`), testée.
- **Hermine** : son portrait de base devient le pelage d'été, brun avec le bout de la queue noir ; son hiver est blanc (le bout de la queue reste noir). **Saumon** : son « hiver » est la phase océan, argent brillant.
- **Où ils se voient** : les portraits remplacent la silhouette dans la grande fête et dans la fiche. **L'écu ne change pas** (glyphe à l'encre, mêmes paliers de détail). Le jeune n'a que son portrait de base.
- **Direction héroïque** : pose fière, vue en légère contre-plongée de trois quarts, carrure, détails d'encre hachurée façon peintures existantes. Le vénérable et le légendaire sont épiques : cicatrices, majesté, et pour le légendaire une taille et une présence hors norme. Rien de mignon, des yeux d'animal (rien ne brille), un fond uni pour le détourage, l'animal entier avec une marge. Le jeune tient l'échelle de son âge par ses proportions.
- **Pelages plausibles** : nobles, visibles en 96 dp, jamais magiques. Rien ne brille, aucune aura, aucune couleur qui n'existe pas dans la nature.
- **Budget** : 30 € pour tout le chantier, arrêt à 25 €. 2,20 € déjà dépensés. Environ 0,30 € par portrait réussi : 60 portraits, environ 18 €, avec les reprises sous la ligne des 25 €. À 25 € dépensés, on s'arrête et on livre ce qui est détouré, en commençant par l'adulte et le légendaire de base de chaque animal (voir la question ouverte en bas).

### Les 60 portraits

Slug : `<animal>-<stade>[-rare|-winter]`. Stades : `young`, `adult`, `venerable`, `legendary`. 10 par animal : 4 de base, 3 rares (adulte, vénérable, légendaire), 3 d'hiver (adulte, vénérable, légendaire).

| Animal | Base (4) | Rare (3) | Hiver (3) |
|---|---|---|---|
| Ours | `bear-young`, `bear-adult`, `bear-venerable`, `bear-legendary` | `bear-adult-rare`, `bear-venerable-rare`, `bear-legendary-rare` | `bear-adult-winter`, `bear-venerable-winter`, `bear-legendary-winter` |
| Cerf | `stag-young`, `stag-adult`, `stag-venerable`, `stag-legendary` | `stag-adult-rare`, `stag-venerable-rare`, `stag-legendary-rare` | `stag-adult-winter`, `stag-venerable-winter`, `stag-legendary-winter` |
| Cheval | `horse-young`, `horse-adult`, `horse-venerable`, `horse-legendary` | `horse-adult-rare`, `horse-venerable-rare`, `horse-legendary-rare` | `horse-adult-winter`, `horse-venerable-winter`, `horse-legendary-winter` |
| Saumon | `salmon-young`, `salmon-adult`, `salmon-venerable`, `salmon-legendary` | `salmon-adult-rare`, `salmon-venerable-rare`, `salmon-legendary-rare` | `salmon-adult-winter`, `salmon-venerable-winter`, `salmon-legendary-winter` |
| Hermine | `ermine-young`, `ermine-adult`, `ermine-venerable`, `ermine-legendary` | `ermine-adult-rare`, `ermine-venerable-rare`, `ermine-legendary-rare` | `ermine-adult-winter`, `ermine-venerable-winter`, `ermine-legendary-winter` |
| Sanglier | `boar-young`, `boar-adult`, `boar-venerable`, `boar-legendary` | `boar-adult-rare`, `boar-venerable-rare`, `boar-legendary-rare` | `boar-adult-winter`, `boar-venerable-winter`, `boar-legendary-winter` |

Total : 6 × (4 + 3 + 3) = 60.

### Hiver et rare, par animal

| Animal | Hiver (décembre à février) | Rare (flamme Brasier) |
|---|---|---|
| Ours | Pelage épais et ébouriffé, brun plus sombre, givre dans les poils des épaules. | Argenté, façon ours esprit : pelage gris argent pâle, museau et pattes plus sombres. |
| Cerf | Robe grise et dense, cou épaissi, bois nus et lavés de froid. | Cerf blanc : robe d'un blanc crème, yeux et sabots foncés, bois pâles. |
| Cheval | Poil long et rude, robe plus terne, crinière emmêlée de neige. | Noir profond, crinière et queue argent. |
| Saumon | La phase océan : flancs argent brillant, dos bleu acier, sans marques de frai. | Saumon doré : flancs d'un jaune d'or mat, nageoires ambrées. |
| Hermine | Blanc pur, le bout de la queue reste noir. | Mélanique : un pelage presque noir d'un bout à l'autre, le ventre à peine plus clair. |
| Sanglier | Soies longues et grises, sous-poil épais, givre sur le dos. | Sanglier fantôme : gris très pâle, presque cendre, défenses ivoire, yeux sombres. |

Pour la génération, ces phrases sont la matière du prompt de pelage. Chaque prompt répète la liste de contrôle ci-dessous et la phrase « rien ne brille ».

### Copie

- Chaîne de la carte « pelage rare gagné », du libellé de la fiche (« pelage habituel », « pelage rare »), du stade légendaire et de la grande fête de passage, dans les 4 langues (fr, en, de, es), apostrophe droite, aucun tiret long.
- Aucun mot interdit de la section Copie ci-dessus, ni « magique », « brille », « aura », et aucune corvée : jamais « il te manque », « encore X jours », ni rien qui pousse à faire plus que la séance prévue.
- Le stade s'écrit « légendaire » / « legendary » / « legendär » / « legendario ». Le fait de la carte nomme la flamme, jamais le pelage comme un gain de jeu.

### Fini quand (V-02)

- Liste de contrôle des images, pour chacun des 60 portraits : « c'est le même animal sur les 3 stades (pelage, marques, silhouette) » ; « fond nuit uni, aucun bord blanc, aucune vignette » ; « la silhouette se lit en 96 dp » ; « le style des peintures existantes, rien de mignon, aucune mascotte » ; « les yeux sont des yeux d'animal, rien ne brille » ; « l'animal entier, une marge sur les 4 côtés » ; « le détourage est propre ».
- Le légendaire, le rare et l'hiver sont testés, golden compris (`golden-hero`, mis à jour avec la raison des chiffres qui bougent), et la copie existe dans les 4 langues sans mot interdit ni corvée.

## Reste ouvert
- Le texte de la révélation pour un héros qui a déjà plus de 8 séances à la mise à jour, retenu, une seule forme (un point après « Depuis ta 8e séance », jamais deux deux-points dans une phrase) : « Depuis ta 8e séance. 5 de tes 8 premières étaient de la force. » (le soir de la 8e : « 5 de tes 8 séances étaient de la force. »). Le sanglier : le fait en `$text`, « Tes 8 séances se partagent : force 3, endurance 3, yoga 2. » (tardif : « Depuis ta 8e séance. Tes 8 premières se partagent : … »), puis l'explication des couleurs sur sa propre ligne en `$textSecondary`, « Les couleurs de l'écu : force et endurance, tes deux pratiques en tête. » (clé `feast_reveal_boar_colors`, `revealColors`), sans « Aucune pratique ne passe 40 % ».
- La grande fête est la route `app/big-feast.tsx`, ouverte par « Continuer » (`VictoryView`) sans rien dans le lien : elle lit la fête dans le résultat de `saveSession` gardé par le store (`savedResult`, vidé avec la séance) et se ferme sans rien marquer ni quitter s'il n'y a pas de séance terminée avec une grande fête non montrée (un lien forgé ne fait rien). Elle se marque dans `bigFeastsShown` à l'ouverture (`reveal`, `tier:<n>`). Fermer dépile la route puis rejoue le « Continuer » de la victoire (`goOn`) : même pile qu'avant (Accueil, puis 4 appuis retour pour sortir, mesuré). « Voir Brumeval » est le « Voir ton village » de la victoire (`seeVillage`, un `push`) ; le retour depuis le village arrive sur l'Accueil et laisse l'écran de séance sous la pile (un appui de plus pour sortir), comme le lien de la victoire avant le chantier. L'épilogue garde la place mais n'est listé dans « Ce soir » que s'il n'a pas de texte de sortie (« Ta campagne est terminée. »).
- Le jour 1 : « la lueur » = deux yeux couleur os, fixes, à la place exacte de l'écu (même emplacement, même taille : le nom ne bouge pas quand l'écu arrive), pas de halo, pas de braise. Les braises de la peinture passent sous le bloc titre.
- « Voir Brumeval » : si le village n'a pas de nom, le bouton dit « Voir ton village ».
