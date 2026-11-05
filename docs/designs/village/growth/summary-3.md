# Alentours : résumé de la session 3 (05/11/2026)

**La page du banc d'essai est prête : https://claude.ai/artifact/PRXjCkLdN2Kdn6WbpGKg9V** La piste attend ton choix de peintre. Rien n'est peint pour de bon.

## Résultat

| Travail | Mesuré | Mara | Mon avis |
|---|---|---|---|
| Maison | 2.5 suit la consigne, magenta franc. 2.6 sort sur fond noir avec un halo | 2.5, essai 1 | 2.5-sunburst |
| Souches | Tour 1 seulement : `gpt-image-2` seul respecte le nombre | `gpt-image-2` essai 2, réduit et assombri | 2.5-sunburst, non testé ici, ou `gpt-image-2` |
| Chemins | Collés : 0,00 hors du masque pour les trois | FLUX essai 1, 2.5 en second | FLUX 3, collé |

## Fait

- **Tes réponses sur les quartiers** : dans `checkpoint.md`. A, N1 à N6 sauf sur une accroche, bourg et fermes à rapprocher, étal désaturé, règle 11 gardée, souches.
- **Tes essais de pièces** : la page n'a rien enregistré, donc j'ai pris ceux de mara (`decisions.md`).
- **Amendement v4.4** : ajouté seul à la fin de `PROMPT-tracks.md`, fusionné. Plus une exception, écrite à la suite, pour les deux modèles récents, banc d'essai seulement.
- **Registre OpenAI** : `scripts/iso/openai_loop.py`, plafonds 20 $, 5 $ par session, 3 $ par lot. Relecture adverse : aucune fuite de clé trouvée, trois défauts de plafond et de coût et une image payée perdue, corrigés. Non relu depuis l'ajout des modèles et du masque, seul l'auto-contrôle a repassé.
- **Banc d'essai** : tour 1, 12 images. Tour 2, 10 images et 3 collages.

## Pas bon, ou pas fait

- **Les modèles récents repeignent tout le décor**, sans le déplacer : façades lissées, perte du trait selon mara. Il faut coller les chemins, quel que soit le peintre.
- **Le masque de l'API a échoué** : blocs noirs, deux formats, deux modèles. Peut-être de mon fait, je n'ai pas essayé d'autre format.
- **Le masque par couleur rate les chemins pavés sombres** près de la place, restés plats. Un masque tiré du tracé des rues devrait les prendre, pas essayé.
- **Les souches n'ont pas été peintes par les modèles récents** : mon avis s'appuie sur la maison.
- **Maison** : chaume de 2.5 strié et répétitif, fenêtre un peu vive, pas encore posée.
- **Le morceau de sol porte 17 bâtiments et accessoires** : l'atelier n'a pas de vue du sol seul.
- **Le masque de mesure est approximatif** : une couleur, 8,2 % de l'image.
- **Reste non fait** : peinture (G8, G10), rapprocher le bourg et les fermes, pose (G11). L'écart des paliers 10 à 12 et le point focal restent à voir une fois posés.
- **Dépense OpenAI** : relevée au registre, pas comparée au tableau de facturation OpenAI.

## Chiffres

- OpenAI : 2,04 $ sur 20 $, 16 images. `gpt-image-2` 0,22 à 0,23 $ l'image, 2.5-sunburst et 2.6-sunburst 0,066 à 0,072 $, qualité haute. `usage` rendu à chaque appel.
- FLUX 3 Image : 0,29 $, 6 images, 0,048 $ l'image. Avec les 0,35 $ de Klein : 0,64 $ sur 4 $.
- Sous-agents : 18 passages sur 150.
- Aucun fichier de l'appli n'a changé depuis le dernier bundle, donc ni typecheck ni bundle. Aucun test.
- La clé n'a été ni affichée ni copiée.

## Pour toi

1. **Choisis un peintre par travail**, sur la page.
2. **Si tu choisis un modèle récent pour la production**, dis-le : l'exception ne couvre que le banc d'essai.
3. **Si tes essais de pièces diffèrent de ceux de mara**, dis-le.
