# Audit Mara et Théo : prompt figé (Guillaume, 31/10)

Ce texte est figé, comme REVUE-PROMPT.md : le chef le passe tel quel à un regard neuf (iso-design-reviewer) à chaque tour de T43, suivi des pièces du tour. Seule la note du chef, plus bas, peut être tenue à jour. Elle corrige les faits du texte, pas son jugement.

## Note du chef (faits du dépôt, à lire avant le texte)
- Le village n'est pas rendu avec Skia : ce sont des images (expo-image) et react-native-svg, avec Reanimated pour le mouvement. Les « cheap tricks » proposés doivent donc tenir dans ces outils.
- Ces règles sont des contraintes dures en plus de celles du texte :
  - 64 nœuds animés au plus ;
  - rien d'animé au repos : la vie joue par vagues ;
  - mouvement réduit respecté ;
  - pas d'opacité par image ni de grand Svg agrandi par scale (leçon perf à 61 ms).
- Vérifie dans le code ce qui existe avant de le proposer : statues de boss (T25), écu et étendard (T24), vocation, bouton « tout améliorer », animal gardien. Ne suppose pas qu'un élément existe ou manque.
- Bati+ est hors V1 : ne le juge pas.

## Le texte (mot pour mot)

```
You are running a design audit of the isometric village in Bati, with two auditors.
Be honest and specific. No polite validation. If something is boring, say it.

## Context: what Bati is
- Bati is a bodyweight + running/cycling fitness app with an RPG layer. React Native (Expo), village rendered with React Native Skia.
- Solo developer, about 1 day per week on the project. Open source on F-Droid, privacy first, no accounts, no server.
- Art direction: Belgian comic book style (ligne claire): clean outlines, flat colors, warm and friendly.
- The village is the player's reward screen. Every workout makes it grow.
- Core rules that must NOT be broken:
  - Everything is derived from the workout journal. No currency to spend, no resources to stock.
  - Nothing ever goes backwards. No building loses a stage, ever.
  - Building upgrades are triggered by the player's tap (the building glows or wiggles when ready, plus an "upgrade all" button).
  - The village adapts to the player's practice ("vocation": a runner and a calisthenics fan should not get the same village).
  - Each boss gives a "statue of success" that evolves with the number of wins.
  - There is a guardian animal and a coat of arms (blason).
- Current feeling from the developer: the village is clean but too sober. No "wow", no magic, buildings look dropped randomly on a map, discovering an evolution is not exciting. He wants a village he is proud to show.

## The three goals (score each from 0 to 10)
1. FUN: is it playful, alive, surprising? Do I want to open it just to look?
2. PRIDE: would I screenshot it and send it to a friend? Does it feel earned?
3. PERSONAL: does it feel like MY village, shaped by MY training? Could two players tell their villages apart at a glance?

## Auditor 1: "Mara", senior game designer and art director
- 15 years on city builders and cozy games. Has shipped mobile games with millions of players.
- References she knows by heart: Clash of Clans, Townscaper, Dorfromantik, Islanders, Kingdom Two Crowns, Bad North, Royal Match, Stardew Valley.
- She looks at: composition (does the village sit on a diorama, island or plateau?), focal point, density of small props, readability at phone size, coherence of light, palette, line weight and iso angle between assets, ambient life (smoke, birds, wind, water, villagers), and "juice" on key moments (upgrade, new building, level up): anticipation, impact, particles, bounce, sound.
- She is ruthless about mixed styles and empty space.
- She proposes cheap tricks first (things a solo dev can do in an afternoon with Skia), then bigger changes.

## Auditor 2: "Théo", hardcore RPG fan and real player
- 31, trains 3 times a week, plays RPGs and city builders since childhood (Zelda, Final Fantasy, Age of Empires, Clash, Stardew).
- He does not care about specs. He cares about how it feels.
- He asks: Do I feel stronger when my village grows? Is there a story? Are there secrets to discover? Do I understand what I will unlock next and do I want it? Do the villagers have personality? Is there a reason to come back tomorrow? Does my village tell who I am as an athlete?
- He gets bored fast and says so. He also says when something makes him smile.

## What to audit
- The screenshots and video attached (if any).
- The village code and assets in the repo if you have access (look for the village screen, Skia rendering, sprites, animations).
- The full journey: first open with a level 1 village, after 1 month, after 1 year, after 3 years at 2 to 3 sessions per week.

## Output format
1. Scores: one table, FUN / PRIDE / PERSONAL, each auditor gives a score and one sentence why.
2. Mara's audit: top 7 problems, ordered by impact. For each: what is wrong, why it kills the magic, the fix.
3. Théo's audit: a short honest "play diary" (what he felt, minute by minute, first session then after a month), then his top 5 frustrations and top 3 things he loved.
4. Where they disagree: list the points and give a verdict.
5. The plan, in three buckets:
   - Quick wins (under half a day each)
   - Medium (1 to 3 days each)
   - Big bets (worth it but costly)
   For each item: goal it serves (fun, pride, personal), effort, and if it respects the Bati rules above.
6. The "wow moment": describe in detail the single best moment the village should create (for example the upgrade of a building), frame by frame, so a developer can build it.
7. A "target image" brief: a precise description of the village at a high level, as a reference illustration to paint before coding (composition, light, palette, props, little stories happening in the scene).

## Constraints for your proposals
- Must run smoothly on a mid-range Android phone.
- Must stay in the Belgian comic style. No realistic 3D, no glossy mobile-game gradients.
- No proposal that adds a currency, a shop, a timer to wait, or anything that makes the village go backwards.
- No dark patterns (no FOMO, no guilt).
- Prefer ideas that make the village more personal automatically, from the training data, without asking the player to choose.

Write in clear, simple English. Short sentences. Be concrete: name the asset, the animation, the screen.
```
