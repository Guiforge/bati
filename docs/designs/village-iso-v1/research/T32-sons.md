# T32 : licences des sons du village (étape 0)

Lu le 2026-10-31. Rien n'a été téléchargé. Aucun asset n'entre dans le dépôt sans la validation de Guillaume.

## Réponse en une phrase

Les 3 sons BigSoundBank sont bien CC0, sans crédit obligatoire et redistribuables ; les 2 pages OpenGameArt (grillons, marteau) n'ont pas pu être lues (HTTP 403), donc leur licence n'est PAS vérifiée, et un remplaçant BigSoundBank vérifié CC0 est proposé pour les grillons.

## Conditions BigSoundBank (page https://bigsoundbank.com/licenses.html, lue le jour même)

- Phrases citées : "Share, copy, distribute and communicate the material by all means and in all formats." / "Adapt, remix, transform and create from material." / "Use, including for commercial purposes." / "Without any restrictions." / "Without asking permission."
- Identité : "Creative Commons CC0 1.0 Universal" (aussi WTFPL et Public Domain Dedication).
- Crédit : non obligatoire. "Nothing is mandatory, but definitely appreciated..." Ligne suggérée : "Additional sounds: Joseph SARDIN - BigSoundBank.com".
- Dépôt public : la page ne dit rien de précis (ni permission ni interdiction). Le "Share, copy, distribute ... all means and in all formats ... Without any restrictions" couvre la redistribution ; pas de condition de pack/revente écrite. Pas d'enregistrement Content ID pour les sons "Free and royalty-free".
- Non vérifié : une preuve écrite en cas de doute (le site propose un certificat signé via compte gratuit).

## Tableau pour validation

| Rôle | Son | Auteur | Licence (phrase sur la page) | Format source, durée | Téléchargement | CC0 réel ? |
|---|---|---|---|---|---|---|
| Fond jour | Countryside, BigSoundBank #0097 | Joseph SARDIN | "CC0 (public domain): Free and royalty-free" | stéréo 48 kHz 16 bit, 1:52 ; WAV 20,9 Mo, MP3 2,6 Mo, OGG 3,1 Mo | Page https://bigsoundbank.com/campagne-s0097.html, bouton Download (URL directe non exposée) | Oui |
| Forge | Anvil 1, BigSoundBank #3589 | Pablo BERGEL | "CC0 (public domain): Free and royalty-free" | mono 48 kHz 24 bit, 0:33 ; WAV 4,6 Mo, OGG 349 Ko, FLAC 1,6 Mo | Page https://bigsoundbank.com/anvil-1-s3589.html | Oui |
| Moulin | Mountain stream #1, BigSoundBank #2754 | Pierre SIBANARCO (bibliothèque de J. Sardin) | "CC0 (public domain): Free and royalty-free" | stéréo 48 kHz 24 bit, 5:22 ; WAV 90,4 Mo, OGG 3,4 Mo ; à découper en 30 s max | Page https://bigsoundbank.com/mountain-stream-1-s2754.html | Oui |
| Fond nuit (fiche) | Crickets ambient noise, OpenGameArt | Wolfgang_ (d'après une recherche, non lu sur la page) | NON LUE, 403. Un résultat de recherche indique CC0, sans valeur de source | ~11 s, bouclable (d'après la recherche) | https://opengameart.org/node/130090 (URL du fichier non lue) | Non vérifié |
| Fond nuit (remplaçant proposé) | Campaign at Night #4, BigSoundBank #1880 | Joseph SARDIN | "CC0 (public domain): Free and royalty-free" | stéréo, 5:00 ; WAV 84,1 Mo, OGG 22 Mo ; "Field crickets, rare frogs" ; à découper en 30 s | https://bigsoundbank.com/campaign-at-night-4-s1880.html | Oui |
| Coup de marteau (T37) | Hammer on Anvil, OpenGameArt (themightyglider) | themightyglider, dérivé d'un enregistrement Freesound de Duasun (d'après la recherche) | NON LUE, 403 ; la chaîne Freesound n'est pas vérifiée | 3 coups courts (recherche) | https://opengameart.org/node/108999 | Non vérifié |
| Coup de marteau (remplaçant proposé) | Un seul coup découpé dans Anvil 1 #3589 | Pablo BERGEL | idem ligne Anvil 1 | 0:33, plusieurs coups | déjà dans la liste, aucun fichier de plus | Oui |

Remarque : le champ OGA "Crickets ambient noise" est préférable si Guillaume le tient pour le plus propre (11 s bouclable), mais il faut qu'il ou le chef lise la licence dans un navigateur avant de l'accepter. Le remplaçant #1880 contient quelques grenouilles ("rare frogs") : à écouter, le fond du village prévoyait « pas de son d'animal ».

## Ce que ça implique pour Bati

- Les liens de téléchargement direct ne sont pas exposés dans le HTML lu ; le script de téléchargement hors app (une fois) devra passer par le formulaire de la page (menu de format, bouton OK). À tester par le chef avec un vrai navigateur ou curl ; je ne l'ai pas fait.
- Les OGG fournis par BigSoundBank (stéréo, jusqu'à 22 Mo) sont des sources : il faut les convertir en mono, découper en 30 s au plus et boucler (étape 1).
- Fichier de crédits à côté des sons : auteur, titre, URL de la page, "CC0 1.0", date de lecture 2026-10-31.

## Limites

- Pages OpenGameArt : 403 sur les deux (node/130090, node/108999, aussi par les URL /content/). Seules des recherches web les décrivent. Licence, auteur, durée et lien de fichier de ces deux sons : non vérifiés.
- URLs directes de téléchargement BigSoundBank : non obtenues.
- Aucune écoute ; boucle sans clic non évaluée.

## Sources

- Countryside #0097 : https://bigsoundbank.com/campagne-s0097.html
- Anvil 1 #3589 : https://bigsoundbank.com/anvil-1-s3589.html
- Mountain stream #1 #2754 : https://bigsoundbank.com/mountain-stream-1-s2754.html
- Campaign at Night #4 #1880 : https://bigsoundbank.com/campaign-at-night-4-s1880.html
- Licences BigSoundBank : https://bigsoundbank.com/licenses.html
- Téléchargement BigSoundBank : https://bigsoundbank.com/articles/download-use-sounds-and-music-f12.html
- OpenGameArt grillons (illisible) : https://opengameart.org/node/130090
- OpenGameArt marteau (illisible) : https://opengameart.org/node/108999
