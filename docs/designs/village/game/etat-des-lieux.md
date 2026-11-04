# Etat des lieux de la page Village, 04/11

Vu sur emulator-5554, build dev, branche track-game (48cb36f5), héros avec 1 an d'historique de dev (palier 8). Captures : `scratch/sheet-b.png` et `scratch/sheet-c.png`.

## Ce qui existe et marche

- **La carte iso** à l'ouverture de l'onglet (drapeau INTEGRATION : allumé en dev et .perf, éteint en publié).
- **Le titre** posé sur la carte : blason, nom du palier, série, niveau, phrase du blason, focus de 7 jours.
- **Marteaux** blancs sur les bâtiments prêts à évoluer.
- **La bulle** au tap (`iso/Bulle.tsx`) : nom, ce qui le nourrit, rang et pastilles, reps, barre avec ses deux bouts, phrase « rang 8 dans environ 64 séances », séances récentes, lien « Find a quest ». Prêt : marteau, « Ready to evolve », bouton Evolve.
- **Le tiroir** (`VillageDrawer`) : prochain palier, « Evolve all », prochain à monter, liste par muscle et par style. C'est aussi la porte du lecteur d'écran.
- **Fin de séance** : `villageHref` envoie `/(tabs)/village?grown=...` ; la carte amorce la fête et les bâtiments prêts montrent leur marteau.
- **Forge** : lien vers la page `/forge`.

## Ce que la piste demande et qui manque

| Demandé | Aujourd'hui |
|---|---|
| Les exercices qui nourrissent le bâtiment | Seulement « Rises with your back » : aucun nom d'exercice |
| Son histoire récente | Oui pour muscle et style (3 séances), sans lien vers ces séances |
| Le prochain stade en silhouette | Rien |
| Du bâtiment vers les exercices et le journal | Rien : seul « Find a quest » |
| Le tap en attente | Existe, à juger depuis la vue de départ |
| De la fin de séance au village | Existe, à jouer pour de vrai |

## Défauts vus en jouant

1. **La bulle cache son bâtiment** : le joueur lit une fiche sur la forge sans voir la forge.
2. **La bulle est trop longue** : les séances sont coupées en bas sans que rien dise qu'on peut défiler.
3. **Grange prête** : « At its ceiling » juste au-dessus de « Evolve » se contredisent à la lecture.
4. **Bâtiment en « prereq »** : « Follows the Farm » puis « Rises with the Farm » répètent la même chose.
5. **Le titre et le blason** recouvrent le bas de la carte et la bulle passe dessous ou à ras.
6. **Le tiroir** liste tout, mais un tap sur une ligne ne ramène pas au bâtiment sur la carte (à vérifier).
7. **Première image lente** : gris pendant plus de 12 s en dev au palier 8. À mesurer en .perf, piste PERF.

Le rouage d'engrenage qui flotte à droite est l'outil du dev client, pas l'app.
