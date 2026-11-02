# L5-bis-qa : vérification sur émulateur du lot 5 bis (HEAD d009dc82)

Statut proposé : prêt pour revue (défaut trouvé sur les reflets, vérification partielle)
Auteur : qa
Tour de revue : 1

## Fait
- `.perf` reconstruit (BUILD SUCCESSFUL en 1m20, `evidence/L5-bis/build.log`), démons arrêtés. `install -r` refusé (versionCode 21301 sous 21303 installé) : `install -r -d` a réussi, sans désinstaller ni toucher aux données. Le Fairphone n'a pas été touché.
- `bati://dev-iso` : Carte seule, palier 12, nuit, Tous debout oui, Cadrer (`repos-palier12.png`, preuve de scène). Cache d'images vidé d'abord dans l'onglet Village.

## Preuves (dossier `docs/designs/village-iso-v1/evidence/L5-bis/`)
- Planche de contrôle : `planche-controle.jpg`.
- Reflets : `reflet-toit-ferme.png`, `canal-repos-vague.png`.
- Fenêtres, envol, animal : `envol-zoom06-planche.png`, film 30 i/s `envol-zoom06-30ips.mp4` (128 Ko).
- Images : `vague1-gfx.txt` (vague), `repos-apres-vague-gfx.txt` (10 s après), `mouvement-reduit-gfx.txt`.

## Verdicts
1. Reflets d'eau : **défaut vu**. Rien au repos, des traits clairs pendant la vague (OK), mais trois traits gris passent par-dessus le toit de la ferme (`reflet-toit-ferme.png`, image du milieu), absents au repos et après. Moulin, grange, arène : non regardés à ce niveau. Reflet sous le pont (2-9) : non vu, manque non jugé.
2. Fenêtres et porte : **vu bon avec réserve**. Sur la forge, les fenêtres suivent la pente de la façade et les tailles des fenêtres peintes ; elles s'allument et s'éteignent pendant la vague (orange, un peu plus sombre que le jaune peint). Tout redevient comme au repos après. Le compte de 9 à 12 allumages, la lueur de porte devant un villageois et la lecture « maison qui vit ou guirlande » : non comptés, la carte au cadrage est trop petite.
3. Animaux et corbeaux : sortie d'un animal gris sur l'herbe vue, il marche (planche). Retour, sens du regard et bascule de fin de vague : non vus. Corbeaux : lisibles à zoom 0,6 près de la fumée de la forge ; au cadrage (zoom bas) ce ne sont que des taches noires. Envol (zoom 0,6) : toucher sur le corbeau, il part (v blanc des ailes, vers le haut) en moins de 0,5 s ; le corbeau de la ferme, hors de portée, reste. Un toucher loin ne le fait pas partir ; le retour a lieu au premier toucher loin (vérifié aussi au cadrage). Zoom 1,0 : non testé.
4. Images : vague la plus chargée (onglet Carte, tous debout) : 902 trames, 3 trames lentes, p99 29 ms, au plus 32 ms (2 trames), aucune au-dessus : à comparer au lot 5 : 902 / 0 (les 3 sont des trames lentes de plus qu'au lot 5, mais sous 33 ms ; la capture vidéo tournait en même temps). 10 s après la vague : 0 trame. Mouvement réduit (`transition_animation_scale` 0, relu 0 puis remis à 1) : 0 trame après un toucher à vide.

## Douteux ou non fait
- Pas de passe pendant une croissance (bouton Grandir de l'onglet Village), pas de passe « tous les villageois en marche » séparée, pas de PSS/Graphics (hors des 4 points demandés), pas de témoin de l'onglet Village actuel.
- Les trames lentes comptent le coût de `screenrecord` ; un seul passage, pas 3.
- Onglet Village avec la carte iso : non regardé.
