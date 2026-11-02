# T40-maquettes : poses de repos des habitants (points 1 et 2)

Statut proposé : prêt pour revue. Auteur : blender.

## 1. Liste des poses (10 maquettes, 11 personnages)
Palier = premier palier où la pose peut être tirée (proposition pour habitants.ts). Les habitants ne portent que forgeron, fermier, herboriste, sage, ménestrel : les corps sont neutres (tunique `canvas`, peau `plaster`, jambes `darkwood`), l'app recolore, l'artiste peint le métier.

| Pose | Où elle se pose | Palier | Lecture en silhouette |
|---|---|---|---|
| repos_balaie | devant la porte d'un bâtiment | 1 | corps penché, long balai en diagonale, brosse au sol |
| repos_assis_tonneau | près du feu de camp, sur la place | 1 | assis sur un tonneau cerclé, mains sur les genoux |
| repos_porte_panier | sur la place, sur un chemin | 1 | grand panier à la hanche, autre bras écarté |
| repos_lit | sur la place ou devant une porte | 3 | parchemin tenu à deux mains devant la poitrine, tête penchée |
| repos_joue_chat | près du chat (où il s'assoit) | 4 | accroupi, main tendue vers un chat assis |
| repos_dort | contre un mur de bâtiment | 5 | assis au sol, dos au mur, tête tombée, bras croisés |
| repos_discutent | place ou carrefour de chemins (paire) | 6 | deux de profil face à face, l'un qui geste |
| repos_range_caisses | devant la ferme ou la grange | 7 | penché sur une caisse soulevée, pile de deux à côté |
| repos_puise | au puits | 8 | penché, seau plein sur la margelle, une main à l'anse |
| repos_regarde_loin | contre une clôture, au bord du village | 9 | coudes sur la lisse, menton levé, pied croisé |

Décisions : la paire est **une seule image** (deux personnages de profil, face à face, 85 % de la largeur ; une seule case, un seul tirage de graine, pas de recalage relatif). Le mur de `dort`, la margelle de `puise` et la clôture de `regarde_loin` sont dans la maquette pour que la pose se lise : l'artiste peut les peindre sobres ou les omettre, l'app pose le sprite contre le vrai mur, le vrai puits ou la vraie clôture. Poses debout (hors liste) : repos pendant une vague = le sprite debout actuel.

## 2. Maquettes
- `scripts/iso/blockouts/gen_repos.py` (10 specs dans `scripts/iso/blockouts/repos/`) et `render_repos.py` (`render` via heavy.sh, `sheet`). Même format que T36 lot D : canevas `villager`, caméra et `light` [0.55, 0.55, 0.63] des villageois, `pxScale` et `anchorPx` propres à chaque pose, encre 12 px. Les primitives et `fit` sont copiées de gen_peinture.py (qui s'exécute à l'import). Rien dans `peinture/`, `pieces/`, `assets/`.
- Exports complets (8 par pose) dans `scripts/iso/blockouts/renders/repos/`, maquettes webp dans `renders/repos-maquettes/`.
- Planche : `docs/designs/village-iso-v1/evidence/T40/blockouts/repos.png`.

## Preuves
- Remplissage mesuré sur l'alpha : 80 % de la hauteur partout sauf `range_caisses` 72 % (limité par la largeur à 94 %). Largeurs 37 à 94 %.
- Reproductibilité : sha256 des 10 `.rgba.png` identique sur deux rendus (`ecfc1a08...1fea`).
- Chaque `anchor.json` porte `pxScale`, 8 exports, volumes (13 à 24) ; ancre à la lecture de `accroches.screen` comme T36.

## Douteux
- `repos_joue_chat` (retouché une fois : jambes) et `repos_dort` restent les moins lisibles ; corps en troncs de cône, un peu massifs.
- Les paliers sont une proposition : pas de lecture des paliers d'apparition des bâtiments dans le code.
- Les poses ne sont pas dans `pieces/` : ni l'index ni `heights.json` ne les connaissent (comme T36). Coût FLUX 0 $.
