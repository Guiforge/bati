# Audit DA par captures (30/10)

Captures : reports/AUDIT-DA-qa.md, evidence/AUDIT-DA/ (bati-bench2, worktree iso-audit, HEAD 5ea86807).

## Grille figée (iso-design-reviewer, REVUE-UI-PROMPT, type « Village complet peint »)
Échec bloquant. Pass : 13, 14, 17. Fail : 15 (décor plat à encre fine contre bâtiments épais et sombres), 16 (profondeur tour et moulin non démontrée), 18 (sol vert saturé, collage ; jour pastel), 19 (bords de l'îlot flous, halo), 29 (ombres en plaques floues), 33 (lisibilité au zoom mini), 34 (forme de l'îlot qui change d'un palier à l'autre).

## Audit détaillé (iso-design-reviewer, brief T27)
40 défauts, triés par le chef en 8 lots sur la page https://claude.ai/artifact/8KQSYcVMTkChRk5Di1q6qu : lot 1 sol et petits objets (4, 5, 6, 7, 8, 9, 10, 11, 22), lot 2 eau et bord (3, 17, 18, 40), lot 3 arbres et cadrage (1, 2, 19, 25, 27), lot 4 lumière (15, 16, 23, 26), lot 5 interface (28, 29, 30), lot 6 petites animations (12, 20, 24, 33, 36, 39), lot 7 peinture à valider (1, 13, 14, 21), lot 8 non retenu avec raison (31, 32, 34, 35, 37, 38). Trames lentes émulateur : glissé 2/636, vague 15/839 (p99 81 ms).

## Sortie après les lots 1 à 6 (31/10, captures evidence/AUDIT-DA-sortie/, HEAD d344d066)
- Grille figée : pass 13, 14, 17, 33, 34 (33 et 34 étaient en échec) ; fail 15 (sol vert saturé, encre inégale), 16 (profondeur tour et moulin non démontrée), 18 (sol en lavis doux contre sprites encrés, « nuages » collés), 19 (liseré flou en haut de l'îlot), 29 (ombres en taches molles).
- Audit détaillé : 6/10. 23 constats. Code, tour 2 en cours : 6 (fumées collées au repos), 11 (lignes de grille sur le dallage), 12 (trait parasite au bord), 17 (croissance de démo trop courte), 8 et 14 (rochers, ruines), 21 (texte sous la barre d'onglets), 22 (île coupée dans l'onglet), 23 (ferme sans bulle). Peinture ou décision de DA (lot 7 et chantiers) : 1 (palier 1 plan vide), 2 (jour : vraie palette), 3 (forêt en pochoir, silhouettes noires), 7, 9 (toits et formes), 10 (villageois), 13 (bulle), 18 et 20 (vie : contre la règle des vagues), 19 (fondu d'ouverture).
- Trames lentes de sortie inexploitables (100 % lentes, émulateur à 1080×2400 et second émulateur en marche) : mesure A/B à faire, puis Fairphone.
