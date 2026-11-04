# Idées pour la page Village, 04/11

Trois directions, classées par l'endroit où vit l'information. Les défauts cités sont numérotés comme dans `etat-des-lieux.md`.

## Commun aux trois

- **Exercices** : une lecture du journal dans `detailExtra.ts`, les exercices que ce héros a vraiment faits pour ce bâtiment. Chaque nom ouvre `/exercises/[id]`. Un bâtiment qui suit un autre affiche seulement « Suit la Ferme », avec un lien vers la Ferme, ce qui règle le défaut 4.
- **Séances** : les lignes existantes deviennent des liens vers `/journal/[id]`, le `sessionId` est déjà là.
- **Silhouette** : le sprite du stade suivant, teinté à l'encre avec `tintColor` et décodé petit. Rien au dernier stade.
- **Bâtiment prêt** : on retire « At its ceiling » de cet état, ce qui règle le défaut 3. Le marteau attend aussi longtemps qu'il faut, sans relance.
- **Tiroir** : un tap sur une ligne ferme le tiroir et ouvre le bâtiment sur la carte. Aujourd'hui, `openBuilding` ouvre l'ancienne fiche, ce qui répond au défaut 6.

## A. La bulle courte à trois faces

Tout reste dans la bulle, assez courte pour tenir au-dessus du bâtiment. Sur les captures, elle passe dessous parce qu'elle est trop haute, et c'est ce qui cache le bâtiment. La place libre au-dessus de la rangée du fond est d'environ 200 dp, ce qui fixe la hauteur.

- **Tap sur un bâtiment** : nom, rang et `LevelPips`, barre en reps, silhouette en vignette à droite. En bas, trois mots : Rang, Exercices, Séances. Chaque face a la même hauteur et montre 3 lignes au plus.
- **Évolution** : marteau, « Ready to evolve », silhouette, `AppButton` Evolve. La bulle se ferme, le moment de LIFE se joue sous les yeux du joueur.
- **Vers les exercices et le journal** : un tap sur la face voulue, un tap sur la ligne. Le retour rend la carte, bulle fermée.
- **Fin de séance** : rien ne change. « See your village » amène à la fête, puis aux marteaux.

**Résout** : 1, 2 et 5 pour la plupart des bâtiments.

**Coûte** : moyen. `Bulle.tsx`, `bulle.ts`, `VillageDetailSheet.tsx` (`BuildingFacts`), `detailExtra.ts`, `locales/`, tests. Pas de caméra.

**Pire défaut** : des onglets dans une bulle de BD, c'est de l'interface de bureau posée sur une peinture, et 3 lignes laissent le joueur régulier sur sa faim. Un tap à côté referme tout.

## B. La page du bâtiment

La bulle se réduit à une légende, et l'information part sur une vraie page, dans le style sombre du tiroir et de la forge.

- **Tap sur un bâtiment** : bulle d'une ligne, nom et rang, avec « Voir ». Un second tap ouvre la page : grand sprite actuel et silhouette côte à côte, barre, exercices, séances, le tout sans limite de longueur.
- **Évolution** : Evolve est déjà dans la bulle d'une ligne, et aussi en haut de la page. Depuis la page, il ramène à la carte, où se joue le moment. La vue revient grâce à `memoire`.
- **Vers les exercices et le journal** : des lignes de la page, et le retour rend la page.
- **Fin de séance** : l'écran de victoire peut lister les bâtiments montés, chacun menant à sa page, en plus de « See your village ».

**Résout** : 1, 2 et 5, tous les bâtiments et toutes les tailles de texte. C'est aussi la meilleure porte pour le lecteur d'écran, et le grand sprite donne une belle capture de P1 pour un seul bâtiment.

**Coûte** : moyen à gros. Nouvelle route `app/building/[code].tsx` (hors de la liste `owns`, à y ajouter), `Bulle.tsx`, `VillageDetailSheet.tsx`, `VillageDrawer.tsx`, `detailExtra.ts`, `destinations.ts`, `locales/`, flux Maestro. Pas de caméra.

**Pire défaut** : on quitte le village pour lire sur le village. P2 en souffre, et chaque curiosité coûte deux taps et un écran noir de plus. Le sprite agrandi montrera aussi la limite de résolution de la peinture, à vérifier.

## C. Le panneau qui remplace le titre

Au tap, le titre et le bandeau du bas s'effacent et un panneau de parchemin prend leur place, au-dessus des onglets. Sur la capture `a5`, tous les bâtiments du village sont dans la moitié haute de l'écran à la vue de départ : le panneau ne cache donc rien, sans bouger la caméra. La queue de la bulle s'allonge du panneau jusqu'au bâtiment, avec le même trait d'encre, pour dire de qui on parle.

- **Tap sur un bâtiment** : environ 300 dp de panneau. Nom, rang et `LevelPips`, barre, silhouette à droite. Exercices et séances défilent en dessous, avec un début de ligne coupé qui montre qu'il y a une suite. Un tap sur un autre bâtiment change le contenu sur place : on peut faire le tour du village.
- **Évolution** : Evolve en haut du panneau, sous le pouce. Le panneau descend, le moment se joue en entier sur une carte dégagée, le titre revient.
- **Vers les exercices et le journal** : une ligne du panneau, et au retour le panneau est toujours ouvert sur le même bâtiment.
- **Fin de séance** : la fête se joue, puis le panneau s'ouvre seul sur le premier bâtiment prêt, avec Evolve visible. Le joueur reste seul à toucher le bouton.

**Caméra** : rien en premier. Si le joueur a zoomé et que le bâtiment finit sous le panneau, on réutilise l'appel de la croissance, `camera.vers(vueSur(point, ZOOM_CAPTURE))`, avec un point décalé vers le bas de la carte pour remonter le bâtiment, et `camera.vue()` pour revenir. `vers` n'est pas accessible depuis `VillageScene` : il faudrait une ligne dans `IsoVillage`, à demander à la piste caméra, sur le modèle de `viseur`. Tant qu'elle n'existe pas, le panneau ne rattrape pas ce cas et se ferme au pan, comme la bulle.

**Résout** : 1, 2 et 5, et la capture montre le village et ses chiffres ensemble.

**Coûte** : moyen. `Bulle.tsx`, `bulle.ts` (un mode panneau à la place du placement), `VillageScene.tsx` (masquer le titre, petites props), `VillageDetailSheet.tsx`, `detailExtra.ts`, `locales/`, tests.

**Pire défaut** : un grand aplat clair dans une appli sombre, qui peut écraser la peinture, et une longue queue d'encre qui peut faire bricolé. À juger sur une maquette avant tout. Il remplace aussi la bulle de la spec, donc `village-bulle.md` est à réécrire.

## Recommandation

Je prends C, sans caméra pour commencer, parce que c'est la seule qui garde le bâtiment et toute son histoire à l'écran en même temps, à condition de vérifier d'abord que le cadrage des petits paliers laisse aussi la moitié basse libre.

## Verdicts, 04/11

**Theo (plaisir) : C, puis A, puis B.** Il ouvrirait C pour le plaisir : il voit le bâtiment, lit son histoire, passe au voisin sans fermer. B l'énerverait : deux taps et un écran noir. Il demande aussi : un retour visuel au tap, un bâtiment jamais nourri qui dit quoi faire, un « Evolve all » qui enchaîne au lieu de tout changer en silence, et « cette séance a nourri ce bâtiment » à la fin de la séance. La première image grise de 12 s passe avant la finition selon lui : à mesurer en .perf, c'est du dev.

**Mara (art) : C, puis A, puis B.** Le panneau ne cache rien, de justesse, à la vue de départ. A recouvre encore le coeur du village pour la porte, le marché et la forge. Corrections pour C : plafond de 35 % de l'écran plutôt que 300 dp ; recadrage nécessaire dès que le joueur a zoomé ; pas de longue queue d'encre, plutôt un halo chaud #F0A848 qui respire ; grain de papier et trait d'encre pour ne pas aplatir la peinture. La silhouette en teinte de code tient à 56 ou 72 dp si l'alpha du socle ne fait pas une tache et si l'écart entre stades se voit : actuel en couleur et suivant en ombre, à la même échelle. Sprites à vérifier un par un.
