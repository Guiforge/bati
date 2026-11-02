# AUDIT-DA-sortie-qa : captures, films et trames lentes (HEAD d344d066)

Statut proposé : jeu refait à l'identique de AUDIT-DA-qa, avec les écarts listés plus bas. Aucun jugement de DA.

Build : `.perf` x86_64 du HEAD d344d066 (worktree `iso`), INTEGRATION = true pour la build seulement, remis à false et relu (`constants/isoPoc.ts` ligne 29, `git diff` vide sur ce fichier). Installé par `install -r` sur `emulator-5554` (bati-bench), données gardées. Écran de cet émulateur : 1080x2400 (AUDIT-DA : 1080x1920 sur bati-bench2). Portrait.

Dossier : `docs/designs/village-iso-v1/evidence/AUDIT-DA-sortie/` (`captures/`, `planches/`, `films/`, `gfxinfo/`). Les 5 films (tous sous 2 Mo, 540 px, 30 i/s) sont aussi dans `~/.cache/bati-art-loop/iso/evidence/AUDIT-DA-sortie/`.

## Fichiers
- `captures/` (webp q90, plein écran) : mêmes noms que AUDIT-DA, 44 fichiers. `portrait-<nuit|jour>-p<1|6|12>-<cadre|zmini|z06|z094|zmaxi>` (30), `portrait-<nuit|jour>-p12-debout-<z06|zmaxi>` (4), `portrait-onglet-vague-0s8|2s3`, `-repos`, `-bulle-iso-maquette-<farm|wizard_tower>`, `-apres-bulles`, `-defile-bas`, `portrait-pret-repos`, `portrait-croissance-3s|7s`.
- `planches/` : `1-sol-et-routes` à `6-interface` (mêmes noms et mêmes vues qu'AUDIT-DA) et `film-film-<vague|glisse|double-toucher|bulle|croissance>-1-par-seconde.jpg`.
- `films/` : `film-vague` (16 s), `film-glisse` (14 s), `film-double-toucher` (10 s), `film-bulle` (10 s), `film-croissance`. Mêmes gestes qu'AUDIT-DA (ouverture à froid de l'onglet ; 9 balayages ; deux doubles taps en (450,650) ; tap sur la tour du mage puis Back).
- `gfxinfo/` : `gfxinfo-vague.txt`, `gfxinfo-glisse.txt`, `meminfo-apres-vague.txt`.

## Trames lentes (émulateur à GPU logiciel, pas le Fairphone)
| Passe | Trames | Janky | Frame deadline missed | p50 / p90 / p95 / p99 |
|---|---|---|---|---|
| Vague (ouverture à froid, 15 s, film en cours) | 421 | 418 (99,29 %) | 418 | 65 / 81 / 81 / 97 ms |
| Glissé (9 balayages, film en cours) | 307 | 307 (100 %) | 307 | 77 / 81 / 81 / 81 ms |

Mémoire après la vague : TOTAL PSS 277 032 kB, Graphics 0 (l'émulateur ne le remplit pas).
Ces chiffres ne se comparent pas à ceux d'AUDIT-DA (p50 26 à 27 ms, 0,3 à 1,8 % de janky) : autre émulateur (5554, 1080x2400, un second émulateur tournait en même temps sur la machine), screenrecord en cours dans les deux passes. Toute trame dépasse 16 ms ici. Aucune conclusion de perf n'est à tirer ; la vraie mesure reste `scripts/iso/perf.sh` sur le Fairphone. Pas de passe témoin, ni pendant croissance ni « tous debout » (comme AUDIT-DA).

## Écarts avec AUDIT-DA
- Écran 2400 px de haut : les planches rognent la zone carte (y 860 à 2330) et sont montées à 640 px de large par vue, au lieu de 760 ; les cadrages de l'app sont les mêmes.
- Croissance : le tap sur le marteau du feu de camp ne marche qu'après « Neuf » (le marteau n'existe pas avant). La croissance est finie avant 3 s : `portrait-croissance-3s` et `-7s` sont identiques (foyer neuf, plus de marteau), et `film-croissance.mp4` ne dure que 3 s (screenrecord n'écrit rien tant que l'écran ne change pas ; l'échafaudage n'est visible que dans les ~0,5 s du film). La planche à 1 image par seconde n'a donc que 3 images.
- `portrait-pret-repos` est pris après une réouverture de PretDemo : la caméra est déjà cadrée serrée (la première ouverture était en vue large).
- Onglet : un seul palier (12). `iso-maquette-druid_grove` et `iso-marcheur-herbalist` sont hors de l'écran dans l'onglet (pas de capture de bulle). Ferme : aucun tap n'ouvre de bulle (`...-bulle-iso-maquette-farm` montre la carte sans bulle). Un tap en (540,60) ne ferme pas la bulle de la tour du mage (`...-apres-bulles`), comme dans AUDIT-DA ; seul Back la ferme.
- Le bouton « Prêt » de dev-iso est maintenant à l'écran (912,228) ; pas de paysage (app verrouillée en portrait, non retenté).
- Scripts de pilotage dans le scratchpad de la session, pas dans le dépôt.
