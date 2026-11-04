# Résumé de la piste CLEAN, session 1

**Tout est fait et fusionné dans `feat/village-iso`.** Il reste trois choix pour toi, aucun ne bloque LIFE. Ton coup d'œil de 5 minutes : [`captures-fin/`](captures-fin/).

## Les 3 décisions pour toi
1. **Les ombres en polygones et le X brun des rues.** Une fois le losange parti, ce sont les bords droits qui restent autour des bâtiments, voir `captures-fin/10-ombre-et-rues-du-code.webp`. Ce n'est pas de la peinture : le code dessine les deux, dans les fichiers de LIFE, donc je n'y ai pas touché. Je recommande d'adoucir ou de retirer les ombres des bâtiments peints, et de revoir le X à bas niveau, dans LIFE ou POLISH.
2. **Les 480 images hors `peints`** qui ne sont pas notées FLUX 3 Image ou Klein : [`modeles.md`](modeles.md). 75 sont en `flux-2-pro-preview` (l'ancienne scène 2D), les autres en FLUX sans version ou sans entrée. Rien n'est repeint. Je recommande de ne pas y toucher avant que INTEGRATION soit allumé : l'ancienne scène partira alors d'elle-même.
3. **Les worktrees et branches gardés**, plus bas : dis-moi lesquels supprimer.

## Ce qui a été fait
- **Le losange :** il ne se lit plus à l'échelle du téléphone, de jour comme de nuit (avis de mara sur les captures en jeu). Masque `scripts/bld/sans_losange.py` sur les 21 bâtiments, sans FLUX. La plaque grise n'existait vraiment que sur l'armurerie. Ailleurs, le défaut était un bord droit, une frange mauve de la découpe, et un contour noir sur le mannequin.
- **5 retouches FLUX 3 Image** là où le masque ne pouvait rien : grand chemin grand, légendaire et mythique, rempart légendaire et mythique. 0 pixel changé hors des zones retouchées.
- **Les 2 images manquantes :** `teaser_r6` du moulin et `gag_1` du puits, en FLUX 3 Image, visibles en jeu. Le prompt du puits était refusé par la modération : la « boucle de corde » se lisait comme de l'automutilation.
- **`gag_2` de l'armurerie repeint,** en plus de ta liste : il se lisait comme un chevalier invisible, trop près de ta règle sur les corps. Les pièces sont maintenant posées sur un tréteau.
- **10 éléments** ont perdu le magenta resté dans leur cadre ou leur ombre (dont `teaser_b8` de la fontaine et `gag_9` de l'observatoire).
- **Modèles :** les 21 bâtiments sont tous en FLUX 3 Image.
- **Ménage :** 137 fichiers retirés, archivés, liste dans [`../archive-index.md`](../archive-index.md). 9 worktrees fusionnés retirés et 114 branches fusionnées supprimées en local.
- **Guides :** [`../README.md`](../README.md) et [`../PIPELINE.md`](../PIPELINE.md). L'ancienne scène 2D reste intacte : INTEGRATION est faux en publié, aucun de ses fichiers n'a bougé.

## Contrôles
| Contrôle | Résultat |
|---|---|
| Suite complète, Node 24.22.2, `e4aba02b` | 557 suites et 7595 tests verts, 1 ignoré de chaque |
| Verrou des loupes | LOCK_OK, 83 fichiers, à chaque étape |
| Coin verrouillé | Hors bâtiments : 0,03 à 0,08 %, sur le `.perf` de `bdbada18`. Outil proche de celui des bâtiments, pas le même. Pas refait sur le dernier build |
| `tsc`, `knip` | Propres, 2 tags déjà présents sur main |
| Build `.perf` final, `e4aba02b` | 106 Mo en x86_64, installé sur `emulator-5554` |

Deux tests dépendaient de l'horloge et sont tombés à minuit (`past-session-sheet`, `iso-dev-screen`). Ils fixent maintenant leur date, assertions inchangées. Le second n'avait jamais été vert un autre jour que celui de sa mesure.

## Ce qui reste visible, sans correction
- **Moulin de nuit :** adouci, il reste un peu de bande pâle sous la base.
- **`archery_range` `gag_8`, `armory` `gag_10`, `windmill` `teaser_r6` :** blanc ou plaque beige mêlés à l'objet, le masque mordait.
- **`fountain` `gag_7` :** un chapeau sur des bottes, proche de l'homme invisible. Choix de goût, 0,05 à 0,10 $ pour le poser à côté.
- **`wizard_tower` `teaser_r4` :** planches sans ombre de contact, signalées par mara, pas traitées.
- **Déjà garés, inchangés :** le carré olive de la place la nuit, le pont du canal (sans doute l'objet cyan de la rive gauche que mara a vu, je n'ai pas vérifié), le terrain en escalier de `archery_range`.

## Ce que je n'ai pas fait
- **Pas de test sur téléphone réel,** comme prévu : émulateur seulement.
- **47 éléments sur 171** ne font pas la taille que donnerait leur source d'aujourd'hui. J'ai gardé ceux qui sont livrés. Le prochain `integrate.py` les régénérera, il faudra les relire : c'est écrit dans `PIPELINE.md`. Je n'ai pas établi lequel des deux est le plus récent.
- **Toutes les captures n'ont pas été vues de près :** mara en a ouvert environ 50 sur 88.
- **Les zones de tap** n'ont pas été vérifiées bloc par bloc, seulement leur compte (1 à 5 % de moins).
- **Le dernier rapport de la troisième passe de masque** ne m'est jamais parvenu : ses tests ont été relancés aux passes suivantes.

## Worktrees et branches gardés
Soldé le 04/11 : archivés puis supprimés, voir la fin de [`decisions.md`](decisions.md). Liste d'origine :
Liste détaillée : [`decisions.md`](decisions.md).
- **Fusionnés mais modifiés (git refuse) :** `audit-copie-fr`, `design-exos`, `wearable`, et `agent-a6d9e6f2e26961458` (le ménage de cette session, commit déjà fusionné, sa branche `clean-menage` reste accrochée).
- **Non fusionnés ou avec travail en cours :** `~/.cache/bati-v03`, `fleet-past-session`, `iso-audit`, `~/.cache/bati-art-loop/iso/p0-wt`.
- **Banc d'essai, fusionnés :** les 2 `~/.cache/bati-bench/src/BUILD-*`.
- **Branches :** 90 branches locales ne sont pas dans iso (dont `main`, `track-life`, `feat/multiplayer-lot0`) : aucune supprimée.

## Dépenses
- **FLUX :** 0,64 $ sur 3 $ (0,12 $ images manquantes dont 0,04 $ de refus, 0,48 $ retouches, 0,04 $ armurerie). Le registre indiquait 1,22 $ réservés en cours de session, pas par moi, je n'y ai pas touché.
- **Sous-agents :** 20 passages sur 150, compte à la main.

## Mes erreurs
- **Première passe trop étroite :** l'agent n'a corrigé que l'armurerie, et le bord pâle a demandé trois passes de plus. Les planches sur aplat ont trompé tout le monde : j'aurais dû faire une capture en jeu plus tôt.
- **Trois boucles d'attente sans fin** (`pgrep -f` qui se trouve lui-même), lancées par un sous-agent. Ma tentative de les tuer a été refusée, l'agent les a arrêtées, elles ne tournent plus.
- **Lien `node_modules` retiré** de `audit-copie-fr` avant que git refuse de supprimer ce worktree : à recréer si tu t'en sers.

**Tip :** `feat/village-iso`. **Archives :** `~/bati-archives/2026-11-04-clean.tgz`, `2026-11-04-clean-scratch.tgz`, `2026-11-03-clean-worktrees.tgz`. L'émulateur est arrêté et l'emplacement 5554 libéré.
