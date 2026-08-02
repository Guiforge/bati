# 🎮 BATI Content Generation: Exercises, Quests & Adventures

> **Generated**: January 5, 2026
> **Purpose**: Production-ready content for BATI v3
> **Historical, as of 2026-07-28**: the 20 exercise names below shipped as
> `drizzle/0006_content_expansion.sql` and were renamed to the movements' official names by
> `drizzle/0023_official_exercise_names.sql` — Goblin Squat became Squat (merged into the `0001`
> row it duplicated), Thunder Jumping Jack became Jumping Jack, and so on. The migrations are
> the source of truth for the catalogue; the quest and adventure content here is unaffected.

---

## 📋 PART 1: EXERCISES (20 Items)

### Exercise 1: Goblin Squat

```json
{
  "id": "goblin_squat",
  "enName": "Goblin Squat",
  "frName": "Squat du Gobelin",
  "enDescription": "Descend into a deep squat, channeling the raw earth power of the mountain goblins. Feel your legs anchor to the ground like stone pillars.",
  "frDescription": "Descendez en squat profond, canalisant la puissance brute des gobelins des montagnes. Sentez vos jambes s'ancrer au sol comme des piliers de pierre.",
  "imagePath": "assets/images/exercises/goblin_squat.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "strength",
  "secondsPerRep": 3,
  "muscles": ["calf"]
}
```

**Image Prompt**:

```
A muscular fantasy warrior in a deep squat position, wearing minimal armor, legs glowing with electric blue energy veins. Dark obsidian blue background (#0B0F19). Comic book style with thick black outlines, cel-shaded rendering, glowing muscles. The hero's face shows intense focus. Isolated character on dark void background. High contrast lighting with blue rim light. Franco-Belgian BD aesthetic, dynamic pose, thick outlines, vibrant but dark palette.
```

---

### Exercise 2: Dragon Push-up

```json
{
  "id": "dragon_pushup",
  "enName": "Dragon Push-up",
  "frName": "Pompe du Dragon",
  "enDescription": "Press the earth away with the force of dragon wings. Each rep ignites the fire in your chest, forging armor from within.",
  "frDescription": "Repoussez la terre avec la force des ailes de dragon. Chaque répétition allume le feu dans votre poitrine, forgeant une armure de l'intérieur.",
  "imagePath": "assets/images/exercises/dragon_pushup.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "strength",
  "secondsPerRep": 3,
  "muscles": ["chest", "arms"]
}
```

**Image Prompt**:

```
A heroic figure in push-up position, chest close to ground, arms forming perfect 90-degree angles. Their chest and arms glow with fiery orange-red energy, like dragon fire within. Dark fantasy comic book style, thick black outlines, dramatic shadows. Background: deep obsidian blue (#0B0F19) void with subtle fire embers floating. Cel-shaded rendering, high contrast, glowing muscle definition. Wide angle showing full body.
```

---

### Exercise 3: Iron Grip Pull-up

```json
{
  "id": "iron_grip_pullup",
  "enName": "Iron Grip Pull-up",
  "frName": "Traction Poigne de Fer",
  "enDescription": "Summon the strength of ancient blacksmiths. Pull your body upward, forging iron willpower with every ascent.",
  "frDescription": "Invoquez la force des anciens forgerons. Tirez votre corps vers le haut, forgeant une volonté de fer à chaque montée.",
  "imagePath": "assets/images/exercises/iron_grip_pullup.png",
  "creator": "Admin",
  "difficulty": "hard",
  "equipment": "pullup_bar",
  "style": "strength",
  "secondsPerRep": 4,
  "muscles": ["back", "arms"]
}
```

**Image Prompt**:

```
A powerful warrior hanging from an ancient stone bar, pulling themselves upward. Back muscles and biceps glowing with metallic silver-blue energy. Dark fantasy setting, thick comic book outlines, cel-shaded. Character wearing torn cloth, showing muscular definition. Background: dark void (#0B0F19) with subtle stone texture. Dynamic angle from below showing effort and strength. Glowing sweat drops, intense facial expression.
```

---

### Exercise 4: Stone Guardian Plank

```json
{
  "id": "stone_guardian_plank",
  "enName": "Stone Guardian Plank",
  "frName": "Planche du Gardien de Pierre",
  "enDescription": "Hold your body rigid as a fortress wall. Channel the unmoving resolve of mountain guardians carved from stone.",
  "frDescription": "Maintenez votre corps rigide comme un mur de forteresse. Canalisez la résolution immobile des gardiens de montagne sculptés dans la pierre.",
  "imagePath": "assets/images/exercises/stone_guardian_plank.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "strength",
  "secondsPerRep": 1,
  "muscles": ["abs", "back"]
}
```

**Image Prompt**:

```
A stoic hero in perfect plank position, body perfectly horizontal, core glowing with golden-white energy. Stone cracks appearing beneath their hands and feet. Dark fantasy comic book style, thick outlines, dramatic lighting. Background: deep blue-black void (#0B0F19). Character's face shows calm determination, not strain. Cel-shaded rendering, glowing core muscles visible through semi-transparent armor. Wide shot showing full body alignment.
```

---

### Exercise 5: Shadow Step Lunge

```json
{
  "id": "shadow_step_lunge",
  "enName": "Shadow Step Lunge",
  "frName": "Fente du Pas d'Ombre",
  "enDescription": "Step forward like an assassin emerging from darkness. Each lunge builds the explosive power needed to strike unseen.",
  "frDescription": "Avancez comme un assassin émergeant des ténèbres. Chaque fente construit la puissance explosive nécessaire pour frapper sans être vu.",
  "imagePath": "assets/images/exercises/shadow_step_lunge.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "strength",
  "secondsPerRep": 3,
  "muscles": ["calf", "abs"]
}
```

**Image Prompt**:

```
A nimble rogue in deep lunge position, front leg bent 90 degrees, back leg extended. Dark purple-blue shadows swirling around legs. Comic book style, thick black outlines, dynamic motion blur. Background: dark void (#0B0F19) with shadow tendrils. Character wearing light leather armor, face partially shadowed. Electric blue energy highlighting leg muscles. Cel-shaded, high contrast, action pose.
```

---

### Exercise 6: Berserker Burpee

```json
{
  "id": "berserker_burpee",
  "enName": "Berserker Burpee",
  "frName": "Burpee du Berserker",
  "enDescription": "Unleash primal fury in explosive motion. Drop, push, leap — channel the relentless assault of a berserker warrior.",
  "frDescription": "Libérez la fureur primitive en mouvement explosif. Tombez, poussez, bondissez — canalisez l'assaut implacable d'un guerrier berserker.",
  "imagePath": "assets/images/exercises/berserker_burpee.png",
  "creator": "Admin",
  "difficulty": "hard",
  "equipment": "none",
  "style": "cardio",
  "secondsPerRep": 5,
  "muscles": ["chest", "calf", "abs"]
}
```

**Image Prompt**:

```
A fierce warrior captured mid-burpee, transitioning from push-up to explosive jump. Body surrounded by red-orange energy burst, motion lines indicating speed. Dark fantasy comic book style, thick outlines, dynamic action pose. Background: dark void (#0B0F19) with impact shockwaves. Facial expression: wild intensity, battle cry. Muscles glowing with kinetic energy. Cel-shaded, multiple motion blur frames showing movement sequence.
```

---

### Exercise 7: Monk's Mountain Climber

```json
{
  "id": "monk_mountain_climber",
  "enName": "Monk's Mountain Climber",
  "frName": "Grimpeur de Montagne du Moine",
  "enDescription": "Ascend imaginary peaks with the discipline of monastery warriors. Rapid leg drives that test spirit and stamina.",
  "frDescription": "Gravissez des sommets imaginaires avec la discipline des guerriers des monastères. Poussées rapides des jambes qui testent l'esprit et l'endurance.",
  "imagePath": "assets/images/exercises/monk_mountain_climber.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "cardio",
  "secondsPerRep": 2,
  "muscles": ["abs", "calf"]
}
```

**Image Prompt**:

```
A focused warrior in plank position, one knee driving toward chest, other leg extended. Wearing simple monk robes, body glowing with white-blue energy. Comic book style, thick outlines, motion blur on moving leg. Background: dark void (#0B0F19) with faint mountain silhouettes. Calm facial expression despite intense movement. Cel-shaded rendering, wind lines indicating speed. Dynamic angle showing core engagement.
```

---

### Exercise 8: Titan's Dip

```json
{
  "id": "titan_dip",
  "enName": "Titan's Dip",
  "frName": "Dip du Titan",
  "enDescription": "Lower yourself between two pillars, bearing the weight of giants. Rise again with the power of the old titans.",
  "frDescription": "Descendez entre deux piliers, portant le poids des géants. Relevez-vous avec la puissance des anciens titans.",
  "imagePath": "assets/images/exercises/titan_dip.png",
  "creator": "Admin",
  "difficulty": "hard",
  "equipment": "none",
  "style": "strength",
  "secondsPerRep": 4,
  "muscles": ["chest", "arms"]
}
```

**Image Prompt**:

```
A massive warrior performing dips between two ancient stone pillars, arms supporting full body weight. Arms and chest glowing with golden-bronze energy. Dark fantasy comic book, thick outlines, heroic proportions. Background: dark void (#0B0F19) with crumbling pillars. Character's face shows concentrated power. Cel-shaded, dramatic lighting from below, massive muscle definition. Wide shot showing scale.
```

---

### Exercise 9: Archer's Pike Push-up

```json
{
  "id": "archer_pike_pushup",
  "enName": "Archer's Pike Push-up",
  "frName": "Pompe Pike de l'Archer",
  "enDescription": "Form your body into a bow's arc. Press upward, building the shoulder strength required to draw the heaviest bows.",
  "frDescription": "Formez votre corps en arc de bow. Poussez vers le haut, développant la force d'épaules nécessaire pour tendre les arcs les plus lourds.",
  "imagePath": "assets/images/exercises/archer_pike_pushup.png",
  "creator": "Admin",
  "difficulty": "hard",
  "equipment": "none",
  "style": "calisthenics",
  "secondsPerRep": 3,
  "muscles": ["shoulder", "arms"]
}
```

**Image Prompt**:

```
A warrior in pike position (inverted V), hips high, lowering head toward ground. Shoulders glowing with wind-blue energy swirls. Comic book style, thick outlines, dynamic angle. Background: dark void (#0B0F19) with arrow trail effects. Character wearing light archery gear. Facial expression: focused determination. Cel-shaded rendering, wind effects around shoulders. Side angle showing body alignment.
```

---

### Exercise 10: Wall Sentinel Hold

```json
{
  "id": "wall_sentinel_hold",
  "enName": "Wall Sentinel Hold",
  "frName": "Maintien du Sentinelle Murale",
  "enDescription": "Press your back against the fortress wall and hold the gate position. Your legs become pillars that never falter.",
  "frDescription": "Appuyez votre dos contre le mur de la forteresse et maintenez la position de garde. Vos jambes deviennent des piliers qui ne faiblissent jamais.",
  "imagePath": "assets/images/exercises/wall_sentinel_hold.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "strength",
  "secondsPerRep": 1,
  "muscles": ["calf"]
}
```

**Image Prompt**:

```
A stoic guard sitting against invisible wall, thighs parallel to ground, back straight. Legs glowing with stone-grey energy, cracks forming on ground. Dark fantasy comic book, thick outlines. Background: dark void (#0B0F19) with faint castle wall texture behind. Character wearing guard armor, face calm but focused. Cel-shaded rendering, static hold pose showing immense control. Front view showing perfect 90-degree angles.
```

---

### Exercise 11: Thunder Jumping Jack

```json
{
  "id": "thunder_jumping_jack",
  "enName": "Thunder Jumping Jack",
  "frName": "Jumping Jack du Tonnerre",
  "enDescription": "Explode with lightning speed, arms and legs spreading like thunderbolts. Channel the storm's endless energy.",
  "frDescription": "Explosez à la vitesse de l'éclair, bras et jambes s'écartant comme des éclairs. Canalisez l'énergie infinie de la tempête.",
  "imagePath": "assets/images/exercises/thunder_jumping_jack.png",
  "creator": "Admin",
  "difficulty": "easy",
  "equipment": "none",
  "style": "cardio",
  "secondsPerRep": 1,
  "muscles": ["calf", "shoulder"]
}
```

**Image Prompt**:

```
A warrior mid-jump, arms and legs fully extended in star shape. Electric blue lightning bolts radiating from body. Comic book style, thick outlines, motion blur. Background: dark void (#0B0F19) with lightning streaks. Facial expression: energized smile. Body glowing with electrical energy. Cel-shaded, high contrast, action lines showing speed. Dynamic angle capturing full extension.
```

---

### Exercise 12: Paladin's High Knee

```json
{
  "id": "paladin_high_knee",
  "enName": "Paladin's High Knee",
  "frName": "Genou Haut du Paladin",
  "enDescription": "March with righteous fury, driving knees high like a holy warrior charging into battle. Each step radiates unwavering conviction.",
  "frDescription": "Marchez avec fureur vertueuse, montant les genoux haut comme un guerrier sacré chargeant au combat. Chaque pas irradie une conviction inébranlable.",
  "imagePath": "assets/images/exercises/paladin_high_knee.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "cardio",
  "secondsPerRep": 1,
  "muscles": ["calf", "abs"]
}
```

**Image Prompt**:

```
A noble warrior running in place, one knee raised high to chest, other foot planted. Body glowing with holy golden-white light. Comic book style, thick outlines, motion lines. Background: dark void (#0B0F19) with divine light rays. Character wearing shining armor, cape flowing. Determined heroic expression. Cel-shaded, radiant energy aura. Dynamic side angle showing knee drive.
```

---

### Exercise 13: Wizard's Bicycle Crunch

```json
{
  "id": "wizard_bicycle_crunch",
  "enName": "Wizard's Bicycle Crunch",
  "frName": "Crunch Vélo du Sorcier",
  "enDescription": "Twist your core like casting arcane spirals. Each rotation channels mystical energy through your center, forging a magical core.",
  "frDescription": "Tordez votre tronc comme en lançant des spirales arcaniques. Chaque rotation canalise l'énergie mystique à travers votre centre, forgeant un noyau magique.",
  "imagePath": "assets/images/exercises/wizard_bicycle_crunch.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "calisthenics",
  "secondsPerRep": 2,
  "muscles": ["abs"]
}
```

**Image Prompt**:

```
A mage lying on back, performing bicycle crunch, elbow touching opposite knee. Purple-blue magical energy spiraling around torso. Comic book style, thick outlines. Background: dark void (#0B0F19) with arcane rune circles. Character wearing wizard robes, mystical tattoos glowing on abs. Focused expression. Cel-shaded, magical particle effects, spiral motion blur. Overhead angle showing rotation.
```

---

### Exercise 14: Knight's Diamond Push-up

```json
{
  "id": "knight_diamond_pushup",
  "enName": "Knight's Diamond Push-up",
  "frName": "Pompe Diamant du Chevalier",
  "enDescription": "Place hands in a diamond formation and descend with honor. This knightly variation forges diamond-hard triceps and unshakable resolve.",
  "frDescription": "Placez les mains en formation diamant et descendez avec honneur. Cette variante chevaleresque forge des triceps durs comme le diamant et une résolution inébranlable.",
  "imagePath": "assets/images/exercises/knight_diamond_pushup.png",
  "creator": "Admin",
  "difficulty": "hard",
  "equipment": "none",
  "style": "strength",
  "secondsPerRep": 3,
  "muscles": ["chest", "arms"]
}
```

**Image Prompt**:

```
A knightly warrior in push-up position, hands forming diamond shape beneath chest, lowering body down. Arms glowing with crystal-blue energy. Comic book style, thick outlines, diamond-shaped light emanating from hands. Background: dark void (#0B0F19) with crystalline sparkles. Character in ornate armor. Face showing noble determination. Cel-shaded, radiant hand position emphasized. Close angle on upper body.
```

---

### Exercise 15: Ranger's Single Leg Deadlift

```json
{
  "id": "ranger_single_leg_deadlift",
  "enName": "Ranger's Single Leg Deadlift",
  "frName": "Soulevé de Terre Unijambiste du Ranger",
  "enDescription": "Balance on one leg like navigating forest roots. Hinge forward with the grace of a ranger, building stability and strength.",
  "frDescription": "Équilibrez-vous sur une jambe comme en naviguant sur des racines forestières. Penchez-vous en avant avec la grâce d'un ranger, développant stabilité et force.",
  "imagePath": "assets/images/exercises/ranger_single_leg_deadlift.png",
  "creator": "Admin",
  "difficulty": "hard",
  "equipment": "none",
  "style": "strength",
  "secondsPerRep": 4,
  "muscles": ["calf", "back"]
}
```

**Image Prompt**:

```
An agile ranger balanced on one leg, other leg extended behind, torso hinged forward parallel to ground. Leg and back glowing with forest-green energy. Comic book style, thick outlines, perfect balance pose. Background: dark void (#0B0F19) with subtle leaf silhouettes. Character in ranger gear, bow on back. Calm focused expression. Cel-shaded, nature energy swirls. Side profile showing T-position.
```

---

### Exercise 16: Druid's Cobra Stretch

```json
{
  "id": "druid_cobra_stretch",
  "enName": "Druid's Cobra Stretch",
  "frName": "Étirement du Cobra du Druide",
  "enDescription": "Rise from the earth like a serpent greeting the sun. Arch your back, connecting with primal nature energy that flows through all living things.",
  "frDescription": "Élevez-vous de la terre comme un serpent saluant le soleil. Cambrez votre dos, vous connectant à l'énergie naturelle primitive qui traverse tous les êtres vivants.",
  "imagePath": "assets/images/exercises/druid_cobra_stretch.png",
  "creator": "Admin",
  "difficulty": "easy",
  "equipment": "none",
  "style": "yoga",
  "secondsPerRep": 1,
  "muscles": ["back", "chest"]
}
```

**Image Prompt**:

```
A serene druid in cobra pose, chest lifted, arms straight, head tilted back. Body glowing with emerald-green nature energy, vine patterns on skin. Comic book style, thick outlines, peaceful expression. Background: dark void (#0B0F19) with floating leaf particles. Character barefoot, wearing nature-inspired clothing. Soft glowing aura. Cel-shaded, organic energy flow. Low angle showing arch.
```

---

### Exercise 17: Samurai's Warrior Pose

```json
{
  "id": "samurai_warrior_pose",
  "enName": "Samurai's Warrior Pose",
  "frName": "Posture du Guerrier Samouraï",
  "enDescription": "Stand in the proud stance of an eastern warrior. Front knee bent, arms extended, embodying balance, power, and unwavering focus.",
  "frDescription": "Tenez-vous dans la posture fière d'un guerrier oriental. Genou avant plié, bras étendus, incarnant équilibre, puissance et concentration inébranlable.",
  "imagePath": "assets/images/exercises/samurai_warrior_pose.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "yoga",
  "secondsPerRep": 1,
  "muscles": ["calf", "shoulder"]
}
```

**Image Prompt**:

```
A disciplined samurai in warrior 2 pose, front leg bent, back leg straight, arms extended horizontally holding katana pose. Body glowing with calm blue-white energy. Comic book style, thick outlines, noble posture. Background: dark void (#0B0F19) with cherry blossom petals floating. Traditional samurai attire. Serene focused expression. Cel-shaded, zen energy aura. Side view showing perfect alignment.
```

---

### Exercise 18: Rogue's Skater Hop

```json
{
  "id": "rogue_skater_hop",
  "enName": "Rogue's Skater Hop",
  "frName": "Saut Patineur du Voleur",
  "enDescription": "Leap side to side with a thief's agility. Each bound builds explosive lateral power, perfect for dodging and quick escapes.",
  "frDescription": "Bondissez de côté avec l'agilité d'un voleur. Chaque saut développe une puissance latérale explosive, parfaite pour esquiver et fuir rapidement.",
  "imagePath": "assets/images/exercises/rogue_skater_hop.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "none",
  "style": "cardio",
  "secondsPerRep": 2,
  "muscles": ["calf"]
}
```

**Image Prompt**:

```
A nimble rogue mid-leap, body tilted, one leg extended behind, arms swinging for momentum. Dark purple speed trails. Comic book style, thick outlines, dynamic motion. Background: dark void (#0B0F19) with motion blur streaks. Light leather armor, hood up. Mischievous grin. Cel-shaded, high energy, lateral movement emphasis. Dynamic angle capturing sideways momentum.
```

---

### Exercise 19: Barbarian's Overhead Press

```json
{
  "id": "barbarian_overhead_press",
  "enName": "Barbarian's Overhead Press",
  "frName": "Développé au-dessus de la Tête du Barbare",
  "enDescription": "Hoist imaginary boulders skyward with primal might. Press overhead, building shoulders that can bear any burden.",
  "frDescription": "Soulevez des rochers imaginaires vers le ciel avec une puissance primitive. Pressez au-dessus de la tête, développant des épaules capables de porter n'importe quel fardeau.",
  "imagePath": "assets/images/exercises/barbarian_overhead_press.png",
  "creator": "Admin",
  "difficulty": "medium",
  "equipment": "dumbbell",
  "style": "strength",
  "secondsPerRep": 3,
  "muscles": ["shoulder", "arms"]
}
```

**Image Prompt**:

```
A massive barbarian pressing imaginary weight overhead, arms fully extended, muscles bulging. Shoulders and arms glowing with orange-red power. Comic book style, thick outlines, powerful stance. Background: dark void (#0B0F19) with energy shockwaves. Character bare-chested, tribal tattoos glowing. Fierce battle cry expression. Cel-shaded, dramatic upward angle emphasizing shoulders. Power aura radiating.
```

---

### Exercise 20: Alchemist's Hollow Body Hold

```json
{
  "id": "alchemist_hollow_body_hold",
  "enName": "Alchemist's Hollow Body Hold",
  "frName": "Maintien Corps Creux de l'Alchimiste",
  "enDescription": "Create perfect stillness in motion, body curved like a potion flask. Hold this alchemical tension, transmuting effort into core steel.",
  "frDescription": "Créez une immobilité parfaite en mouvement, corps courbé comme une fiole de potion. Maintenez cette tension alchimique, transmutant l'effort en acier abdominal.",
  "imagePath": "assets/images/exercises/alchemist_hollow_body_hold.png",
  "creator": "Admin",
  "difficulty": "hard",
  "equipment": "none",
  "style": "calisthenics",
  "secondsPerRep": 1,
  "muscles": ["abs"]
}
```

**Image Prompt**:

```
A mystical figure lying on back, legs and shoulders lifted off ground, body forming perfect curve. Core glowing with swirling multi-colored alchemical energy. Comic book style, thick outlines, tense static hold. Background: dark void (#0B0F19) with floating potion bottles and magical symbols. Character in alchemist robes. Concentrated expression. Cel-shaded, magical energy emanating from core. Side view showing hollow curve.
```

---

## 🗡️ PART 2: QUESTS (10 Workouts)

### Quest 1: Escape the Collapsing Mine

**Theme**: High-intensity cardio panic
**Duration**: ~18 minutes (3 rounds)
**Target Audience**: Intermediate cardio lovers

```json
{
  "id": "escape_collapsing_mine",
  "enTitle": "Escape the Collapsing Mine",
  "frTitle": "Fuite de la Mine Effondrée",
  "enDescription": "The tunnel rumbles. Rocks fall. You have minutes to reach sunlight. Move fast, move now, or be buried forever!",
  "frDescription": "Le tunnel gronde. Des rochers tombent. Vous avez quelques minutes pour atteindre la lumière du jour. Bougez vite, bougez maintenant, ou soyez enterré à jamais!",
  "author": "Admin",
  "rounds": 3,
  "restSeconds": 45,
  "exercises": [
    {
      "exerciseId": "berserker_burpee",
      "sortOrder": 0,
      "targetType": "reps",
      "targetMin": 8,
      "targetMax": 12
    },
    {
      "exerciseId": "monk_mountain_climber",
      "sortOrder": 1,
      "targetType": "time",
      "targetMin": 30,
      "targetMax": 45
    },
    {
      "exerciseId": "paladin_high_knee",
      "sortOrder": 2,
      "targetType": "time",
      "targetMin": 30,
      "targetMax": 45
    },
    {
      "exerciseId": "thunder_jumping_jack",
      "sortOrder": 3,
      "targetType": "reps",
      "targetMin": 20,
      "targetMax": 30
    }
  ]
}
```

---

### Quest 2: Guard the Fortress Gate

**Theme**: Isometric holds & defense
**Duration**: ~15 minutes (3 rounds)
**Target Audience**: Beginners, core focus

```json
{
  "id": "guard_fortress_gate",
  "enTitle": "Guard the Fortress Gate",
  "frTitle": "Garder la Porte de la Forteresse",
  "enDescription": "The enemy charges. You hold the line. Your body is the wall. Do not falter. Do not break.",
  "frDescription": "L'ennemi charge. Vous tenez la ligne. Votre corps est le mur. Ne faiblis pas. Ne casse pas.",
  "author": "Admin",
  "rounds": 3,
  "restSeconds": 60,
  "exercises": [
    {
      "exerciseId": "wall_sentinel_hold",
      "sortOrder": 0,
      "targetType": "time",
      "targetMin": 30,
      "targetMax": 45
    },
    {
      "exerciseId": "stone_guardian_plank",
      "sortOrder": 1,
      "targetType": "time",
      "targetMin": 30,
      "targetMax": 60
    },
    {
      "exerciseId": "goblin_squat",
      "sortOrder": 2,
      "targetType": "reps",
      "targetMin": 12,
      "targetMax": 15
    },
    {
      "exerciseId": "shadow_step_lunge",
      "sortOrder": 3,
      "targetType": "reps",
      "targetMin": 10,
      "targetMax": 12
    }
  ]
}
```

---

### Quest 3: Forge the Dragon Blade

**Theme**: Upper body pushing strength
**Duration**: ~20 minutes (4 rounds)
**Target Audience**: Advanced strength

```json
{
  "id": "forge_dragon_blade",
  "enTitle": "Forge the Dragon Blade",
  "frTitle": "Forger la Lame du Dragon",
  "enDescription": "The forge burns hot. Each strike of the hammer shapes legendary steel. Your chest and arms become the anvil.",
  "frDescription": "La forge brûle. Chaque coup de marteau façonne l'acier légendaire. Votre poitrine et vos bras deviennent l'enclume.",
  "author": "Admin",
  "rounds": 4,
  "restSeconds": 60,
  "exercises": [
    {
      "exerciseId": "dragon_pushup",
      "sortOrder": 0,
      "targetType": "reps",
      "targetMin": 12,
      "targetMax": 15
    },
    {
      "exerciseId": "knight_diamond_pushup",
      "sortOrder": 1,
      "targetType": "reps",
      "targetMin": 8,
      "targetMax": 10
    },
    {
      "exerciseId": "titan_dip",
      "sortOrder": 2,
      "targetType": "reps",
      "targetMin": 8,
      "targetMax": 12
    },
    {
      "exerciseId": "archer_pike_pushup",
      "sortOrder": 3,
      "targetType": "reps",
      "targetMin": 8,
      "targetMax": 10
    }
  ]
}
```

---

### Quest 4: Climb the Titan's Tower

**Theme**: Back & pulling strength
**Duration**: ~18 minutes (3 rounds)
**Target Audience**: Intermediate/Advanced pull-up users

```json
{
  "id": "climb_titan_tower",
  "enTitle": "Climb the Titan's Tower",
  "frTitle": "Escalader la Tour du Titan",
  "enDescription": "An ancient tower reaches the clouds. Each floor demands you pull yourself higher. Reach the summit or fall trying.",
  "frDescription": "Une tour antique atteint les nuages. Chaque étage exige que vous vous tiriez plus haut. Atteignez le sommet ou tombez en essayant.",
  "author": "Admin",
  "rounds": 3,
  "restSeconds": 90,
  "exercises": [
    {
      "exerciseId": "iron_grip_pullup",
      "sortOrder": 0,
      "targetType": "reps",
      "targetMin": 5,
      "targetMax": 8
    },
    {
      "exerciseId": "ranger_single_leg_deadlift",
      "sortOrder": 1,
      "targetType": "reps",
      "targetMin": 8,
      "targetMax": 10
    },
    {
      "exerciseId": "stone_guardian_plank",
      "sortOrder": 2,
      "targetType": "time",
      "targetMin": 45,
      "targetMax": 60
    }
  ]
}
```

---

### Quest 5: The Arcane Gauntlet

**Theme**: Core & calisthenics mastery
**Duration**: ~17 minutes (4 rounds)
**Target Audience**: Intermediate calisthenics

```json
{
  "id": "arcane_gauntlet",
  "enTitle": "The Arcane Gauntlet",
  "frTitle": "Le Gant Arcanique",
  "enDescription": "The wizard's trial begins. Channel raw mana through perfect body control. Only those with iron cores pass.",
  "frDescription": "L'épreuve du sorcier commence. Canalisez le mana brut par un contrôle corporel parfait. Seuls ceux avec des abdos de fer réussissent.",
  "author": "Admin",
  "rounds": 4,
  "restSeconds": 45,
  "exercises": [
    {
      "exerciseId": "wizard_bicycle_crunch",
      "sortOrder": 0,
      "targetType": "reps",
      "targetMin": 15,
      "targetMax": 20
    },
    {
      "exerciseId": "alchemist_hollow_body_hold",
      "sortOrder": 1,
      "targetType": "time",
      "targetMin": 20,
      "targetMax": 30
    },
    {
      "exerciseId": "stone_guardian_plank",
      "sortOrder": 2,
      "targetType": "time",
      "targetMin": 45,
      "targetMax": 60
    },
    {
      "exerciseId": "monk_mountain_climber",
      "sortOrder": 3,
      "targetType": "time",
      "targetMin": 30,
      "targetMax": 40
    }
  ]
}
```

---

### Quest 6: The Druid's Path

**Theme**: Yoga & flexibility
**Duration**: ~12 minutes (2 rounds)
**Target Audience**: All levels, recovery/flexibility

```json
{
  "id": "druid_path",
  "enTitle": "The Druid's Path",
  "frTitle": "Le Chemin du Druide",
  "enDescription": "Walk the forest trail. Connect with earth energy. Stretch, breathe, restore. Nature heals the warrior's weary body.",
  "frDescription": "Parcourez le sentier forestier. Connectez-vous à l'énergie de la terre. Étirez-vous, respirez, restaurez. La nature guérit le corps fatigué du guerrier.",
  "author": "Admin",
  "rounds": 2,
  "restSeconds": 30,
  "exercises": [
    {
      "exerciseId": "druid_cobra_stretch",
      "sortOrder": 0,
      "targetType": "time",
      "targetMin": 30,
      "targetMax": 45
    },
    {
      "exerciseId": "samurai_warrior_pose",
      "sortOrder": 1,
      "targetType": "time",
      "targetMin": 45,
      "targetMax": 60
    },
    {
      "exerciseId": "shadow_step_lunge",
      "sortOrder": 2,
      "targetType": "reps",
      "targetMin": 8,
      "targetMax": 10
    }
  ]
}
```

---

### Quest 7: Sprint Through the Shadowlands

**Theme**: Full-body cardio blast
**Duration**: ~16 minutes (3 rounds)
**Target Audience**: Intermediate cardio

```json
{
  "id": "sprint_shadowlands",
  "enTitle": "Sprint Through the Shadowlands",
  "frTitle": "Sprint à Travers les Terres d'Ombre",
  "enDescription": "Darkness hunts you. Run. Don't look back. Speed and stamina are your only weapons in this cursed realm.",
  "frDescription": "Les ténèbres vous chassent. Courez. Ne regardez pas en arrière. Vitesse et endurance sont vos seules armes dans ce royaume maudit.",
  "author": "Admin",
  "rounds": 3,
  "restSeconds": 45,
  "exercises": [
    {
      "exerciseId": "paladin_high_knee",
      "sortOrder": 0,
      "targetType": "time",
      "targetMin": 40,
      "targetMax": 50
    },
    {
      "exerciseId": "rogue_skater_hop",
      "sortOrder": 1,
      "targetType": "reps",
      "targetMin": 15,
      "targetMax": 20
    },
    {
      "exerciseId": "berserker_burpee",
      "sortOrder": 2,
      "targetType": "reps",
      "targetMin": 10,
      "targetMax": 12
    },
    {
      "exerciseId": "thunder_jumping_jack",
      "sortOrder": 3,
      "targetType": "reps",
      "targetMin": 25,
      "targetMax": 30
    }
  ]
}
```

---

### Quest 8: Build the Stronghold

**Theme**: Balanced full-body
**Duration**: ~22 minutes (4 rounds)
**Target Audience**: Intermediate all-around

```json
{
  "id": "build_stronghold",
  "enTitle": "Build the Stronghold",
  "frTitle": "Construire le Bastion",
  "enDescription": "Stone by stone, you raise mighty walls. Every muscle contributes. A balanced fortress requires a balanced hero.",
  "frDescription": "Pierre par pierre, vous élevez de puissants murs. Chaque muscle contribue. Une forteresse équilibrée nécessite un héros équilibré.",
  "author": "Admin",
  "rounds": 4,
  "restSeconds": 60,
  "exercises": [
    {
      "exerciseId": "goblin_squat",
      "sortOrder": 0,
      "targetType": "reps",
      "targetMin": 15,
      "targetMax": 18
    },
    {
      "exerciseId": "dragon_pushup",
      "sortOrder": 1,
      "targetType": "reps",
      "targetMin": 12,
      "targetMax": 15
    },
    {
      "exerciseId": "iron_grip_pullup",
      "sortOrder": 2,
      "targetType": "reps",
      "targetMin": 5,
      "targetMax": 7
    },
    {
      "exerciseId": "stone_guardian_plank",
      "sortOrder": 3,
      "targetType": "time",
      "targetMin": 45,
      "targetMax": 60
    },
    {
      "exerciseId": "shadow_step_lunge",
      "sortOrder": 4,
      "targetType": "reps",
      "targetMin": 12,
      "targetMax": 15
    }
  ]
}
```

---

### Quest 9: The Iron Gauntlet Challenge

**Theme**: Advanced strength test
**Duration**: ~25 minutes (4 rounds)
**Target Audience**: Advanced athletes

```json
{
  "id": "iron_gauntlet_challenge",
  "enTitle": "The Iron Gauntlet Challenge",
  "frTitle": "Défi du Gantelet de Fer",
  "enDescription": "Only the strongest dare enter. This trial breaks the weak, forges legends from the resilient. Prove your iron will.",
  "frDescription": "Seuls les plus forts osent entrer. Cette épreuve brise les faibles, forge des légendes des résilients. Prouvez votre volonté de fer.",
  "author": "Admin",
  "rounds": 4,
  "restSeconds": 90,
  "exercises": [
    {
      "exerciseId": "knight_diamond_pushup",
      "sortOrder": 0,
      "targetType": "reps",
      "targetMin": 10,
      "targetMax": 12
    },
    {
      "exerciseId": "iron_grip_pullup",
      "sortOrder": 1,
      "targetType": "reps",
      "targetMin": 8,
      "targetMax": 10
    },
    {
      "exerciseId": "titan_dip",
      "sortOrder": 2,
      "targetType": "reps",
      "targetMin": 10,
      "targetMax": 12
    },
    {
      "exerciseId": "archer_pike_pushup",
      "sortOrder": 3,
      "targetType": "reps",
      "targetMin": 10,
      "targetMax": 12
    },
    {
      "exerciseId": "alchemist_hollow_body_hold",
      "sortOrder": 4,
      "targetType": "time",
      "targetMin": 30,
      "targetMax": 45
    }
  ]
}
```

---

### Quest 10: Morning of the Champion

**Theme**: Full-body wake-up routine
**Duration**: ~14 minutes (3 rounds)
**Target Audience**: All levels, daily habit

```json
{
  "id": "morning_champion",
  "enTitle": "Morning of the Champion",
  "frTitle": "Matin du Champion",
  "enDescription": "Greet the dawn like a warrior. Wake every muscle, ignite your spirit. This is how heroes start their day.",
  "frDescription": "Saluez l'aube comme un guerrier. Réveillez chaque muscle, allumez votre esprit. C'est ainsi que les héros commencent leur journée.",
  "author": "Admin",
  "rounds": 3,
  "restSeconds": 30,
  "exercises": [
    {
      "exerciseId": "thunder_jumping_jack",
      "sortOrder": 0,
      "targetType": "reps",
      "targetMin": 20,
      "targetMax": 25
    },
    {
      "exerciseId": "goblin_squat",
      "sortOrder": 1,
      "targetType": "reps",
      "targetMin": 12,
      "targetMax": 15
    },
    {
      "exerciseId": "dragon_pushup",
      "sortOrder": 2,
      "targetType": "reps",
      "targetMin": 10,
      "targetMax": 12
    },
    {
      "exerciseId": "druid_cobra_stretch",
      "sortOrder": 3,
      "targetType": "time",
      "targetMin": 30,
      "targetMax": 40
    }
  ]
}
```

---

## 🐉 PART 3: ADVENTURES (5 Campaigns)

### Adventure 1: The Scout's Trial

**Goal**: Cardio & Speed
**Duration**: 5 Quests
**Target**: Endurance builders

```json
{
  "id": "scout_trial",
  "enTitle": "The Scout's Trial",
  "frTitle": "L'Épreuve de l'Éclaireur",
  "enDescription": "The kingdom needs scouts who never tire. Run faster, last longer. Your legs become lightning, your lungs endless.",
  "frDescription": "Le royaume a besoin d'éclaireurs qui ne se fatiguent jamais. Courez plus vite, durez plus longtemps. Vos jambes deviennent foudre, vos poumons infinis.",
  "kind": "campaign",
  "author": "Admin",
  "quests": [
    "morning_champion",
    "sprint_shadowlands",
    "escape_collapsing_mine",
    "sprint_shadowlands",
    "sprint_shadowlands"
  ],
  "bossAdventure": null
}
```

**Boss Fight**: **The Wind Wraith** (After 5 quests)

- **Boss ID**: `wind_wraith`
- **Total HP**: 400
- **Weakness**: Calf (Legs)
- **Resistance**: Arms
- **Asset**: `assets/images/bosses/wind_wraith.png`
- **Prompt**: `A ghostly spectral figure made of swirling wind and storm clouds, ethereal translucent body with glowing electric blue eyes. Dark fantasy comic book style, thick black outlines, motion blur effects. Background: dark void (#0B0F19) with lightning streaks and tornado swirls. Menacing but elegant, floating pose. Cel-shaded, high contrast, wind particle effects. Wide shot showing full spectral form.`

---

### Adventure 2: The Guardian's Oath

**Goal**: Strength & Defense
**Duration**: 6 Quests
**Target**: Back & core builders

```json
{
  "id": "guardian_oath",
  "enTitle": "The Guardian's Oath",
  "frTitle": "Le Serment du Gardien",
  "enDescription": "Swear to protect. Your back becomes armor. Your core becomes an unbreakable shield. Stand firm, guard the realm.",
  "frDescription": "Jurez de protéger. Votre dos devient armure. Votre tronc devient un bouclier incassable. Tenez ferme, gardez le royaume.",
  "kind": "campaign",
  "author": "Admin",
  "quests": [
    "guard_fortress_gate",
    "build_stronghold",
    "climb_titan_tower",
    "guard_fortress_gate",
    "arcane_gauntlet",
    "guard_fortress_gate"
  ],
  "bossAdventure": null
}
```

**Boss Fight**: **The Stone Golem** (After 6 quests)

- **Boss ID**: `stone_golem`
- **Total HP**: 600
- **Weakness**: Back (Stone breaks stone)
- **Resistance**: Chest (Fire)
- **Asset**: `assets/images/bosses/stone_golem.png`
- **Prompt**: `A massive humanoid made entirely of grey stone blocks and boulders, glowing red cracks between stones like magma. Dark fantasy comic book style, thick black outlines, imposing stance. Background: dark void (#0B0F19) with falling rocks and dust clouds. Faceless stone head, giant fists. Menacing, slow, unstoppable presence. Cel-shaded, rock texture emphasis. Low angle showing immense size.`

---

### Adventure 3: The Monk's Enlightenment

**Goal**: Mobility & Core
**Duration**: 4 Quests
**Target**: Calisthenics & yoga lovers

```json
{
  "id": "monk_enlightenment",
  "enTitle": "The Monk's Enlightenment",
  "frTitle": "L'Illumination du Moine",
  "enDescription": "Walk the path of balance. Master your body, master your mind. Core steel, spirit calm, movement pure.",
  "frDescription": "Parcourez le chemin de l'équilibre. Maîtrisez votre corps, maîtrisez votre esprit. Tronc d'acier, esprit calme, mouvement pur.",
  "kind": "campaign",
  "author": "Admin",
  "quests": [
    "druid_path",
    "arcane_gauntlet",
    "druid_path",
    "arcane_gauntlet"
  ],
  "bossAdventure": null
}
```

**Boss Fight**: **The Shadow Serpent** (After 4 quests)

- **Boss ID**: `shadow_serpent`
- **Total HP**: 350
- **Weakness**: Abs (Core)
- **Resistance**: Calf (Legs)
- **Asset**: `assets/images/bosses/shadow_serpent.png`
- **Prompt**: `A colossal serpent made of living shadows and dark purple mist, glowing violet eyes, scales shimmer with darkness. Dark fantasy comic book style, thick black outlines, sinuous coiled pose. Background: dark void (#0B0F19) with shadow tendrils reaching out. Fangs dripping dark energy, hypnotic gaze. Cel-shaded, gradient shadow effects. Overhead angle showing full serpent length.`

---

### Adventure 4: The Ranger's Journey

**Goal**: Endurance & Consistency
**Duration**: 7 Quests
**Target**: Marathon trainers

```json
{
  "id": "ranger_journey",
  "enTitle": "The Ranger's Journey",
  "frTitle": "Le Voyage du Ranger",
  "enDescription": "The long road awaits. Miles to walk, battles to face, never stopping. Build the endurance to outlast any foe, any trial.",
  "frDescription": "La longue route attend. Des kilomètres à parcourir, des batailles à affronter, ne jamais s'arrêter. Développez l'endurance pour surpasser tout ennemi, toute épreuve.",
  "kind": "campaign",
  "author": "Admin",
  "quests": [
    "morning_champion",
    "build_stronghold",
    "sprint_shadowlands",
    "build_stronghold",
    "sprint_shadowlands",
    "build_stronghold",
    "morning_champion"
  ],
  "bossAdventure": null
}
```

**Boss Fight**: **The Forest Titan** (After 7 quests)

- **Boss ID**: `forest_titan`
- **Total HP**: 550
- **Weakness**: Calf (Legs for mobility)
- **Resistance**: Shoulder
- **Asset**: `assets/images/bosses/forest_titan.png`
- **Prompt**: `A giant humanoid made of ancient trees, moss, and vines, wooden bark skin with glowing green nature runes. Dark fantasy comic book style, thick black outlines, towering presence. Background: dark void (#0B0F19) with floating leaves and roots. Face partially covered by tree branches, eyes glow emerald. Cel-shaded, organic texture, nature energy aura. Low angle showing immense scale.`

---

### Adventure 5: The Iron Lord's Conquest

**Goal**: Max Intensity Boss Rush
**Duration**: 8 Quests
**Target**: Elite athletes

```json
{
  "id": "iron_lord_conquest",
  "enTitle": "The Iron Lord's Conquest",
  "frTitle": "La Conquête du Seigneur de Fer",
  "enDescription": "The ultimate challenge. Face every trial, defeat every boss, emerge as the Iron Lord. Only legends complete this path.",
  "frDescription": "Le défi ultime. Affrontez chaque épreuve, vainquez chaque boss, émergez comme le Seigneur de Fer. Seules les légendes achèvent ce chemin.",
  "kind": "campaign",
  "author": "Admin",
  "quests": [
    "forge_dragon_blade",
    "iron_gauntlet_challenge",
    "climb_titan_tower",
    "forge_dragon_blade",
    "iron_gauntlet_challenge",
    "build_stronghold",
    "iron_gauntlet_challenge",
    "iron_gauntlet_challenge"
  ],
  "bossAdventure": null
}
```

**Boss Fight**: **The Fire Dragon** (After 8 quests)

- **Boss ID**: `fire_dragon`
- **Total HP**: 800
- **Weakness**: Abs (Water)
- **Resistance**: Chest (Fire)
- **Asset**: `assets/images/bosses/fire_dragon.png`
- **Prompt**: `A colossal dragon with obsidian black scales edged in molten red-orange, wings spread wide, breathing streams of fire. Dark fantasy comic book style, thick black outlines, imposing stance on hind legs. Background: dark void (#0B0F19) with fire explosions and embers floating. Glowing yellow eyes, fangs dripping magma, smoke billowing. Cel-shaded, dramatic lighting from fire glow. Wide shot showing full dragon majesty.`

---

## 🔗 PART 4: ASSET MAP GENERATION

*(Continued in next message...)*
