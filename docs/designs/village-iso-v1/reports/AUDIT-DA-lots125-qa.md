# AUDIT-DA-lots125-qa : captures après les lots 1, 2 et 5

Statut proposé : jeu livré. Aucun jugement de DA ici.

Build : `.perf` x86_64 du working tree de `iso` (INTEGRATION = true pour la build seulement, remis à false et relu : `constants/isoPoc.ts` ligne 29). Émulateur `emulator-5554` (bati-bench), installé par `install -r -d`, données gardées, pas de remise à zéro. Écran forcé en 1080x1920 le temps des prises (comme l'audit d'avant), puis `wm size reset`. Taille de police remise à 1.0 après les prises à 130 %. Démons Gradle arrêtés.

Dossier : `docs/designs/village-iso-v1/evidence/AUDIT-DA/apres-t1/` (2,7 Mo en tout, chaque fichier sous 2 Mo).

## Planches (avant = `evidence/AUDIT-DA/captures/`, après = cette build ; colonnes avant nuit | après nuit | avant jour | après jour)
- `1-sol-et-routes.jpg` : p12 zoom maxi, p6 zoom 0,94, p1 zoom 0,6, p1 zoom 0,94. Zone carte seule, mêmes boutons que l'audit.
- `2-eau.jpg` : p12 et p6, cadre puis zoom mini (ruisseau, bord de l'île, forêt autour).
- `6-interface.jpg` : avant (bulle de la tour du mage de l'audit) | onglet au repos | bulle de la forge à 100 % | bulle de la forge à 130 %. Captures pleines : `bulle-forge-100.webp`, `bulle-forge-130.webp`.
- Film : `film-marche-gros-plan.mp4` (14 s, 30 i/s, 540 px, 200 ko), p12 « Tous debout », zoom maxi, jour, sans `?fige=1`, un tap sur la carte pour lancer la vague ; le villageois rouge marche du feu vers le bas. `film-marche-1-par-seconde.jpg` (12 images à 1 par seconde) et `film-marche-pas-a-pas-30ips.jpg` (12 images consécutives à 30 i/s, recadrées sur le villageois : l'ombre au sol est visible pendant le rebond).

## Différences de protocole avec l'audit d'avant (à ne pas lire comme des défauts)
- **Le héros de cette émulateur n'est pas le même** : palier 1, « Isoville », niveau 2, contre « Metropolis », niveau 34 palier 12 avant. La bulle « chargée » est donc celle de la forge (rang 3, séances listées, défilement dans la bulle), pas celle de la tour du mage (rang 8) ; l'avant et l'après ne montrent pas le même bâtiment ni la même île dans l'onglet. Pour un avant/après strict de l'onglet, il faudrait le même héros.
- Les captures des planches 1 et 2 sont prises avec `?fige=1` (comme avant) ; le film et les bulles de l'onglet sont animés.
- Le recadrage de la planche coupe à y 830 : le haut de la zone carte diffère de quelques pixels entre avant et après (le bandeau de boutons de dev-iso apparaît en bordure sur certaines lignes).
- Film de marche : p1 (3 villageois) n'a montré aucune marche en 14 s (film jeté), d'où p12 « Tous debout ».
- Pas de mesures de trames cette fois (non demandées).
- Scripts de pilotage dans le scratchpad de la session, hors dépôt.
