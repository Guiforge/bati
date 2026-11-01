---
title: Perf TypeScript de la carte iso (Hermes, React Compiler, Reanimated 4)
type: research
status: draft
updated: 2026-10-31
---

# Perf TypeScript de la carte iso

Pile lue dans `package.json` : Expo ~58.0.19, react-native 0.88.0, react 19.3.0, reanimated 4.7.1,
worklets 0.13.0. Ce que `docs/architecture/performance.md` dit déjà (pas de memo manuel, jamais
`.value` côté JS, transform/opacity seulement, flag `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`,
boucles ambiantes bornées) n'est pas répété.

## Réponse en une phrase

Les ~300 ms de surcoût à froid viennent probablement de l'évaluation à l'import de ~15 000 lignes
de littéraux et du premier rendu de `Tuile`, et le React Compiler ne règle ni l'un ni l'autre :
il faut sortir du rendu et de l'import ce qui ne dépend que de constantes.

## Les 5 tips à plus fort gain

1. Précalculer au build les chaînes `d` et listes statiques des tuiles (JSON généré, comme `isoLisiere.json`).
2. Ne pas évaluer `maquettes1..4` au démarrage de l'onglet (découpage + `require` à la demande, ou JSON).
3. Sortir du rendu les `Set`/`Map`/tableaux dérivés de constantes ; grille dense en `Uint8Array`.
4. Une seule passe et un seul tableau pour bâtir une chaîne de path (plus de `filter().map().flatMap().join()`).
5. Mesurer avant de corriger : `console.time` autour de l'import et d'un rendu de `Tuile`, build `.perf`.

## Q1. Gros modules de données sur Hermes

**Le bytecode ne se parse pas à l'exécution.** En release Hermes compile le JS en bytecode au build ;
il peut être mappé en mémoire sans lecture complète, ce qui améliore le TTI. Sources : doc RN
"Using Hermes", "Optimizing JavaScript loading", billet Meta sur Hermes. Donc le coût de
`maquettes*.ts` n'est pas du parsing, c'est l'**évaluation** : au premier `require`, le corps du
module construit chaque objet, tableau et chaîne avant que l'onglet ne dessine.
*Bati : oui*, premier suspect des 300 ms. Aucun chiffre Hermes publié trouvé pour "N Ko de littéraux".

**Pas de chargement paresseux du corps d'un module en release.** `Design.md` décrit un module compilé
en entier à l'avance ; le billet Meta réserve la compilation paresseuse au debug. Charger un module
évalue donc tout son corps. *Bati : oui*.

**Metro n'inline pas les `require` ici.** La config installée
(`node_modules/@expo/metro-config/build/ExpoMetroConfig.js`, l. 459 à 463) renvoie
`inlineRequires: false`. Un import statique en tête de fichier s'évalue donc au chargement du
premier module qui l'importe (`maquettes.ts` est tiré par `IsoCarteDemo`, `Chantier`, `Statue`,
`carteDemo`, `reflets`, `lisiereChoix`). La doc RN dit qu'un `require()` appelé au premier usage
repousse l'évaluation, au prix d'un ordre d'évaluation changé (effets de bord).
*Bati : oui, mais* différer ne gagne que si le premier rendu n'a pas besoin de toutes les entrées.
À vérifier : `carteDemo.ts` et `reflets.ts` parcourent-ils toute la table ? Activer `inlineRequires`
globalement est un risque large (Tamagui, plugins), non testé.

**JSON contre littéral.** V8 mesure `JSON.parse` 1,7 fois plus rapide qu'un littéral objet
équivalent, règle pratique à partir de 10 Ko, pour un objet évalué une fois (V8, "Cost of JavaScript
2019"). Mesure V8, **non vérifiée sur Hermes**. *Bati : probablement oui* : essayer `maquettes1.json`
et comparer l'évaluation en release. Contrainte : un `.json` perd la vérification de `SpriteIso` ;
le test générateur `iso-maquettes.test.ts` doit valider la forme.

## Q2. Ce que le React Compiler mémoïse, et comment le vérifier

- Il mémoïse JSX, valeurs calculées et fonctions **dans les composants et hooks seulement**, et son
  cache **n'est pas partagé entre composants** (react.dev, "React Compiler"). La doc ne dit rien de
  `Map`/`Set`/contexte : tout ce qui suit est l'application des règles, pas une citation.
- `useMemo` "n'accélère pas le premier rendu" (react.dev, useMemo). Les 300 ms à froid sont un
  premier rendu : **le memo n'y change rien**. Il ne sert qu'aux rendus suivants.
- Dans `Tuile` tout dépend de props. Si le parent (`IsoCarteDemo` l. 1653 à 1684) redonne un `Set`
  ou un tableau d'identité nouvelle (ambiance, `reclames`, `montres` changent), les chaînes `d`
  de **chaque** tuile sont recalculées. *Bati : oui*, d'où l'intérêt de sortir le statique.
- Seuil de la doc : un calcul est suspect à ~1 ms ou plus, ou en bouclant sur des milliers
  d'objets (react.dev, useMemo). `Tuile` boucle sur toutes les cases : on y est.
- Vérifier qu'un composant est compilé : badge "Memo ✨" dans React DevTools (react.dev,
  "Debugging"), et `__tests__/react-compiler-coverage.test.ts` du dépôt (échoue sur un bail-out
  non listé). Contrôler qu'aucun fichier de `components/village/iso/` n'est dans `ALLOWED`.
- Vérifier qu'il ne re-rend pas : la doc RN "Profiling" ne cite pas le profiler React. De ma
  connaissance, non sourcé ici : DevTools Profiler avec "Why did this render", ou un
  `console.count("Tuile")` temporaire en build `.perf` (un compteur par `useRef` pendant le rendu
  est interdit par le compiler). `why-did-you-render` : non vérifié avec React 19 / RN 0.88.

## Q3. Précalcul au build

`Tuile` (l. 348 à 409) calcule `terres`, `eaux`, `fonds`, `bord`, `plaques`, `sombres`, `galets`,
`decals`, `terrains` depuis `rect`, `cases`, `biome`, `bords`, `ruisseau` : des constantes de la
carte, indépendantes de l'état du héros (le code l'écrit lui-même, l. 373 : "never changes").
Précalculer au build les chaînes `blob`/`diamant`/`dessinDecal` et les listes `galets`/`terrains`,
sur le modèle de `constants/isoLisiere.json` (`UPDATE_LISIERE=1 npx jest iso-lisiere` l'écrit,
`lisiere.ts` l'importe). Gardes : un test qui échoue si le JSON est périmé ; ne précalculer que le
statique (`boites`, `ombres`, `lumiere` dépendent de l'état) ; peser le JSON dans le bundle
(performance.md § Binary size) car des chaînes de path pèsent. *Bati : oui*, c'est le tip 1.

## Q4. Worklets Reanimated 4

- **Peu de nœuds animés.** Doc Reanimated "Performance" : pas plus de ~100 composants animés sur
  Android bas de gamme. *Bati : oui* : animer le conteneur de la carte (pan/zoom), jamais chaque
  `Path` ou tuile.
- **Closure copiée une fois.** Doc Worklets ("Understanding closures", "Troubleshooting") : sur un
  autre runtime la closure est "une copie exacte" des variables ; un objet capturé n'est copié
  qu'une fois, ses mutations n'arrivent pas, il est gelé en dev avec un avertissement. Un worklet
  qui capture `MAQUETTES` ou toute la liste de cases paie cette copie. *Bati : oui* : capturer des
  nombres ou un petit tableau. (performance.md énonce la règle sans la source.)
- **Lecture JS d'une shared value** : "à éviter", elle bloque le thread JS jusqu'à la réponse de
  l'UI (doc Performance). Déjà couvert par `.get()`/`.set()`. *Bati : déjà fait*.
- **Calcul lourd par trame dans `useAnimatedStyle`** : la doc ne chiffre pas. Le worklet tourne
  à chaque trame, donc seulement de l'arithmétique dedans, tout le reste calculé côté JS. *Bati :
  oui*, non mesuré.
- **Drapeaux** (doc Performance) : `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS` (RN 0.80+, Reanimated
  4.2+) pour la baisse de fps au scroll, `DISABLE_COMMIT_PAUSING_MECHANISM` pour les saccades de
  scroll. Non testés ici. *Bati : à essayer seulement* si le pan accroche pendant d'autres animations.

## Q5. Patterns JS chauds sur Hermes

- **Concaténation contre `join`.** Seuls des micro-benchmarks génériques (measurethat.net) trouvés ;
  aucun ne teste Hermes, rien sur d'éventuelles "ropes" Hermes. **Non vérifié sur Hermes.** Prudence :
  un tableau, des `push`, un `join("")` final, plutôt que 3 à 4 tableaux intermédiaires par case
  (`filter().map().join()`, `flatMap`). *Bati : oui*, mais mesurer sur appareil avant d'en faire une règle.
- **Allocations dans le rendu.** `new Set(...)` (l. 350, 351, 1453, 1653), `flatMap` (l. 395, 402,
  1672 à 1684) et spreads allouent à chaque rendu. *Bati : oui* : hors du rendu tout ce qui dérive de
  constantes.
- **Tableaux typés.** Pris en charge par Hermes (`Features.md`, doc ancienne). `visibles` et
  `dansTuile` (`Set<number>` de clés `gy * TAILLE + gx`) peuvent être un `Uint8Array` de
  présence, comme `bords` l'est déjà. *Bati : oui*.

## Ce que je n'ai pas pu vérifier

- Un chiffre Hermes pour "littéraux TS contre JSON" à l'évaluation.
- Si les 300 ms sont l'import des maquettes ou le premier rendu des tuiles (les deux sont
  plausibles) : un profil Hermes ou deux `console.time` en `.perf` tranchent. Ne pas choisir sans.
- Le comportement du compiler sur `Map`/`Set`/contextes, `why-did-you-render` sous React 19, les
  ropes de chaînes Hermes, le coût chiffré de copie d'une closure de worklet.

## Sources

- [Using Hermes (React Native)](https://reactnative.dev/docs/hermes)
- [Optimizing JavaScript loading (React Native)](https://reactnative.dev/docs/optimizing-javascript-loading)
- [Profiling (React Native)](https://reactnative.dev/docs/profiling)
- [Hermes: An open source JavaScript engine (Meta Engineering)](https://engineering.fb.com/2019/07/12/android/hermes/)
- [Hermes Design.md](https://github.com/facebook/hermes/blob/main/doc/Design.md)
- [Hermes Features.md](https://github.com/facebook/hermes/blob/main/doc/Features.md)
- [The cost of JavaScript in 2019 (V8)](https://v8.dev/blog/cost-of-javascript-2019)
- [React Compiler, introduction](https://react.dev/learn/react-compiler/introduction)
- [React Compiler, debugging](https://react.dev/learn/react-compiler/debugging)
- [useMemo (React)](https://react.dev/reference/react/useMemo)
- [Reanimated, Performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [Worklets, Understanding closures](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/closures/)
- [Worklets, Troubleshooting](https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting/)
- Dépôt : `docs/architecture/performance.md`, `metro.config.js`, `ExpoMetroConfig.js`,
  `components/village/iso/IsoCarteDemo.tsx`, `components/village/iso/maquettes.ts`
