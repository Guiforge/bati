# L5-T03 (qa) : flamme et fumée dessinées par l'app

Date : 2026-10-29. Arbre non commité (base b12ccc45). Émulateur emulator-5554, `.perf`, base intacte.
Preuves : `docs/designs/village-iso-v1/evidence/L5-T03/`. Build `.perf` neuf (`build.log`, BUILD SUCCESSFUL en 1m15, démons arrêtés), `install -r` Success, `iso-vider-cache`, force-stop, réouverture, 22 s.

## Captures
1. Carte seule, palier 12, tout debout (« Tous debout : oui ») : `p12-cadrage.png` (cadrage, forge, camp, arène, repaire, armurerie allumés) ; zoom max : `campfire-zoommax-2x.png` (feu de camp), `forge-zoommax-recadre.png` (forge solid/grand + flamme) et `forge-fumee-2x.png` (cheminée), `repaire-arene-zoommax-recadre.png` (repaire de dragon et brasero du bâtiment voisin), `arene-3x.png` (arène au cadrage).
2. Palier 1 : `p1-cadrage.png`, `p1-feu-de-camp-4x.png` (camp au palier 1, forge au rang rough sur la même capture).
3. Vague : film `screenrecord` (7,7 s) lancé avec le tap « Onglet Village » : `vague-a-brut.png` (1,0 s, transition), `vague-b-brut.png` (1,4 s), `vague-c-brut.png` (1,8 s) et leurs `*-forge-3x.png` ; repos 20 s après : `village-repos-brut.png`, `village-repos-forge-3x.png`.
4. Onglet Village au repos : `village-repos-brut.png`.

## Ce que je vois
- **Flotte ou posée ?** Posée. Sur le feu de camp, la flamme sort du foyer entre les pierres et le trépied, pied dans les braises. Sur la forge, la flamme est assise sur le dessus du foyer en brique (le pied touche les braises peintes) et, sur la forge solid, la lueur au sol se lit sous le foyer. Dans le repaire de dragon et dans l'arène, la flamme se tient sur le brasero. Aucune ne flotte.
- **Taille.** Feu de camp : correcte, légèrement plus petite que l'espace entre les pierres, au bon rapport avec la marmite. Forge : plus haute que le foyer lui-même (environ 1,5 fois sa hauteur), lisible au cadrage comme point chaud ; elle dépasse un peu du foyer vers le haut et déborde sur la parcelle voisine (tir à l'arc) dans la maquette rough, sans gêner. Repaire : grande flamme (près d'1/3 de la hauteur du bâtiment), visible, un peu plus massive que les petites braises peintes. Arène : minuscule (quelques pixels), un seul brasero allumé au cadrage.
- **Fumée.** Très discrète. Au repos on lit un petit nuage pâle de 14 dp environ, à quelques dizaines de dp au-dessus du foyer du camp (décalé à gauche du feu, sans lien visible avec lui), un autre au-dessus de la cheminée de la forge solid (il tombe sur le toit du puits voisin, donc il se lit comme une tache claire sur le toit). Au cadrage la fumée ne se lit pas ; elle n'existe qu'au zoom max. Je n'ai vu aucune volute sur le palier 1 au cadrage (blob pâle près du puits seulement).
- **Trait.** Cohérent avec le sprite peint : encre sombre continue autour de la flamme, aplat orange et cœur clair ; la flamme est plus « graphique » (aplats nets) que les braises peintes (texturées, dégradées), mais le trait d'encre est du même ordre. La fumée est plus pâle et sans trait épais visible à cette échelle.
- **Vague.** Images b et c : flamme de la forge de hauteur légèrement différente d'une image à l'autre (environ 3 % entre 1,4 s et le repos), donc la pulsation est réelle mais très faible à l'œil ; la forme reste identique. À 1,0 s (transition de mode), la flamme n'est pas encore dessinée (7 pixels orange). Après 20 s : flamme allumée à pleine hauteur, immobile (deux mesures séparées ont donné la même hauteur de 18 px).
- **Onglet Village (repos)** : flamme de la forge et du camp présentes sur la carte de l'onglet, sans décalage vis-à-vis des sprites ; cohérence avec la capture de la Carte seule.
- **À signaler** : une volute de fumée se lit sur le mur avant de la forge, près d'une fenêtre, sur `forge-zoommax-recadre.png` (petit nuage clair sur la façade, au-dessus de la porte), loin de la cheminée de pierre. Non expliqué, pourrait être une volute en début de montée ancrée sur un autre point que la cheminée.

## Repos
20 s sans toucher, reset `gfxinfo`, 10 s : `Total frames rendered: 0` (`repos-gfx.txt`).

## Non vérifié
Mouvement réduit, croissance de la forge (fondu sans feu flottant), trame avec 50 nœuds contre 35 (perf gardée par Guillaume), Fairphone, arène et repaire au zoom max depuis le centre (l'arène n'a été vue qu'au cadrage).

# Tour 2

Date : 2026-10-29. Même arbre non commité (base b12ccc45), tour 2 de l'engineer. `.perf` neuf (`evidence/L5-T03/t2/build.log`, BUILD SUCCESSFUL en 1m10, démons arrêtés), `install -r` Success, `iso-vider-cache`, force-stop, réouverture, palier 12, « Tous debout : oui », 22 s. Preuves dans `evidence/L5-T03/t2/`, mêmes noms et cadrages qu'au tour 1 : `p12-cadrage.png`, `campfire-zoommax-2x.png`, `forge-zoommax-recadre.png`, `forge-fumee-2x.png`, `repaire-arene-zoommax-recadre.png`, `arene-3x.png`, `village-repos-brut.png` (et les bruts `zoommax`, `pan1..3`, `p12-debout`). Palier 1, vague et film non refaits (non demandés).

## Ce que je vois, face au tour 1
- **Flamme.** Nettement plus petite et moins « icône » : au tour 1 la forge solid portait une flamme d'environ 1,5 fois la hauteur du foyer, en grand aplat orange saturé à trait épais ; maintenant elle fait environ 0,8 du foyer, orange atténué, trait fin, cœur clair décalé, forme asymétrique, quelques étincelles. Elle se lit comme du feu, plus comme un pictogramme.
- **Posée ?** Oui. Forge : pied sur les braises du foyer sous la hotte, lueur au sol discrète. Camp : dans le cercle de pierres, devant la marmite, pied dans les braises. Repaire : sur le brasero dans la gueule, avec sa lueur au sol. Arène : flamme minuscule sur le brasero du mur de gauche, à peine lisible au cadrage.
- **Fumée.** Elle se lit maintenant au cadrage (`p12-cadrage.png`) : petits nuages pâles au-dessus de la forge/puits, de l'observatoire, de la tente, de la tour d'archers, de la ferme. Au zoom max : nuages gris-bleu nets à trait fin. Défauts : plus clairs que la scène nocturne (taches blanches) ; ceux du camp montent vers la tente, deux nuages détachés sans filet vers le feu ; celle de la cheminée de la forge atterrit sur le toit du puits (`forge-fumee-2x.png`).
- **Volute sur la façade de la forge.** Toujours là (`forge-zoommax-recadre.png`, nuage à gauche près des fenêtres) : c'est la fumée de la cheminée de l'armurerie, placée devant. Elle est plus grosse et plus claire qu'au tour 1 : elle se lit comme un nuage flottant sur la façade, sans cheminée visible. Reste un problème de placement (armurerie/forge), pas de code.
- **Onglet Village (repos).** Flammes de la forge et du camp présentes et posées ; la fumée ne se lit pas à cette échelle.

## Repos
20 s sans toucher, reset `gfxinfo`, 10 s : `Total frames rendered: 0`, `Janky frames: 0` (`t2/repos-gfx.txt`).

## Non vérifié
Mouvement réduit, croissance, vague et palier 1 (non demandés), perf.
