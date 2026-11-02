# Piste surroundings : bilan intermédiaire

**La piste n'est pas finie.** Ce bilan date du 01/11 et n'est pas à jour. Le 02/11, le coin de beauté a fait ses 5 tours sur `loupe-bc`, non fusionnée : voir `loupes/checkpoint.md`, qui attend les réponses de Guillaume. R1 et l'intégration finale n'ont pas commencé. Il sera remplacé par le bilan final.

## État des défauts

| Défaut | État | Preuve |
| --- | --- | --- |
| G16 cache d'images | **Passe** | `__tests__/iso-cache-images.test.ts`, 3 tests. Empreinte + purge, car `cacheKey` n'atteint pas les images `res:`. |
| G15 nuit | **Échoue, parqué** | Branche `loupe-s-night` non fusionnée, voir plus bas. |
| G03 arbres fixes | Code fait, non vérifié en jeu | Retirés sur `loupe-bc`, jest vert, aucune capture faite. Non fusionné. |
| G01, G02, G04, G05, G06, G07 | À faire | Coin de beauté, puis R1 et R2. Présents sur la baseline. |
| G14, G19 | À faire | R5 et R6, hors de cette session. |
| G17 flamme sur une cabane | Non tranché | Le dump n'enregistre que les flammes de foyer de bâtiment : il ne peut pas encore le prouver. R7. |
| G18 créatures sans images dessinées | Non vérifié | R7. |

G08 à G13 appartiennent aux autres pistes.

## S-night, parquée

- 4 tours. Le critère 1 échoue sur p12 (0,9849 pour 0,987), les autres critères mesurés passent. Parcelles reconnues à l'aveugle : 3 sur 3.
- A/B : 0 gain sur 9 selon la règle, peu probant. Un contexte est nul (canari manqué deux fois), l'autre est partagé à 5 contre 4, avec un biais vers la gauche.
- Env : le sol va mieux, mais forêt monochrome, blé gris, pavés qui brillent.

Avant, après : [loupes/s-night/avant-apres.webp](loupes/s-night/avant-apres.webp)

## Consommation

- FLUX : 2,03 $ cette session. Registre : 36,45 $ sur 40 $, reste 3,55 $.
- Sous-agents : 15 passages sur 80.
- APK arm64 : 71,1 MiB, au-dessus de la limite de 55 MiB du prompt, avant toute loupe. Rien n'a été fusionné depuis.

## Questions parquées

- S-night : parquer, reprendre avec un contrat refait, ou fusionner ?

## Les 3 décisions à prendre

Détail et images dans [loupes/checkpoint.md](loupes/checkpoint.md).

1. Choisir les écrans cibles des paliers 1, 6 et 12.
2. Écrire la ligne `BUDGET_FLUX_V1: 60`. Sans elle, BC s'arrête aux sondes.
3. Routes et champs peints ou en code. La bible et le prompt se contredisent.
