# T30 : ombre de contact, techniques et coût react-native-svg

Chercheur, 2026-10-30. Dépôt : react-native-svg 15.16.0, react-native 0.88.0, Expo 58.

## Réponse en une phrase

Le standard est une ellipse écrasée (environ 2:1) sous les pieds, en dégradé radial doux ou en 2 à 3 anneaux à bord net, teintée du sol plutôt que noire ; en BD encrée l'ombre de contact est un aplat à bord net, le dégradé n'est pas le langage du dessin. Sur react-native-svg, un `RadialGradient` défini une fois par `Svg` et référencé par `fill="url(#id)"` suffit ; le flou gaussien est à éviter. Le coût d'un dégradé contre un aplat n'est pas mesuré (voir limites).

## État du dépôt (vérifié)

- Ombre des marcheurs : `components/village/iso/IsoCarteDemo.tsx` l. 1144-1162, un `Svg` par marcheur avec une seule `Ellipse` en aplat, `fill = rawColors.isoSocleShadow` (`rgba(8, 12, 22, 0.4)`, `constants/rawColors.ts` l. 135), taille `OMBRE_L = COTE * 0.56` par `OMBRE_H = COTE * 0.14` (rapport 4:1, plus plat que le 2:1 iso habituel).
- Autres ellipses (non ouvertes en détail) : `petitsDetails.tsx` l. 200-217 (rat, ce sont des corps, pas des ombres), `VeillesDessinees.tsx` l. 169, `FeuxDessines.tsx` l. 145, `CorbeauxToits.tsx` l. 117 (corps de corbeau).
- Aucun `RadialGradient` n'existe aujourd'hui dans `components/village/iso/`.

## Ce que font les jeux iso 2D et la BD

1. Dégradé radial doux en ellipse écrasée : technique dite "blob shadow", décrite comme plus simple et moins chère qu'une vraie ombre ; sprite blanc vers transparent, centre opaque, mis à l'échelle en ellipse environ moitié moins haute que large, posé aux pieds. Le plugin Godot SimpleShadow2D (défauts 32 x 16 px, soit 2:1 ; couleur noire alpha 0,5 ; décalage vertical de 8 px) en est un exemple concret.
2. Forme qui suit l'emprise : pour un petit décor (caillou, buisson, tonneau) l'ombre reprend la largeur et la profondeur du pied, pas une ellipse unique de taille fixe. Pas de source trouvée qui le documente pour les jeux ; c'est la pratique des tuiles de décor et reste ici une recommandation, pas un fait sourcé.
3. Double ellipse / anneaux : SimpleShadow2D propose `shadow_steps` (1 à 16) : 1 = une chute douce, plus = bandes à bord net, chacune à alpha multiplié par `step_falloff` (0,3 par défaut). C'est la version "BD" du dégradé : peu de paliers, bords nets. Une petite ellipse sombre sur une grande claire donne le même effet que le contact serré sur ombre diffuse.
4. Couleur : le noir pur est déconseillé hors occlusion ; un guide d'encrage recommande de réserver le noir pur "pour l'occlusion et les ombres de contact" et un ton d'ombre unique ailleurs. Teinter du sol (bleu nuit du `isoSocleShadow` déjà, ou un brun/vert foncé du tapis) s'accorde avec cette règle ; multiplier est l'équivalent sur le papier, à ne pas utiliser ici (pas de mode de fusion bon marché dans react-native-svg, non vérifié).
5. Bord net contre bord doux, BD : le même guide d'encrage dit bords durs et nets pour une source ponctuelle ou petite, plus doux pour une source large ou un ciel couvert, et une seule direction d'ombre portée par planche ; les ombres portées peuvent être remplies en aplat noir (spot blacks). Conséquence pour Bati : la direction BD (CHECKLIST 18 et 29, aplat à bord net, une seule lune) plaide pour un bord net ; un dégradé doux seul contredit les ombres portées de `ombres.ts`. Un compromis cohérent est un halo à 2 paliers nets.

## Ce que react-native-svg rend

- Vérifié (USAGE.md officiel) : `RadialGradient` s'écrit dans `Defs` avec un `id`, et la forme le référence par `fill="url(#id)"` ; l'exemple officiel emploie `gradientUnits="userSpaceOnUse"`.
- `Stop` porte `stopOpacity` (vu dans les exemples du même fichier ; la prose ne l'explique pas). Une ombre = un stop centre noir teinté à `stopOpacity` 0,4-0,5, un stop bord à 0.
- Filtres : `FeGaussianBlur` et `FeDropShadow` sont listés "implémentés", mais la doc précise que tous les filtres ne le sont pas sur natif et ne distingue pas Android ; rien ne montre qu'ils soient bon marché. Ne pas s'en servir pour des ombres (dizaines d'instances).
- Une définition par `Svg` : chaque `Svg` est une vue native ; `Defs` n'est donc pas partagé entre `Svg`. Un dégradé par `Svg` d'ombre est inévitable tant que chaque marcheur a son `Svg`, sauf à regrouper les ombres statiques dans un seul `Svg` de la carte. Les gradients sont de simples nœuds de définition, pas de bitmap (inférence, voir limites).
- Un `id` identique dans deux `Svg` distincts ne se heurte pas (chaque `Svg` a sa portée) ; non testé sur Android ici.

## Ce que cela implique pour Bati

- Garder le budget : ces ombres ne sont pas animées (elles suivent le parent animé), donc 0 nœud animé en plus. Seul le nombre de nœuds SVG compte.
- Un aplat à bord net (comme aujourd'hui) est la lecture BD la plus fidèle ; "grossier" tient plutôt au rapport 4:1, à l'unique ellipse noire-bleue identique pour tout, et à l'absence d'emprise propre. Corriger la forme et la couleur coûte moins qu'ajouter un dégradé.
- Le dégradé radial vaut surtout pour les lueurs au sol (feux), pas pour les ombres BD.

## Trois variantes à monter côte à côte

**A. Aplat à emprise propre (BD pure)**
- Forme : une ellipse 2:1 (au lieu de 4:1), largeur = emprise du pied, décalée de quelques px vers la direction opposée à la lune.
- Couleur et opacité : aplat, ton d'ombre du sol (brun-vert foncé, pas de noir), opacité 0,35-0,45, pas de contour.
- Coût : 1 `Ellipse` par ombre, 0 définition ; identique à aujourd'hui.

**B. Deux ellipses à bords nets (contact serré sur ombre diffuse)**
- Forme : grande ellipse 2:1 claire + petite ellipse centrée environ 55 % de la largeur, plus sombre, sous le pied.
- Couleur et opacité : même teinte du sol ; grande à 0,22, petite à 0,38 (le noir pur seulement, si besoin, sur la petite).
- Coût : 2 `Ellipse` par ombre, 0 définition ; +1 nœud SVG par ombre.

**C. Dégradé radial à 2 stops (doux)**
- Forme : une ellipse 2:1, `RadialGradient` en `userSpaceOnUse`, centre à `stopOpacity` 0,5, bord à 0 ; définition unique par `Svg`.
- Couleur et opacité : stop teinté du sol ; bord quasi net en fixant le second stop vers 90-100 % du rayon pour garder un halo discret.
- Coût : 1 `Ellipse` + 1 `Defs`/`RadialGradient`/2 `Stop` par `Svg` (3 à 4 nœuds de plus par `Svg` si un `Svg` par ombre) ; à regrouper pour les ombres statiques.

## Limites, non vérifié

- Coût d'un dégradé contre un aplat sur Android : aucune mesure trouvée ni faite ; la recherche n'a donné ni benchmark ni source officielle. À mesurer avec `adb gfxinfo` (protocole du dépôt) avant d'adopter C partout.
- Je n'ai pas lu le code natif Android de react-native-svg : "pas de bitmap, un shader" est une inférence.
- Aucune étude de cas d'un jeu iso précis (Hades, Bastion, etc.) n'a été ouverte ; seuls un plugin Godot (doc) et des guides d'encrage ont été lus. Les conventions "jeux iso" ci-dessus sont donc le consensus général, pas des citations de jeux.
- L'item "forme qui suit l'emprise" n'a pas de source.
- Page Unity (ellipse avec dégradé pour l'éclairage iso) vue seulement dans un résultat de recherche, non ouverte : elle n'est pas citée comme fait.

## Sources (ouvertes)

- [react-native-svg, USAGE.md (RadialGradient, filtres)](https://github.com/software-mansion/react-native-svg/blob/main/USAGE.md)
- [SimpleShadow2D, Class Reference (Godot)](https://github.com/shoyguer/simple_shadow_2d/wiki/1.-Class-Reference)
- [Charles Houghton, Inking: Special Effects for Special Moments](https://cmerritthoughton.substack.com/p/art)
- [Salesforce Engineering, Experiments with high performance animation in React Native](https://engineering.salesforce.com/experiments-with-high-performance-animation-in-react-native-80a0cb7052b0/) (consulté via résultat de recherche seulement, ne tire aucun fait ici)
