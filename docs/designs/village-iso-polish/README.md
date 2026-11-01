# Passe d'amélioration par chantiers (après la V1)

Prompt de Guillaume du 30/10, collé dans la session du chef du village iso V1. Il est relancé une fois par chantier (`da`, `bugs`, `vie`, `waouh`, `lumiere`, `nature`), dans l'ordre conseillé, une fois finis les lots 1 à 7 de l'audit DA du 30/10 (docs/designs/village-iso-v1/reviews/AUDIT-DA.md).

Le texte complet du prompt est gardé par Guillaume ; chaque chantier écrit son état dans `<chantier>/STATE.md`, `BACKLOG.md`, `LOG.md`, `REPORT.md` et `evidence/`.

Pistes déjà prises par le chef avant les chantiers :
- `bugs`, ombre des villageois (Guillaume, 30/10) : l'ombre est trop prononcée et monte avec le villageois quand il rebondit ; elle doit être dessinée dans la couche du sol, sœur du sprite, ne suivre que sa position sur la grille, rétrécir et s'éclaircir quand il s'élève, plus petite que les pieds écartés, rebond de marche d'environ 2 px au zoom 1. Pris dans le lot 1 de l'audit DA.
