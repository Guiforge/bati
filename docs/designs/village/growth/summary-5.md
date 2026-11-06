# Alentours : résumé de la session 5, fermeture (06/11/2026)

**La piste GROWTH est fermée.** Le village pousse en jeu du palier 1 au 12, le mât rouge marque la place au palier 10. Bandes : `img/apres3-strip-jour.jpg` et `img/apres3-strip-nuit.jpg`, place : `img/place-avant-apres.jpg`.

## Fait

- **Feu de joie retiré**, comme tu l'as demandé. Le mât reste.
- **Rendus et planches refaits** sur le jeu tel qu'il est : 12 paliers de jour, nuits 3, 6, 9, 10, 11, 12.
- **Portes de l'atelier, une fois** : tout à 0 sauf `sacs_de_grain_2` au palier 2 (caché à 44 % par le puits, accessoire de la forêt du sud). Accroches 60 par défaut et 73 en `haut=1`, comme la référence de LAYOUT.
- **`lisiere` et `pieds` reverrouillés** sur le rendu du palier 6, avec la forêt reculée et les quartiers. Dossier `village-loop/loupes/bc/relock-2026-11-06/`. LOCK_OK.
- **Note pour AUDIT et POLISH** dans `handoff.md` : le cœur ne change plus après le palier 8, les paliers 11 et 12 se ressemblent.
- **Fermeture** : dossier de travail archivé dans `~/bati-archives/2026-11-06-growth.tgz` (983 Mo, 2024 fichiers) puis vidé, `growth-iso/` retiré.

## Pas bon, ou pas fait

- **Le palier 12 n'a pas de sommet au centre.** Sans le feu, c'est un 11 avec plus de maisons au bord.
- **La nuit ne brille pas** dans les nouveaux quartiers, et les pièces n'ont pas d'ombre de pied : passé à POLISH.
- **Les nouveaux crops verrouillés ont des bandes noires** : une partie de `lisiere` (25 %) sort de l'écran à la caméra par défaut. Coupés comme LAYOUT le faisait, pas au format des anciens.
- **Pas de test** sur la table des pièces ni sur le recul de forêt, et deux tests existants cassent : `tests-debt.md`.
- **Je n'ai pas relancé de juge** après le retrait du feu.

## Chiffres

- OpenAI : 3,67 $ sur 20 $. FLUX : 0,64 $ sur 4 $.
- Sous-agents : 27 passages sur 150.
- LOCK_OK, typecheck vert. Aucun test lancé.

## Pour toi

Rien n'attend ta réponse sur cette piste.
