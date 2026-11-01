# Plan V1 du village iso, revu contre la spec produit (30/10)

Source : « Bati : village iso V1, spec pour l'ingénieur » (https://claude.ai/artifact/GyLZaF7bAXNCxAKXhsM2C8, rev 11), demandée par Guillaume le 30/10 : « améliorer le plan pour prendre en compte ». La spec décrit le village comme produit (moteur, pierres, quartiers, paysages). Le chantier iso V1 en est la fondation de rendu. Ce document dit ce qui change dans notre plan, ce qui est déjà conforme, ce qui la contredit, et ce qui passe au chantier suivant.

## 1. Partage des rôles

- **Iso V1 (ce chantier)** : le rendu et l'interaction de la scène. Tout ce que la spec demande à l'écran doit y être possible et conforme : marqueur marteau, bulle BD, densité, accessibilité, jour et nuit, paysage, test figé, 30 i/s.
- **Village V1 de la spec (chantier suivant, lots 1, 2a, 2b)** : le moteur `village = f(journal, graine, date, version)`, les pierres, les événements `village.*`, la vocation, les plans, les saisons, les stèles, statues, bornes, sentiers, le nom breton. L'iso V1 les prépare sans les coder.

La règle qui tranche : rien de ce que l'iso V1 livre ne doit être à défaire pour le moteur de la spec.

## 2. Ce que la spec change dans le lot 6

| Carte | Avant | Après (spec) |
| --- | --- | --- |
| L6-T13 réclamer | pastille braise animée, le stade attend le toucher sans limite, clé `villageClaimedStages` | **VI-29 coup de marteau** : le bâtiment brille et s'agite pendant les vagues, avec un **marteau fixe au-dessus**, visible aussi en mouvement réduit ; nom accessible « Forge prête à évoluer » ; le toucher joue la scène (3 s au plus, un toucher la passe, texte à la place en mouvement réduit) ; **« Tout faire évoluer »** dès 2 ; **sans toucher, le bâtiment évolue tout seul à la séance comptée suivante, sans scène** ; aucune pastille ni badge sur l'onglet. La clé devient l'état local « scène jouée » (`scene_played` de la spec, non synchronisé) : un 2e appareil rejoue la scène, c'est voulu. L'étape elle-même reste dérivée (aujourd'hui des reps, demain des pierres). |
| L6-T02 chantier | animation de 3,6 s à la croissance | Gardée comme **scène d'évolution** de VI-29 (3 s au plus : à raccourcir de 0,6 s). Le chantier permanent de VI-21 (échafaudage et tas de pierres qui grossit à chaque pierre, un seul à la fois) attend le moteur des pierres ; l'iso V1 prépare un rendu « chantier en cours, n pierres sur 5 » piloté par une prop. |
| L3-T04 fiche au tap | `VillageDetailSheet` | **Bulle BD** : un seul composant pour tout ce qui se tape (nom, fait, date, nom accessible), texte jamais coupé, feuille du bas au-delà de 130 %. À spécifier dans le design system avant le code (nouvelle carte L6-T14). |
| L6-T04 cartouche du titre | nom du village dans un Récitatif | Conforme. Le nom breton tiré de la graine (VI-05) viendra du moteur ; le cartouche affiche ce qu'on lui donne, sans jamais couper à 200 %. |
| L6-T07 à T09 intégration | portrait, paysage, revue des personas | Conforme et renforcé : 12 points tapables au plus (contrôles compris), cibles de 48 dp, chiffres au tap seulement, lisible en 360 × 640, 130 et 200 %, tablette en paysage, pliable. L'audit des personas est rejoué par un agent neuf sur la PR finale. |
| L6-T10 monde autour | forêt, montagnes, bout de mer | Devient le **premier paysage, « lisière de forêt »** de VI-02 (la spec permet de sortir avec un seul paysage). La mer en coin reste un décor de l'anneau extérieur ; rivière et mer seront deux autres anneaux. Le cœur du village est commun aux paysages. |
| L6-T11 palette | nuit colorée | Conforme pour la nuit. **VI-15** : un gratuit sur Play voit une **lumière de jour fixe**, F-Droid et Bati+ ont jour et nuit. Il faut donc une ambiance **jour** (nouvelle carte L6-T15). |
| L6-T06 mesures | émulateur puis Fairphone | Ajouter : **30 i/s sur un téléphone d'entrée de gamme (type Galaxy A13)**, village plein, animations actives ; un **mode test qui fige les animations** pour Maestro (point ouvert de la spec). |

## 3. Déjà conforme

Rien n'est stocké comme ressource ; le village ne recule jamais (rien ne se dégrade, pas d'animation de ruine) ; aucun emplacement vide (l'îlot grandit avec le palier, un élément apparaît quand il est gagné) ; aucune notification ; mouvement réduit couvert partout ; jamais la couleur seule (le marteau est une forme) ; le hasard (graine par jour et vague) ne choisit que le décor ; rien ne tourne au repos, donc rien pendant une sortie GPS ; drapeau éteint, production inchangée.

## 4. Contradictions à trancher (Guillaume)

1. **« Éléments animés en même temps : 8 au plus »** (spec, densité) contre « il faut que ce soit vivant » (Guillaume, porte du lot 4) et la vague actuelle (flammes, fumées, 3 villageois, oiseaux, lucioles, reflets, étoiles, fenêtres). Reco du chef : lire la limite comme 8 **familles** d'animation visibles à la fois (eau, feux, fumées, villageois, oiseaux, lucioles, ciel, signal de bâtiment) et les tenir sous 8 ; le compte de nœuds Reanimated (plafond 64) reste la limite technique.
2. **Jour fixe pour le gratuit sur Play** : tout l'art peint est de nuit (`*.nuit.webp`). Reco : V1 en jour par la lumière dessinée par l'app (ciel, sol, palette) et un étalonnage des sprites de nuit (teinte et luminosité dans un calque), sans repeindre ; la vraie peinture de jour plus tard. À valider à l'œil sur 3 bâtiments avant d'étendre.
3. **Niveaux actuels contre pierres** : aujourd'hui le stade vient du volume de reps par muscle ; la spec paie la régularité (1 pierre par séance comptée, plafonds 2 par jour et 6 par semaine, jamais au volume). Reco : l'iso V1 garde le calcul actuel derrière une seule fonction d'entrée ; le moteur de la spec la remplacera sans toucher au rendu.
4. **Bâtiments de la spec absents de nos 21** : tranché par Guillaume le 30/10, « l'idée, c'est de pas d'inventer des nouveaux bâtiments, il faut reprendre les bâtiments existants ». Les rôles de la spec se posent sur les 21 bâtiments existants (proposition du chef, à valider) :

| Rôle dans la spec | Bâtiment existant |
| --- | --- |
| Jour 1 : place, feu, abri du gardien, maison du guérisseur | place, feu de camp (campfire), tente (tent) pour le gardien, bosquet du druide (druid_grove) pour le guérisseur, qui fume et porte un panneau en pause |
| Quartier force | forge, arène (champion_arena), mannequin, armurerie, champ de tir |
| Quartier course | grand-route (high_road), tour de guet (watchtower) |
| Quartier mobilité | fontaine, puits, observatoire |
| Quartier vélo | ferme et grange (barn), écurie à la place d'une écurie neuve |
| Place du marché (commun) | moulin (windmill), carrière, rempart (castle_wall), salle des héros |
| Signature du paysage (scierie, moulin à eau, port) | variante d'anneau extérieur seulement, pas de bâtiment neuf : le moulin et la carrière pour la lisière de forêt |
| Stèles, statues de boss, bornes des sentiers | petits objets de décor, pas des bâtiments ; au chantier suivant, à décider avec le moteur |
| Antre du dragon, tour du sorcier | hauts faits et boss (VI-10), comme aujourd'hui |

Aucun bâtiment n'est ajouté ; l'iso V1 n'a rien à peindre de plus pour la spec.
5. **Bulle BD contre fiche actuelle** : reco, L6-T14 avant la porte finale, car la bulle est le composant commun de toute la V1.

## 5. Nouveau découpage du lot 6

1. L6-T13 revu en VI-29 (marteau fixe, « Tout faire évoluer », évolution automatique à la séance suivante, état local « scène jouée », pas de pastille).
2. L6-T02 ramené à 3 s, passable d'un toucher, texte en mouvement réduit.
3. L6-T14 bulle BD (spec design system, puis code), 12 points tapables, 48 dp.
4. L6-T03 et L6-T12 : gestes de travail, bannières, or et lumière au dernier stade (3B).
5. L6-T15 ambiance jour par l'app (après l'essai sur 3 bâtiments).
6. L6-T04 cartouche, L6-T07 à T09 intégration portrait et paysage, revues et audit des personas.
7. L6-T16 mode test qui fige les animations (Maestro), compte des familles animées.
8. L6-T05, L6-T06 revue « village complet peint », mesures (Fairphone, entrée de gamme), vidéo, rapport ; L6-AUD ; porte finale.

## 6. Ce que l'iso V1 prépare pour le moteur de la spec

Une seule entrée de données pour la scène (bâtiments, stades, chantier en cours avec n pierres, éléments gagnés), un état local « scène jouée », une graine reçue de l'extérieur, une palette en tokens par ambiance (nuit, jour, puis saisons), des emplacements de carte nommés (pour les 3 plans de VI-03), un anneau extérieur interchangeable (pour les 3 paysages de VI-02).

## 7. Un village qui pousse pour de vrai (ajouté le 30/10)

Source : « Bati : un village qui pousse pour de vrai » (https://claude.ai/artifact/HnnbowunW3xNk5bsBzsq6W, rev 9), ajouté au plan par Guillaume le 30/10. Constat : la disposition se lit comme un plateau de jeu (damier visible, chemin en croix tiré à la règle, bâtiments qui ne touchent pas la rue, rien entre eux, îlot en losange). Proposition : un squelette dessiné (grand-rue, place, bonnes places), un remplissage tiré de la graine (ruelles, petites maisons de décor, jardins, clôtures), une croissance calculée une fois pour toutes à la création ; jour 1 petit mais plein, caméra serrée qui recule à chaque palier, clairière petite et forêt proche qui recule.

Partage, comme pour la spec :
- **Iso V1 (ce chantier), « le premier pas presque gratuit »**, sans nouvelle image ni nœud animé :
  - L6-T18 : cacher le damier (le sol ne montre plus les cases, la grille reste interne) ; rues redessinées par l'app, un peu ondulées, qui montent en gamme près de la place (terre, empierrée, pavée) ; chaque bâtiment existant touche une rue et lui présente sa porte (points d'accroche `porte` déjà exportés) ; bord de la clairière organique au lieu du losange, fondu dans la forêt du monde sans bord (L6-T17) ; densité qui baisse du centre vers la lisière.
  - L6-T19 : au palier 1, la caméra est serrée et le hameau remplit l'écran ; elle recule un peu à chaque palier ; la clairière est petite au début et la forêt recule quand le village grandit.
- **Chantier suivant, avec le moteur de la spec** : squelettes des trois plans (remplace VI-03 « plans dessinés »), remplissage généré depuis la graine et ordre d'apparition figé à la création, 1 ou 2 petites maisons par étape franchie, test doré étendu à la position et à l'ordre de chaque maison, version du générateur, villages déjà créés complétés autour de l'existant. Images : environ 6 maisons en 2 orientations et une dizaine d'objets (clôture, jardin, puits, charrette, tas de bois, lanterne), packs achetés vérifiés d'abord, sinon FLUX.

Règles qui ne bougent pas : les petites maisons sont du décor, sans tap ni chiffre, immobiles (hors du plafond d'animations), jamais un emplacement vide ; aucun bâtiment nouveau (Guillaume, 30/10) : guérisseur et gardien restent posés sur le bosquet du druide et la tente.

Décisions du document, recos suivies sauf avis contraire de Guillaume : approche hybride ; mesure mémoire sur le Fairphone avant le remplissage (elle est à la porte finale, donc le remplissage passe au chantier suivant) ; villages existants complétés autour de l'existant ; une ou deux maisons par étape. Ouverte : les maisons prennent-elles l'allure de la vocation (plus d'images).
