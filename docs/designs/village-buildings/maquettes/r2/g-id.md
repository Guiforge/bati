# G-ID, silhouettes, tour 2 : échec

Même test que le tour 1, deux nouveaux étrangers S-A, deux nouveaux mélanges.
Les clés sont dans `~/.cache/bati-buildings/pilot-r2-a` et `pilot-r2-b`.
Flou corrigé : 96 dp à une densité supposée de 2,75, soit 264 px.

| Image | S-A, réponse brute | S-A | S-B, réponse brute | S-B |
|---|---|---|---|---|
| moulin rough | Windmill | ok | Windmill | ok |
| moulin solid | Windmill | ok | Windmill | ok |
| moulin grand | Windmill | ok | Windmill | ok |
| moulin legendary | Windmill | ok | Windmill | ok |
| moulin mythic | Windmill | ok | Windmill | ok |
| moulin mythic flouté | Windmill | ok | Windmill | ok |
| observatoire rough | « Observatory, or unsure » | ok, faible | unsure (« wide and low with the tube alone ») | échec |
| observatoire solid | Observatory | ok | Observatory | ok |
| observatoire grand | Observatory, moyen (« Forge? No ») | ok | Barn (« two upright pillars with a gap ») | échec |
| observatoire legendary | Observatory | ok | Observatory | ok |
| observatoire mythic | Observatory | ok | unsure (« a big round ball ») | échec |
| observatoire mythic flouté | Training Dummy, peu sûr | échec | unsure | échec |

Score : S-A 11/12, S-B 8/12.

Gagné : le moulin passe partout, flou compris. Le legendary de l'observatoire n'est plus lu comme une
tour de mage. Perdu : les volets du grand se lisent comme une grange. Le dôme ne ressort pas en noir.
