# Progression (à lire en premier par chaque nouvel agent)

Mis à jour par le chef à chaque tâche close. Dernière mise à jour : 30/10, fin de la session qui a fait le lot 5 bis et le début du lot 6.

## Où on en est

- Branche `feat/village-iso-v1`, worktree `.claude/worktrees/iso`. Dernier commit : celui de T20 et du plan en wiki (30/10).
- Fait et commité le 30/10 : reflets regroupés, fenêtres et lueur de porte, animaux qui marchent, corbeaux posés, monde autour de l'île puis monde sans bord, nuit colorée, chantier, coup de marteau (VI-29), rues et damier caché, clairière par palier, 46 sprites peints acceptés (dont 30 au nom de Guillaume), spec de la bulle BD.
- **T20** : fait (tour 2). Carte seule palier 12 à 251 Mo de PSS ; onglet palier 1 à 278 Mo, à remesurer en T06 contre un témoin du même démarrage (la cible de 222 Mo était fausse). Île décollée au-dessus des montagnes vue une fois à la première entrée : à surveiller en qa de T21.
- **T02b** : fait (tour 2), défauts mineurs reportés dans tasks/T03.md.
- **T21** : fait au 4e tour accordé par Guillaume (carte à un seul endroit) ; restent 4 images d'ancienne mise en page à la rotation ; ordre TalkBack reporté en T04.
- **Faites** : T03 (au plafond, une image reportée en T27), T14 (bulle BD), T16 (mode figé, 8 familles au plus à la fois), T23 (vue sans ciel).
- **T22** : routes texturées bonnes ; le ruisseau se lit comme une route goudronnée, tour 3 sur l'eau.
- **T04** : codé et relu, qa à faire (captures 100 et 200 %, TalkBack au doigt).
- **T27** : vitesses faites et relues (film à faire) ; sprites contre images, détails et petits effets de bâtiment à faire.
- **Ajouts du 30/10 par Guillaume** : T23 à T27 (voir DECISIONS et LOG).
- Prochaines tâches : T22 tour 3, qa de T04 et des vitesses, T15, T24, puis T25, T26, la suite de T27, T09.
- Budget d'animation : 43 au repos, 56 au pire sur 64 (après T23) ; 8 familles au plus à la fois.
- **Coût** : lancer chaque agent avec `model: "sonnet"` (les fiches `.claude/agents` disent `inherit`, donc Opus sans ça), sauf iso-tech-auditor ; qa par lots ; un agent neuf plutôt qu'un agent relancé au-delà de deux tours.
- Rien n'a été mesuré sur le Fairphone : la perf est à la toute fin (HF), demande de Guillaume.

## Ce que Guillaume a décidé (les mots exacts sont dans ../LOG.md)

- Autonomie pour finir la V1 ; perf seulement à la fin.
- Direction d'art : BD dark fantasy mais agréable, on doit être fier de son village ; le dernier stade fait « waouh ».
- Vue iso sans ciel (30/10) : plus d'horizon ni de montagnes, le monde couvre tout le cadre (T23).
- Choix visuels : nuit colorée, forêt et mer (les montagnes partent avec le ciel), bannières et or au dernier stade, paysage carte à gauche et infos à droite, grille d'art à mettre à jour (texte dans ../PROPOSITION-GRILLE.md, à coller par lui).
- Pas de nouveau bâtiment : les rôles de la spec vont sur les 21 existants (../PLAN-SPEC-VI.md §4).
- Le monde continue au-delà de l'écran, on peut glisser jusqu'à la forêt ou la mer.
- Navigation aux seuls gestes, carte sur presque tout l'écran, rotation possible sur l'écran du village (T21, avec expo-screen-orientation).
- Retouches d'art après la V1.

## Pièges de cette session (en plus de ../KNOWLEDGE.md)

- `pgrep -f motif` dans une boucle d'attente se trouve lui-même et ne finit jamais : `pgrep -x`.
- La commande `emulator` n'est pas dans le PATH de la session : `~/Android/Sdk/emulator/emulator -avd bati-bench`, détaché.
- Un sous-agent qui « attend sa propre tâche de fond » peut avoir fini : regarder son rapport, puis l'arrêter.
- Le hook de commit refuse un fichier de plus de 1 Mio pour Biome : l'index des maquettes est découpé en `maquettes1..4.ts` (`UPDATE_ISO_MAQUETTES=1 npx jest iso-maquettes`).
- Le pre-commit met de côté les changements non indexés pendant qu'il tourne : ne pas commiter pendant qu'un agent écrit des fichiers suivis.
- Les relecteurs n'ont pas d'outil d'écriture : le chef colle leur verdict dans `../reviews/`.
- Le jest complet sous Node 24 peut faire tomber un test lourd en délai dépassé sous la charge : porter son délai, pas le désactiver.
- Un test qui exige un compte exact de nœuds peut dépendre du jour (graine) : borne, pas égalité.
