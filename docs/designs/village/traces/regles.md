# Les règles des traces

Celles de l'annexe H, plus ce que l'audit y ajoute.

1. **Du journal seulement**, par une seule fonction pure, journal vers traces. Même résultat sur deux téléphones. L'horloge n'entre jamais.
2. **Une trace ne part jamais et ne rétrécit jamais.** Voir la question 1 : ce n'est vrai que si une séance n'est jamais supprimée.
3. **Pas de monnaie, pas de chiffre affiché, pas de minuteur, rien à réclamer.** Ne ressemble jamais à du butin.
4. **Ne punit jamais.** Une pause, une blessure ou une semaine creuse ne se voient pas. Une trace absente ne laisse aucune place vide.
5. **Santé** (ajout de l'audit) : aucune trace ne récompense l'heure extrême ni l'excès. Le banc de l'aube et la lanterne du soir sont écartés tant qu'ils comptent de 22 h à 7 h. Les seuils de volume restent espacés.
6. **Ne cache jamais un bâtiment du joueur**, jamais sur son parvis (règle 14 de la cible), jamais sur le coin verrouillé. Une valeur plus calme que les bâtiments.
7. **Pas de personnage peint, ni fausses lettres, ni chiffres, ni enseigne, ni drapeau, ni lueur.** Ombres sur la couche d'ombres, jamais peintes.
8. **Lisible à taille de téléphone** (ajout de l'audit) : une trace fait au moins 60 px sur 1080, soit 2 à 3 fois la taille décrite dans `idees.md`. Une ligne ne doit pas se lire comme une route. Une marque au sol se peint en contexte, un objet en sprite.
9. **Places à demander à LAYOUT et GROWTH** : que le remplissage ne recouvre à aucun palier. Une maison qui pousse sur une trace la ferait reculer.
10. **Le compte** : ces cinq font 13 peintures. Le budget d'images de PROBE décidera.

## Les questions pour Guillaume

**1. Une séance supprimée.** Le village se calcule du journal, sans mémoire. Supprimer une séance retire ce qu'elle apportait, y compris sur l'autre téléphone. La règle 2 ne tient donc que pour les traces de dates : l'arbre, la souche (sauf fusion). Le sentier, la poutre et l'aire peuvent redescendre si la séance supprimée les tenait au seuil.
- **a. Accepter** : « rien ne recule, sauf ce que tu effaces », comme les bâtiments aujourd'hui. Aucune donnée nouvelle. **Ma recommandation.**
- **b. Garder un plus haut atteint** : une donnée nouvelle, et la trace n'est plus une pure fonction du journal.
- **c. Ne garder que les traces de dates** : promesse tenue, mais adieu les trois villages différents.

Ce choix touche une promesse de Bati : il t'appartient.

**2. Une séance supprimée garde-t-elle sa date ?** Pour que l'arbre tienne, il lirait `deleted_sessions`, donc une séance effacée, même refusée à l'écran de victoire, laisserait sa date. Ma recommandation : oui pour l'arbre, c'est invisible et sans contenu.

**3. Voit-on une trace arriver ?** Le risque de theo. Rien ne le signale aujourd'hui, et l'amendement B permet « un moment » pour une nouvelle trace. Proposition : un petit moment discret à la première ouverture après le gain, pour GAME. Et un premier seuil atteignable dans le premier mois pour chaque trace visible.

**4. Les côtes du monstre.** La meilleure silhouette des quinze, mais `boss_fights` n'est pas fusionné : deux téléphones diffèrent, et supprimer une séance relève le boss. L'antre a déjà ce défaut. Les accepter pareil, ou attendre que les campagnes soient fusionnées ? Ma recommandation : attendre.

**5. Une heure de séance ?** Le banc et la lanterne plaisent à theo, mais récompensent les heures extrêmes. Une version sans extrême (« toujours le même créneau du soir », avant 22 h) resterait possible. Je la laisse de côté sauf si tu la veux.
