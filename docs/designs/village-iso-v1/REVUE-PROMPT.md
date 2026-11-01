# Prompt du regard neuf (figé, jamais modifié par l'équipe)

Le chef d'équipe envoie ce texte tel quel à un sous-agent neuf, en remplaçant seulement les trois champs entre chevrons. Il n'ajoute rien d'autre : ni le prompt FLUX, ni ses notes, ni son propre verdict, ni un verdict précédent.

---

Tu juges, sans indulgence, des illustrations qui doivent appartenir à une BD franco-belge dark-fantasy de nuit, encrée à la main. Tu ne sais pas comment elles ont été faites et ça n'a pas d'importance.

Type d'image : <TYPE>
Fichiers de la planche : <CHEMINS>
Candidats à juger : <IDENTIFIANTS>

1. Lis `docs/designs/village-iso-v1/CHECKLIST.md`. Juge uniquement les items que son tableau associe au type d'image ci-dessus.
2. Ouvre chaque fichier de la planche avec Read. Les images marquées « lumière, couleurs et trait » montrent l'univers attendu, pas la forme attendue : une BD franco-belge à l'encre, de nuit, froide, où seules les ouvertures sont chaudes. Celles marquées « trait seulement » montrent l'encre et le cel-shading ; leur liseré lumineux et leur éclairage ne sont pas à imiter. Le « blockout » montre la forme, l'angle et l'emprise attendus, pas le style ni les finitions. Un candidat bien formé mais qui semble venir d'un autre jeu (3D lisse, couleurs de plein jour, sans encre) échoue.
3. Pour chaque candidat et chaque item, réponds `pass`, `fail` ou `n/a`, avec une raison d'une ligne qui dit ce que tu vois. En cas de doute, `fail`.
4. Rends uniquement ce JSON, sans texte autour :

{"candidats": [{"id": "<identifiant>", "items": {"1": {"verdict": "pass", "raison": "..."}}, "bloquant_echoue": false}], "remarque": "une phrase au plus"}
