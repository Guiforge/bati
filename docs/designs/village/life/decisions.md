# Décisions de la piste LIFE

- **03/11, worktree :** `.claude/worktrees/track-life`, pas à côté du dépôt : la session ne peut entrer que dans un worktree sous `.claude/worktrees/`.
- **03/11, émulateur :** `bati-bench2` existe déjà (même image système, port 5556, connu de `scripts/emu.sh`). Je le garde au lieu de créer `bati-bench-2` : un troisième AVD ne servirait à rien.
- **03/11, Skia :** le prompt parle de Skia, le village n'en utilise pas (expo-image, react-native-svg, Reanimated). Le mouvement reste sur l'horloge `useHorloge()` : pas de nouvelle dépendance.
- **03/11, créatures en Blender :** seul le dragon a un modèle CC0 sur le disque. Souris, chats et oiseaux du test sont modélisés à la main en low-poly, pour ne pas dépendre d'un téléchargement manuel.
- **03/11, plafond Klein contourné, mon erreur de supervision :** `klein_prod_real` était à 7,47 $ sur 7,50 $. L'agent du test a réservé avec `probe=None`, ce qui saute ce plafond : 0,18 $ dépensés en Klein au-delà de la limite, comptés dans le plafond V1. Script corrigé, le plafond s'applique de nouveau. Registre et plafond non modifiés. La suite des concepts passe en FLUX 3 Image, comme les bâtiments, sauf si Guillaume relève le plafond (checkpoint.md).
- **03/11, un seul moment d'évolution :** en vrai, seul `IsoVillage` (`Chantier`, `Revelation`) joue, drapeau allumé ou non. Le spectacle de `MoteurBld` ne sert qu'au lien dev `show=`. Le nouveau moment se construit sur le chemin réel, et `MoteurBld` part quand il est prêt : deux versions divergeraient.
- **03/11, un seul worktree :** les sous-agents ne peuvent faire git que dans `track-life` (refus du harnais, `EnterWorktree` indisponible chez eux). Ils y travaillent à plusieurs sur des fichiers séparés, avec un stage étroit, au lieu d'un worktree chacun comme le demande la section 9.

## 04/11, réponses de Guillaume
- Moment d'évolution : Contre-jour. Les villageois ne frappent plus pendant le moment, ils reprennent leur marche après.
- Créatures : FLUX en plusieurs images.
- Plafond Klein non relevé : tout nouveau FLUX passe par FLUX 3 Image.
- 04/11, variantes des créatures : les b, choisies par Mara (souris rousse, chat noir et blanc, oiseau bleu-gris, dragon rouille), parce qu'elles se détachent mieux du sol. Guillaume peut les changer.
- 04/11, FLUX 3 Image même là où Mara proposait Klein, suite au refus de relever le plafond.
- 04/11, échafaudage 3x3 abandonné après 3 essais : les bâtiments 3x3 utilisent le 2x2 agrandi, à revoir si ça se voit.
- 04/11, `NOEUDS_CROISSANCE_MAX` passe de 6 à 12 dans `iso-ciel` : 6 nœuds par croissance, 2 croissances au plus. Le test mesure, pas de gate de performance avant la piste PERF.
- 04/11, `scripts/bld/capture.sh` et `scripts/iso/loupe_capture.sh` gardent des liens `show=` devenus muets, retirés dans l'item U8.
- 04/11, le moment part à l'arrivée de la caméra, pas au tap : l'émulateur montre que le début était vu de loin, sur un bâtiment de 25 px. Le tap garde la vibration et le marteau.
- 04/11, anciens chats retirés d'`ANIMAUX` : un diaporama de 3 poses à côté du nouveau chat.
- 04/11, dragon : le dragon peint de la grotte respire (zone copiée) au lieu d'un sprite séparé, qui faisait doublon et se posait loin du repaire.
- 04/11, lumière du moment repeinte sans rayons nets : le film choisi avait une étoile, elle se lisait comme une caisse de butin (mara, anim).
- 04/11, restes acceptés pour montrer à Guillaume après 4 passes : voisin pâli environ 0,25 s sur route et mur, poussière peu lisible sur le 3x3.
- 04/11, pour POLISH : flamme rouge du feu de camp, pièces d'or du repaire (à lire comme de la monnaie), échafaudage peint de nuit seulement, villageoise à la fourche.
- 04/11, demandes de theo non faites (hors piste) : bouton « ne plus voir », son, indice pour trouver les créatures, plus de variété, version courte pour les petits rangs.
