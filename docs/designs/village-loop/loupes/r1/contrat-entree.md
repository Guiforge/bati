# R1 : ce que son contrat doit contenir dès le départ

Décisions de Guillaume du 02/11. R1 part dans une nouvelle session, avec son propre budget. Ces points sont obligatoires, sans exception.

## D'abord : jest
- Stabiliser en premier `iso-dev-screen` et `iso-perf-compteur`, instables par délais (dépassements en suite complète, verts seuls avec un délai de 120 s).
- À partir de R1, plus d'exception : la suite complète doit passer d'un seul coup.

## Critères repris du coin de beauté
- **Bouquets jumeaux** (critère 2) : deux bosquets de bouleaux en miroir aux paliers 3 et 4, cellules (-1,-4) et (-2,7). Le test des jumeaux doit regarder tout l'écran, pas seulement moins de 300 unités.
- **Pieds couverts** (critère 3) : racine nue en (13,-5) au palier 6, bosquet (11,23) aux paliers 3 et 4. Toute masse dont le pied se voit sur le pré a son sous-bois, pas seulement au nord et sur les isolées.
- **Ombres froides du sol** (critère 10) : obligatoire. Un décalage de teinte seul ne suffit pas, il bleuit l'encre de l'herbe : il faut peindre ces ombres.

## Défauts vus par env
- **Pré du nord** : sans matière, bord presque droit sur environ 13 tuiles. Pixels (0,996) à (492,756) sur la capture p06.
- **Forêt du sud** : trait trop épais, aplats plus plats, nettement plus lourds que les chaumières et la forêt du nord.
- **Tache floue près du haut de la route** : pixels (66,1452) à (234,1548) sur la capture p06, à fondre avec des touffes et des fleurs, et son bord lisible de nuit.

## Règles nouvelles
- **Un arbre qui disparaît laisse une souche, un champ ou une construction, jamais un trou vide.**
- **Prospérité** : aux premiers paliers, les alentours restent très simples, presque tribaux. Puis les fermes peintes grossissent et les alentours s'améliorent peu à peu, sans changer à chaque palier. Une évolution très positive, et rien ne recule. Moyen prévu : les bandes de sol, voir `docs/designs/village-surroundings/bible.md`.
- **Aucune croix** : aucun poteau nu avec traverse dans un champ, à aucun palier.
- **Forêt** : la répétition reste admise dans une masse. Peindre plus de masses est permis.
- **Lumière** : L village / L alentours d'au moins 0,98, le cœur restant le plus clair sur la vignette floue.

## Vu par mara et theo à l'intégration finale, pas encore décidé par Guillaume
- Le palier 3 fait vieux, et le saut vers le palier 4 est trop sec. Peindre un sud pauvre, avec route seule, qui se remplit ensuite. Ça rejoint la prospérité.
- Le hameau reste éteint la nuit : deux fenêtres chaudes et une lueur au sol.
- La route est la forme la plus claire de l'écran, surtout de nuit.
- Route et porte non alignées à partir du palier 7, et cadre coupé au palier 12 : voir les décisions du bilan.

## Références
- Extraits verrouillés du coin, pour la règle 10.1 : `loupes/bc/r6/bc-*.png`, capture `loupes/bc/r6/captures-7/`. Ces images restent locales, comme la baseline.
- Méthode de peinture : `iso-paint-ground-in-context` en mémoire, repeindre la vraie capture. Déformer la peinture existante coûte 0 $ et garde sa matière (`warp_head` dans `scripts/iso/loupe_bc_sondes12.py`).
