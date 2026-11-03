# Résumé de la session 2, chantier bâtiments

**Fin de vague, 03/11/2026.** Les 21 bâtiments sont peints et intégrés derrière leurs drapeaux, éteints en publié. Détail bâtiment par bâtiment : [`summary-vague.md`](summary-vague.md). Tu n'as rien à faire pour que LIFE continue.

**Tip :** `feat/village-iso`, poussé sur origin. **Archive :** `~/bati-archives/2026-11-03-vague.tgz`.

## Les 3 décisions pour toi
1. **Le losange gris sous les bâtiments.** Une plaque claire aux bords droits reste peinte autour du sol, surtout sur la fontaine, le rempart, la ferme et l'armurerie. Elle se voit de près, moins à l'échelle du village. Voir `captures-vague/fin2/reprises/fountain-r1-jour.png`. Je l'ai laissée parce que tu as validé ces images et qu'une reprise en fin de vague aurait touché des dizaines de sprites sans revue. Je recommande de l'enlever, par un masque sans FLUX d'abord. Coût pas estimé.
2. **La caméra reste zoomée après une évolution**, sur tous les bâtiments. Je recommande de revenir à la vue d'avant. C'est à trancher avec LIFE, qui reprend ce moment.
3. **Quand allumer les drapeaux.** Je recommande d'attendre le moment d'évolution de LIFE : aujourd'hui, c'est un carré brun puis des cercles plats.

## Questions garées
- **Carrière et moulin :** dès p06, le bord haut de la carrière couvre le pied du moulin (escalier et porte, vers x715-790, y1045-1070). Les ailes et le corps restent lisibles.
- **Dallage de la place, la nuit :** il reste jaune-olive (p12, x300-725, y1250-1400). Même couleur à la capture précédente, et ce n'est pas un sprite de bâtiment. Je n'ai pas cherché depuis quand.
- **Pont du canal :** `eau/canal_pont`, rendu noir et bleu de maquette avec un bord cyan, le pêcheur posé dessus (x180-252, y1099-1149, p06 à p12). Ancienne pièce, hors de ce chantier.
- **Bottes modernes :** semelles crantées sur fontaine gag_1 et gag_8, dragon_lair gag_4, heroes_hall gag_4. **Pain de mie :** campfire gag_2. Mara les trouve hors style, je n'ai rien repeint.
- **Pont de `high_road` mythique :** droit, validé par toi. Une arche coûterait environ 0,10 $.
- **Voiles roulées du mythique de la tente :** se lisent comme des bûches.
- **Reconnaissance au G-ID :** faible sur les mythiques de l'armurerie, grange, feu de camp, grand chemin, carrière, tente, mannequin et moulin (0 sur 2). Moulin sans ailes dans ce test.
- **Lueurs de la tour du mage au rang 7 :** les deux fenêtres hautes débordent un peu à gauche du fût.
- **Lisibilité à l'échelle :** Theo trouve le village petit à p12 et ne lit pas bien coureur contre callisthénie au palier 4.
- **Plafond Klein :** la sonde reste à 7,50 $, je n'y ai pas touché.

## Ce que j'ai décidé à ta place
- **Alerte FLUX des 100 $ acquittée**, dans les 140 $ que tu as autorisés, comme les précédentes.
- **1,34 $ de réservations libérées** par `budget klein-ack` : ces lots étaient morts, aucun job en cours, vérifié avant. Ton accord portait sur ce cas. Le plafond de sonde n'a pas bougé.
- **7 gags repeints sans te demander** (0,29 $) : ils montraient un corps ou se lisaient comme du sang, contre ta règle. Les 4 armures sont maintenant en pièces posées ou sur un support de bois, et le puits n'a plus de silhouette dans le givre.
- **FLUX 3 Image est le défaut du dépôt**, à ta demande, et le garde refuse FLUX.2.

## Mes erreurs de cette session
- **Un agent sans worktree isolé** a changé la branche du checkout iso et coupé `npm ci`. Arrêté, branche remise, `npm ci` relancé, QA refaite.
- **Une note du feu de camp codée en dur** dans `final.py` a contaminé 5 mythiques : corrigé, repeints.
- **À 17h15, je t'ai dit que la peinture tournait** alors qu'elle était arrêtée depuis 16h27.

---

# Historique : arrêt avant tes choix

Session arrêtée le 03/11/2026 : tous les concepts sont peints, plus rien à faire avant tes choix. Aucun bâtiment n'est en production, aucun drapeau n'a bougé, rien de neuf dans l'application en dehors du champ `mesure`.

**Tip :** `feat/village-iso`, `dcca8a18`, plus le commit de cette ligne, poussé sur origin.

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

## Repeinte du 03/11, après les retours

Page mise à jour au même lien : direction 4 de 19 bâtiments, peinte d'après tes notes, sans audit ni sous-agent. Fontaine et puits inchangés. Notes : [`retours-concepts-1.md`](retours-concepts-1.md).

- **FLUX :** 18,80 $ en tout cette session, registre à 72,95 $ sur 75 $, 0,71 $ restants. Alerte à 70 $ acquittée par moi.
- **Production bloquée** tant que `BUDGET_FLUX_V1` n'est pas relevé.

## Après les choix de Guillaume (03/11)
Rien n'est peint : le plafond est encore à 75 $. Ce qui est fait sans FLUX : ses décisions dans `retours-concepts-2.md`, le tap fusionné, le moulin et le puits réécrits, 19 specs finales. Prochaine étape : `checkpoint.md`, une ligne à ajouter. Puis écrire `final.py`, peindre le moulin et le puits, et lancer la production par vagues.
