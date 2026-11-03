# Décisions du chantier bâtiments

Une ligne par décision, avec son pourquoi. Ce que Guillaume doit confirmer est marqué « checkpoint ».

## Session 1, étape 0

### Réglages
- `~/Downloads` n'existe pas sur cette machine : les sources étaient dans `~/Téléchargements`, premières lignes vérifiées (v2, catalogue v4).
- Registre FLUX : 44,84 $ dépensés sur 60 $, il reste 15,16 $ pour une session réglée à 30 $. Le registre reste le plafond dur, seul Guillaume écrit la ligne : checkpoint.
- PNG des maquettes de la prep hors de l'historique (9 Mo, F-Droid clone le dépôt) ; l'historique complet reste sur la branche `bld-prep-history`.

### Questions de la prep (étape 0, point 9)
Déjà tranché par le prompt :
- Q1 Sommet du moulin : le pic de cristal bleu, jamais de nuage.
- Q2 Gardien de l'observatoire : le Sage.
- Mythique de l'observatoire : les atlantes du catalogue v4, à tester en E1.

Réponses prises, que Guillaume peut rayer au checkpoint :
- Q3 Jour de la mise à jour : pas de show pour un bâtiment repeint dont le rang ne change pas. La mise à jour change la peinture, comme toute mise à jour ; un show sans rang gagné mentirait sur ce qu'il fête. Checkpoint.
- Q4 Teintes `#9DB8C2` (ailes) et `#5E8A80` (patine) : gardées comme point de départ, G-SET les juge sur la peinture.
- Q5 Règle B : le legendary d'une amélioration suppose bien son rang propre 3, comme le dit la section 6.
- Q6 Feu, mur du r7 : z 1,1. L'échelle doit se lire à l'écran, et la croissance monte par la pièce, pas par le mur.
- Q7 Feu, r6 : le sanglier rôti est un accessoire, il ne compte pas dans les 2 figures.
- Q8 Feu, r8 et r9 : trois quarts dos accepté ; G-GAG dira si le gag se lit.
- Q9 Tente, r8 à r10 : le catalogue v4 prime (le chien dort, puis porte le bonnet). La carte de la prep est à réaligner.
- Q10 Tente : le chien reste celui du gag. L'animal gardien du joueur fait partie des éléments statiques de la section 6. Checkpoint.
- Q11 Mannequin, bras du manège : le débord en l'air est permis s'il reste dans le canevas et que le contact au sol reste dans le masque (section 7). Le contrôle des 30 % de recouvrement le surveille.
- Q12 Mannequin, visage : pas de visage. Deux croix se lisent comme des lettres, et le seau-casque du catalogue suffit.

Écart signalé par la prep :
- Garde-fou de 55 MiB : le prompt v2 le maintient, alors que Guillaume l'a retiré le 02/11 et que `AGENTS.md` le dit retiré depuis le 18/10. Je mesure après chaque fusion et je suis le prompt, le plus récent : checkpoint pour confirmer.

### Exploration et références
- E1 : le test de silhouette écarte l'observatoire A (atlantes, lu « Well » 8 fois sur 8) et B. Survivants : moulin A, B, C ; observatoire C. Voir `explore/E1/verdict.md`. Les atlantes étaient la demande du catalogue : checkpoint.
- Références de style FLUX, choix de mara : `castle_wall/solid.jour.webp`, `druid_grove/grand.jour.webp`, `high_road/solid.jour.webp`. Trois objets sans forme commune, seul le style passe. Quand le sujet est l'un des trois, retirer sa propre image. Le prompt impose l'ardoise `#2E3552` pour les ombres : ces sprites tirent vers l'olive.
- Calibration : mara et theo échouent au premier test (1 ÉCHEC sur 5, 3 BON sur 3), notes écrites, puis 2 sur 3 chacun au retest. Section 11 : on s'arrête et on demande : checkpoint.

### Base propre (demande de Guillaume, 02/11)
- Plus de garde APK : retirée par Guillaume, la question du checkpoint tombe. Le prompt à jour le dit aussi.
- Drapeaux iso allumés dans les builds dev et perf, éteints en publié, testé par `iso-poc-flags`.
- `transformOrigin` à deux valeurs : l'onglet Village plantait en dev seulement, invisible à jest et au build perf. Sept sites corrigés, un test les parcourt.
- Cycles d'import cassés plutôt que contournés : `noImportCycles` venu de main est un cliquet.
- Comptes rendus et specs E1 générées exclus de Biome : on ne reformate pas des archives.
- `golden.spec.json` des loupes garde `peint=tout` : ses réglages sont verrouillés.

### Réponses de Guillaume avant la nuit (02/11)
- Planche : tout gardé pour l'instant, il rayera le matin. Les [wink] restent non approuvés : on prévoit leur repli.
- UPGRADE_RULE : B. Une amélioration dont l'aspect change a son propre marqueur et son tap.
- Questions de la prep : mes réponses par défaut.
- Battement de rang sur tap : oui, le marqueur s'étend à chaque rang. Les éléments de la section 6 restent statiques.
- Tailles d'image : relevées là où il faut.
- Go, dans la limite de 30 $ et 250 passages. Guillaume autorise le changement du registre (« I put 30$ it is ok we can change registre ») : ligne `BUDGET_FLUX_V1: 75` écrite à sa demande, soit 44,84 $ déjà dépensés plus 30 $.
- Il maintenait l'arrêt sur un retest de calibration raté (mara et theo à 2 sur 3). Interrogé, il a répondu : continuer, juges notés. Mara et theo restent juges avec leurs notes, l'écart va dans le rapport, il juge lui-même au checkpoint de verrouillage. Risque connu : ils peuvent laisser passer un défaut vectoriel de nuit.

### Moteur, revue de tech
- Verdict PAS PRÊT. Points 1 à 7 corrigés avant toute peinture, points 8 à 16 au branchement.
- Point 8 : `VillageScene.tsx:514` fait évoluer seul un bâtiment prêt avant une séance, sans tap. C'est contraire à la promesse et ça existe déjà aujourd'hui. Sous le drapeau par rang, ce chemin ne réclame plus rien ; drapeau éteint, l'application ne change pas. Le choix produit reste à Guillaume : checkpoint.
- Atlantes : lus « Well » 8 fois sur 8. Je tente une seule retouche de maquette à 0 $ (A2), car c'est la direction que le catalogue demande. Si elle échoue, l'astrolabe C reste seul.

### Exploration (nuit du 02 au 03/11)
- E3 : FLUX 3 Image. Il garde la maquette. FLUX.2 pro gagne S-D avec des ailes et des objets qu'il ne doit pas peindre. `explore/E3/verdict.md`.
- E5 : finition (b), contour plus épais et intérieur fin. `explore/E5/verdict.md`.
- E4 : peinture neuve avec le stade précédent en référence. La chaîne gagne l'A/B mais perd le contrefort : G-CONT dure tranche. Ce qui plaît entre dans la maquette. `explore/E4/verdict.md`.
- Sol : peint une seule fois par emplacement, en contexte, jamais avec le bâtiment. Le prompt ne gagne pas contre le losange de la maquette.
- Atlantes A2 : échoue aussi (« Champion Arena »). Mythique de l'observatoire : astrolabe C, seul survivant. Les atlantes restent la demande du catalogue : checkpoint.

- E1 après écrans cibles (0,38 $). S-C, canari réussi aux deux : moulin A bat B deux fois, bat C une fois et fait égalité une fois, A et l'astrolabe C battent aujourd'hui deux fois. Theo : moulin A (v1), observatoire C « le moins pire, toujours sans magie ». Mara : moulin C (lyre), observatoire C ; aucune des 8 ne s'envoie à un ami.
- Décision moulin : A, le cristal. Prompt, S-C et theo vont dans ce sens. Correction prise chez mara : un seul cristal, mat, sans facettes brillantes, ni bijou ni butin. La lyre revient en question au checkpoint de verrouillage : c'est l'idée préférée de mara.
- Décision observatoire : C, l'astrolabe, avec un disque de ciel nocturne mat visible en plein jour, une lunette qui sort d'une fente du dôme et pointe dessus, des anneaux croisés sur trois axes. Les atlantes restent écartés tant qu'ils n'ont pas passé G-ID.

- Coin après fusion du moteur, le 03/11 : `bc-keep-feu` à 2,04 %, frames à 0,40 %. Les dumps montrent 12 villageois déplacés et rien d'autre : c'est le changement de date, pas le moteur. G-CORNER doit retirer les rectangles des villageois du calcul, sinon il sonne chaque nuit à minuit.

### Moteur (nuit du 03/11)
- Verdict d'anim sur `56e95e0c` : G-UPGRADE passe, G-MOTION échoue encore. Magie en code : vectoriel à côté de la peinture. Décision : anneau, glyphes, halo et faisceau deviennent des images fixes peintes à bords doux, le code ne garde que leur mouvement (règle 9.3 ; ton retour « vectoriel, moche à côté de la peinture »). Restes à corriger avec l'art : pointes noires au moyeu, nuage de nuit trop clair, feu devant l'échafaudage. Ailes figées au ralenti : à vérifier, sans doute la capture.
- G-ID sur maquettes : moulin r1 et observatoire r2 réussis aux deux mélanges. Le grand de l'observatoire r1 avait échoué (« Forge ») : dôme ouvert et long télescope.
- La lunette raccourcit entre le grand (2,2) et le legendary (1,4) de l'observatoire : à faire juger par mara pour G-KEEP.

### Moulin, sondes r1 (nuit du 03/11)
- Verdict de mara sur 10 sondes à l'aveugle (0,70 $) : non, pas de peinture complète. Pic en pierre grise, coupure verticale sur le fût, pierre qui change au grand, pas de chaume, caleçon absent. Bases G et H saines.
- Corrections prises, avec écart à la carte gelée du moulin (à relire au checkpoint) : le pic devient une seule masse brisée au lieu de 3 tronçons, sans rebord d'ellipse (repasser G-ID) ; caleçon en forme de tissu dans la maquette, FLUX l'oublie sinon ; âne et cheval en sprite au mythique, pas peints dans la tour.
- Chapeau : chaume rétabli (la maquette le convertissait en tuile à tort), tuile en terre cuite éteinte au lieu de l'ardoise grise. Cela revient sur la correction de mara à E3 : le pic doit être le seul élément froid.
- Recette : le meilleur solid sert de référence de matière à tous les stades, le stade précédent ne sert qu'à la forme. Pic testé seul d'abord (0,14 $), repli teinte par script sous masque. Contrôle ajouté : hauteur du haut de tour à chaque essai.

- Tour 2 (0,84 $), mara : non, mais chaume gagné, grand J (`grand/t1_v0`) et legendary F (`legendary/t1_v0`) gardés. Son « anomalie » 3 grand / 1 legendary s'explique par la clé : A est le legendary v1 au toit mordu, déjà rejeté par le contrôle de hauteur. Rien à changer au contrôle.
- Tour 3, sans repeindre ce qui est gardé : supprimer la cassure à deux tons du fût à sa source, repeindre rough et solid avec la pierre de J en référence (la référence solid n'a pas tenu), pic forme de C et bleu de B par teinte sous masque avec collier sombre, caleçon peint une fois en blanc de farine et posé par script, montage avec ailes et rubans pour refaire le test de l'ami.
- Panne de la nuit : le peintre attendait avec `while pgrep -f <script>`, qui se trouve lui-même et ne finit jamais. Son rapport est resté bloqué de 4 h 36 à 8 h 31, sans travail fait pendant ce temps. Consigne ajoutée à chaque envoi ; vérifier les dossiers de sortie au lieu de croire « attend sa tâche de fond ».

- Guillaume, le 03/11 au matin : règle d'attente ajoutée en 9.0 de `PROMPT.md` ; sauvegarde de `bld-flux` sur origin, fusion dès la suite verte. Fût : regarder d'abord le rendu de la maquette, corriger la maquette (lissage, segments, lumière douce) et repeindre plutôt que retoucher. Pic : décalage de teinte sous masque permis, mais anneau de pierre et couture en retouche FLUX 3 par zone, jamais de clone ni de flou ; taille d'au moins un quart de la tour et saturation vers 0,55. Bande des 5 stades en aperçu non bloquant dans `checkpoint.md` dès qu'ils sont peints, puis l'observatoire.

- Guillaume, kit de maquettes : formes réutilisables dans le format des specs (cylindres lissés, toits coniques et en tuiles, dôme, arche, échafaudage, grue à roue), pour le moulin et tous les suivants. Les bâtiments restent faits de ces formes, jamais de modèles téléchargés. Exception approuvée, sans s'arrêter : figures et créatures seulement (atlantes, statue du héros, dragon, figures de gags quand la pose compte), modèles CC0 de Quaternius et Kenney, licence vérifiée pack par pack, fichiers dans le dépôt avec une note LICENSES (pack, auteur, CC0). Ils ne servent qu'à la maquette : FLUX repeint tout, et aucun modèle téléchargé n'est livré dans l'application. Les atlantes peuvent donc être retentés avec une vraie figure posée.

- G-ID du nouveau pic : réussi aux deux mélanges, silhouette et flou. Le témoin Champion Arena est lu « Observatory » 4 fois sur 4 : à traiter dans sa carte, les deux silhouettes se confondent.
- Tour 3 (1,22 $), mara : presque, silhouette et montée validées, legendary nouveau préféré à l'ancien. Reste : deux diagonales droites sur le fût à partir du grand (ombre de la galerie, à vérifier), trois grains de pierre, pic trop vif et brillant, caleçon qui paraît collé.
- Pic : mara le veut plus gris que le bleu à saturation 0,55 demandé par Guillaume. Je tiens le 0,55 de Guillaume et retire ce qui fait gemme (blancs, bord droit, bout carré). Une variante à 0,40 l'accompagne pour que Guillaume tranche sur l'image.
- Tour 4 : grain du solid comme référence partout. Fût corrigé dans la maquette (lumière douce, sans ombre portée droite) puis repeint, pas retouché. Le tracé des rubans change, sans bloquer les tours.

- Atlantes A3, vraies figures CC0 posées (0 $) : G-ID à l'aveugle, chaque variante seule, deux mélanges. a : « Observatory » 4 fois sur 4, silhouette et flou. b : aussi 4 sur 4, mais empreinte à 0,969, sous les 0,98. c : échoue (« Wizard Tower », « Well »), et un de ses rapports contredit sa clé, non rejoué puisque a suffit. Les atlantes redeviennent possibles, par la variante a. Une silhouette réussie ne les fait pas gagner : comparaison A3a contre astrolabe sur écran cible (S-C, theo, mara) au début de l'observatoire, décision au checkpoint.

- Tour 4 (1,54 $), mara : oui pour la peinture complète, après deux guides sans peinture (rubans sans barres ni double trait, vraie forme de caleçon sur l'aile du rough). Pic à saturation 0,55 gardé : à 0,40 il devient de l'ardoise, ce qui faisait gemme était sa forme. Tours sondes4 gardées pour grand, legendary, mythic, sondes3 pour rough et solid, pas de repeinture entière. Restes locaux pour la suite : poivre de la pierre, couture du rough, caleçon, pic.
- Budget : contrôle du registre à 50 $ acquitté par moi, dans les 75 $ autorisés par Guillaume.

Conséquences de la planche de cartes :
- La carte `campfire.md` de la prep est à réécrire : le Ménestrel remplace le cuistot.

## Session 2, prompt v3 (03/11)

- Prompt v3 installé, `PROMPT-v2.md` garde l'ancien. Réglages donnés par Guillaume : 30 $, 250 passages, push oui.
- `~/Downloads` n'existe toujours pas : prompt pris dans `~/Téléchargements`, première ligne vérifiée.
- Plafond FLUX réel de la session : 20,717 $, le registre est plus petit que les 30 $. Je ne touche pas à `BUDGET_FLUX_V1`.
- Builds de l'émulateur anciens (`56e95e0c`, `bb2d9a82`) : pas reconstruits maintenant, les étapes A à C n'utilisent pas l'émulateur. Reconstruits depuis le tip avant la première capture.
