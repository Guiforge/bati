# Licence des images FLUX des abords

Vérifié le 01/11/2026, avant toute génération de l'étape 0. Je ne suis pas juriste : cette note lit les textes.

## Verdict

**Oui, on peut générer.** Les abords passent par le même outil que les 461 images déjà livrées : `scripts/lib/flux.py`, API directe de BFL (`api.bfl.ai`), modèle `flux-2-pro-preview` (ou `flux-3-image`, les deux seuls que `iso_loop.py guard_endpoint` accepte). Les sorties de l'API relèvent des BFL Developer Terms : le titulaire du compte possède l'image et peut s'en servir à titre commercial. Elles peuvent donc aller dans l'APK F-Droid (assets sous CC BY-SA 4.0, ni NC ni ND, pas d'anti-feature `NonFreeAssets`) et dans l'app Play payante.

Rien de neuf par rapport à `docs/designs/village-iso-v1/research/klein-licence.md` (28/10), qui fait l'analyse complète. Cette note la reconfirme et ajoute Google Play.

## Ce qui a été vérifié

| Point | Résultat | Source |
| --- | --- | --- |
| Modèle et voie | `flux-2-pro-preview` par défaut (`flux.py` l. 41), `FLUX_ENDPOINT` non défini, fournisseur « Black Forest Labs (direct API) » | `scripts/lib/flux.py`, `scripts/iso/iso_loop.py` `guard_endpoint` |
| Propriété | « you own all right, title, and interest in and to Output » (§3.b) ; BFL ne revendique rien (§4.b) | EU Developer Terms, révisés le 26/08/2026, relus le 01/11 |
| Usage commercial | « may use Outputs for your or their own personal or commercial purposes » (§4.b) | idem |
| Aide BFL | « All images generated through the BFL API include full commercial usage rights » | help.bfl.ai, voir la note klein |
| F-Droid | l'art doit avoir une licence valide qui permet la redistribution ; rien sur l'IA | Inclusion Policy, Anti-Features |
| Google Play | la politique sur le contenu généré par IA « is not intended to cover » les « Apps that merely host AI-generated content and are unable to create content using AI ». Bati livre des images figées : hors champ. | support.google.com/googleplay/android-developer/answer/14094294 |
| Dépôt | `LICENSE` dit déjà « generated with FLUX.2 and FLUX 3 Image Klein by Black Forest Labs » ; `scripts/provenance.json` porte la chaîne de licence §3.b pour chaque image | `LICENSE`, `scripts/provenance.json` |

## FLUX 3 Image et FLUX 3 Image Klein (ajout du 01/11, boucle 2)

Les abords passent à **`flux-3-image`** depuis la boucle 2 de l'étape 0 (demande de Guillaume).

| Modèle | Voie chez nous | Sorties | Poids |
| --- | --- | --- | --- |
| FLUX 3 Image (`api.bfl.ai/v1/flux-3-image`) | API directe, via `iso_loop.py` (variante `f3`, `guard_endpoint` l'accepte) | Developer Terms, comme FLUX.2 : propriété §3.b, usage commercial §4.b. Les termes parlent des « FLUX AI Models » sans nommer de modèle, donc FLUX 3 compris. | Pas de poids ouverts ; la page du modèle parle d'une licence commerciale de poids pour l'auto-hébergement, qui ne nous concerne pas. |
| FLUX 3 Image Klein (`api.bfl.ai/v1/flux-3-image-klein`) | API directe, réservé aux lots de la boucle (pas utilisé ici) | Mêmes Developer Terms par l'API. | Poids ouverts sous FLUX Kommunity License (non commercial, ou commercial sous 5 M$ de revenu). La page dit « Running Klein in a product requires a commercial license » : ça vise qui fait tourner les poids, pas l'API. Analyse complète : `klein-licence.md`. |

Ce que disent les pages du 01/11 :
- bfl.ai/models/flux-3-image : jusqu'à 10 références, 2K et 4K natifs, mise en page par boîtes. Ni prix ni clause sur les sorties sur la page.
- bfl.ai/models/flux-3-image-klein : 5,6 G paramètres, génération, retouche et multi-référence dans les mêmes poids, licence des poids sur Hugging Face.
- bfl.ai/pricing : calculateur à 0,048 $ l'image, sans dire quel modèle. Mesuré chez nous : 0,048 $ par image FLUX 3 Image en 1K avec 1 référence (registre, 01/11), 0,041 $ sur les lots f3 de T41.
- help.bfl.ai (commercial use) : « All images generated through the BFL API include full commercial usage rights. » La page date d'environ 4 mois et ne nomme pas FLUX 3.

**Verdict FLUX 3 Image : clair, on l'utilise.** Aucun texte BFL ne nomme FLUX 3 Image dans une clause de sortie, mais les Developer Terms couvrent tous les « FLUX AI Models » de l'API, et 86 sprites `flux-3-image` sont déjà livrés sous la même chaîne de licence (`scripts/provenance.json`). Limite : FLUX 3 Image ne prend pas de graine, donc la provenance garde le prompt et les références mais ne permet pas de rejouer l'image.

## Conditions à tenir (communes à tout l'art FLUX)

- Ne jamais dire qu'une image est faite main (§6.i).
- Ne pas se servir des sorties pour entraîner un autre modèle (§6.c).
- Content Credentials (C2PA, §6.i) : le détourage et le `cwebp` cassent le manifeste. Question ouverte depuis le 28/10, la même pour tout l'art livré. `flux.py` garde chaque original signé dans le dossier `ORIGINALS`, hors APK : c'est la piste de la note klein. À trancher par Guillaume une fois pour tout le projet, pas ici.
- Aucune image de Thronebreaker envoyée à FLUX ni dans le dépôt.

## Sources

- BFL, EU Developer Terms of Service : https://bfl.ai/legal/eu-developer-terms-of-service
- BFL, Developer Terms of Service : https://bfl.ai/legal/developer-terms-of-service
- BFL Help, commercial use : https://help.bfl.ai/articles/4375863104-can-i-use-the-api-for-a-commercial-application
- Google Play, AI-Generated Content policy : https://support.google.com/googleplay/android-developer/answer/14094294
- F-Droid, Inclusion Policy : https://f-droid.org/docs/Inclusion_Policy/
- F-Droid, Anti-Features : https://f-droid.org/docs/Anti-Features/
- BFL, FLUX 3 Image : https://bfl.ai/models/flux-3-image
- BFL, FLUX 3 Image Klein : https://bfl.ai/models/flux-3-image-klein
- BFL, Pricing : https://bfl.ai/pricing
- Analyse complète : `docs/designs/village-iso-v1/research/klein-licence.md`
