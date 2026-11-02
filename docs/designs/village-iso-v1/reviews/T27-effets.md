# T27 point 4 : petits effets de bâtiment (31/10)

Revue de code neuve (iso-code-reviewer, Sonnet) : **pass**. 5 effets en aplats (runes du mage, lucioles du bosquet, braises de l'antre, éclat de l'observatoire, étincelles de la forge), 2 bâtiments au plus par vague, tirés par graine (jour, vague), dans les sièges tournants de T16 (8 familles au plus).

Corrigé après revue : le rapport dit maintenant +2 nœuds réels au pire sans lueur (61 → 63, sous 64) ; un test force les 2 effets et mesure exactement 63 ; tests « aucun effet de jour » et « aucun effet en mouvement réduit ». Plafond absolu 64 intact, mesuré sur le vrai rendu.
Limite : un effet se monte ou se démonte si une lueur prête apparaît en pleine vague (dans le budget, sans fondu).
Reste : film qa à 30 i/s d'une vague sur 3 bâtiments à effet, ancrage au sommet du masque de la tour, du dôme et du bosquet à vérifier.
