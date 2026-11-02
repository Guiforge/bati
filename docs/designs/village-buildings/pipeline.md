# Pipeline des bâtiments iso

Vérifié dans le dépôt le 2026-11-02 (worktree `bld-prep`). Rien n'a été rendu ni lancé pour écrire cette page.

## 1. De la maquette Blender à la peinture jour puis nuit

Il n'y a aucun fichier `.blend` dans le dépôt. La maquette est un **spec JSON** (liste de pièces : `box`, `roof`, `cyl`, matériau, `accroche`), rendue par un script bpy.

| Étape | Fichier | Qui écrit quoi |
|---|---|---|
| Spec d'un stade | `scripts/iso/blockouts/<code>_<stade>.json` (ex. `forge_solid.json`) | Générée par `scripts/iso/blockouts/gen_tier3.py`, `gen_tier4.py`, `gen_specials.py`, `gen_muscle.py` (un script par famille, sortie dans le même dossier). À la main sinon. |
| Rendu | `scripts/iso/iso_blockout.py` (tourne dans Blender, jamais seul) | Écrit les passes ton / ombre / lumière, puis `scripts/iso/isolib.py` `blender()` les compose en `.rgba.png` et copie `.anchor.json` (ancre, ombre, flaques, volumes, points d'accroche, index des exports). |
| Exports par stade | `scripts/iso/exports/stage_exports.py` | Ajoute `.emissive.png`, `.roof.png`, `.mask.png` et la maquette de l'app. Spec : `exportsParStade` dans `constants/isoSpec.json`. |
| Sortie maquette | `scripts/iso/blockouts/renders/<code>_<stade>.*` (versionné) | `.rgba.png`, `.png` (fond clé), `.dark.png`, `.green.png`, `.mask.png`, `.classes.png`, `.emissive.png`, `.roof.png`, `.anchor.json`. |
| Maquette dans l'app | `assets/images/village/iso/blockout/` | Écrite par `stage_exports.py` / `iso_loop.py prep-blockout` (même canevas et ancre que le sprite peint). |
| Peinture jour | FLUX (`scripts/iso/iso_loop.py candidates` puis `audit`, `accept`) | Part du `.png` de la maquette (angle, empreinte, hauteur fixés). Pour F1 (vagues 1 à 4), les retenus sont des `<stade>[_v2].post<k>.cut.webp` sous `docs/designs/village-loop/evidence/F1-vague*/`. |
| Sprites jour et nuit | `scripts/iso/famille_jour.py` (0 $, sans FLUX, relançable) | Table `RETENUS` : prend le dernier `.post*.cut.webp` retenu, écrit `assets/images/village/iso/<code>/<stade>.jour.webp`, `<stade>.nuit.webp` et les deux `.json`. |
| Nuit | même script | Pas une seconde peinture : un **grade du jour** (`NUIT`, `NUIT_SOL`) et les lumières ré-allumées en `isoLueur` (#F0A848) depuis `.emissive.png` de la maquette. Même alpha que le jour. |
| Provenance | `scripts/provenance.json` | `famille_jour.py` y écrit une entrée par sprite. `derived_from` du jour et de la nuit = le `.post*.cut.webp` retenu (`how` dit « graded and relit offline »). `derived_from` d'une maquette de remplacement = `scripts/iso/blockouts/renders/<slug>.rgba.png` (`iso_loop.py` ligne 1203). |

`recolor_night.py` est l'ancien chemin de nuit (recoloration par teinte, lot T36). `famille_jour.py` le remplace pour la famille F2.

## 2. Les données de la page « Bâtiments du village iso »

Source unique : `constants/isoSpec.json`, clé `batiments` (21 entrées). Chaque entrée porte `tier`, `stades` (liste, 2 pour le palier 3, 3 sinon), `emprise` (`[gx, gy]` en cases) et `repere` (texte FR : ce qui rend le bâtiment reconnaissable à 30 % de zoom).

- Le `code` est la clé et vient de `buildingCodes` dans `db/schema.ts` (ligne 843). Le palier est aussi dans `db/schema.ts` (`tier: n` par bâtiment).
- `emprise` est copiée de `scripts/iso/exports/heights.json`, produit par `scripts/iso/exports/heights.py` (écrit aussi `hauteurMax`, ombres). `__tests__/iso-layout.test.ts` échoue si les deux divergent.
- Position sur la carte : `constants/isoLayout.json` (`batiments`, `sol`, `paliers`).
- Canevas par taille : `isoSpec.json` `canvases` (`building2x2`, `building3x3`, `building1x2`, `tower1x1`...). Nom d'image : `nomImage`.
- Les vues « ancien » et « nuit/jour » viennent de `assets/images/village/iso/<code>/` ; « maquette » de `renders/` ci-dessus.

Script qui a construit la page : **introuvable** dans le dépôt (recherche du titre, de `repere`, de `isoSpec` côté scripts). Les seuls lecteurs de `batiments` sont `layout_preview.py`, `reference_sprites.py`, `heights.py`. La page est donc probablement générée hors dépôt à partir de ce JSON (inféré).

## 3. Rendre une maquette sans interface

Blender est un flatpak (`org.blender.Blender`, 5.1.1 ; il n'y a pas de `blender` dans le PATH). Lu, **pas lancé**.

Commande brute (en tête de `iso_blockout.py`) :

```
flatpak run --filesystem=home org.blender.Blender --background \
  --python scripts/iso/iso_blockout.py -- spec.json sortie.png [--no-lines] [--catcher] [--swap-tones]
```

Ça écrit des passes (`.tone`, `.shadowtone`, `.direct`, `.ndotl`, `.cls`) et `.anchor.json`, pas encore le sprite. Pour le sprite composé, passer par `isolib.blender(spec, out, socle_shadow=False)`, qui lance la commande puis compose (Python avec Pillow et `magick`). Appel direct sans `iso_loop.py`, depuis `scripts/iso/` : `python3 -c "import pathlib, isolib as L; L.blender(pathlib.Path('blockouts/forge_solid.json'), pathlib.Path('/chemin/sortie.rgba.png'), socle_shadow=False)"` (inféré, non essayé). Les passes brutes vont dans `~/.cache/bati-art-loop/iso/passes` (`ART_LOOP_DIR` pour changer). `iso_loop.py blockout <slug>` fait la même chose plus les `.png`, `.dark`, `.green`, `.mask` ; ne pas l'appeler pendant la session des loupes.

- **Entrées** : le spec ; `constants/isoSpec.json` (caméra orthographique rotation 60/0/45, `pxPerUnit` 271.529, lune `moon.L`, matériaux, tons).
- **Emprise** : le spec choisit `canvas` (`building2x2`...). Le canevas fixe la taille en px et l'empreinte ; l'ancre est le coin bas de l'empreinte, à `anchorMarginPx` (64) du bas, sauf `anchorPx` dans le spec. Toutes les pièces doivent rester dans l'empreinte (`gen_tier4.py` et `heights.py` le vérifient).
- **Silhouette noire** : pas d'export dédié. Le plus proche est `<slug>.mask.png` (alpha >= 128 en blanc sur noir, silhouette de maquette pour le tap). Une silhouette noire sur fond clair se tire de `.rgba.png` (alpha) ; à écrire (inféré).
- **Contrôles** : `scripts/iso/test_audit.py`, `iso_audit.py`, `exports/test_exports.py`, `exports/light_check.py`.

## 4. Où vit le mapping de stade

- `constants/buildingLevels.ts` : `buildingStage(level)` : rang < 3 = `rough`, 3 et 4 = `solid`, 5 et plus = `grand`. `BUILDING_STAGE_LEVEL = 5`, `MAX_BUILDING_LEVEL = 10`, `T3_MAX_LEVEL = 3`. `buildingCeiling()` : palier 3 plafonne à 3, palier 4 à 5 (la route `high_road` à 10), les autres à 10. Niveau 0 affiche `rough`.
- `components/village/iso/carteDemo.ts` `stadeReel(code, voulu)` : ramène le stade voulu aux stades du bâtiment (palier 3 : jamais `grand`).
- `db/village.ts` : `stageRank` (ligne 580) pour `claimable()` ; seuils des rangs : `TIER_LEVEL_FLOORS` (niveau héros 1/3/5/8/10/13/15/18/20/25/32/40), `STARTER_RANK_LEVELS` = 1, 3, 5, 8, 10, 18, 26, 34, 42, 50 (palier 1), `VOLUME_FLOORS` via `buildingLevelThresholds` (`db/schema.ts` ligne 1105) pour les bâtiments à volume, `BOSS_FLOORS` 1,2,3,4,6, `REMATCH_FLOORS` 1,3,6,10,15, `ROUTE_FLOORS` 1,2,4,7,10, `ROAD_FLOORS` en lieues 1..5500. Les anciens seuils (`LEGACY_*`) restent pour l'historique.
- Utilisé par `IsoVillage.tsx` (lignes 321, 400) et `constants/assetMap.ts` (ligne 753).

Il n'existe qu'une règle de stade : rang vers rough/solid/grand.

## 5. Legendary, mythic, seconde règle

Aucun stade ni règle « legendary » ou « mythic » pour un bâtiment. Rencontres de « legendary » : les trois bâtiments de palier 4 (`dragon_lair`, `heroes_hall`, `champion_arena`) sont appelés « the legendary three » dans un commentaire de `db/village.ts` (ligne 275) car leur rang suit des exploits ; `legendaryNews` (`db/villageNewsRules.ts`), `app/big-feast.tsx` (fête « legendary » d'un animal) et les portraits d'animaux `*-legendary` (`constants/animalPortraits.ts`) ; une couleur `rawColors.ts` (bannière légendaire). Aucun n'ajoute de stade de bâtiment. Aucune « règle B » dans le code ; elle n'existe que dans le texte du prompt de la session (`prompt-village-buildings-prep.md`, hors dépôt de cette branche).

## 6. Ce qui reste flou

- Le script de peinture F1 (écrit les `.post*.cut.webp`) n'est pas dans le dépôt ; seules ses sorties le sont (et sous `evidence/` du worktree iso, pas ici). Inféré : `iso_loop.py candidates/audit` plus une retouche manuelle de Mara.
- Les maquettes enrichies `_v2` (forge et salle des héros grand, vagues 2 et 3) sont rendues hors dépôt dans `~/.cache/bati-art-loop/iso/blockouts_v2/renders` par `gen_v2*.py` et `render_v2.py` qui ne sont pas versionnés. Une maquette de nouveau stade devra partir d'ici ou d'un spec propre.
- Qui a construit la page « Bâtiments du village iso » : inconnu (voir 2).
- Pas de silhouette noire, ni de flou 96 dp, ni de grille numérotée dans le dépôt.
- La commande `isolib.blender` directe n'a pas été exécutée ; le chemin sûr, `iso_loop.py blockout`, est interdit pour l'instant.
- Les deux règles d'amélioration du prompt (A et B) et les stades `legendary` / `mythic` sont à créer ; `BuildingStage`, `buildingStage()`, `stades` dans `isoSpec.json` et `famille_jour.RETENUS` seraient à étendre ensemble.
- `scripts/iso/team/heavy.sh` (cité par CLAUDE.md) n'existe pas dans cette branche.
