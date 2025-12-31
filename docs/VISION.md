# Bati - Vision & Product Overview

## 🏰 The Vision

**Bati** is a **mobile fitness app** that transforms your workout routine into an epic fantasy RPG adventure.

**Core Philosophy:**

- 🎮 **Simple, Fun, Addictive** — Minimal choices, maximum engagement
- 📴 **Offline-First** — Works anywhere, no internet required
- 🏋️ **Sport-Focused** — The workout is the core, RPG elements enhance motivation
- ⚔️ **Fantasy RPG Rewards** — Build your village, fight bosses, earn loot

> "Train like a hero, build like a king."

---

## 🎯 Core Concept

Every workout you complete **builds your fantasy village**. The type of exercises you do determines what your village looks like:

| Exercise Type | Fantasy Resource | Village Building |
|--------------|------------------|------------------|
| Arms (Biceps, Triceps) | 🪵 **Wood** | Archery Range, Watchtower |
| Back (Pull-ups, Rows) | �ite **Stone** | Castle Walls, Fortress |
| Chest (Push-ups, Bench) | 🔥 **Fire/Forge** | Blacksmith, Armory |
| Abs (Core work) | 💧 **Water** | Well, Fishing Dock |
| Shoulders (Presses) | 🌬️ **Wind** | Windmill, Tower |
| Legs (Squats, Calf) | 🌾 **Food/Grain** | Farm, Barn |

**Your village reflects YOU** — If you train arms often, you'll have an impressive Archery Range. If you focus on back exercises, your castle walls will be legendary.

---

## 🗺️ Core Gameplay Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1. CHOOSE QUEST/ADVENTURE                                     │
│      ↓                                                          │
│   2. COMPLETE WORKOUT SESSION                                   │
│      ↓                                                          │
│   3. EARN REWARDS (XP, Gold, Resources)                         │
│      ↓                                                          │
│   4. BUILD/UPGRADE VILLAGE                                      │
│      ↓                                                          │
│   5. UNLOCK NEW ADVENTURES                                      │
│      ↓                                                          │
│   (Repeat)                                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎮 RPG Elements

### Resources System

| Resource | How to Earn | Use |
|----------|-------------|-----|
| 🪙 **Gold** | Every completed quest | Buy buildings, cosmetics |
| 🪵 **Wood** | Arms exercises | Build wooden structures |
| 🪨 **Stone** | Back exercises | Build stone structures |
| 🔥 **Fire Essence** | Chest exercises | Forge weapons/armor |
| 💧 **Water** | Abs exercises | Fountains, wells |
| 🌾 **Grain** | Leg exercises | Farms, food storage |

### Buildings (Auto-Constructed)

Buildings are **automatically built** based on your workout history — minimal user choice, maximum reward visibility.

**Philosophy**: User doesn't choose what to build. The village **grows organically** based on their training patterns. This:

1. Reduces decision fatigue
2. Creates a visual "fitness fingerprint"
3. Encourages balanced training

### 🔥 Flame System (Streak)

- **Daily Flame** = Workout streak counter
- RPG Justification: "The Sacred Flame of the Village"
- Losing streak = Flame dims (not lost completely)
- Long streaks = Special flame colors/effects

---

## 📱 User Journey

### Onboarding

1. Welcome to the Kingdom
2. Choose your Avatar (simple preset selection)
3. Set your Goal (strength, endurance, flexibility)
4. First Quest tutorial
5. Your village is founded!

### Daily Experience

1. **Home Screen**: Village overview + "Continue Adventure" or "Quick Quest"
2. **Quest Selection**: Browse available workouts
3. **Session**: Active workout with RPG feedback
4. **Victory**: Rewards animation, resources collected
5. **Village Update**: See your new building/upgrade

---

## 🛠️ Technical Stack

| Technology | Purpose |
|------------|---------|
| **React Native + Expo** | Cross-platform mobile |
| **SQLite (Drizzle ORM)** | Offline-first local database |
| **i18next** | Internationalization (EN/FR) |
| **Tamagui** | Performant UI components |
| **Zustand** | State management |

### Performance Principles

- **Offline-First**: All data stored locally
- **Fast Load**: <2s cold start target
- **Smooth Animations**: 60fps during sessions
- **Battery Efficient**: Minimal background work

---

## 🎨 Visual Identity

**Style**: Franco-Belgian Comic Book (Bande Dessinée)

- Thick black outlines
- Bold, saturated colors
- Expressive characters
- Whimsical fantasy world

See [prompt.image.md](prompt.image.md) for AI image generation prompts.

---

## 🚀 Feature Roadmap

### Phase 1: Core Loop (Current)

- [x] Quest system (workout templates)
- [x] Session flow (active workout UI)
- [x] Adventures (multi-quest campaigns)
- [x] Boss fights
- [x] XP system
- [x] Exercise color coding

### Phase 2: Village & Resources

- [ ] Resource system (Wood, Stone, Gold, etc.)
- [ ] Village view
- [ ] Auto-building based on workout history
- [ ] Building upgrades

### Phase 3: Coach & Planning

- [ ] Goal setting
- [ ] Auto-generated adventure plans
- [ ] Notification scheduling
- [ ] Weekly planning view

### Phase 4: Statistics & Progress

- [ ] Workout history charts
- [ ] Muscle balance visualization
- [ ] Personal records tracking
- [ ] Achievement system

### Phase 5: Future (Post-MVP)

- [ ] Visit other players' villages
- [ ] Cooperative adventures
- [ ] GPS/outdoor quests
- [ ] Smartwatch integration
- [ ] Cloud sync

---

## 📖 Documentation Index

| Document | Description |
|----------|-------------|
| [QUESTS.md](QUESTS.md) | Quest system (workout templates) |
| [ADVENTURES.md](ADVENTURES.md) | Multi-quest campaigns |
| [BOSS.md](BOSS.md) | Boss fight mechanics |
| [SESSION.md](SESSION.md) | Active workout UI |
| [VILLAGE.md](VILLAGE.md) | Village & building system |
| [RESOURCES.md](RESOURCES.md) | Resource economy |
| [COACH.md](COACH.md) | Goal setting & planning |
| [UI_GUIDE.md](UI_GUIDE.md) | Visual design system |
| [QUEST_SESSION_SPEC.md](QUEST_SESSION_SPEC.md) | Technical session spec |
| [mobile.md](mobile.md) | Mobile UX best practices |

---

## 🎯 Design Principles

1. **Sport First, RPG Second** — Never let gamification interfere with the workout
2. **One Tap to Train** — Minimize friction to start a session
3. **Visible Progress** — Every workout should feel rewarding
4. **Offline Always** — No loading screens, no connection required
5. **Simple Choices** — Reduce cognitive load, auto-optimize where possible
6. **Balanced Encouragement** — Celebrate wins without punishing breaks
