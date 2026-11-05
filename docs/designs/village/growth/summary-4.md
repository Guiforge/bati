# Alentours : résumé de la session 4 (05/11/2026)

**Le village pousse dans le jeu, du palier 1 au 12.** Bandes : `img/apres2-strip-jour.jpg` et `img/apres2-strip-nuit.jpg`. La piste attend ton coup d'oeil et quatre réponses dans `checkpoint.md`.

## Fait

- **Peinture** : 19 images en `gpt-image-2.5-sunburst`, sans reprise : maisons et pièces des quartiers, souches, bourg, fermes, hameaux. Planche `img/pieces-finales.jpg`. Provenance écrite pour chaque image.
- **Pose** : `scripts/growth/poser.py` écrit `components/village/iso/piecesPosees.ts`. Au palier 12 : 54 pièces de quartier, 16 souches et copeaux, 5 pièces de campagne, et le mât. 0 SVG, rien qui bouge.
- **Marché** : le grand étal remplace l'ancien au 8, la halle prend sa place au 11. Mara le lit désaturé, pas gris, comme tu le voulais.
- **Bourg et fermes ramenés dans le cadre** : cabanes au 7, hameau au 9, fermes au 10 et 11, champs au 11, bourg au 12 (`layout/slots.json`).
- **La forêt recule** : 9 masses en moins aux paliers 11 et 12, aucune ne revient.
- **Passe de correction** : campagne relevée à la valeur des quartiers (elle était presque noire), mât de fête au centre de la place au 10.

## Pas bon, ou pas fait

- **Le point focal est raté** : Theo a cherché le mât sans le voir. Trop petit, de la couleur des toits.
- **Le 12 se confond avec le 11** : les ajouts sont à la périphérie, le cœur ne bouge plus après le 8. Les trois juges le disent.
- **La nuit ne brille pas** : fenêtres éteintes dans les nouveaux quartiers. Passé à POLISH, comme les ombres de pied des pièces et le rouge du moulin.
- **Les pièces de campagne restent un peu collées** : pas d'ombre ni de fondu au pied. La couronne de souches du bourg est peinte dans l'image.
- **Aucune route F posée.** La ruelle de Q1 essayée ne se voit pas, retirée.
- **Pas de test** (règle de la piste) : la table des pièces, le remplacement `avant` et le recul de forêt sont dans `tests-debt.md`. Deux tests existants cassent (`iso-alentours.test.tsx`), notés aussi.
- **Les portes de l'atelier ne passent pas par `heavy.sh`** dans mes scripts : à lancer une à la fois.

## Chiffres

- OpenAI : 3,47 $ sur 20 $ (session à 3,47 $ sur 5 $). Peinture 1,37 $, mât 0,064 $.
- FLUX : 0,64 $ sur 4 $, rien de neuf cette fois.
- Sous-agents : 26 passages sur 150.
- LOCK_OK, typecheck vert, bundle Android construit, portes à 0 sauf un accessoire de G15 au palier 2 (caché à 44 % par le puits). Différence de vignette 10 → 11 : 0,14 avant, 1,55 après ; 11 → 12 : 0,01 avant, 0,62 après.
- Relecture du code : aucun bloquant. Notes : env 5/5/5, mara 5/4,5/4,5/5, theo 7/6/6/5.
- Poussé sur `track-growth` et `feat/village-iso`. La clé n'a été ni affichée ni copiée.

## Pour toi

1. **Regarde la bande** et dis si 8 à 12 tiennent.
2. **Le mât** : le grandir et le passer en rouge vif, et un sommet au 12 au centre ? Environ 0,15 $.
3. **`lisiere` et `pieds`** : d'accord pour que LAYOUT les reverrouille sur ce rendu ?
4. **Couronne de souches du bourg** : la garder ou repeindre ?
