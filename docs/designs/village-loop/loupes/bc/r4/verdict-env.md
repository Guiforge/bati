# BC tour 4 : verdicts (02/11)

**Env : échec sur 2, 8, 9, 16.** PASS sur 1, 3, 4, 5, 6, 7, 11, 14, 17. Non vérifié par lui sur 10, 12, 13, 15. Pour lui, la finition de la ferme et de la route est là ; la lumière et la forêt sud restent sous la cible.

**A/B valide, canari réussi dans les deux contextes.** 6 extraits dorés gagnés sur 6 : route, coin bas, lisière, pieds, champ, porte. Les deux extraits à préserver de nuit (feu, villageois) comptent comme perdus : dans chaque cas, un contexte préfère la baseline et l'autre donne une égalité.

**Lecture du chef sur ces deux extraits** : écart de 14 % sur l'image entière, 0,00 % une fois les villageois masqués (moitié de chaque extrait environ, leurs boîtes sont larges). Les villageois sont placés selon la date, et la baseline a été capturée la veille. Le feu est identique au pixel près, la « lueur plus vive » perçue n'est pas dans l'image. Selon la règle stricte, c'est perdu : à dire à Guillaume tel quel.

Choix du chef : ne pas chercher à gagner ces deux extraits, ni à changer la date de l'émulateur. La cause est connue et rien n'a reculé.

## Tour 5, le dernier

**Peinture locale** : triangle du potager, raccord vertical à gauche, moignon en haut de route, ornières dans le pavé de la porte.

**Code** : clairière nord assombrie (critère 9), charrette sur la route avec ombre ardoise, forêt sud plus aérée avec un bouquet de bouleaux sur le pré, tache sombre retirée du bord de route, lisière sans trio de pins répété, tapis des bouquets moins net.

**Mesures qui manquent** : critère 10 (ombres B > R, B > G), cliquet 12, toucher du 13, KEEP 15, dump-check sur route et coin bas.

## Pour Guillaume au checkpoint

- Règle 3 sur une forêt à 6 masses.
- Ombres peintes des chaumières dans le tampon, face à la liste slop : direction juste, et l'œil n'en souffre pas selon env.
- Sol nord encore ancien : deux finitions dans le même écran.
