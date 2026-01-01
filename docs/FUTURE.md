# Future Roadmap

## Overview

This document outlines features planned for future releases, beyond the current MVP scope.

---

## 🗺️ Release Phases

### Phase 1: Core Loop ✅ (Current)

- [x] Quest system (workout templates)
- [x] Session flow (active workout UI)
- [x] Adventures (multi-quest campaigns)
- [x] Boss fights
- [x] XP system
- [x] Exercise color coding
- [x] Localization (EN/FR)

### Phase 2: Village & Economy 🏗️ (Next)

- [ ] Resource system (Wood, Stone, Gold, etc.)
- [ ] Village view (isometric 2.5D)
- [ ] Auto-building based on workout history
- [ ] Building upgrades & levels
- [ ] Flame/streak system with visual feedback

### Phase 3: Coach & Planning 🎯

- [ ] Goal setting (strength, endurance, etc.)
- [ ] Auto-generated adventure plans
- [ ] Notification scheduling
- [ ] Weekly planning view
- [ ] Missed workout reminders

### Phase 4: Statistics & Progress 📊

- [ ] Workout history charts
- [ ] Muscle balance visualization
- [ ] Personal records tracking
- [ ] Achievement system
- [ ] Export data functionality

### Phase 5: Polish & Quality 💎

- [ ] Improved animations
- [ ] Sound effects & music
- [ ] Haptic feedback refinement
- [ ] Performance optimization
- [ ] Accessibility improvements

---

## 🌐 Social Features (Future)

### Village Visiting

**Concept**: Visit other players' villages to see their progress.

```text
┌─────────────────────────────────────────────┐
│              🏰 FRIEND'S VILLAGE            │
├─────────────────────────────────────────────┤
│                                             │
│           [Village Visualization]           │
│                                             │
│   "Alex's Stronghold"                       │
│   Level 15 • 234 sessions                   │
│                                             │
│   Specialization: Back training 💪          │
│   Their castle walls are legendary!         │
│                                             │
├─────────────────────────────────────────────┤
│   [Send Gift]  [Challenge]  [Back]          │
└─────────────────────────────────────────────┘
```

**Features**:

- View friends' villages (read-only)
- See their training focus
- Send encouragement gifts
- Challenge to co-op sessions

### Cooperative Adventures

**Concept**: Complete adventures together with friends.

```text
CO-OP ADVENTURE: "THE TWIN DRAGONS"

You + Alex vs. The Dragon Brothers

Combined Progress:
You:  ████████████░░░░░░░░ 180 dmg
Alex: ██████████░░░░░░░░░░ 150 dmg
Total: ████████████████████░░ 330/500 HP

[Start Your Session]
```

**Features**:

- Async co-op (not real-time required)
- Combined damage to shared boss HP
- Shared rewards split fairly
- Friend leaderboards

---

## 📍 GPS & Outdoor Features

### Outdoor Quests

**Concept**: Location-based workout challenges.

```text
🌳 OUTDOOR QUEST: FOREST RUN

Distance: 3.2 km
Checkpoints: 4

[Checkpoint 1] Park entrance - 10 squats
[Checkpoint 2] Lake view - 15 lunges
[Checkpoint 3] Hill top - 20 mountain climbers
[Checkpoint 4] Return - Sprint finish!

[Start with GPS Tracking]
```

**Features**:

- Create custom routes
- Exercise stations along the way
- GPS tracking for distance
- Weather integration

### Territory System

**Concept**: Claim territory in your neighborhood.

- Complete workouts to expand territory
- Compete with nearby users (optional)
- Discover secret quests in locations
- Community events at landmarks

---

## ⌚ Smartwatch Integration

### Supported Platforms

- Apple Watch
- Wear OS (Google)
- Fitbit (limited)

### Features

| Feature | Priority | Description |
| ------- | -------- | ----------- |
| **Heart Rate** | High | Track workout intensity |
| **Session Control** | High | Start/pause from watch |
| **Timer Display** | Medium | Exercise countdown on wrist |
| **Notifications** | Medium | Rest alerts, motivation |
| **Standalone** | Low | Watch-only sessions |

### Heart Rate Zones

```text
WORKOUT INTENSITY

Current: 145 BPM 🔥

Zone 1 (Warm-up):  50-60% ░░░░░░░░░░
Zone 2 (Fat Burn): 60-70% ░░░░░░░░░░
Zone 3 (Cardio):   70-80% ████████░░ ← You're here!
Zone 4 (Peak):     80-90% ░░░░░░░░░░
Zone 5 (Max):      90%+   ░░░░░░░░░░

Keep it up! 🔥
```

---

## ☁️ Cloud Sync

### Architecture

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Phone A   │────▶│   Cloud     │◀────│   Phone B   │
│   (SQLite)  │     │   (Server)  │     │   (SQLite)  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │   Web App   │
                    │  (Optional) │
                    └─────────────┘
```

### Sync Strategy

- **Offline-First**: Always works without connection
- **Background Sync**: When online, push/pull changes
- **Conflict Resolution**: Last-write-wins + merge for exercises
- **End-to-End Encryption**: Privacy by default

### Cloud Features

| Feature | Description |
| ------- | ----------- |
| **Multi-device** | Sync between phone/tablet |
| **Backup** | Never lose progress |
| **Web Access** | View stats on computer |
| **Family Sharing** | Share subscription (if applicable) |

---

## 🎮 Advanced RPG Features

### Guild System

**Concept**: Join or create training guilds.

- Train together (async)
- Guild challenges & leaderboards
- Shared guild village
- Weekly guild quests

### Seasons & Events

**Concept**: Limited-time themed content.

| Season | Theme | Special Content |
| ------ | ----- | --------------- |
| Spring | Renewal | New quests, double XP |
| Summer | Beach Body | Outdoor challenges |
| Fall | Harvest | Resource bonuses |
| Winter | Frost Festival | Boss event |

### Cosmetics

**Concept**: Personalization options.

- Avatar customization
- Village themes
- Flame colors
- Victory animations
- UI themes

---

## 🛠️ Technical Improvements

### Performance

- [ ] Lazy loading for lists
- [ ] Image optimization
- [ ] Database query optimization
- [ ] Reduce bundle size
- [ ] Memory management

### Developer Experience

- [ ] Comprehensive test suite
- [ ] CI/CD pipeline
- [ ] Documentation site
- [ ] Debug tools
- [ ] Analytics (privacy-respecting)

### Accessibility

- [ ] VoiceOver/TalkBack support
- [ ] Dynamic type sizes
- [ ] High contrast mode
- [ ] Reduced motion option
- [ ] Colorblind modes

---

## 📅 Tentative Timeline

| Quarter | Focus |
| ------- | ----- |
| Q1 2025 | Phase 2: Village & Economy |
| Q2 2025 | Phase 3: Coach & Planning |
| Q3 2025 | Phase 4: Statistics |
| Q4 2025 | Phase 5: Polish |
| 2026+ | Social, GPS, Watch, Cloud |

*Timeline subject to change based on user feedback and priorities.*

---

## 💡 Community Suggestions

Ideas gathered from potential users:

1. **User-Created Quests**: Let users design and share workouts
2. **Workout Music**: In-app playlists or Spotify integration
3. **Rest Day Activities**: Light yoga/stretching content
4. **Photo Progress**: Before/after photo timeline
5. **AI Coach**: Personalized recommendations via AI

---

## 🎯 Guiding Principles

When adding features, always ask:

1. **Does it enhance the workout?** (Sport-first)
2. **Is it simple to use?** (Minimal choices)
3. **Does it work offline?** (Offline-first)
4. **Is it fun?** (Gamification that motivates)
5. **Is it respectful?** (Privacy, no dark patterns)

### 6.7 Advanced RPG 💡

- 💡 Seasons & events
  - 💡 Limited-time content
  - 💡 Seasonal rewards
- 💡 Cosmetics
  - 💡 Avatar customization
  - 💡 Village themes
  - 💡 Flame colors
- 💡 Equipment system
  - 💡 Collect gear
  - 💡 Buff effects

### DevOps 📋

- 📋 CI/CD pipeline
  - 📋 Automated tests
  - 📋 Build automation
  - 📋 Release management
- 📋 Monitoring
  - 📋 Crash reporting
  - 📋 Performance monitoring
  - 📋 Analytics (privacy-respecting)

### 5.2 Sound & Haptics ⚠️

- ✅ Haptic feedback (onboarding + session)
- ⚠️ Sound effects
  - ✅ System setup (expo-av + useSound hook)
  - 📋 Session start (battle horn)
  - 📋 Exercise complete (sword swing)
  - 📋 Rest start (campfire)
  - 📋 Timer warning (tick-tock)
  - ✅ Victory fanfare (hooked up, needs asset)
  - 📋 Level up chime
- ✅ Haptic feedback during session
  - ✅ Heavy impact on "Done"
  - ✅ Light tick on countdown
  - ✅ Success pattern on complete
- ✅ Audio preferences
  - ✅ Sound enable/disable (settings toggle)
  - ✅ Haptic enable/disable (useHaptics hook + settings toggle)
