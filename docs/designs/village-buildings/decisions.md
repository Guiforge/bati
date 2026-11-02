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

Conséquences de la planche de cartes :
- La carte `campfire.md` de la prep est à réécrire : le Ménestrel remplace le cuistot.
