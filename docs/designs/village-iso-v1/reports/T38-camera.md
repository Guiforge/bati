# T38-camera : tap, île décollée, règle séance/GPS, fondu d'ouverture, cadrage de l'onglet, flow Maestro

Statut proposé : prêt pour revue
Auteur : engineer
Tour de revue : 1

## Fait
1. Tap pendant la vague / première seconde. Reproduit (2 tests rouges). Causes : (a) `useCameraIso` lisait la vue au moment où le tap est résolu (après la fenêtre du double tap), pas au toucher : une caméra encore en mouvement répondait pour un autre point ; la vue est gardée à `onBegin` du tap. (b) `IsoVillage.onTap` : pendant la scène d'ouverture, le tap passait la scène (`passer()`) et ne regardait plus le bâtiment ; il fait maintenant les deux. Fichiers : `useCameraIso.ts`, `IsoVillage.tsx`.
2. Île décollée. Non reproduite : test « le monde et l'île gardent une transform et une origine » (`iso-camera.test.tsx`) vert à travers 3 redimensionnements, pincements et glissés ; les deux nœuds lisent les mêmes valeurs partagées. Cause probable restante (T21-qa) : les images du monde se décodent après l'île au premier rendu ; le fondu du point 4 couvre la première image. À revoir en qa.
3. Règle séance / GPS. L'app la tient par le focus : séance et sortie sont la route `/session` poussée sur la Stack racine, l'onglet n'est plus focalisé, et l'horloge (`horloge.ts`) et les marcheurs (`useMarcheurs.ts`) lisent `useIsFocused`. Pas faux, pas de correction. Nouveau test `iso-regle-seance.test.tsx` : vrai routeur (Stack racine + Tabs), `useIsFocused` vrai → faux au push de `/session`, vrai au retour. Les tests d'horloge existants couvrent la réaction au focus.
4. Constat 19. `ouverture.ts` : un seul fondu (450 ms, `FONDU_OUVERTURE_MS`), opacité seulement, 0 ms avec mouvement réduit ; porté par les deux nœuds de caméra existants (île et monde), donc 0 nœud animé de plus (le budget de 63 tient).
5. Cadrage de l'onglet. `cadrage` ajustait l'île au pixel (l'ancien 1,08 avait été retiré) : pointes sur les bords. `MARGE_CADRAGE = 0.92` (carteDemo.ts). Test avec la taille réelle de l'onglet (390 x 591) aux paliers 1, 6, 12 : au moins 8 dp de chaque côté. Deux attentes mises à jour (`iso-village`, `iso-dev-screen`).
6. Flow `.maestro/iso-batiments.yaml` : les 4 taps de fermeture à (1000,330) remplacés par `- back` (la bulle se ferme au Back, T14-qa). Maestro non lancé.

## Preuves
- `npx jest iso- village-scene --testPathIgnorePatterns /node_modules/` : 663 passés, 1 rouge, `iso-fierte` (fenêtre de forge_grand, T03, hors de mon périmètre ; blender).
- Rouge avant correction : « reads the view at the touch » et « tap on a building during the opening scene » (iso-village) ; vert après. La première repasse rouge si on retire la vue gardée.
- `scripts/iso/team/heavy.sh npx tsc --noEmit` : propre. `npx biome check --error-on-warnings` sur mes fichiers : propre.
- Pendant mes essais, 3 tests de `iso-habitants-vue` étaient rouges : travail en cours de T26, pas le mien.

## Douteux ou non fait
- Point 2 non reproductible en jest (l'image décodée tard est native).
- Le flow Maestro n'a pas été rejoué.

## Pour la suite (qa à rejouer)
- Les points de tap de `iso-batiments.yaml` sont à re-mesurer : le cadrage d'ouverture est 8 % plus petit, les bâtiments bougent. Puis rejouer le flow (le `- back` ferme chaque bulle).
- Onglet Village palier 1 : l'île ne touche plus les bords à l'ouverture, en portrait et paysage.
- Tap sur un bâtiment pendant la scène d'ouverture (retour de séance) : la bulle s'ouvre et la scène s'arrête ; tap dans la première seconde de l'onglet : bonne cible.
- Fondu d'ouverture à l'entrée : doux, sans image de sol absent ; absent avec mouvement réduit. Trames lentes pendant le fondu à mesurer en .perf.
- Île décollée : surveiller la première entrée.
