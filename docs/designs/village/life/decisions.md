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
