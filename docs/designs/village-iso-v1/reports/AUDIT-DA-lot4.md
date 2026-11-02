# AUDIT-DA lot 4, la lumière (15, 16, 26)

Quoi
- 16: `lumiere.ts` opaciteLavis 0.5 -> 0.34 (lavis du sol, de l'eau et de la forêt, ombres au prorata): le sol de jour reprend contraste et saturation.
- 15: nuit, `rawColors.ts` : herbes isoPre* plus froides et désaturées, forêt (isoForetLoin/Sol) plus teal grise, eau de nuit (isoEauNuit, Coeur) plus bleue : eau et sol mieux séparés, veil bleu et lueurs chaudes inchangés.
- 26 (revue): plus de vue en plus. `ombreContactDe` (carteDemo.ts) ajoute un polygone d'emprise élargi, poussé à droite, aux ombres portées de `IsoCarte` : même chemin plat du `ClipPath` de `Tuile`, un seul ton, aucun cumul ; absent sous un bâtiment en tas (enTas) ou sans sprite. Test `__tests__/iso-ombre-contact.test.ts`. OmbreSocle (sur le sprite) ne chevauche pas. Rendu tier 12 : 314 -> 455 ms (sol-rendu). Observatoire : mesuré, luminance moyenne 52/255 comme les autres (43 à 63), pas quasi noir ; pas d'éclaircissement (RN n'a pas de mode de fusion sans halo ni image). 23 non touché.

Checks
- `npx jest iso- village-scene`: 623 verts, 57 suites (après revue).
- tsc: sans sortie d'erreur ; biome: propre sur les 3 fichiers.

Limites : à valider à l'œil par qa (nuit et jour, p6 et p12) ; les teintes sont des estimations, pas mesurées sur capture.

Mesure du coût (iso-sol-rendu, palier 12, médiane de 5, deux séries chacune, même charge machine) : avec contact 380 et 377 ms, contact coupé 379 et 385 ms. Le 314 ms du premier relevé était une machine moins chargée ; le contact ne coûte rien de mesurable (21 polygones de 4 points dans un clip déjà là), donc pas de précalcul par île. Test « tas » : `iso-carte-couches` vérifie que le chemin du contact est dans la carte et absent avec masques et chantiers.
