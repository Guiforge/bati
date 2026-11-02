# L6-T02-qa : monde (L6-T10, L5-T09b) et chantier (L6-T02), émulateur

Build `.perf` neuve de l'arbre au 30/10 14:0x (`evidence/L6-T02/build.log`), `install -r`, « Vider cache images », preuves dans `evidence/L6-T02/`.

## Monde
- Plus d'arbre dans le ciel : OK (onglet Village palier 1 `village-brut.png`, Carte seule palier 12 `carte12-brut.png`). Palier 12 dans l'onglet : non vérifié, l'onglet affiche le palier réel du héros (1).
- Carte seule : montagnes, forêt, mer visibles : OK.
- Canal en vague (`canal-3s-6s-recadre.png`) : reflets pâles sur les dalles, visibles mais discrets. Aucun reflet sur les toits ferme, grange, observatoire (`toits-3s-6s-recadre.png`) : OK. Arène (toit plat) : rien vu.

## Chantier (film dans `~/.cache/bati-art-loop/iso/evidence/L6-T02/chantier1.mp4`, 540x1200, 60 i/s ; `planche-6-images.png`, `gros-plan-ouvriers.png`)
- Séquence : zoom caméra, échafaudage noir autour du site, 3 ouvriers (gris, rouge, gris) à ses pieds, puis fondu et nouveau stade (le feu de camp), échafaudage disparu. Rien ne reste (`apres-brut.png`).
- Cadrage : le chantier se lit (échafaudage net, gros), mais la caméra zoome sur le site ; au cadrage large d'avant il serait minuscule.
- Ouvriers : sur le chemin et l'herbe à côté, ni dans l'eau ni dans le bâtiment. Les coups de marteau ne se distinguent pas sur les planches de 0,4 s.
- Poussière : trois ronds gris translucides au pied, qui se lisent comme des bulles, pas comme de la poussière. À retoucher.
- L'ancien stade n'est pas visible sous l'échafaudage (rien sous les montants) : à confirmer par Guillaume.
- Trames : chantier 312 rendues, 9 janky (2,88 %), 9 `Frame deadline missed` (`chantier1-gfx.txt`). 10 s de repos : 0 (`temoin-repos-avant-gfx.txt`, `apres-croissance-fenetres-gfx.txt`, 14 fenêtres de 10 s, de 22 à 152 s : 0).
- Réserve : trois fenêtres de repos isolées ont montré 131, 603 et 575 trames (`repos-10s-gfx.txt`, 60 i/s plein), sans cause trouvée ; non reproduites en 14 fenêtres après une croissance ni en 13 fenêtres sans croissance (après l'ouverture : 582 et 319 trames à 10 et 20 s, 0 ensuite, c'est la vague d'ouverture).
- Mouvement réduit (`transition_animation_scale 0`, remis à 1 et relu) : pas d'échafaudage, ouvriers ni poussière, le nouveau stade apparaît ; 10 trames (`mouvement-reduit-planche.png`, `mouvement-reduit-gfx.txt`).
- Non fait : 3 passes, passe tous villageois en marche, Fairphone.
