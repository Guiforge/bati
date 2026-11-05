# Alentours : résumé de la session 3 (05/11/2026)

**La page du banc d'essai est prête : https://claude.ai/artifact/PRXjCkLdN2Kdn6WbpGKg9V** La piste attend ton choix de peintre. Rien n'est peint pour de bon.

## Résultat

| Travail | Mesuré | Mara | Mon avis |
|---|---|---|---|
| Maison | GPT suit mieux les corrections, toit trop clair | FLUX essai 1 | À ton oeil |
| Souches | GPT seul respecte le nombre, dessus pâles, trop grosses | GPT essai 2, réduit et assombri | GPT |
| Chemins | FLUX ne bouge aucun repère, GPT déplace les 17, jusqu'à 33 px | FLUX essai 1 | FLUX |

## Fait

- **Tes réponses sur les quartiers** : dans `checkpoint.md`. A, N1 à N6 sauf sur une accroche, bourg et fermes à rapprocher, étal désaturé, règle 11 gardée, souches.
- **Tes essais de pièces** : la page n'a rien enregistré, donc j'ai pris ceux de mara (`decisions.md`).
- **Amendement v4.4** : ajouté seul à la fin de `PROMPT-tracks.md`, fusionné.
- **Registre OpenAI** : `scripts/iso/openai_loop.py`, plafonds 20 $, 5 $ par session, 3 $ par lot. Relecture adverse : aucune fuite de clé trouvée, trois défauts de plafond et de coût et une image payée perdue, corrigés.
- **Banc d'essai** : 12 images, une passe, sans reprise.

## Pas bon, ou pas fait

- **GPT est inutilisable tel quel sur le sol** : il repeint toute l'image et zoome d'environ 3 %. Recaler puis masquer les chemins pourrait marcher, je ne l'ai pas essayé.
- **Mara a jugé le style** sur les planches et 5 images ouvertes, pas les essais 2 en pleine taille.
- **Aucune des maisons n'est prête à poser** : FLUX oublie les corrections, le toit de GPT est trop clair. Mon idée qu'il se reprend le mieux n'est pas testée.
- **Le morceau de sol porte 17 bâtiments et accessoires** : l'atelier n'a pas de vue du sol seul.
- **Le masque de mesure est approximatif** : une couleur, 8,2 % de l'image. Il rate des pavés déjà texturés.
- **Qualités moyenne et basse de GPT** : pas mesurées.
- **Reste non fait** : peinture (G8, G10), rapprocher le bourg et les fermes, pose (G11). L'écart des paliers 10 à 12 et le point focal restent à voir une fois posés.
- **Dépense OpenAI** : relevée au registre, pas comparée au tableau de facturation OpenAI.

## Chiffres

- OpenAI : 1,35 $ sur 20 $, 6 images, 0,22 à 0,23 $ l'image en qualité haute, `usage` rendu à chaque appel.
- FLUX 3 Image : 0,29 $, 6 images, 0,048 $ l'image. Avec les 0,35 $ de Klein : 0,64 $ sur 4 $.
- Sous-agents : 14 passages sur 150.
- Aucun fichier de l'appli n'a changé depuis le dernier bundle, donc ni typecheck ni bundle. Aucun test.
- La clé n'a été ni affichée ni copiée.

## Pour toi

1. **Choisis un peintre par travail**, sur la page.
2. **Si tes essais de pièces diffèrent de ceux de mara**, dis-le.
