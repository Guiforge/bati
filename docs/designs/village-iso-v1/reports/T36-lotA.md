# T36 lot A : essai de modèles (forgeron, tente grand, chat au repos)

Statut : prêt pour le regard neuf du chef. Aucun jugement de modèle ici. Rien écrit dans `assets/` ni dans l'index des sprites.

## Modèles (vérifiés le 31/10 sur `api.bfl.ai/openapi.json`, docs.bfl.ai pricing, et par le champ `cost`)
| Modèle | Endpoint | Graine | Prix réel par image (champ `cost`) |
| --- | --- | --- | --- |
| FLUX.2 pro (actuel) | `flux-2-pro-preview`, `disable_pup` | oui | 0,060 $ (villageois, 0,56 MP sortie) ; 0,045 $ (chat) ; 0,075 $ (tente, 1,15 MP) |
| FLUX 3 Image | `flux-3-image`, `grounding:false`, `width`/`height` exacts | non (le schéma n'en a pas) | 0,041 $ (768²) ; 0,070 $ (tente 896x1344) |
| FLUX 3 Image Klein | `flux-3-image-klein`, suréchantillonneur serveur non désactivable | oui | 0,008 $ (768²) ; 0,011 $ (tente) |

Les écarts « pro villageois 0,060 » contre « pro chat 0,045 » viennent de la 2e référence (image de l'app, 2 MP en entrée) que le chat n'a pas.

## Méthode
- Même consigne (`PREAMBLE` + sujet + `ISO_STYLE` du POC, fond vert `w5g`), même image 1 (blockout `.green.png`), même image 2 pour forgeron et tente (image de l'app, sur fond blanc ; le chat n'en a pas : aucune image de l'app), mêmes graines pour pro et Klein (base du slug `_w5` + 1000 + i). FLUX 3 n'a pas de graine : ses 3 candidats ne sont pas appariés aux autres. 3 candidats par modèle, une tentative (`lotA<modèle>a1`). Une phrase ajoutée avant `ISO_STYLE` : « Image 2 is the same subject in the app's own artwork: take from it the materials, the colours and the weight of the ink line, and keep the shape, the pose, the angle and the framing of image 1. »
- Sujets : tente = `SUBJECTS["tent"]` + stade grand du POC ; forgeron et chat = textes écrits pour le lot (parties visibles, `FLAT` ajouté), dans `evidence/T36/lotA/lotA.py` ; prompts complets dans le cache (`prompt_<sprite>.txt` du scratchpad).
- Passage par `iso_loop.reserve`/`settle` (0 probe, plafond du lot 2 $ vérifié par le script). Audit (A) gelé inchangé (sha256 `4beebf08…`, `3677fc4e…` vérifiés), clé adaptative mesurée sur chaque original, nettoyage des résidus, découpe par le blockout (équivalent de `recut`, dans `lotA.py`). Les 27 originaux sont à la taille de la toile, aucun redimensionnement.
- Candidats et audits : `~/.cache/bati-art-loop/iso/{tent_grand,pieces/villageois_smith_face,pieces/animal_chat_repos}/lotA<modèle>a1_c{0,1,2}*` (`*_audit_adaptive.json`).

## Coût réel
Forgeron : Klein 0,024 + FLUX 3 0,123 + pro 0,180 = 0,327 $. Tente : 0,033 + 0,210 + 0,225 = 0,468 $. Chat : 0,024 + 0,123 + 0,135 = 0,282 $. **Total du lot : 1,077 $ (plafond 2 $)**. V1 : 8,038 $ (avant 6,961). Aucune alerte de 10 $ franchie ; `klein_stop` non levé (Klein facturé au palier). Le champ `mismatch` du budget est le décalage habituel du solde lu en retard ; contre-vérification `/v1/credits` : le solde se recale au prochain lot.

## Planches (candidats côte à côte, blockout et image de l'app en tête, sur sol de nuit puis fond clair)
- `docs/designs/village-iso-v1/evidence/T36/lotA/smith_planche.png`
- `docs/designs/village-iso-v1/evidence/T36/lotA/tent_planche.png`
- `docs/designs/village-iso-v1/evidence/T36/lotA/cat_planche.png`
Hautes (environ 2100 x 3960) : une lecture seule les réduit de moitié ; 2 lignes par modèle (nuit, clair), lignes pro, FLUX 3, Klein dans cet ordre.

## Audit A par candidat (adaptatif ; échecs listés)
| Sprite | Modèle | c0 | c1 | c2 |
| --- | --- | --- | --- | --- |
| forgeron | pro | holes, silhouette, ink_step, detail, light | holes, silhouette, ink, ink_step, palette, light | holes, silhouette, detail, light |
| forgeron | FLUX 3 | holes, silhouette, ink, ink_step, palette, light | holes, ink, ink_step, palette, light | holes, silhouette, ink, palette, light |
| forgeron | Klein | holes, silhouette, ink, palette, light | holes, silhouette, ink_step, palette, detail, light | holes, silhouette, ink_step, palette, light |
| tente grand | pro | residual, holes, silhouette, footprint | holes, silhouette, footprint | holes, silhouette, footprint |
| tente grand | FLUX 3 | holes | palette | **PASS** |
| tente grand | Klein | holes, silhouette | holes, silhouette, light | silhouette, palette, light |
| chat repos | pro | residual, holes, silhouette, light | holes, silhouette, detail, light | holes, silhouette, light |
| chat repos | FLUX 3 | holes, ink_step, palette, light | holes, silhouette, light | holes, ink_step, palette, light |
| chat repos | Klein | silhouette, ink, palette, detail, light | holes, silhouette, ink, palette, detail, light | holes, ink_step, palette, light |

Seul passage : tente grand FLUX 3 c2.

## Limites à savoir avant le regard neuf
- Les blockouts du forgeron et du chat sont minuscules dans leur toile de 768 px (la figure fait environ 150 px de haut) : la plupart des modèles peignent un personnage beaucoup plus grand, et le recalage plus la découpe par la silhouette du blockout rognent alors le corps (planche forgeron : torse et jambes seuls). Les échecs `silhouette`, `holes` et `light` des villageois et du chat en viennent en bonne partie : ils mesurent autant la maquette que le modèle. Ce n'est pas une mesure de qualité de peinture, à voir sur les originaux si le chef le veut.
- Un seul essai par sprite, 3 candidats : pas de tendance statistique.
- Chat sans image de l'app, donc sans image 2 : sa comparaison est un peu moins appariée que celle de la tente.
