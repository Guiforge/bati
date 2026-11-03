# Résumé de la session 2, chantier bâtiments

Session arrêtée le 03/11/2026 : tous les concepts sont peints, plus rien à faire avant tes choix. Aucun bâtiment n'est en production, aucun drapeau n'a bougé, rien de neuf dans l'application en dehors du champ `mesure`.

**Pour choisir :** [la page des concepts](https://claude.ai/artifact/HBBzj1ZZ3AC4bGhwk8YgMk). Tes choix s'enregistrent tout seuls, je les relis au démarrage de la suite.

## Les 3 décisions pour toi
1. **Le budget, sinon la production s'arrête après 1 ou 2 bâtiments.** Il reste 6,28 $ au registre sur 75 $. Peindre un bâtiment entier coûte environ 3 à 4 $, d'après les 3,62 $ du moulin, soit 60 à 85 $ pour les 21. C'est une estimation, aucun bâtiment v3 n'a encore été produit. La ligne `BUDGET_FLUX_V1` est la tienne.
2. **Une direction par bâtiment**, ou un mélange, sur la page.
3. **`VillageScene.tsx:514`** fait évoluer seul un bâtiment prêt, sans tap, contre la promesse. Je recommande de passer tout le monde au tap.

## Ce qui a été fait
- **Étape 0 :** prompt v3 installé, base propre, verrou des loupes bon (83 fichiers, avant la fusion de `bld-measured`). Pas revérifié ensuite, aucune fusion depuis.
- **Lecteurs de maquettes :** champ `mesure` optionnel, lu en priorité, ancien art inchangé. Fusionné.
- **Étapes A à C pour les 21 bâtiments :** 3 directions en texte, 4 lecteurs, 2 directions gardées, planche peinte.
- **Relecture d'images :** mara sur toutes les grandes images. 5 reprises sur la première vague, puis 4 sur les 16 autres. Tu as demandé d'arrêter d'itérer : les défauts restants sont signalés sur la page, sans autre reprise.

## Ce qui a changé en route
- **Référence de style retirée :** `high_road/solid.jour` recopiait son portique et son poteau à lanterne dans 5 images sur 30. Il en reste 2, et un bâtiment qui est lui-même une référence ne se reçoit plus.
- **Klein remplacé par FLUX 3 à partir de la vague 2 :** le plafond de sonde `klein_prod_real` (7,50 $) est atteint. Je n'y ai pas touché. Ces planches ont donc 2 variantes par stade au lieu de 4, peintes directement sur FLUX 3. Dis-moi si tu veux monter ce plafond.
- **Alerte du registre à 60 $ acquittée par moi**, dans les 75 $ que tu as autorisés, comme à 50 $ en session 1.
- **Planches peintes avant ta réponse sur le budget :** le prompt le demande. Cela a coûté environ 10 $ et réduit d'autant ce qui reste pour produire.
- **Provenance des concepts :** 183 entrées écrites par erreur dans `scripts/provenance.json`, retirées et rangées à côté des images. Ce registre reste celui des images livrées.

## Limites
- Les variantes ont été choisies par les peintres, pas par un juge. Tu vois toutes les variantes sur la page.
- Trois signes centraux n'ont pas été obtenus : le X de la forge 3 sort en A, le chêne du bosquet 2 n'est pas sur une seule racine, et la spirale de la tour de guet 3 se lit escalier. Le long cou de l'arène 2 reste discret.
- Le fonctionnement de la page n'a pas été testé avec un vrai navigateur : script vérifié, images toutes présentes, stockage relu à vide. Si un choix ne s'enregistre pas, le bouton « Copier mes choix » te sert de secours.
- 1,20 $ restent réservés au registre, sans doute un lot coupé par un délai (le puits), et 0,14 $ de la session 1. Peut-être déjà facturés, peut-être libérables. Je n'ai pas touché au registre : les 6,28 $ en tiennent compte.

## Dépenses
- **FLUX :** 13,24 $ cette session sur un plafond réel de 20,72 $. Registre à 67,38 $ sur 75 $.
- **Sous-agents :** environ 80 passages sur 250, compte estimé à la main.

## Suite complète
**Rouge sur un test :** 529 suites vertes, 1 en échec, 1 ignorée, sous Node 24. Voir [`tests-debt.md`](tests-debt.md). Elle a tourné avant les derniers commits de specs et de planches, qui ne touchent pas au code de l'app.

## Ce qui reste en place
- **Archive :** `~/bati-archives/2026-11-03-session2.tgz` : toutes les variantes et planches des 21 bâtiments, ignorées par git. Rien n'a été supprimé.
- **Émulateur :** pas touché, builds anciens (`56e95e0c`, `bb2d9a82`). À reconstruire avant la première capture.
- **Branches :** `bld-measured` fusionnée, son worktree retiré. La branche `worktree-agent-aa50a09c02bc85629` reste, sans travail propre. Les worktrees de la session 1 listés dans `summary-1.md` n'ont pas bougé.

## Pour reprendre
Lire `state.json`, puis relire les choix dans la collection `picks` de la page. Pour chaque bâtiment choisi, passer à l'étape E, dans l'ordre du prompt, si le budget le permet.
