# Decisions de la piste GAME

- 04/11, worktree `.claude/worktrees/track-game` : le seul endroit ou cette session peut entrer.
- 04/11, slot 5554 (demande par Guillaume), emulateur bati-bench, Metro 8081.
- 04/11, contenu commun aux 3 directions construit avant le choix : il sert quel que soit le choix. Affiché par la prop `surCarte`, pour que la vieille fiche du build publié ne bouge pas.
- 04/11, maquettes rapides en HTML sur une vraie capture, sans FLUX : le choix porte sur l'endroit où vit l'information, pas sur une nouvelle peinture.
- 04/11, `db/completed.ts` et `app/(tabs)/journal/[id].tsx` ajoutés aux fichiers touchés : une lecture seule et le retour vers le village, sans changement pour qui vient du Journal.
- 04/11, réponses de Guillaume : maquettes de la session, C, panneau seul en fin de séance. La page de choix disait « maquettes plus poussées, puis je construis » : les maquettes ne bloquent donc pas, il jugera sur de vraies captures à la fin de la piste.
- 04/11, zoom : le panneau se pose en haut de l'écran si le bâtiment finirait dessous. Ni caméra ni `IsoVillage.tsx` à toucher : la coordination avec LIFE tombe. Si le coin s'avère trop haut, on reviendra à l'appel de caméra.
- 04/11, panneau sans Modal : il reste ouvert sous une fiche poussée, et le retour le retrouve. Le villageois garde sa petite bulle.
- 04/11, paysage et texte au-dessus de 130 % : la feuille existante, pas de 3e mise en page.
- 04/11, reportées, à revoir après les captures : « Evolve all » qui enchaîne et « cette séance a nourri ce bâtiment » (demandes de Theo), grain de papier (Mara, sans FLUX pour l'instant).
- 04/11, `scripts/game/status.py` copie celui de LIFE : son fichier appartient a LIFE, et le tableau de bord garde un seul format.
