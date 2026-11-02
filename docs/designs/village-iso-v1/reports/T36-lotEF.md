# T36 lots E et F (artist), FLUX 3, tentative a1

Script : evidence/T36/lotEF.py (copie de lotDG.py : prompt, cap 2 $, étiquette ledger "lotEF"). Image 1 = maquette verte, image 2 = decor_rochers_a (seul décor accepté), fond vert w5g, pas de sol peint, encre épaisse, cel-shading, sans texture, sans violet/bleu clair/rouge vif.
Formes : arbre_a feuillu, arbre_b conifère, arbre_c bouleau (la maquette c a deux houppiers, pas de chêne mort).
Lanterne : seule la vitre est ambre.

Coût : 0,738 $ (6 x 3 candidats, 4,1 crédits chacun), ledger v1 "lotEF". Aucun dépassement.

Audit A (rendu, pas un jugement) :
- arbre_a : 3 PASS
- arbre_b : c0 palette+detail, c1 holes+detail, c2 holes+detail
- arbre_c : c0 holes+palette, c1 holes+palette, c2 palette+light
- tas_bois : c0 palette+light, c1 holes+light, c2 light
- cloture : c0 footprint+palette, c1 residual+footprint+palette, c2 footprint+detail
- lanterne : c0 footprint, c1 footprint+detail, c2 residual+footprint+detail

Planches (candidats, maquette, référence) : evidence/T36/lotE/{arbre_a,arbre_b,arbre_c}_planche.png, lotF/{tas_bois,cloture,lanterne}_planche.png. Candidats et audit dans le cache de la boucle (lotEFa1_c0..2).
Rien écrit dans assets/ ni l'index. Pas de jugement, pas d'accept.

## Tour 2 (a2, après le regard neuf : arbre_a c1 et lanterne c0 acceptés)
Script evidence/T36/lotEF2.py. Un seul changement par pièce : une phrase de correction ajoutée au sujet et image 2 = arbre_a c1 (arbres) ou lanterne c0 (tas_bois, cloture). Coût 0,492 $ ; total lotEF 1,23 $ sur 2 $.
Audit A : arbre_b c0 holes+palette, c1 palette, c2 palette ; arbre_c c0 palette, c1 holes, c2 holes+palette ; tas_bois c0 palette+light, c1 light, c2 palette+light ; cloture c0 footprint+palette, c1 residual+holes+footprint+palette+detail, c2 footprint+palette. Planches : evidence/T36/lotE2/, lotF2/. Pas de jugement.
