# T04-qa : nom du village

Statut proposé : partiel
- Portrait 100 % : cartouche « Isoville » à côté du blason, lisible (`evidence/T04/portrait-100.png`). Portrait 200 % : lisible, non coupé (`portrait-200_s.png`).
- Paysage 200 % : le nom « Isoville » est coupé en deux lignes au milieu du mot (« Isovi / lle ») dans la colonne étroite (`paysage-200_s.png`). Défaut. Paysage 100 % non pris.
- Nom long : non testé (changer le nom exigerait de toucher aux données).
- TalkBack : activé, mais les touchers injectés ne pilotent pas ses gestes (une boîte de permission n'a pas pu être fermée au doigt). Ordre de lecture, double toucher et action blason non vérifiés ; seul le test jest les couvre. TalkBack remis à l'arrêt, police 1.0, rotation auto remise.

## Tour 2
Statut proposé : passe pour le nom ; TalkBack : ordre lu par l'arbre seulement
Build : celle de T28-qa Tour 2. Onglet Village par dev-iso (« Onglet Village »), héros « Isoville », palier 1.
- Paysage à 200 % de police (`evidence/T04/t2-paysage-200.png`) : « Isoville » tient sur une ligne dans son cartouche, à côté du blason, non coupé. Le défaut du tour 1 (« Isovi / lle ») a disparu. Plus bas, « Hamlet · Level 2 · Novice » passe sur 3 lignes, normal. Portrait 100 % : `t2-portrait-100.png`, conforme. Nom long : non testé.
- TalkBack : activé (cadre vert de focus, `t2-talkback-on.png`). Les balayages injectés par `input swipe` ne sont pas pris par TalkBack (le geste a fait glisser la carte) ; Alt+droite et bas ne font rien ; seule la touche Tab déplace le focus : Carte seule, Grandir, Vider cache images, puis il reste là (la zone défilante n'est pas atteinte au clavier). Pas de parcours par balayages possible.
- Ordre d'après l'arbre d'accessibilité (`uiautomator dump`, `evidence/T04/t2-ui-dump.xml`) : les 3 boutons, puis le groupe `village-hero-room` dont l'étiquette commence par le nom : « Isoville, Hamlet · Level 2 · Novice, A bear watches over Isoville., 7-day focus · Arms », puis le blason `village-crest` « Why the Bear? » (enfant « A bear. »). Le nom passe en premier ; que TalkBack lise bien cet ordre n'est pas vérifié.
- Remis comme avant (relu) : police 1.0, rotation auto 1 et user_rotation 0, services d'accessibilité effacés (null), accessibility_enabled 0.
