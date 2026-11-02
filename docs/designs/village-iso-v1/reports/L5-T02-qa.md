# L5-T02 (qa) : le ciel

Date : 2026-10-29. Arbre non commité (base d1561ad8). Émulateur emulator-5554, `.perf`, base intacte.
Preuves : `docs/designs/village-iso-v1/evidence/L5-T02/` (`build.log`, `repos-brut/recadre.png`, `vague-{04s,1s,3s,6s}-brut.png`, `vague-1s/6s-recadre.png`, `carte12-brut/cadrage.png`, `repos-village-gfx.txt`, `onglet-autre-brut.png`, `onglet-autre-gfx.txt`).

## Méthode
Build `.perf` neuf (BUILD SUCCESSFUL, démons arrêtés), `install -r` Success, `iso-vider-cache`, force-stop. Onglet Village de dev-iso (bouton « Onglet Village », après quoi la vague démarre), recadré sous la barre de débogage. Film `screenrecord` (7,4 s, 1080x2400), images extraites à 1 s et 6 s après le début du film (le tap est lancé avec l'enregistrement : le film commence à moins d'une seconde du tap ; l'image à 0,4 s est encore la transition de mode). Le temps réel de l'écran n'est pas calé à l'image près.

## Ce que je vois
1. **Au repos (20 s)** `repos-recadre.png` : lune en croissant en haut à droite avec un halo bleu froid, une cinquantaine d'étoiles de 3 tailles (petits points clairs, répartis surtout en haut), brume en deux ovales clairs et plats près de la ligne de l'îlot et au bas, bords d'ovale discernables à gauche (« nappe » lisible comme une forme).
2. **Vague** `vague-1s-recadre.png`, `vague-6s-recadre.png` : l'image à 1 s montre quelques étoiles plus pâles ou absentes par rapport à 6 s (comptage des pixels clairs de la zone : 2422 à 1 s, 2445 à 3 s, 2446 à 6 s, soit une différence de l'ordre de 1 %, et 2 400 à 5 100 pixels qui changent entre deux images, donc un mouvement réel mais faible) ; la nappe de brume est décalée vers la gauche à 1 s. Le mouvement existe mais il est discret : à l'œil, la différence se lit à peine entre les deux captures.
3. **Carte seule palier 12** `carte12-cadrage.png` : fond uni noir, sans lune, étoiles ni brume (le ciel n'est que dans l'onglet Village). À signaler si le ciel devait aussi couvrir la Carte seule.

## Les questions
- **Lune et titre** : ne se gênent pas : la lune est en haut à droite, le titre « Isoville » et le blason en bas à gauche, à plus de 600 px. Un seul voisinage : le bas de la lune recouvre la silhouette d'un arbre de la lisière (la pointe du croissant passe devant le tronc), ce qui se lit comme un arbre derrière la lune, sans défaut gênant.
- **Brume** : ne noie pas l'îlot (5 à 7 %) : les bâtiments, chemins et parcelles restent nets ; elle se lit surtout comme un voile clair sous l'îlot et sur le haut du bloc de titre, avec deux ovales aux contours un peu nets.
- **Étoiles** : se lisent ; les plus grandes sont des points francs, les petites sont faibles sur le dégradé foncé mais visibles. Aucune ne tombe sur la lune ou sur un bâtiment.

## Repos et onglet
- Repos : 22 s sans toucher, reset `gfxinfo`, 10 s : `Total frames rendered: 0` (`repos-village-gfx.txt`).
- Autre onglet pendant la vague : tap « Onglet Village », 1,5 s, puis `am start bati://quests` (l'onglet Quêtes s'ouvre, capture `onglet-autre-brut.png`), 3 s, reset `gfxinfo`, 10 s : `Total frames rendered: 0`. Rien ne bouge. Remarque : un retour système (BACK) à la place sortait de l'application vers le lanceur, donc n'était pas un test valide ; je ne l'ai pas retenu.

## Non vérifié
Perf (Guillaume), Fairphone, jour/autres ambiances, la brume pendant une vague complète en continu (comparaison de deux images seulement).
