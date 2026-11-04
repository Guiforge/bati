# Prompt pour Claude Design, page Village de Bati

À coller tel quel dans Claude Design, avec le design system Bati, et en joignant `carte.webp` et `bulle-actuelle.webp` (dans `scratch/page/`, ou sur la page de choix).

---

Dessine les écrans de l'onglet Village de Bati, une appli de fitness RPG dark-fantasy, hors ligne, en mode sombre seulement. Utilise le design system Bati tel quel : aucun nouveau token, aucune nouvelle couleur, aucun nouveau composant de base. Format téléphone, 360 x 800 dp. Texte en français, tutoiement, sans tiret cadratin.

**Le contexte.** L'onglet s'ouvre sur un village peint en vue isométrique (`carte.webp`). Il occupe la moitié haute de l'écran à la vue de départ. En bas : blason, nom du palier, niveau, puis un bandeau « Ton village, palier 8 » qui ouvre un tiroir, puis les onglets. La peinture est le héros de l'écran : ne pose rien dessus sans raison. Aujourd'hui, un tap ouvre une bulle de parchemin (`bulle-actuelle.webp`) qui cache le bâtiment dont elle parle et qui est trop longue.

**La direction à dessiner : le panneau.** Au tap sur un bâtiment, le titre et le bandeau s'effacent, et un panneau de parchemin et d'encre prend leur place au-dessus des onglets, 35 % de l'écran au plus. Le bâtiment reste visible au-dessus, avec un halo chaud qui respire, sans queue de bulle. Un tap sur un autre bâtiment change le contenu sur place. Un tap sur la carte vide ferme. La capture fière reste l'état fermé.

**Dessine ces états :**
1. La carte fermée, comme aujourd'hui, pour la référence.
2. Panneau d'un bâtiment nourri par un muscle : Carrière, rang 7, pastilles, barre de 4 800 à 10 000 reps avec ses deux bouts, « Rang 8 dans environ 64 séances de dos ». À droite le bâtiment actuel en couleur et le stade suivant en silhouette d'encre, à la même échelle. Puis, en défilant : les exercices que le héros a vraiment faits pour lui, chaque nom menant à sa fiche ; les 3 dernières séances, chacune menant au journal.
3. Panneau d'un bâtiment prêt à évoluer : marteau, « Prête à évoluer », bouton braise « Faire évoluer » sous le pouce, silhouette du stade suivant. Il attend aussi longtemps qu'il faut.
4. Panneau d'un bâtiment jamais nourri : ce qu'il faut faire pour le bâtir, un lien vers une quête, jamais de vide.
5. Panneau d'un bâtiment qui suit un autre : une seule phrase, « Suit la Ferme », avec un lien vers la Ferme.
6. Dernier stade atteint : pas de silhouette, le bâtiment seul.
7. Retour de fin de séance : l'écran de victoire nomme ce que la séance a nourri, puis la carte, puis le panneau ouvert seul sur le premier bâtiment prêt. Le joueur reste seul à toucher le bouton.
8. Le tiroir : un tap sur une ligne ferme le tiroir et ouvre le panneau sur la carte.
9. Texte à 200 % : même contenu, le panneau devient une feuille plus haute. Rien de coupé.

**Si un autre choix te semble meilleur**, dessine-le à côté, jamais à la place.

**À ne jamais montrer :** minuteur, compte à rebours, date de disponibilité, monnaie, prix, boutique, coffre, ce qui ressemble à du butin, relance pour revenir, chiffre qui baisse. Les figures ne s'affichent qu'au tap, jamais sur la carte. L'état « prêt » ne passe jamais par la couleur seule : marteau, mot et bouton.

**Accessibilité :** ordre de lecture nom, fait, chiffres, action. Cibles de 48 dp. Contraste de texte 4,5:1.

**Rends :** une planche par état, avec le nom des composants du design system utilisés, et un mot sur chaque décision que tu as prise toi-même.
