# Plan du village iso V1 (wiki)

Une ligne par tâche. L'orchestrateur ne lit que ce fichier, status.json et progress.md ; chaque worker reçoit seulement le chemin de sa fiche.

| Id | Tâche | Dépend de | Rôle | Fiche |
| --- | --- | --- | --- | --- |
| T20 | Mémoire du monde et corrections vues à l'écran | aucune | iso-engineer | [tasks/T20.md](tasks/T20.md) |
| T21 | Carte presque plein écran, gestes seuls, rotation | T20 | iso-engineer | [tasks/T21.md](tasks/T21.md) |
| T14 | Bulle BD au toucher | T21 | iso-engineer | [tasks/T14.md](tasks/T14.md) |
| T02b | Chantier : finitions vues à l'écran | T20 | iso-engineer | [tasks/T02b.md](tasks/T02b.md) |
| T03 | Gestes de travail, bannières, or au dernier stade | T02b | iso-engineer | [tasks/T03.md](tasks/T03.md) |
| T15 | Ambiance jour | T03 | iso-engineer | [tasks/T15.md](tasks/T15.md) |
| T16 | Mode test figé et familles animées | T03 | iso-engineer | [tasks/T16.md](tasks/T16.md) |
| T04 | Cartouche du nom du village | T21 | iso-engineer | [tasks/T04.md](tasks/T04.md) |
| T22 | Routes peintes et ruisseau sans couture | T20 | iso-artist + iso-engineer | [tasks/T22.md](tasks/T22.md) |
| T23 | Vue iso sans ciel | T20 | iso-engineer | [tasks/T23.md](tasks/T23.md) |
| T24 | Le blason dans la ville | T03, T21 | iso-engineer | [tasks/T24.md](tasks/T24.md) |
| T25 | Statue du totem sur la place | T24 | iso-artist + iso-engineer | [tasks/T25.md](tasks/T25.md) |
| T26 | Villageois qui peuplent et réagissent | T03, T14, T24 | iso-engineer | [tasks/T26.md](tasks/T26.md) |
| T28 | Bug : villageois dessinés derrière les bâtiments (prioritaire) | aucune | iso-engineer | [tasks/T28.md](tasks/T28.md) |
| T30 | Ombres au sol plus fines, par tours d'audit | T23 | researcher + qa + design-reviewer + engineer | [tasks/T30.md](tasks/T30.md) |
| T27 | Passe de finition : sprites contre images, vitesses, détails | T22, T23, T03 | qa + design-reviewer + artist + engineer | [tasks/T27.md](tasks/T27.md) |
| T31 | Animaux qui ont leur propre vie (comportements au hasard, pas une boucle) | T27, T16, T26 | researcher + artist + engineer | [tasks/T31.md](tasks/T31.md) |
| T32 | Son d'ambiance simple (fond jour et nuit, forge et moulin au zoom) | T27, T15 | researcher + engineer | [tasks/T32.md](tasks/T32.md) |
| T36 | Lot 7 de l'audit DA : la peinture que Guillaume retient, bake-off FLUX d'abord | T27 | chef + iso-artist + iso-art-reviewer | [tasks/T36.md](tasks/T36.md) |
| T37 | L'effet de la séance visible en moins d'1 s (révélation, son, vibration) | T02b, T32 | iso-engineer + qa + design-reviewer | [tasks/T37.md](tasks/T37.md) |
| T38 | Solder les reliquats reportés (bugs, accroches, rotation, tap de la 1re seconde) | T27 | chef + engineer + blender + qa | [tasks/T38.md](tasks/T38.md) |
| T39 | Le bord du village se fond dans le décor | T36 | qa + design-reviewer + engineer | [tasks/T39.md](tasks/T39.md) |
| T40 | Habitants qui font quelque chose, même immobiles (poses de repos peintes) | T26, T36 | blender + artist + engineer | [tasks/T40.md](tasks/T40.md) |
| T41 | Un village fantastique dont on est fier de voir la croissance (magie, évolution des stades) | T36, T39, T40 | chef + reviewers + engineer + artist | [tasks/T41.md](tasks/T41.md) |
| T42 | Des villageois qui vont avec leur bâtiment (rôle et activité selon le voisin) | T26, T31, T40 | engineer + artist + qa + design-reviewer | [tasks/T42.md](tasks/T42.md) |
| T43 | Boucle d'audit Mara et Théo (FUN, PRIDE, PERSONAL), agencement et poids du village | T41, T42 | chef + qa + design-reviewer + engineer + artist | [tasks/T43.md](tasks/T43.md) |
| T44 | Des quartiers qui se remplissent tout seuls (petites maisons, échoppes, remparts, selon l'état du village) | FIN-DIS, FIN-ECH | chef + engineer + blender + artist + qa + design-reviewer | [tasks/T44.md](tasks/T44.md) |
| T33 | Boucle d'amélioration et d'audit « village vivant » (fiche de Guillaume) | T26, T31, T32, T36, T37, T38, T39, T40, T41 | chef + qa + design-reviewer + engineer | [tasks/T33.md](tasks/T33.md) |
| T09 | Revues de l'intégration : écran et personas | T21, T14, T03, T04, T22, T23, T24, T25, T26, T27, T28, T30, T31, T32, T33 | chef + iso-design-reviewer | [tasks/T09.md](tasks/T09.md) |
| T05 | Revue « Village complet peint » | T09 | iso-qa + iso-design-reviewer | [tasks/T05.md](tasks/T05.md) |
| T06 | Mesures finales, vidéo, rapport V1 | T05, T15, T16 | iso-qa + chef | [tasks/T06.md](tasks/T06.md) |
| T34 | Build de release rejoué en local, sans erreur ni warning (jamais `npm run release`) | T06 | iso-qa + iso-engineer | [tasks/T34.md](tasks/T34.md) |
| AUD | Audit du lot 6 | T06, T34 | iso-tech-auditor (modèle du chef) | [tasks/AUD.md](tasks/AUD.md) |
| T35 | Prête à fusionner : maquettes hors de l'APK, preuves hors de git, commandes pour Guillaume | AUD | chef + iso-engineer | [tasks/T35.md](tasks/T35.md) |
| HF | Porte finale (Guillaume) | AUD, T35 | Guillaume | [tasks/HF.md](tasks/HF.md) |

## Après la V1 (ne rien coder dans ce plan)
- Le jeu du village de la roadmap (https://claude.ai/artifact/4kesL29VDvFVXveZw7pCq4) : lot 1 « ça réagit » (VI-00 moteur, VI-01 graine, VI-21, VI-29, VI-22, VI-09, VI-10, VI-18, VI-05), lot 2a (vocation, plans, saisons, jour et nuit réels, abri du gardien), lot 2b (paysages), puis le parking (VI-35 d'abord). Bati+ et le village : hors de ce plan.
- Son, au-delà du fond et de deux bâtiments (T32) : taverne, foule, musique, sons d'animaux qui suivent leur comportement, one-shots en variantes, pack payant hors dépôt pour le build Play (page « Sons du village Bati », https://claude.ai/artifact/1zwCuUDdZpYqL7U2qh4v22).
- Retouches d'art voulues par Guillaume : 6 stades restés en maquette (reviews/L6-T01-art-f8.md), cause commune d'abord (dérive vers le bleu saturé), nouvelle maquette pour high_road_solid.
- Moteur du village de la spec (pierres, événements village.*, quartiers, paysages, stèles, statues) : PLAN-SPEC-VI.md §1 et §4.
- Village qui pousse, remplissage de petites maisons : PLAN-SPEC-VI.md §7. Avant de produire les maisons (audit externe du 30/10) : une seule maison posée des deux côtés d'une rue dans toutes les orientations utiles (sans doute 4, porte vers la rue, éclairage jamais inversé) ; plan du village versionné (`generatorVersion`, positions et identifiants stables, migration additive : un bâtiment acquis ne bouge jamais) ; densité par distance à la place, du vide gardé ; inventaire unique des assets avec budget mémoire ; régression visuelle en CI sur graines fixes.
