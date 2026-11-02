# T36 lots D et G : villageois et animaux, FLUX 3

Statut : planches prêtes pour le regard neuf du chef. Aucun jugement ici, rien écrit dans `assets/`, ni dans l'index.

## Fait
- 15 sprites, 3 candidats chacun, une tentative (`lotDGa1`), `flux-3-image` (`width`/`height` = taille de la maquette, 768x768), sans graine (le schéma n'en a pas).
- Image 1 : `renders/peinture/<slug>.green.png`. Image 2 : `assets/images/villagers/<métier>_talk.webp` (D) ; sprite actuel `blockout/pieces/animal_<bête>_repos.webp` (G), agrandi de 142 px à 768 px sur le grand côté car FLUX 3 répond 422 sous son minimum (5 envois à 0 $ avant ce correctif, rien facturé).
- Consigne : préambule, sujet par parties visibles, `FLAT`, encre épaisse continue + cel-shading 2 à 3 tons (`INK`), image 2 (matières et couleurs, palette assourdie sans rouge vif, bleu clair, violet), `ISO_STYLE` inchangé. Prompts : `evidence/T36/lotD|lotG/prompt_<nom>.txt`.
- Détourage : clé adaptative mesurée sur l'original, nettoyage des résidus, audit A gelé avec `clip=False` (alpha du candidat, pas de masque du blockout). Les `silhouette` et `holes` mesurent donc encore l'écart à la maquette, sans la découper.
- Script : `evidence/T36/lotDG.py` (`paint|measure|sheet`). Planches : `evidence/T36/lotD/<métier>_planche.png` (7) et `lotG/<bête>_<pose>_planche.png` (8) : maquette, image 2, 3 candidats sur sol de nuit avec leurs échecs d'audit.

## Coût
FLUX 3 à 0,041 $ l'image : 0,123 $ par sprite, **1,845 $ au total** (plafond 3 $, 1,155 $ restants ; V1 à 13,26 $ en réel, avec les lots B/C de l'autre artiste). Aucun envoi en plus. Pas de tentative 2.

## Audit A (échecs par candidat c0, c1, c2 ; aucun PASS)
| Sprite | c0 | c1 | c2 |
| --- | --- | --- | --- |
| forgeron | holes, silhouette, palette, light | holes, silhouette, light | holes, light |
| guetteur | light | palette, light | detail, light |
| sage | palette, light | palette, light | palette, light |
| champion | light | palette, light | light |
| herboriste | holes, light | holes, light | holes, palette, light |
| ménestrel | holes, silhouette, palette, light | holes, palette, light | holes, palette, light |
| fermier | light | detail, light | light |
| chat dort | detail, light | light | light |
| chat assis | palette, light | detail, light | light |
| chat étiré | detail, light | palette, light | palette, light |
| chat marche | light | detail, light | palette, light |
| poule picore | light | palette, light | holes, light |
| poule marche | detail, light | detail, light | detail, light |
| poule sursaute | palette, light | holes, palette, light | palette, light |
| poule ailes | detail, light | light | light |

`light` échoue partout : à lire sur les planches (lumière gauche/droite des maquettes), pas à corriger à l'aveugle.

## Constats à vérifier au regard neuf
- Forgeron : FLUX 3 recopie très fort l'image 2 (visage, pose de la main) ; le marteau suit la maquette selon les candidats.
- Les originaux sont à la taille de la toile : pas de recadrage fait. Le recadrage à l'échelle de la carte reste à faire avant remplacement (`pxScale`/`anchor` de chaque `anchor.json`).
- Pour D, T26 attend ces silhouettes pour les recolorer : un candidat trop "peinture réaliste" ne convient pas, à trancher au regard neuf.

## Douteux
- Je n'ai pas regardé les 14 autres planches une à une (pas mon rôle) : seule la planche forgeron a été vue pour vérifier le montage.
- Le garde-budget est partagé : ma somme `lotDG` est 1,845 $ ; le solde `/v1/credits` n'a pas été recoupé dans ce lot.

## Suite du 31/10 (consigne du chef)
1. Entrée dans l'app : NON faite, arrêt demandé par la consigne. Les sprites actuels sont `assets/images/village/iso/blockout/pieces/*.webp` (zone de `blender`, hors de mon périmètre), câblés par `maquettes4.ts` (villageois) et `maquettes1.ts` (chat), générés par `UPDATE_ISO_MAQUETTES=1`, avec masque dans le json. Fichiers prêts : `evidence/T36/entree/villageois_<métier>_face.webp` (c0 des 7, 768x768, même hauteur, même ligne de pieds et même centre que la figure actuelle ; l'herboriste est plus large, panier). Un ingénieur doit : les déposer à la place des `_face` actuels, relancer l'index, et décider du `_dos` (absent). Chat : le sprite actuel est une vignette 142x107 (ancre 77,80) et `dort` est une pose nouvelle, pas le repos : taille, ancre et clip demandent du code, à un ingénieur.
2. Tour 2 lot G (7 poses, 3 candidats, `lotDGa2`) : planches dans `evidence/T36/lotG2/`. Image 2 = chat_dort c1 découpé (style seulement). Seul changement de méthode : consigne sans `FLAT`, sans le « socle de pierre » du préambule ni la liste de matières d'`ISO_STYLE` (pierre, chaume, tuile, y compris le texte qui attirait les textures), remplacés par un bloc « fourrure ou plumes plates, contour noir épais, hachures, aucune texture » (décision du chef, `STYLE2` dans `lotDG.py`). Coût total lots D+G : voir budget (1,845 $ + 0,861 $).
