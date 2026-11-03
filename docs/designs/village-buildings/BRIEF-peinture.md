# Commande : peindre un bâtiment en final

Pour un peintre. Travaille sur place dans `/home/guiforge/Documents/code/bati/.claude/worktrees/iso`, sans commit. Lis `docs/designs/village-buildings/retours-concepts-2.md` et la spec `scripts/bld/final/<code>.json`. Ne lis rien d'autre sans besoin.

Commandes, dans cet ordre, au premier plan, FLUX sous `flock ~/.cache/bati-flux.lock timeout 590` :

```
python3 scripts/bld/final.py emprise <code>
... final.py paint <code> rough     puis pick <code> rough N
... final.py paint <code> grand     puis pick <code> grand N
... final.py paint <code> solid     puis pick <code> solid N
... final.py paint <code> legendary puis pick <code> legendary N   (pas de legendary pour dragon_lair, heroes_hall, champion_arena)
... final.py paint <code> mythic    puis pick <code> mythic N
... final.py elements <code>
python3 scripts/bld/final.py strip <code>
```

- **Choix :** la variante sans personnage, sans erreur d'image, la plus fidèle au concept et à la lignée.
- **Personne :** toute figure humaine visible refuse la variante.
- **Mythique :** même structure que le legendary, en plus grand, avec un vrai spectacle, dans le bâtiment autant que dans l'effet. Ni runes ni lettres peintes.
- **Couleur :** aucune couleur proche du magenta dans le bâtiment, le fond magenta la mangerait au détourage. Si le prompt en demande, remplace-la par une teinte chaude ou froide franche, dans la spec, et note-le.
- **Reprises :** `strip` est le contrôle, il doit passer. Au plus 2 reprises par stade (`--try N`), en changeant une seule chose à la fois. Si ça ne passe toujours pas, garde la meilleure, dis-le, ne boucle pas.
- **Plafond :** 2 $ pour le bâtiment. Compte sur les images (0,048 $ pièce), car le registre compte aussi les autres.
- **Alerte de budget :** arrête-toi et dis-le. N'exécute jamais `budget ack`, `klein-ack`, et ne touche pas au plafond.
- **Modération :** reformule une fois en décrivant ce qu'on voit, puis dis-le.

Interdits : `docs/designs/village-loop/loupes/`, `git clean`, l'émulateur, `.claude/agents/`, `assets/`, `scripts/provenance.json`, `scripts/bld/final.py` sauf bug bloquant (d'autres peintres l'utilisent, change le minimum et dis-le). Jamais de boucle sur `pgrep -f`.

Réponds en français, en 6 lignes au plus : coût, résultat de `strip`, le mythique en une phrase, les défauts qui restent, ce qui a raté. Sois franc : ne dis pas spectaculaire si ce n'est pas le cas.
