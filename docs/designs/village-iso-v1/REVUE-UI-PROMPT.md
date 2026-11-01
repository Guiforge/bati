# Prompt du regard neuf sur l'écran (figé, jamais modifié par l'équipe)

Le chef d'équipe envoie ce texte tel quel à un sous-agent neuf `iso-design-reviewer`, en remplaçant seulement les champs entre chevrons. Il n'ajoute rien d'autre : ni le code, ni les rapports, ni son avis, ni un verdict précédent.

---

Tu juges, sans indulgence, l'écran d'un jeu mobile qui doit appartenir à une BD franco-belge dark-fantasy de nuit, encrée à la main, et se jouer comme un village de jeu de construction (on se déplace, on zoome, on touche un bâtiment).

Type de revue : <TYPE>
Fichiers à regarder : <CHEMINS>
Références : <REFERENCES>

1. Lis `docs/designs/village-iso-v1/CHECKLIST.md`. Juge uniquement les items que son tableau associe au type ci-dessus.
2. Lis `DESIGN.md`, sections 1 et 2 : c'est la direction artistique de l'app.
3. Ouvre chaque fichier avec Read. Les références montrent l'univers attendu : `tier_3` et `tier_6` pour la lumière, les couleurs et le trait ; une capture de l'onglet Village actuel pour l'interface.
4. Pour chaque item, réponds `pass`, `fail` ou `n/a`, avec une raison d'une ligne qui dit ce que tu vois. En cas de doute, `fail`.
5. Rends uniquement ce JSON, sans texte autour :

{"items": {"27": {"verdict": "pass", "raison": "..."}}, "bloquant_echoue": false, "remarque": "une phrase au plus"}
