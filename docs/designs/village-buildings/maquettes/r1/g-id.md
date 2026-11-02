# G-ID, silhouettes, tour 1 : échec

12 images (5 stades + le mythic flouté, par bâtiment), deux étrangers S-A, deux mélanges.
Les clés sont dans `~/.cache/bati-buildings/pilot-r1-a` et `pilot-r1-b`.
Passe si le nom est juste pour chaque image, dans les deux contextes.

| Image | S-A, réponse brute | S-A | S-B, réponse brute | S-B |
|---|---|---|---|---|
| moulin rough | Windmill | ok | Windmill | ok |
| moulin solid | Windmill | ok | Windmill | ok |
| moulin grand | Windmill | ok | Windmill | ok |
| moulin legendary | Windmill | ok | Windmill | ok |
| moulin mythic | Windmill | ok | Windmill | ok |
| moulin mythic flouté | Windmill | ok | unsure (« looks like a windmill », « tiny thumbnail ») | échec |
| observatoire rough | Observatory, peu sûr | ok | Observatory | ok |
| observatoire solid | Observatory, peu sûr | ok | Observatory | ok |
| observatoire grand | Observatory | ok | Observatory (« no dome visible ») | ok |
| observatoire legendary | Observatory | ok | Wizard Tower, peu sûr | échec |
| observatoire mythic | Observatory | ok | Observatory, peu sûr | ok |
| observatoire mythic flouté | unsure (« tiny », « probably Observatory ») | échec | unsure (« tiny thumbnail ») | échec |

Score : S-A 11/12, S-B 9/12. Le moulin passe en clair, l'observatoire non.

Limite du test : les étrangers n'ont vu que ces deux bâtiments, le contraste est donc facile.
Les flous de ce tour font 96 px, pas 96 dp : l'outil confondait les deux.
