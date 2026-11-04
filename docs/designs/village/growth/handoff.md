# Alentours : à passer aux autres pistes

- **LAYOUT** : au sud du palier 1 à 3, deux grands polygones sombres à bords nets, comme un sol pas fini. Ils tombent au palier 4. `node scripts/atelier/atelier.js render --tier 1 --query 'foyer=campfire&zoom=0.45'`.
- **LAYOUT** (env) : au recul, coupe rectangulaire au pied de la route sud, bord carré à gauche du coin, taches sombres plates à l'est, haut de carte en bruit uni. Même commande, `--tier 12`. À fondre avant que GROWTH pose quoi que ce soit.
- **LAYOUT** : les rues de `rues.ts` changent de rang avec la distance au feu, jamais avec le palier. Si la route doit s'améliorer dans l'île aussi, c'est dans ce fichier, qui t'appartient. La route haute s'arrête net au palier 8.
- **LAYOUT** : GROWTH aura besoin d'une route vers le nord avec un passage de rivière, et d'emplacements hors de l'île en plus des quartiers.
- **POLISH** : hors de l'île, aucune fenêtre allumée à aucun palier. Les chaumières du coin restent noires la nuit. GROWTH cuira celles de ses pièces. Celles du coin touchent un crop verrouillé : à décider avec Guillaume.
- **LAYOUT** : Guillaume a choisi F, la forêt recule. Il faudra sur la carte agrandie, dans `slots.md` : une clairière à l'ouest du bosquet, au-dessus de l'observatoire, pour un hameau, deux fermes et un bourg ; une route qui évite l'observatoire et le moulin ; le bosquet garde la forêt derrière lui. `img/plan-sur-F.jpg` montre où tombe ton plan.
