# Pipeline du village iso

Court et pratique. Chaque commande se lance à la racine du dépôt. Les formes ont été lues dans le code (`--help` pour `final.py`, docstring pour les autres). Ce qui n'a pas pu être vérifié est dit en bas.

## 0. La règle des modèles

- **FLUX 3 Image** et **FLUX 3 Image Klein**, rien d'autre (règle de Guillaume). Jamais FLUX.2 ni un modèle plus ancien, même si le défaut d'un script le propose : lire le modèle de chaque appel et du manifeste.
- Tout appel FLUX passe par `scripts/iso/iso_loop.py` (registre de budget, verrou `budget.lock`). Jamais d'appel en dehors, jamais dans un autre verrou.
- Le budget : `python3 scripts/iso/iso_loop.py budget` (réservé, réel, solde BFL). Autres formes : `budget ack` (reprise après un palier de 10 $), `budget klein-ack`.
- Aucune image Thronebreaker envoyée à FLUX. Aucun prompt FLUX ne nomme un jeu, un studio, un film, une BD ou un artiste.
- Un prompt refusé par la modération est **facturé quand même**. Une boucle de corde a été lue comme de l'automutilation. Éviter pendu, à la taille, écorché : décrire ce qu'on voit.

## 1. Ajouter ou changer un bâtiment

Un bâtiment = un `code` (les 21 de `buildingCodes`, `db/schema.ts`). Un code neuf demande d'abord une entrée dans `buildingCodes`, dans `constants/isoSpec.json` (`batiments`) et dans `constants/isoLayout.json`. La suite ne change pas.

| Étape | Commande | Ce que ça écrit |
|---|---|---|
| Idées | À la main (texte), puis un coup d'oeil de mara (art) et theo (plaisir). | `docs/designs/village-buildings/<code>/` |
| Concepts | `python3 scripts/bld/concepts.py klein <code>` (essais à 1 centime), ou `direct`, `f3`. Options : `--dirs`, `--stages rough,grand,mythic`, `--try N`. | `<code>/concepts/*.png` (ignoré par git) |
| Choix | `python3 scripts/bld/concepts.py pick <code> ...` puis `board <code>` pour la planche. Guillaume choisit lui-même sur une page. | `scripts/bld/concepts/<code>.json` |
| Spec de peinture | À la main : `scripts/bld/final/<code>.json`. Format dans `docs/designs/village-buildings/BRIEF-final.md` (stades, teasers, gag, ancres). | le JSON |
| Emprise | `python3 scripts/bld/final.py emprise <code>` | `<code>/emprise.png`, le losange au sol |
| Peinture finale | `flock ~/.cache/bati-flux.lock timeout 590 python3 scripts/bld/final.py paint <code> <stade> [--variants 2] [--try N]` | `final/<stade>_t<N>_v<i>.png`. Ordre : rough, grand, solid, legendary, mythic. Choisir chaque stade avant de peindre le suivant. |
| Choisir une variante | `python3 scripts/bld/final.py pick <code> <stade> <N> [--try N] [--allow-green]` | `final/<stade>.png` (magenta clé) et `measures.json` |
| Éléments | `flock ~/.cache/bati-flux.lock timeout 590 python3 scripts/bld/final.py elements <code>` | `final/elements/<nom>.raw.png` puis `<nom>.png` : teasers et gags, un sujet par image |
| Reclé sans FLUX | `final.py rekey <code>` (éléments depuis leurs `.raw.png`), `final.py repick <code>` (reposer les stades sur l'emprise) | 0 $ |
| Bande des stades | `final.py strip <code>` | `final/strip.png` |
| Sol propre | `python3 scripts/bld/sans_losange.py dry [codes]` (table, n'écrit rien) puis `apply <code> [stade...]` | voir plus bas |
| Intégration | `python3 -I scripts/bld/integrate.py <code> [--src DIR]` | voir plus bas |
| Vérifier | voir « Contrôles » |

`final.py` ne repeint jamais par-dessus : un fichier qui existe fait refuser l'appel (`exists, pass --try`). Pour une autre prise, passer `--try N+1`.

### Deux pièges

1. **`final.py elements` refuse dès qu'un seul `.raw.png` existe** (`concepts.free` teste tous les travaux). Il n'a pas d'option pour un seul élément. Un élément manquant demande donc un appel à part : pas d'option, écrire un petit appel à `C.run` pour ce seul sujet, ou mettre de côté les `.raw.png` déjà bons le temps de l'appel. Vérifier le prix avant : chaque élément vaut 0,10 $.
2. **La modération FLUX facture un prompt refusé.** Relire le prompt avant de lancer.

### sans_losange.py : le masque

Retire la plaque grise (le losange d'emprise que FLUX a recopié) autour du sol, par masque, sans FLUX, 0 $. Rejouable : un second passage repart de la sauvegarde.

- `dry [codes...]` : tableau de la part retirée par stade, planches dans `docs/designs/village/clean/scratch/losange` (ignoré par git). N'écrit rien dans `final/`.
- `apply <code> [stade...]` : tous les stades sans argument. Réécrit `<stade>.png`. Sauvegardes, jamais écrasées :
  - `<stade>.avant-losange.png` : le stade avant le masque ;
  - `<stade>.edit.png` : une retouche FLUX locale du bord du sol, posée à côté de la source ; si elle existe, le masque part d'elle (elle prime sur la sauvegarde) ;
  - `<nom>.avant-cle.png` : l'élément avant la clé, dans `elements/`.
- `cle [code/nom ...]` : reclé des éléments (liste `ELEMENTS_CLE` du script sans argument). Écrit `elements/<nom>.png`, sauvegarde `.avant-cle.png`.

### integrate.py

`python3 -I scripts/bld/integrate.py <code> [--src DIR]`. 0 $, rejouable. Par défaut `--src` est `final/` du worktree iso. Écrit :

- `assets/images/village/iso/peints/<code>/<stade>.jour.webp` et `.nuit.webp`, `elements/<nom>.jour.webp` et `.nuit.webp`, et leurs entrées dans `scripts/provenance.json` ;
- `components/village/iso/peints/<code>.ts` (registre, généré, ne pas éditer) ;
- `constants/buildings/<code>.ts` (données). Le bloc entre `hand:begin` et `hand:end` garde les positions que tu as réglées à la main (case du gag, teaser, feu, fumée, magie). Tout le reste est réécrit ;
- les deux lignes de `components/village/iso/peints.ts`, la ligne `<code>: BUILD_LOCAL` de `BLD_PEINTS` dans `constants/isoPoc.ts`, `__tests__/iso-bld-<code>.test.ts` (gardé s'il existe) et l'empreinte des images (`node scripts/iso/empreinte-sprites.js`).

Ensuite : `npx biome check --write` sur les fichiers générés, puis `npx jest iso-bld-<code>`.

**À savoir aujourd'hui** : 47 webp d'éléments sur 171 ne font pas la taille que donnerait leur source (17 de plus de 2 px). On a gardé les webp livrés, car les captures montrent ce que voit le joueur. Le prochain `integrate.py` les régénère depuis les sources : **il faudra relire ces 47 éléments après** (voir `clean/decisions.md`, 03/11).

### Contrôles

- Verrou d'art : `python3 scripts/bld/lock_check.py` (lecture seule ; affiche `LOCK_OK`, ou une ligne `MISMATCH` par fichier et `LOCK_FAILED n`). À lancer avant chaque fusion.
- Python : `python3 -m unittest discover -s scripts/bld -p 'test_*.py'` (7 fichiers `test_*.py`, 6 tests lancés par unittest, 2 s, OK).
- Jest : `iso-bld-<code>`, `iso-bld-positions`, `iso-bld-tap-stade`, `iso-etat-bld`, `iso-mouvement`, `reduced-motion`, `village-copy-*`, `built-locale-keys`. Dans un worktree sous `.claude/worktrees/`, ajouter `--testPathIgnorePatterns=/node_modules/ --coverage=false`.
- Portes scriptées : `python3 scripts/bld/gates.py sil|grow|corner|blind|canary ...` (`gates.py` en tête de fichier dit les arguments).
- Captures d'un bâtiment : `scripts/bld/capture.sh <code> [spec.json]` écrit la liste ; `scripts/iso/loupe_capture.sh <dossier> <spec.json>` la joue, **sur émulateur seulement**.

## 2. La nuit

La nuit n'est pas une seconde peinture : c'est un **grade du jour** (même alpha) plus les lumières rallumées en code (`isoLueur`, #F0A848).

- Bâtiments peints : `integrate.py` appelle `nuit()` de `scripts/iso/famille_jour.py` et écrit `<stade>.nuit.webp` à côté du jour.
- Famille F2 (sprites `assets/images/village/iso/<code>/`) : `python3 -I scripts/iso/famille_jour.py` (`--liste` n'écrit rien, `--regen` refait ensuite la vérité du toucher, les sprites de référence et l'index).
- Alentours : `scripts/iso/nuit_alentours.py`.
- Les couleurs de nuit (voile, `isoLueur`) vivent dans `constants/rawColors.ts`, jamais ailleurs.

## 3. Les drapeaux

Tout est dans `constants/isoPoc.ts`.

| Drapeau | Dev (`__DEV__`) et build `.perf` | Build publié (F-Droid, GitHub, Play) | Jest |
|---|---|---|---|
| `ISO_POC` | oui | non | oui |
| `INTEGRATION` : l'onglet Village dessine la carte iso au lieu de la vieille scène | oui | **non** | non |
| `BATIMENT_MOTEUR` : règle B, marqueurs de rang | oui | non | non |
| `ALENTOURS` (`sol`, `foret`, `decor`, `animaux`) | oui | non | non |
| `BLD_PEINTS[code]` : le bâtiment peint | oui | non | non |
| `MODE_VIE` | `continu` partout | | |

- « Local » = `BUILD_LOCAL` : dev client (hors jest) ou `.perf`, reconnu à l'id d'application `com.guiforge.bati.<suffixe>`. Un build publié est `com.guiforge.bati`, donc faux.
- Un drapeau passe à `true` à la main dans `isoPoc.ts` quand Guillaume a jugé la couche ou le bâtiment. La piste GAME met `INTEGRATION` à `true`. Jusque-là, une version publiée montre la vieille scène 2D (`VillageScene`, `iso = INTEGRATION`).
- La route de dev `bati://dev-iso` (`app/dev-iso.tsx`) ouvre la carte iso : `?bld=<code>&rang=N`, `?peint=sol,foret,decor,animaux` ou `?peint=tout`.
- Mouvement réduit : tout est immobile (`useMouvementReduit`). Les lueurs ne se touchent jamais.

## 4. Ajouter une créature ou un effet de mouvement

C'est le travail de LIFE, **en cours** : ce qui suit décrit l'existant, pas un système fini.

- **Effets sur un bâtiment** : `components/village/iso/motion/<code>.json` + une ligne dans `motion/index.ts`. Quatre genres : `lueur`, `particules`, `vent`, `miroitement` (`motion/types.ts`, `KINDS`). Particules : `fumee`, `vapeur`, `etincelle`, `braise`, `poussiere`, `magie`. Les ancres sont en pixels du canevas, mesurées sur la peinture. Existent aujourd'hui : `forge`, `windmill`, `fountain`. Le dessin est dans `MouvementBld.tsx`. Test : `__tests__/iso-mouvement.test.tsx`. Les particules portent encore un sprite de remplacement.
- **Créatures** : concept seulement. `scripts/life/c1_creatures.py` (Blender, `flatpak run --filesystem=home org.blender.Blender -b --python scripts/life/c1_creatures.py -- [dossier] [noms]`), `c1_flux.py gen|cut|measure` (Klein), `c1_planche.py` (planche de comparaison, sans FLUX). Rien de tout ça n'est encore dans l'app.
- **Moment d'évolution** : `scripts/life/u3_pieces.py gen|cut` (FLUX 3 Image seul) et `u3_films.py all|one` (maquettes). Pièces dans `assets/images/village/iso/pieces/`.
- Suivi : `scripts/life/status.py` régénère `docs/designs/village/life/status.json` depuis `features.json`.
- Règles : pas de personne peinte (les villageois ont leur piste), de petites choses à la fois, jamais une kermesse.

## 5. Où vit chaque outil

| Outil | Commande | Vérifié |
|---|---|---|
| Budget et appels FLUX | `python3 scripts/iso/iso_loop.py budget` | docstring lue, non lancé (appelle BFL) |
| Maquette Blender | `python3 scripts/iso/iso_loop.py blockout <slug>` | docstring lue, non lancé |
| Concepts | `python3 scripts/bld/concepts.py klein\|direct\|pick\|f3\|board <code>` | `argparse` lu |
| Peinture finale | `python3 scripts/bld/final.py <emprise\|paint\|pick\|elements\|rekey\|repick\|strip> <code>` | `--help` lancé |
| Masque du sol | `python3 scripts/bld/sans_losange.py dry\|apply\|cle` | docstring et `__main__` lus |
| Intégration | `python3 -I scripts/bld/integrate.py <code> [--src DIR]` | docstring et `argparse` lus |
| Verrou d'art | `python3 scripts/bld/lock_check.py` | lancé : `LOCK_OK` |
| Tests Python | `python3 -m unittest discover -s scripts/bld -p 'test_*.py'` | lancé : 6 tests, OK |
| Portes | `python3 scripts/bld/gates.py <sil\|grow\|corner\|blind\|canary>` | docstring lue |
| Captures | `scripts/bld/capture.sh <code>`, `scripts/iso/loupe_capture.sh <dossier> <spec>` | en-tête lu, non lancé |
| Nuit et famille F2 | `python3 -I scripts/iso/famille_jour.py [--liste\|--regen]` | docstring lue |
| Mesures et alignement | `scripts/iso/loupe_checks.py`, `ab_pairs.py`, `loupe_crop.py` | non lus ici |
| Commandes lourdes (jest complet, tsc, Gradle) | `scripts/iso/team/heavy.sh <commande>` (2 emplacements) | cité par `CLAUDE.md` |
| Commit d'équipe | `scripts/iso/team/commit.sh` | non lu ici |
| Vie (LIFE) | `scripts/life/*.py` | docstrings lues, non lancées (sauf `status.py`, aucun effet vu) |

## Ce que je n'ai pas pu vérifier

- Aucune commande FLUX n'a été lancée (budget oblige) : `iso_loop.py budget`, `concepts.py`, `final.py paint|elements` sont lus, pas essayés.
- `integrate.py` et `sans_losange.py` n'ont pas été rejoués : ils lisent le worktree iso, et une autre session y travaille.
- La forme exacte de `concepts.py pick` et `board` (arguments positionnels après le code) : seul le `argparse` est lu.
- Le script qui construisait la page « Bâtiments du village iso » est introuvable dans le dépôt (voir `docs/designs/village-buildings/pipeline.md`, section 2).
