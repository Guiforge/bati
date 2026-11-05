# Alentours : résumé de la session 2 (05/11/2026)

**La page de choix est prête : https://claude.ai/artifact/TGeq36n8R1z8cD7dykz2it** La piste attend tes réponses. Ensuite viennent la peinture et la pose.

## Fait

- **G15, dans le jeu** : la forêt couvre le sud aux paliers 1 à 3, cache les polygones sombres et laisse la place au coin au palier 4. Le pied de la route sud est fermé (`img/foret-sud-t1-4.jpg`).
- **Camp du palier 1, dans le jeu** : 4 accessoires peints rendus.
- **G14, montage** : la bande F sur ton plan, avec les arrivées étalées du palier 7 au 12 (`img/bande-F2.jpg`).
- **Quartiers, concepts** : 3 directions (`quartiers.md`), auditées par theo, mara et env, 44 concepts Klein, montages sur les vrais rendus.
- **PROBE retiré** : l'amendement v4.3 est dans `PROMPT-tracks.md`, fusionné.

## Pas bon, ou moins bien que demandé

- **Le point focal n'est pas réglé.** Autour de la place, les cases sont trop petites : N3 reste vide, N2 a une maison sur 4. La halle du montage est confuse. La vraie réponse est la lumière, chez POLISH.
- **Les paliers 10 à 12 restent proches** vus de loin. Écart sur la vignette : 0,95 de 9 à 10, 0,39 de 10 à 11, 0,29 de 11 à 12, après une reprise.
- **H2 et H3 sont à moitié hors de l'écran**, et le recul de la forêt se voit mal à H1, déjà ouvert.
- **Forêt du sud** : +32 masses au palier 1 contre 25 visées, recul discret de 1 à 3, trous sombres le long de la route, et la route visible finit 100 px plus haut.
- **Pas de souches** : aucun sprite n'existe.
- **Montages** : les pièces sont des autocollants, sans ombre. A n'a pas passé `check`. La nuit n'est pas montrée.
- **Les juges n'ont vu que le texte** des quartiers, pas les montages.

## Vérifié, ou pas

- Vérifié : `tsc` par le sous-agent, bundle Android sans appareil, verrou d'art `LOCK_OK`, `check` aux paliers 1, 3, 6, 12 sans ligne de plus que LAYOUT. Sauvegarde de la page testée par une écriture et une lecture de ma part, sonde supprimée.
- Pas fait : aucun test lancé (règle 2), `tests-debt.md` liste ceux que la forêt casse. Le palier 6 de la forêt n'a pas de rendu avant à comparer.
- Le bouton de la page n'a pas été cliqué dans le vrai navigateur de claude.ai.

## Chiffres

FLUX : 0,35 $ sur 4 $, Klein seul (`growth_klein` 0,94 $ sur 2 $). Registre : 109,48 $ sur 140 $ au début de la session, avant ces 0,35 $. Sous-agents : 8 passages sur 150. Tu trouveras la pointe dans `git log origin/track-growth`.

**Worktree** : la session tourne dans `iso`, sur la branche locale `track-growth-iso`, poussée vers `track-growth`. L'ancien worktree `.claude/worktrees/track-growth` est derrière, et il garde les vieux brouillons dans `scratch/`.

## Pour toi

1. **Réponds sur la page** : la direction, et les questions 2 à 6.
2. **Garde tes essais de pièces.**
3. **Regarde le pied de la route sud** : elle finit 100 px plus haut pour fermer la découpe.
