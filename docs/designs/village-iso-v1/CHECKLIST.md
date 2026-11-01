# Checklist village iso V1 (écrite par Guillaume, jamais modifiée par l'équipe)

Un item marqué [B] est bloquant : un seul `fail` et le candidat est refusé.
Le tableau dit quels items juger pour chaque type d'image. Un item qui ne s'applique pas est noté `n/a`, jamais `pass`.

| Type d'image | Items à juger |
| --- | --- |
| Bâtiment (un stade) | 1 à 9, 24 à 26 |
| Bâtiment (série de stades) | 1 à 12, 24 à 26 |
| Ailes du moulin | 3, 5, 6, 9, 22, 23, 24 à 26 |
| Décor (bosquet, rochers) | 1, 3, 4, 5, 6, 8, 9, 24 à 26 |
| Villageois | 3, 5, 6, 20, 21, 24, 25 |
| Style Bati (planche de comparaison de la sonde) | 3, 4, 9, 13, 24 à 26, 29 |
| Ensemble posé sur le sol | 13 à 19, 24 à 26, 29 |
| Écran de démo | 27, 28 |
| Planche de dessins (flamme, eau, bannière) | 3, 5, 6, 24, 30, 31 |
| Villageois (planche de dessins) | 3, 5, 6, 20, 21, 24, 25, 31, 32 |
| Échafaudage | 1 à 6, 24, 25 |
| Village complet en maquettes (lot 1, captures par palier) | 13, 14, 16, 19, 29, 33, 34 |
| Village complet peint (lot 6, captures par palier) | 13 à 19, 29, 33, 34 |
| Écran animé (images tirées d'une vidéo) | 27, 28, 35, 36 |

« Vue réduite » = l'image réduite à 30 % de sa taille, ce qu'on voit au zoom minimum de l'app.
La lumière et les couleurs attendues sont celles des peintures de palier 1 à 7. Les sprites et villageois actuels montrent seulement le trait (encre, cel-shading) : leur liseré lumineux, leurs couleurs d'énergie et leur éclairage sont hors de la DA iso. Jouable comme Clash of Clans, dessiné comme Bati : en cas de doute entre les deux, c'est Bati.

## Chaque sprite de bâtiment ou de décor
1. [B] Vue orthographique isométrique : les arêtes verticales sont verticales, aucune fuite de perspective, même angle que le blockout.
2. [B] Silhouette fidèle au blockout : même toit, même nombre de niveaux, même emprise ; rien ne déborde de l'emprise au sol.
3. [B] Dessin BD franco-belge : contour d'encre noire épais et assuré, aplats en cel-shading, ombres à bord franc ; ni rendu 3D lisse, ni plastique brillant, ni reflets, ni aérographe, ni photoréalisme, ni trame, ni texture plaquée, ni texte.
4. [B] Éclairage de nuit : clair de lune froid d'en haut à gauche (faces gauches bleutées claires, faces droites dans l'ombre obsidienne), et la lumière chaude seulement aux ouvertures (fenêtres et lanterne en ambre pâle, feu en orange). Exception, décidée par Guillaume le 28/10/2026 : le foyer d'une forge et un flambeau peuvent éclairer en orange les surfaces toutes proches (mur et sol du foyer), comme dans une case de BD de nuit.
5. [B] Aucune ombre portée peinte, aucun sol au-delà du socle, aucun halo coloré autour.
6. [B] Détourage propre, jugé sur les recadrages zoomés sur fond clair et sur damier : pas de frange ni de halo de la couleur de fond, pas de trou qui n'existe pas dans le blockout, le contour d'encre est intact.
7. [B] Reconnaissable en vue réduite par son repère, celui que `constants/isoSpec.json` donne pour ce bâtiment (champ `repere`, validé par Guillaume à la porte H0). Par exemple : la forge (enclume et foyer ; la cheminée à partir du stade solid), le moulin (tour et chapeau), la tour de guet (plate-forme haute).
8. Monde pré-industriel : bois, pierre, chaume, tuile, fer forgé ; aucun anachronisme.
9. [B] Même famille de couleurs que les peintures de palier 1 à 7 : nuit froide et désaturée ancrée dans le bleu obsidienne, toits et bois dans leur couleur locale assourdie, aucune couleur saturée de plein jour, aucun violet.

## Les stades d'un même bâtiment (la planche montre tous les stades déjà acceptés)
10. [B] C'est le même bâtiment à chaque stade : on le reconnaît d'un coup d'œil.
11. [B] La croissance se lit : rough plus petit et rudimentaire, solid net, grand plus haut et orné.
12. [B] Même emprise et même ancrage à chaque stade.

## L'ensemble posé sur le sol
13. [B] Chaque bâtiment a l'air posé sur le sol : sa base suit le losange, il ne flotte pas, il ne s'enfonce pas.
14. [B] Échelles cohérentes entre bâtiments, décors et villageois.
15. [B] Même lumière, même épaisseur d'encre, même saturation entre bâtiments et décors. Le villageois en est dispensé pour la lumière (il est éclairé de face, pour que son miroir reste juste), pas pour l'encre.
16. La tour devant le moulin se lit clairement, sans confusion de profondeur.
17. Ça donne envie de taper dessus : un joueur dirait « c'est mon village ».
18. [B] Le sol dessiné par l'app et les sprites vont ensemble : même nuit, même encre, ombres en aplat à bord net, flaques de braise nettes ; pas de collage.
19. [B] Bords de l'îlot nets sur le fond sombre, sans halo.

## Le villageois
20. [B] Lisible en vue réduite : on voit un forgeron (tablier, marteau).
21. [B] Les vues face et dos sont le même personnage, mêmes couleurs.

## Les ailes du moulin
22. [B] Quatre ailes nues et symétriques, peintes à plat face à nous : une rotation de 90° donne la même image.
23. [B] Posées sur le moulin à chaque stade (planche de composition), elles semblent tenir à l'axe.

## La DA de Bati
24. [B] Même dessinateur : posé à côté d'un recadrage de `tier_6.webp` à la même échelle, on dirait la même main, la même encre, le même cel-shading. Pour le villageois, la comparaison se fait avec le trait de `smith_talk.webp`.
25. [B] Ça ne ressemble pas à un jeu mobile en 3D (Clash of Clans, jeux de ville) : pas de volumes lisses et brillants, pas de couleurs bonbon, pas de contour absent.
26. [B] Les seules sources chaudes sont les ouvertures (fenêtres, feu, lanterne), sur une petite part de l'image ; les matières gardent leur couleur locale assourdie par la nuit ; aucun reflet chaud loin d'une source. La lueur d'un foyer ou d'un flambeau sur les surfaces toutes proches est permise (voir item 4). Sans ouverture (rochers, ailes) : `pass` si rien ne luit.

## L'écran de démo
27. [B] La carte suit la recette de l'art de Bati : pleine largeur, sans cadre, texte posé sur l'art et tenu par un dégradé vers le fond, nom du village dans un Récitatif ; titres en serif Alegreya, chiffres en Noto Sans.
28. [B] Braise pour l'action seulement, or pour ce qui est gagné (stade atteint, croissance), stades à venir assombris (jamais repeints) ; aucune ombre d'UI, aucun glow, aucune texture.

## La lumière
29. [B] Une seule lune pour tout : les ombres portées au sol partent du côté opposé aux faces éclairées des sprites et ont la forme du bâtiment ; là où deux ombres se croisent, le ton est exactement celui d'une ombre seule, ni plus foncé, ni éclairci ; aucune ombre ne tombe sur un autre bâtiment ou décor.
30. [B] La planche : tous les dessins montrent la même chose dans le même style, chacun lisible en vue réduite, avec un contour d'encre et aucun halo autour. Pour une flamme : trois tons (orange, jaune, cœur clair).

## Les planches de dessins et les villageois
31. [B] Les dessins s'enchaînent sans saut : même cadrage, même taille, même point d'attache d'un dessin à l'autre.
32. [B] Le villageois garde les mêmes proportions et les mêmes couleurs dans tous ses dessins ; à 8 images par seconde, la marche et le geste de travail se lisent.

## Le village complet
33. [B] Le village se lit : des chemins clairs, des quartiers, rien d'entassé ; chaque bâtiment se reconnaît au zoom 0,6.
34. [B] Le village grandit lisiblement d'un palier à l'autre : l'îlot s'agrandit, les chemins se prolongent, aucun bâtiment ne semble posé au hasard.

## L'écran animé
35. [B] Les mouvements restent discrets et dans la DA : pas d'effet numérique (étirement caoutchouc, flou, glow), pas de rebond hors de la récompense de croissance.
36. [B] Au repos, tout est arrêté sur un état lisible : flamme sur son dessin de repos, ailes immobiles, villageois debout sur une case.
