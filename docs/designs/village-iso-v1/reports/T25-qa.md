# T25-qa : statue du totem sur la place

Build `.perf` du working tree (INTEGRATION true pour la build, remis à false et relu). `evidence/T25/onglet-palier1-ours.png` (onglet Village via dev-iso, palier 1, ours, héros niveau 2) ; `crop-place-statue.png` (agrandissement x3 de la place, résolution native 1080 px, pas de zoom 0,6).
- Constat : la statue est là, à gauche du feu de camp sur la case [10,11], sur un socle gris levé ; stade jeune : ours teinté beige-bois. L'étendard n'est plus là (le mât près de la tente est un autre élément).
- Défaut visible : l'ours flotte au-dessus du socle (vide entre le pied et le dessus du socle) et semble décalé vers la gauche ; à vérifier à l'oeil par le chef.
- Palier 12 et zoom 0,6 : impossibles. La carte seule de dev-iso ne passe pas de `blason` à `IsoCarteDemo` : pas de statue dans ce mode (rien sur la place sur la capture p12 zoom 0,6). L'onglet Village n'a ni palier ni zoom réglables (ils suivent le héros ; un pincement est impossible en commande).
- Animaux et stades : un seul vu (ours, jeune). Changer d'animal ou de stade demande des séances dans la base du héros, et l'accès à la base de la .perf est interdit. Il manque un `?animal=&stade=` dans dev-iso qui passe un `blason` factice à `IsoCarteDemo` : palier, zoom 0,6 et les 6 animaux x 4 stades se captureraient alors.
- Verdict qa : pas évaluable en entier ; le défaut de pose est à regarder.

## Tour 2
Même build que AUDIT-DA-lot3-qa (INTEGRATION remis à false). `bati://dev-iso?ambiance=nuit&fige=1&animal=<a>&stade=<s>`, palier 12, bouton 0,6, recadré sur la statue (360 px de la capture 1080x2400, agrandi x1,33). Planche : `evidence/T25/planche-statues.png` (ours, hermine, saumon, cerf, cheval, sanglier au stade jeune ; ours adulte, vénérable, légendaire).
- **Les neuf statues reposent sur leur socle** : pieds ou ventre sur le dessus, pas de vide, pas de double socle. Le décalage vers la gauche du tour 1 n'apparaît plus.
- Le socle grandit avec le stade (ours : petit, bleu-gris pierre, large bronze, large doré) ; la matière change : bois beige, pierre bleutée, bronze brun, or jaune.
- Les statues jeunes sont petites et pâles par rapport au socle (hermine, saumon : fines) ; le saumon se tient presque debout sur une patte de queue. Constat de lisibilité, pas de pose.
- Au stade légendaire, le socle large déborde sur le bord gauche de la plateforme du feu de camp (quelques pixels de chevauchement du socle sur les pierres du feu).
- Le rocher du palier 1 (11,11) est juste à droite de la statue, bas : il se lit comme un second objet collé au socle à zoom 0,6.
- Avec animaux et stades par le lien, le tour 1 demandait ce paramètre : présent et fonctionnel.
