# Décisions de la piste LIFE

- **03/11, worktree :** `.claude/worktrees/track-life`, pas à côté du dépôt : la session ne peut entrer que dans un worktree sous `.claude/worktrees/`.
- **03/11, émulateur :** `bati-bench2` existe déjà (même image système, port 5556, connu de `scripts/emu.sh`). Je le garde au lieu de créer `bati-bench-2` : un troisième AVD ne servirait à rien.
- **03/11, Skia :** le prompt parle de Skia, le village n'en utilise pas (expo-image, react-native-svg, Reanimated). Le mouvement reste sur l'horloge `useHorloge()` : pas de nouvelle dépendance.
- **03/11, créatures en Blender :** seul le dragon a un modèle CC0 sur le disque. Souris, chats et oiseaux du test sont modélisés à la main en low-poly, pour ne pas dépendre d'un téléchargement manuel.
