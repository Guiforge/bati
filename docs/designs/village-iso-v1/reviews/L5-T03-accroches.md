verdict: pass (réserves)

Revue neuve (iso-code-reviewer, Sonnet) de la partie blender de L5-T03, non commitée, base d1561ad8. Texte du relecteur condensé par le chef sans retouche de fond.

IMPORTANTS
1. Aucun point n'arrive à l'app : `pointsAccroche` et `cheminee` ne sont lus que par les types (`isoSpec.ts:31-62`, `:290-299`) et un test de forme (`iso-maquettes.test.ts:524`). À brancher : un chargeur par stade (index généré), la conversion px du sprite vers l'écran, puis flamme (foyer), fumée (cheminée), lueur de fenêtre et de porte ; rendre `foyer` et `fenetres` obligatoires une fois lus.
2. Le chemin Blender (`iso_blockout.py:496-500`) n'est pas exécuté ni testé ; équivalent par construction à `accroches.py`.
3. Le 0,0012 px vient d'une rejouée manuelle : `test_exports.py:105-113` tolère 1,0 px, et `accroches.py:screen` et `test_exports.py:screen` sont deux copies de la même formule ; le test devrait importer `accroches.screen`.
MINEURS : foyer non filtré par le masque émissif ; `accroches.py:132` lit un `.emissive.png` généré ailleurs ; pas de couverture des pièces (sans feu ni fenêtre).
VÉRIFIÉ : aucun subprocess, git, adb, maestro, Gradle ni FLUX ; écritures limitées aux ancrages et à la planche ; 96 ancrages régénérés, seules `foyer` et `fenetres` s'ajoutent (les 96 lignes supprimées sont des `}` devenus `},`) ; les échecs de `test_exports.py` sur les 9 animaux portent sur la maquette webp et son sidecar (recadrage de L4-T08c), pas sur les ancrages ; jest iso-spec et iso-maquettes verts.

Chef : 2 et 3 renvoyés à blender ; 1 est le travail de la flamme et de la fumée (L5-T03, partie engineer).
