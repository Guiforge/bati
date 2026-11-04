# Résumé de la session 2, piste GAME, 04/11

Piste arrêtée par Guillaume en cours de contrôle. Tout est fusionné dans `feat/village-iso`. La pointe est celle de `git log` sur `origin/track-game` : son dernier commit porte ce résumé.

## Ce qui marche, joué sur émulateur

- **Panneau C** : le tap ouvre un panneau de parchemin à la place du titre, avec un halo sur le bâtiment. Un voisin change le contenu sur place. Le villageois garde sa petite bulle.
- **Après un zoom** : le panneau passe en haut si le bâtiment finirait dessous. Essayé en déplaçant la carte, pas en pinçant.
- **Liens** : exercices et séances s'ouvrent, un seul Back retrouve le même panneau ouvert.
- **Évolution** : le panneau part, le moment de LIFE se joue, retour à la même vue, plus de marteau. Le changement tient après un redémarrage.
- **Tiroir** : une ligne ferme le tiroir et ouvre le panneau sur la carte.
- **Fin de séance** : le panneau s'ouvre seul 10 s après la fête, une seule fois, et rien n'évolue sans le tap.
- **Accessibilité visuelle** : à 200 % au démarrage, la feuille, rien de coupé. Paysage : la feuille. Mouvement réduit : carte immobile, halo compris, et la phrase « a évolué » est visible.

## Ce qui n'est pas fini

- **G9** : TalkBack n'a jamais été écouté sur appareil, l'ordre de lecture est vérifié dans l'arbre seulement.
- **G10** : le flux de fin de séance est vert sur le code final. Panneau et évolution étaient verts à `4256233c`, mais pas rejoués après `67b2eadc` et `308d28f7`. Le dernier essai a été arrêté à ta demande, et `seed-hero` corrigé n'a jamais tourné.
- **G11** : pas de 2e passage de theo et mara après leurs corrections (voir `verdicts-panneau.md`). **La suite complète et le build de fin n'ont pas tourné.** Seuls `tsc` et les suites touchées l'ont fait.
- **G12** : activer INTEGRATION attend ton go. Remettre alors les 3 flux dans `.maestro/config.yaml`.
- **G13** : les 3 bugs ci-dessous.

## Drapeaux

- **`INTEGRATION`** (`constants/isoPoc.ts`) : éteint en publié, allumé en dev et .perf. Éteint, on garde le vieux village et sa fiche. Vérifié par le code et les tests, pas sur un build publié. Une seule différence possible : le bouton Evolve de la vieille fiche passe avant les longues listes, un changement de LIFE gardé à la fusion.
- Aucun drapeau neuf : ce qui reste est un manque de contrôle, pas un code connu cassé.

## Décisions pour toi

1. **Rythme du rang 2** : un débutant met une dizaine de séances, Theo le veut en 2 ou 3. Cela touche les chiffres figés du héros.
2. **« Cette séance a nourri ce bâtiment »** : Theo y tient avant la sortie. Pas construit.
3. **Le look du panneau** : la dalle plate fait carte Material selon Mara, à revoir avec POLISH (teinte plus chaude, grain à environ 0,15 $). Le go pour G12 vient après.

## Bugs connus

**Signalés à l'arrêt, venus de LIFE, à corriger ici à la fin, sur émulateur. Je ne les ai pas reproduits.**
1. Après le tap, passer le moment ne montre jamais le bâtiment final. Toucher l'écran pendant le moment d'évolution.
2. La Fontaine dit « Ready to evolve » mais n'a de bouton Evolve nulle part. L'ouvrir quand elle est prête.
3. La vieille palissade reste environ 1,4 s à côté du nouveau mur. Faire évoluer le mur et regarder la fin du moment.

**Vus ici :**
4. Changer la taille du texte pendant que l'app tourne ne fait passer en feuille qu'au prochain démarrage. Le panneau reste lisible, il défile.
5. Après une ligne du tiroir, le voile sombre restait visible 4 s. À revoir hors du build de dev.
6. Halo possiblement décalé après un tiroir, si la carte n'a jamais été touchée : `viseur` lit l'origine (0,0) avant le premier tap. Pas observé, repéré à la lecture.
7. La première image de la carte reste longue en dev (plus de 12 s au palier 8). À mesurer en .perf.
8. Le sous-flux `seed-hero` a raté le bouton « 3y » 3 fois. Correctif écrit, pas éprouvé.

**Pour PERF** : chercher l'ancre d'une ouverture sans tap fait environ 1 400 tests de tap d'un coup, et le halo respire en continu tant que le panneau est ouvert.

## État laissé

- **FLUX** : 0 $ sur 3 $. **Agents** : 8 lancés sur 200, plus 5 reprises de l'implémenteur.
- **Héros de dev effacé sur 5554** : les flux font un `pm clear`, et je n'avais plus le droit de toucher l'émulateur pour le remettre. La sauvegarde est dans `scratch/db-orig/`, et `scratch/db.sh restore` la remet. Le dev client devra aussi être reconnecté à Metro.
- `scratch/` n'est ni archivé ni vidé, puisque la piste reprendra.
- Maquettes : https://claude.ai/artifact/QK826RGP7fanTi4wLG4cZL

## Pour reprendre

G13 d'abord, sur émulateur. Puis rejouer `village-panel` et `village-evolve`, puis `scripts/game/village-eos.sh`, TalkBack, theo et mara une fois, la suite complète et le build.
