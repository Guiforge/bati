# Critères GO / NO-GO du POC village iso (écrits par Guillaume avant le lancement, jamais modifiés par l'agent)

Le verdict de l'agent se lit uniquement contre ce tableau. Un critère non mesuré compte comme non rempli.

**Les 9 slugs du cœur** : `forge_rough`, `forge_solid`, `forge_grand`, `windmill_rough`, `windmill_solid`, `windmill_grand`, `windmill_sails`, `watchtower_rough`, `watchtower_solid`. Les décors et le forgeron peints sont des bonus : ils ne comptent dans aucun critère.

| # | Critère | Seuil GO | Comment c'est mesuré |
| --- | --- | --- | --- |
| 1 | La DA de Bati tient | La planche « Style Bati » de la sonde passe, ou Guillaume la valide à l'œil à la pause G1 (décision notée dans STATE.md et dans le rapport, avec le verdict du regard neuf qu'elle remplace) ; les 9 slugs du cœur sont acceptés (items DA applicables compris), et la revue (C) finale passe ses items [B] : type « Ensemble posé sur le sol » 13, 14, 15, 18, 19, 24 à 26, 29 ; type « Écran de démo » 27, 28 (le sol a droit à 2 tours de retouche au plus) | `STATE.md`, verdicts du regard neuf |
| 2 | La méthode est rentable | Au moins 7 des 9 slugs du cœur acceptés en 2 tentatives ou moins (un slug accepté via le triptyque compte avec les tentatives du triptyque) | `LOG.md` |
| 3 | Le coût passe à l'échelle | Coût réel par slug du cœur accepté ≤ 0,60 $, sonde exclue (repère : 0,73 € par portrait réussi pour les animaux V-02) | somme des champs `cost` de BFL, 1 crédit = 0,01 $ |
| 4 | Le tap est juste | 100 % de justes sur au moins 2 000 points tirés au hasard, hors d'une bande de 8 px autour des bords de sprites, contre une vérité calculée en pleine résolution par Python ; le taux dans la bande est rapporté à part. Plus le cas fixe : le toit de la tour au-dessus d'une case du moulin donne la tour | Jest + script Python + Maestro |
| 5 | Le pan est fluide | Janky frames de l'écran iso ≤ celles du Village actuel + 5 points, aux zooms 0,6 et 1,0, à chacune des 3 passes, mesures de la phase 4 | `dumpsys gfxinfo`, build `.perf`, émulateur |
| 6 | Le village se repose | Après la fin des animations : 0 image en 10 s, et `uiautomator dump` répond en moins de 3 s | `dumpsys gfxinfo`, `uiautomator dump` |
| 7 | La mémoire tient | PSS de l'écran iso ≤ PSS du Village actuel + 60 Mo, même protocole (lancement normal, puis écran ouvert à chaud) | `dumpsys meminfo` |
| 8 | C'est Bati, et ça donne envie | Guillaume regarde la vidéo et la planche « village iso à côté de `tier_3` et `tier_6` », et dit : « c'est la DA de Bati, et ça se joue comme un Clash » | humain, après le rapport |

Verdict possible : **GO** (1 à 8 remplis), **GO provisoire** (1 à 7 remplis, en attente de la mesure sur le Fairphone avec `scripts/iso/perf.sh` et du critère 8), **NO-GO** (un critère de 1 à 4 non rempli), **à creuser** (les autres cas, avec la cause).

Note du 28/10/2026 : à la pause G1 de la sonde v5, Guillaume a validé la DA à l'œil malgré le refus du regard neuf, qui portait sur la lueur du foyer sur le mur. Le rapport doit le dire tel quel : critère 1 rempli par décision humaine sur la planche « Style Bati ». Les 9 slugs du cœur, eux, restent soumis à (A) et (B).
