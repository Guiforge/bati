# T40-peinture : poses de repos des habitants (point 3)

Statut : planches prêtes, non jugées. Auteur : artist.

## Méthode
Script `evidence/T40/peinture.py` (copie de lotDG.py de T36) : FLUX 3 (`flux-3-image`), attempts=1, 3 candidats par pose, une tentative `T40pa1` par pose. Image 1 = maquette `renders/repos/<pose>.green.png`, image 2 = villageois accepté du lot D (`evidence/T36/entree/villageois_<métier>_face.webp`) pour le style : farmer (balaie, dort, range_caisses), smith (tonneau), herbalist (panier, puise), sage (lit, discutent), minstrel (joue_chat), watcher (regarde_loin). Consigne d'encre épaisse, cel-shading, palette assourdie, « pas de reflets métalliques », « tête avec visage, corps entier ». Détourage sur l'alpha du candidat (clip=False), audit A passé. La paire discutent est une seule image, deux personnages face à face.

## Budget
1,23 $ sur 3 $ (10 lots x 0,123 $), par `iso_loop.reserve/settle`, étiquette `T40p`. Aucun lot refait, rien dans assets/ ni l'index.

## Planches
`evidence/T40/peinture/<pose>_planche.png` (maquette, référence, 3 candidats) pour : repos_balaie, repos_assis_tonneau, repos_porte_panier, repos_lit, repos_joue_chat, repos_dort, repos_discutent, repos_range_caisses, repos_puise, repos_regarde_loin. Prompts : `prompt_<pose>.txt`. Candidats et audits : cache `~/.cache/bati-art-loop/iso/.../repos/T40pa1_*`.

## Audit A (aucun candidat PASS)
| Pose | c0 | c1 | c2 |
|---|---|---|---|
| balaie | holes, light | holes, palette, light | holes, light |
| assis_tonneau | holes, light | light | holes, palette, light |
| porte_panier | holes, palette, light | palette, light | light |
| lit | palette, light | light | light |
| joue_chat | holes, palette, light | holes, palette, light | holes, palette, light |
| dort | light | palette, light | palette, light |
| discutent | palette, light | palette, light | light |
| range_caisses | holes, light | holes, light | holes, palette, light |
| puise | holes, light | holes, light | palette, light |
| regarde_loin | palette, light | light | light |

`light` échoue sur les 30 : même chose que pour les villageois du lot D ? Non vérifié ; à trancher par le chef d'équipe (le regard neuf juge, pas moi).

## Constats (sans jugement)
- Les poses donnent des personnages, pas des solides, dans les planches que j'ai ouvertes (dort, joue_chat, discutent) : visages et vêtements peints sur les volumes. Exception visible : `discutent` c0 et c1, volumes de maquette à peine habillés (têtes en abat-jour sans visage) ; c2 est un personnage.
- `dort` : FLUX peint le mur de la maquette (pierre texturée) ; le chapeau de maquette reste en forme d'abat-jour sur les trois candidats.
- `joue_chat` : le chat est peint en fourrure, assez détaillé, hors style cel-shading net.
- Je n'ai pas ouvert les 7 autres planches une à une.

## Prochaine tentative (non lancée)
Un seul changement possible : retirer le mur, la margelle, la clôture de la consigne pour `dort`, `puise`, `regarde_loin`.

## Tour 2 (demande du chef, après regard neuf)
Acceptés au tour 1 : porte_panier c0, lit c1, regarde_loin c1 (pas entrés dans assets). Tour 2 pour dort, balaie, assis_tonneau, joue_chat, discutent, range_caisses, puise : tentative `T40pa2`, script `evidence/T40/peinture2.py`, planches `evidence/T40/peinture2/<pose>_planche.png`. Un changement de méthode : image 2 = lit c1 (regarde_loin c1 pour dort et puise) au lieu du villageois du lot D, et consigne ouverte par la règle d'encre (contour noir épais continu, 2-3 tons plats, ni texture, ni liseré, ni halo, figure entièrement peinte avec visage) ; dort sans mur ; discutent deux personnages habillés de même palette ; range_caisses bois plat. Coût tour 2 : 0,86 $, total 2,09 $ sur 3 $. Non jugé.

## Tour 3 (discutent seul)
Tentative `T40pa3`, `evidence/T40/peinture3.py`, planche `evidence/T40/peinture3/repos_discutent_planche.png`. Un changement : image 2 = balaie c0 (tour 2), visages de BD simples (points, traits), mêmes teintes pour les deux. Audit A : c0 silhouette+palette+light, c1 palette+light, c2 silhouette+light. Coût 0,123 $, total 2,214 $ sur 3 $. Non jugé.

## Les 9 acceptés (PNG détourés, taille 768 x 768 sauf mention, dans le cache)
Dossier : `/home/guiforge/.cache/bati-art-loop/iso/repos/`
- repos_porte_panier/T40pa1_c0.adaptive.cut.png
- repos_lit/T40pa1_c1.adaptive.cut.png
- repos_regarde_loin/T40pa1_c1.adaptive.cut.png
- repos_dort/T40pa2_c1.adaptive.cut.png
- repos_balaie/T40pa2_c0.adaptive.cut.png
- repos_assis_tonneau/T40pa2_c0.adaptive.cut.png
- repos_joue_chat/T40pa2_c1.adaptive.cut.png
- repos_range_caisses/T40pa2_c0.adaptive.cut.png
- repos_puise/T40pa2_c2.adaptive.cut.png
Ancres : `scripts/iso/blockouts/renders/repos/<pose>.anchor.json`. repos_discutent : aucun accepté à ce stade.
