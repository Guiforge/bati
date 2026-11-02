# qa-peinture : ensemble posé sur le sol, village repeint (T36)

Statut proposé : prêt pour revue
Auteur : qa
Tour de revue : 1

## Fait
- `.perf` construite au HEAD (BUILD SUCCESSFUL en 2m21, démons Gradle arrêtés), installée par `emu-adb.sh install -r` : `lastUpdateTime=2026-10-31 15:14:56` (firstInstall 29/10, données gardées, rien désinstallé).
- Captures par dev-iso (`bati://dev-iso?ambiance=jour|nuit`), émulateur 1080x2400. Réglages lus : `wm size`, `animator_duration_scale` (1) ; rien modifié, rien à remettre.

## Preuves (dossier docs/designs/village-iso-v1/evidence/qa-peinture/)
Planches jour (gauche) / nuit (droite), départ en haut, zoom maxi en bas : `planche-palier1.png`, `planche-palier6.png`, `planche-palier12.png` (plus de 2 Mo : fichiers réels dans `~/.cache/bati-art-loop/iso/evidence/qa-peinture/`).
Captures brutes : `p{1,6,12}-{jour,nuit}-{depart,zoommax}.png` ; « tous debout » (stades rough, bâtiments recolorés) : `p{1,6}-{jour,nuit}-tousdebout-{depart,z06,z06b}.png` ; vague en marche (Fête) palier 12 jour : `p12-jour-vague-{1,2,3}.png`.
Le mode « Onglet Village » (village du héros, 10 bâtiments) n'a pas de palier : non capturé, le sélecteur de palier est dans la carte seule.

## Vu de faux à l'œil
- Fenêtres chaudes de jour : salle des héros grand (palier 12, `p12-jour-zoommax`, bas) a ses fenêtres jaune vif en plein jour. Les autres bâtiments ont leurs fenêtres éteintes de jour.
- Sprite qui jure : corbeaux en aplat noir (grands, `p12-jour-zoommax` droite) ; pochoirs noirs (bancs/planches, arbres sombres) autour de l'île (`p1-jour-depart`), la forêt de fond est peinte mais ces silhouettes non ; le dragon_lair rough (blocs gris plats, `p1-nuit-tousdebout-z06` bas) reste le plus « maquette » de l'ensemble.
- Teinte : villageois vert-bleu quasi fantomatique (haut `p6-jour-tousdebout-z06b`) en rupture avec les bruns des autres.
- Taille : les villageois paraissent petits devant la tente et la salle des héros au zoom maxi ; je n'ai pas mesuré.
- Bien vus : armurerie, tente, tour de guet, tour du mage recolorées sans toit rouge criard ; stades rough fontaine et observatoire lisibles ; feux et fenêtres de nuit cohérents.

## Douteux ou non fait
- Les 10 poses de repos et le chat qui dort : non isolés avec certitude sur les captures (petits, mêlés aux habitants) ; je ne les certifie pas. Archery rough et bosquet rough : vus de loin seulement, pas au zoom maxi.
- Villageois flottants : aucun repéré, mais pas inspecté au zoom maxi villageois par villageois.
- Aucune mesure de fluidité (non demandée).
