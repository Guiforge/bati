# T28-qa : profondeur des villageois

Statut proposé : non conclu (film pris, aucune traversée devant/derrière un bâtiment repérée)
Build : `.perf` du working tree, INTEGRATION allumé pour la build puis remis à false (relu : `false`). `evidence/T28/build.log`, `apk.sha256`.
- Film 17 s, palier 12, zoom 0,6 sur la place, vague lancée par un tap (`~/.cache/bati-art-loop/iso/evidence/T28/t28a.mp4`). Un villageois est visible près du feu et reste debout ; aucun marcheur ne passe devant ou derrière un bâtiment dans ce film. Aucune erreur d'ordre vue, mais rien de probant.
- Bête : non filmée.

## Reste à faire
Plusieurs vagues filmées (ou « Tous debout ») et un repérage des traversées image par image ; le repérage à l'œil sur planche est trop lent, il faudrait la position des marcheurs (sondes).

## Tour 2
Statut proposé : passe (échantillon limité, voir fin)
Build : `.perf` du HEAD `a62c9e1e`, INTEGRATION allumé pour la build puis remis à false et relu (`constants/isoPoc.ts:29`). sha256 `evidence/T28/apk-tour2.sha256`, journal `evidence/T28/build-tour2.log`.
- Films (screenrecord 720x1600, mesuré 28 à 31 i/s) dans `~/.cache/bati-art-loop/iso/evidence/` : `T28-t28-tour2.mp4` (palier 12, zoom 0,6, 4 taps espacés de 20 s, 91 s), `T28-t28c-tour2-tousdebout-06.mp4` (idem avec « Tous debout », 78 s, 2422 images), `T28-t28b-tour2-tousdebout.mp4` (1080x2400, 15 i/s seulement : écarté pour juger des fautes d'image). Scène avant mesure : `evidence/T24/t2-p12-z06.png`.
- Repérage : différence avec une image de référence, blobs de la taille d'un marcheur, chaînage en pistes (`evidence/T28/blobs.py`, `strips.py`), puis planches de recadrages 100x100 pris toutes les 3 images le long de la piste (un défaut de plus de 2 images tombe sur au moins un recadrage).
- Pistes regardées : un villageois gris-vert qui longe l'atelier, passe les poteaux de la tente, le mât de l'étendard et l'abri de bois (`trk14`, 80 recadrages, et `trk03`, 88), et un qui longe la forge en roche puis la palissade de l'armurerie (`trk01`). Aucune image où il est du mauvais côté : derrière un mât ou une façade quand il est plus en arrière, devant quand il est plus en avant, sans à-coup.
- Bêtes : un chat et des souris sont visibles dans les films mais aucun ne longe un bâtiment dans les pistes retenues ; non jugés.
- Limite : sur 19 pistes détectées, 3 lisibles (les autres sont des bords d'écran, des corbeaux, ou trop courtes). Peu de marcheurs longent un bâtiment à ce zoom. Une faute de 3 images ou plus : non vue ; une de 1 à 2 images : non exclue, c'est la tolérance admise.
