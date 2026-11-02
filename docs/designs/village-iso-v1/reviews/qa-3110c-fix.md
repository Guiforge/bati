# Correctifs de qa-3110c (31/10)

Revue de code neuve : **pass**, 75 suites, 818 tests.
- Réglage « Sons » (5 langues) avec une ligne d'aide qui cite les bips de séance et l'ambiance du village ; un seul réglage `soundEnabled` ; `SettingRow` prend un `hint` optionnel, lu par TalkBack.
- Observatoire : une seule étoile au sommet du dôme (moins de nœuds qu'avant) ; lucioles du bosquet agrandies, ancre inchangée.
- Vibration : partie d'un effet après le commit du calque du nouveau stade ; le retard d'environ 1 s venait du `require` paresseux du store dans dev-iso, maintenant chargé au montage de l'écran de dev (la carte reste sans base).
Reste : vu sur appareil (étoile, lucioles, moment de la vibration).
