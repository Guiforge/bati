# T14-qa : bulle BD au toucher, sur émulateur

Statut proposé : prêt pour revue
Auteur : qa
Tour de revue : 1

Même `.perf` que T23 (`evidence/T14/apk.sha256`), avec `INTEGRATION` allumé pour la build (onglet Village en carte iso). Tout a été fait dans l'onglet Village réel. Pour avoir des bâtiments prêts, deux séances ont été jouées par `.maestro/iso-perf-sessions.yaml` (vert, journal hors dépôt). Le village est passé de 10 à 13 bâtiments, avec la forge et le champ de tir prêts.

## Verdicts
1. **100 % de texte, portrait : conforme.**
   - Tente : bulle parchemin au-dessus du bâtiment, queue sur le haut du sprite (`03-tap-tente-0s8.jpg`, `p100-a-ouverte.jpg`). Feu de camp : bulle en haut à droite, dans l'écran, queue sur le feu (`p100-f-autre.jpg`).
   - Champ de tir prêt : la bulle passe **sous** son ancre faute de place au-dessus, sa queue sur le marteau. Elle reste dans l'écran, au-dessus de la barre d'onglets (bas à 2058 px), et elle **couvre le bâtiment tapé** (`07-pret-archery-100.jpg`).
   - Forge prête : directement la **feuille**, le contenu dépassant 70 % de hauteur avec « Enter the forge » (`05-bulle-pret-forge.jpg`).
2. **130 % : conforme.** Tente : bulle sous l'ancre, queue sur la tente (`11-p130-tente.jpg`). Champ de tir prêt : feuille (`12-p130-archery.jpg`). Le seuil de la feuille reste au-delà de 130 % pour un contenu court.
3. **200 % : conforme.** Tente : feuille du bas, nom en premier (`21-p200-tente.jpg`). Le tap sur le voile la ferme, Back aussi (`22-p200-apres-back.jpg`).
4. **Fermetures, 100 % : conformes** (`planche-p100-fermetures.jpg`, dump après chaque geste) :
   - tap dehors : fermée ;
   - Back : fermée, l'app reste sur l'onglet ;
   - glissé de 400 px démarré hors de la bulle : fermée, **la carte n'a pas bougé** (même cadrage avant et après) ;
   - retouche du même bâtiment : fermée ;
   - tap sur un autre bâtiment : la bulle est remplacée (tente, puis feu de camp ; à 130 %, tente, puis champ de tir en feuille).
   - Back sur la feuille : fermée.
5. **« Faire évoluer » : conforme.** Dans la feuille de la forge prête, Evolve lance le chantier : échafaudage à 2 s, nouveau stade à 5 s, marteau parti (`planche-evolve.jpg`). Le premier appui a pris (tap `input` simple).
6. **Bulle qui grandit sans sortir de l'écran : oui**, sur les 7 ouvertures en bulle : bord haut sous la barre d'état, bord bas au-dessus de la barre d'onglets.
7. **Paysage : conforme.** Tente : bulle au-dessus, queue sur la tente, dans la moitié carte. Carrière et champ de tir prêt : feuille centrée de 680 px de large ; Evolve n'est visible qu'en faisant défiler (`planche-paysage.jpg`).

## Remarques
- **Premier tap après l'ouverture de l'onglet.** Pendant la vague d'ouverture, la caméra va vers le bâtiment du focus (carrière, focus « Arms »). Un tap fait à ce moment rate sa cible et ne fait que relancer le mouvement (`01-bulle-100-forge.jpg`, `01-bulle-100-tente.jpg`). Une fois la carte au repos, chaque tap ouvre la bulle. Ce n'est pas un défaut de la bulle, mais un héros qui tape tout de suite sur un bâtiment le verra.
- Le TalkBack n'a pas été activé. Le dump donne bien le libellé du nom (« Archery Range ready to evolve, rank 3 ») et le fond « Close ».
- Mes Back successifs m'ont fait quitter l'onglet une fois (un Back de trop sans bulle ouverte), et un tap suivant a ouvert une quête « Chop Wood ». Aucune séance n'a été lancée.

## Preuves
- `docs/designs/village-iso-v1/evidence/T14/` : `00` à `32`, `planche-p100-fermetures.jpg`, `planche-p130.jpg`, `planche-evolve.jpg`, `planche-paysage.jpg`, `apk.sha256`, `films-lien.txt`.
- Hors dépôt : `~/.cache/bati-art-loop/iso/evidence/T14/maestro-sessions.log`.
- `font_scale` remis à 1.0, rotation auto remise à 1 (relus).
- Coût FLUX : 0.

## Douteux ou non fait
- TalkBack, et le focus sur le nom à l'ouverture, non vérifiés.
- 360 x 640 non simulé (`wm size`) : tout s'est passé en 1080x2400.
- Le champ de tir est resté prêt (non évolué), pour d'autres essais.
