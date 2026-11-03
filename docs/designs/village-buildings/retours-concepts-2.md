# Choix de Guillaume sur les concepts, 03/11, deuxième passage

Ils remplacent le prompt là où ils le contredisent.

## Décisions
- **Peinture finale** pour tous les bâtiments, sauf le moulin et le puits.
- **Moulin et puits :** étapes A à C refaites, sans rien bloquer. Leurs planches vont dans le prochain checkpoint.
- **Mythiques :** ils manquent de spectacle en général. En production, tous vont plus loin : un élément vertigineux plus grand, une couche magique plus forte de jour et de nuit, une silhouette qu'on n'oublie pas.
- **Personne dans les peintures :** statues et animaux au repos seulement, les gags passent par des objets. Cela remplace « keepers » et « figures » des sections 5 à 7 du prompt, et le signe sport passe par le matériel.
- **Images fixes maintenant :** les ancres de ce qui bougera (feu, fumée, fenêtres allumées, drapeaux, ailes, eau, magie) vont dans les données de chaque bâtiment. Le mouvement viendra dans une passe ultérieure, une fois tout peint, sauf s'il existe déjà dans le code.
- **Tap :** oui. `VillageScene.tsx:514` passe au tap, pour tout le monde.
- **Budget :** Guillaume écrit `BUDGET_FLUX_V1` lui-même dans `VALIDATIONS.md`, je lis la valeur dans le registre.

## Direction de chaque bâtiment
Direction 4 des specs `scripts/bld/concepts/` (celle qu'il a vue et approuvée sur la page), sauf :
- **Fontaine :** direction 3, Le Tonneau percé.
- **Moulin, puits :** à refaire.

Il écrit « where no direction was picked, take the direction ranked first in the audit ». Aucune image n'est marquée sur sa page, mais ses « super » portent sur les planches qu'elle montrait, seules les directions 4 n'ayant pas d'audit. Lire la phrase à la lettre ramènerait les directions à blagues qu'il a écartées. Décision notée, à contredire au besoin : rien n'est encore peint.

## Notes par bâtiment
- **Moulin :** un vrai moulin à chaque stade, reconnaissable tout de suite. Rough : tout petit moulin très simple d'un tout petit village, clairement un moulin. Solid : moulin classique. Grand : gros moulin. Legendary : gros moulin très puissant. Touches amusantes et magie viennent en plus, ça reste un moulin. Aucun concept actuel ne se lit moulin, mais leurs bonnes idées restent à garder.
- **Mannequin :** très bien, mais le mythique manque de spectacle. Une vraie salle d'entraînement au mythique.
- **Tour du mage :** le mythique a l'air en ruine, jamais en ruine. Une tour imposante et intacte, dans l'esprit d'une grande école de magie : haute, tourelles, beaucoup de fenêtres allumées, un laboratoire à l'intérieur où la magie se transforme, visible par de grandes fenêtres. Une ambiance seulement : aucun château de film copié, et jamais nommé dans un prompt FLUX.
- **Champion Arena :** très bien, le mythique demande plus de spectacle.
- **Tous les autres :** approuvés tels quels.

## Moulin et puits, retour sur les planches (03/11)
Le petit et le grand marchent dans les deux cas, pas le mythique : « fais juste en sorte qu'il soit plus grand et fastueux, comme si on avait mis plus d'argent et plus de personnes ». Mythiques repeints en ce sens, sans personnage peint : l'effort se lit dans la taille et la qualité des travaux. La direction 5 ou 6 de chacun reste à choisir.
