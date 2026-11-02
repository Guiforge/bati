# Checkpoint de l'étape 0, session 1

Écrit la nuit du 02 au 03/11, sans attendre : tes réponses avant de te coucher sont appliquées. Rien ici ne bloque la nuit. Le matin, chaque point se relit en oui ou non, et tout peut encore changer avant les vagues.

Base propre : `bb2d9a82` pour le code, poussée sur `origin/feat/village-iso` (`ee63e477`). 526 suites vertes d'un seul coup. Le coin de beauté correspond au verrou à 0,000 %.

## 1. La planche de cartes

[`card-sheet.md`](card-sheet.md) : les 21 bâtiments, 4 lignes chacun, relue par theo et mara. Tout est gardé pour l'instant, à toi de rayer.

Ce qui s'écarte du catalogue, à confirmer :
- **Arène** : un petit Colisée à trois étages d'arcades, la couronne sur colonne se lisait comme un anneau sur un bâton.
- **Feu de camp** : le Ménestrel remplace le cuistot. **Bosquet** : l'Herboriste remplace le druide. **Arène** : la Championne s'incline devant la poule.
- **Carrière** : plus de géode (gemmes, lecture butin), des marques de tailleur tracées en code qui s'allument marche par marche.
- **Forge** : plus d'épée dans l'enclume (doublon de la Fontaine).
- **Grand Chemin** : une borne avec une tortue en relief.

Les deux `[wink]` restent non approuvés, on prépare leur repli :
- Flèche dans la genouillère : theo pour, mara contre (réplique connue, frôle la blessure). Repli : la cible criblée au mur.
- Saut dans le foin : gardé par theo. Repli : le guetteur et la cigogne.

### Les directions du mythique (E1)

Silhouette et flou à 96 dp, deux mélanges avec témoins, étrangers à l'aveugle. Détail : [`explore/E1/verdict.md`](explore/E1/verdict.md).

| Direction | Verdict |
|---|---|
| Moulin A, pic de cristal | passe, à la relance |
| Moulin B, rosette à 6 pales | passe |
| Moulin C, lyre d'Éole | passe |
| Observatoire A, atlantes | **échoue : « Well » 8 fois sur 8** |
| Observatoire B, grand orrery | échoue |
| Observatoire C, grand astrolabe | passe |

![Moulin](explore/E1/planche_windmill.png)
![Observatoire](explore/E1/planche_observatory.png)

**Les atlantes étaient ta demande.** Je tente une seule retouche de maquette à 0 $ (A2). Si elle échoue aussi, l'astrolabe C part seul cette nuit. Dis-moi le matin si tu veux insister. Ces images sont locales, non versionnées.

## 2. Règle des améliorations
**B**, avec marqueur et tap propres : ta réponse. Cela demande une donnée nouvelle, le « rang de base vu » par amélioration, une clé de préférence, sans migration de schéma.

## 3. Les questions de la prep
Mes réponses par défaut, appliquées : [`decisions.md`](decisions.md). Les deux que tu peux vouloir rayer :
- Jour de la mise à jour : pas de show pour un bâtiment repeint dont le rang ne change pas.
- Tente : le chien reste celui du gag, pas ton animal gardien.

## 4. Battement de rang et éléments statiques
Oui aux deux, tes réponses. **Une chose à trancher le matin :** tech a trouvé que `VillageScene.tsx:514` fait déjà évoluer seul un bâtiment prêt avant une séance, sans tap. C'est contraire à la promesse « rien sans tap », et ça existe aujourd'hui. Derrière le nouveau drapeau, ce chemin ne réclame plus rien ; drapeau éteint, rien ne change.
- **Le nouveau comportement devient-il le bon pour tout le monde ?** Je recommande oui : un joueur verra plusieurs bâtiments en attente après une séance, à toucher un par un.

## 5. Tailles d'image, pour information
[`headroom.md`](headroom.md) : les 21 bâtiments tiennent dans la taille actuelle tant que l'aire peut grandir. Les plus serrés : moulin, tour du mage, forge. Toute hausse sera notée dans `decisions.md`.

`iso-spec.test.ts` exige toujours 200 px libres, ce que les specs pilotes ne respectent pas. Il ne lit que les anciens stades, et un contrôle séparé mesure le vrai sommet dans le canevas. À revoir si le nouvel art remplace l'ancien.

## 6. Calibration et estimations

**Calibration : échec au retest, tu as dit de continuer.** Premier test 1 ÉCHEC sur 5 et 3 BON sur 3, retest 2 sur 3, pour mara comme pour theo. Tous deux ont dit BON à la place de nuit avec anneaux et bannières. Ils acceptent facilement un bâtiment « sobre mais bien fait », d'où les notes [`calibration/notes-mara.md`](calibration/notes-mara.md) et [`notes-theo.md`](calibration/notes-theo.md), passées à chaque jugement. **Ne prends pas leurs verdicts sur un défaut vectoriel de nuit pour acquis : regarde toi-même au checkpoint de verrouillage.**

**FLUX.** Plafond passé à 75 $ à ta demande, 30,16 $ disponibles. Estimations de tête, pas de mesures, à corriger au checkpoint de verrouillage :
- Session 1 : environ 20 $.
- Les 19 autres bâtiments : 75 à 115 $, soit bien au-delà du plafond actuel.

**Sous-agents.** 44 sur 250 à ce stade. Pour tout le chantier, ordre de grandeur 400 à 500, donc plusieurs sessions.

## Ce qui reste à savoir
- `moteur` : pas prêt selon tech à l'écriture de cette page, corrections en cours, jugé ensuite par anim.
- Rien n'est allumé dans un build publié.
