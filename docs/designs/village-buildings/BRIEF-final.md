# Commande : specs de peinture finale

Travaille sur place dans `/home/guiforge/Documents/code/bati/.claude/worktrees/iso`, sans commit, sans appel FLUX. Lis d'abord `docs/designs/village-buildings/retours-concepts-2.md` (il prime sur tout), puis `docs/designs/village-buildings/PROMPT.md` sections 5, 6, 7 et 8.E.

Pour chaque bâtiment de ton envoi, écris `scripts/bld/final/<code>.json`. Pars du concept approuvé : la direction 4 de `scripts/bld/concepts/<code>.json` et ses images `docs/designs/village-buildings/<code>/concepts/f3_d4_{rough,grand,mythic}_t*.png` (le plus haut essai), à regarder. Pour la fontaine, c'est la direction 3 et `f3_d3_*`. Les images variantes `direct_d4_*` sont là si elles portent mieux une idée.

```json
{
  "building": "<code>",
  "concept": {"rough": "<chemin>", "grand": "<chemin>", "mythic": "<chemin>"},
  "stages": {"rough": "...", "solid": "...", "grand": "...", "legendary": "...", "mythic": "..."},
  "teasers": [{"id": "...", "stage_after": "rough", "prompt": "..."}],
  "gag": [{"rank": 2, "prompt": "..."}],
  "anchors": ["fire", "smoke"]
}
```

- **stages :** un prompt anglais par stade. `rough`, `grand`, `mythic` sont des consignes d'édition du concept : ce qu'on garde, ce qu'on change. `solid` et `legendary` se peignent entre leurs voisins : décris ce qui est ajouté, pour que ce soit le même bâtiment qui grandit. Les hauts faits (`dragon_lair`, `heroes_hall`, `champion_arena`) n'ont pas de `legendary`.
- **Personne :** aucun personnage dans aucun prompt, statues et animaux au repos seulement. Retire les figures des concepts en le disant explicitement. Ce que faisaient les figures passe par des objets : les sacs posés, la barre, l'outil laissé là.
- **Chaque stade change** la silhouette et la classe de matériaux, du bricolage au prodige. Les bâtiments restent vraisemblables, de la vraie vie, surtout au début : une blague sur deux ou trois bâtiments, pas plus.
- **Le mythique va plus loin que le concept :** un élément vertigineux plus grand, une couche magique plus forte, visible de jour et de nuit, une silhouette qu'on n'oublie pas. C'est là que tu travailles le plus. Reste dans le canevas et l'emprise : l'emprise au sol ne change pas, la croissance monte (`constants/isoSpec.json`, `batiments`). Seule la tour du mage flotte, et elle est désormais intacte, voir les retours.
- **teasers :** un chantier par rang intermédiaire (section 6), objets seuls, lisibles à 16 dp. **gag :** les objets de l'emplacement de gag, sobres, rien de drôle forcé. Les hauts faits ont un teaser au rang 2.
- **anchors :** ce qui bougera plus tard, parmi `fire`, `smoke`, `windows`, `flag`, `sails`, `water`, `magic`. Pas de position : elles seront mesurées sur la peinture.
- **Interdits :** ni lettres, ni runes, ni tissu qui pend, pas de dalle à bord dur, pas d'ombre portée peinte, pas de fumée grise en nappe. Mat. Aucun nom de jeu, studio, film, BD, artiste ou château de fiction. Évite les mots que la modération refuse (pendu, à la taille, écorché) : décris ce qu'on voit.

Réponds en français, en 5 lignes au plus : ce que tu as écrit, et pour chaque mythique le geste nouveau, en quelques mots. Pas de tiret cadratin.
