# AUDIT-DA-qa : captures, films et trames lentes pour l'audit DA

Statut proposé : jeu livré, avec les trous listés plus bas (paysage, paliers de l'onglet). Aucun jugement de DA ici : c'est le travail du regard neuf.

Build : `.perf` x86_64 du worktree `iso-audit` (HEAD 5ea86807), INTEGRATION = true pour la build seulement, remis à false et relu (`constants/isoPoc.ts` ligne 29). Émulateur `emulator-5556` (bati-bench2), écran 1080x1920 (override déjà posé sur l'appareil), portrait. Install par `install -r -d` (le `.perf` déjà présent avait le versionCode 21302, la build 21301 : downgrade forcé, données gardées, pas de remise à zéro).
Dossier : `docs/designs/village-iso-v1/evidence/AUDIT-DA/` (`captures/`, `planches/`, `films/`, `gfxinfo/`). Films aussi dans `~/.cache/bati-art-loop/iso/evidence/AUDIT-DA/` (tous sous 2 Mo en 540 px de large, 30 i/s, donc aussi dans le dépôt).

## Planches (une par thème, `planches/`)
- `1-sol-et-routes.jpg` : zone carte seule, nuit à gauche, jour à droite. p12 zoom maxi, p6 zoom 0,94, p1 zoom 0,6 et 0,94. Pavés, herbe, plaques, bord de l'île.
- `2-eau.jpg` : p12 et p6, cadre par défaut puis zoom mini, nuit/jour. Le ruisseau du bord gauche de l'île, la fin de l'île, la forêt autour.
- `3-batiments.jpg` : p12 cadre, p12 zoom 0,6, p6 zoom 0,6, p6 cadre, nuit/jour. Bâtiments des paliers 6 et 12, stades.
- `4-villageois-et-betes.jpg` : « Tous debout » p12 zoom 0,6 et maxi (villageois rouge au feu), p1 zoom 0,94 et cadre (3 villageois, feu, tente), nuit/jour. Animations figées (`?fige=1`).
- `5-lumiere-jour-et-nuit.jpg` : mêmes vues jour et nuit : p12 cadre, 0,6, zoom mini, p1 zoom mini.
- `6-interface.jpg` : onglet Village (vague 0,8 s, 2,3 s, repos), bulle de la tour du mage, tap sur la ferme (aucune bulle), écran dev-iso (liste des paliers), PretDemo au repos, croissance à 3 s et 7 s.
- `film-film-<nom>-1-par-seconde.jpg` : 12 images à 1 par seconde de chaque film.

## Captures (`captures/*.webp`, plein écran 1080x1920, webp q90)
`portrait-<nuit|jour>-p<1|6|12>-<cadre|zmini|z06|z094|zmaxi>.webp` (30 fichiers : cadre = après sélection du palier ; zmini = « - » x8 ; z06 = bouton 0,6 ; z094 = 0,6 puis « + » x2 ; zmaxi = « + » x8 de plus), `portrait-<nuit|jour>-p12-debout-<z06|zmaxi>.webp` (« Tous debout »), `portrait-onglet-vague-0s8|2s3`, `portrait-onglet-repos`, `portrait-onglet-bulle-iso-maquette-<farm|wizard_tower>`, `portrait-onglet-apres-bulles`, `portrait-onglet-defile-bas`, `portrait-pret-repos`, `portrait-croissance-3s|7s`, `portrait-nuit-ecran-entier`-type captures de dev-iso (cadre = écran entier, liste des paliers en haut).

## Films (30 i/s, `films/` et cache)
- `film-vague.mp4` : 16 s, ouverture à froid de l'onglet Village (force-stop puis `bati://village`) : écran noir avec logo, carte, corbeaux.
- `film-glisse.mp4` : 14 s, 9 balayages (y 450 à 900) dans la zone carte de l'onglet ; la page défile avec la carte (balayage vertical), c'est ce que montre le film.
- `film-double-toucher.mp4` : 10 s, deux doubles taps à (450,650). Film très léger (1,3 Mo brut) : l'écran ne change presque pas ; voir la planche 1 par seconde avant de conclure sur le zoom.
- `film-bulle.mp4` : 10 s, tap sur la tour du mage, bulle, Back.
- `film-croissance.mp4` : 16 s, dev-iso > Prêt (« Onglet » non), tap sur le marteau du feu de camp : échafaudage à 3 s, foyer neuf à 7 s.

## Trames lentes (`gfxinfo/`, émulateur à GPU logiciel, pas le Fairphone)
| Passe | Trames | Janky | Frame deadline missed | p50 / p90 / p95 / p99 |
|---|---|---|---|---|
| Vague (ouverture à froid, 15 s, film en cours) | 839 | 15 (1,79 %) | 15 | 26 / 30 / 31 / 81 ms |
| Glissé (9 balayages, 14 s) | 636 | 2 (0,31 %) | 2 | 27 / 29 / 31 / 32 ms |
Les « Janky frames (legacy) » (95 à 97 %) ne comptent pas : l'émulateur tient 27 ms par image sous screenrecord, toute trame dépasse 16 ms. Le p99 de 81 ms de la vague tient aux trames de démarrage. Mémoire après la vague : `meminfo-apres-vague.txt`, TOTAL PSS 333 713 kB, Graphics 0 (l'émulateur ne le remplit pas). Pas de passe témoin (onglet actuel), ni pendant croissance ni « tous debout » : hors de cette tâche.

## Trous et remarques de session (à ne pas relire comme des défauts de DA)
- **Paysage impossible** : l'app est verrouillée en portrait (`orientation: portrait`, `requestedOrientation=PORTRAIT`) ; `user_rotation 1` ne la fait pas tourner. Aucune capture paysage.
- **Onglet : un seul palier** (celui du héros, 12). Les paliers 1 et 6 ne sont captés que dans dev-iso (même carte, mêmes sprites, hors onglet).
- **Le bouton « Prêt » de l'en-tête de dev-iso sort de l'écran** (bounds x 1073-1080 sur 1080) : tap en (1076,190) seulement. Écran de dev, relevé en passant.
- **Ferme** : un tap sur la ferme de l'onglet n'ouvre aucune bulle (`portrait-onglet-bulle-iso-maquette-farm`, 430,539) alors que la tour du mage en ouvre une.
- **Bulle** : un tap en (540,60), hors de la bulle, ne la ferme pas (`portrait-onglet-apres-bulles` montre la bulle encore ouverte) ; Back la ferme. À rejouer avec un tap sur la carte avant d'en faire un défaut.
- Villageois et bêtes de dev-iso : figés par `?fige=1`, la marche n'est donc visible que dans les films de l'onglet (peu de personnages à l'écran à zoom du cadre).
- Deux zooms (0,94 et maxi) donnent des vues quasi identiques sur p12 : le zoom maxi est proche de 1.
- Une première série de 4 bulles a fini sur l'écran d'accueil du système (Back en trop) : captures jetées et refaites.
- Scripts de pilotage dans le scratchpad de la session, pas dans le dépôt. `scripts/iso/team/` copié dans `iso-audit` (non suivi) pour que les gardes y trouvent l'émulateur.
