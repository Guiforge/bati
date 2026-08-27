---
title: Session Flow (Active Workout)
type: system
status: active
updated: 2026-07-18
related: [progression.md, adventures.md, ../design/design-system.md]
sources: [app/session.tsx, stores/session.ts]
---

# Session Flow (Active Workout)

> Merged from the former `SESSION.md` (product-facing screen design) and
> `QUEST_SESSION_SPEC.md` (technical spec) — one canonical page, no duplicate source of
> truth for the workout screen.

## Summary

The Session is the core experience — where the actual workout happens. It must be
**sport-focused first**, with RPG elements enhancing (not distracting from) the workout.
Completion is always **manual** (the user taps "Done" / "I'm done"): there is no silent
auto-transition out of an exercise, even when a timer reaches zero. The principle is
real-friction input — 2 real taps, not a passive countdown — so that a logged set means someone
was there for it.

---

## 🎮 Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1. PRE-START (Quest Preview)                                  │
│      ↓                                                          │
│   2. ACTIVE EXERCISE ("The Battle")                             │
│      ↓                                                          │
│   3. REST PERIOD ("The Campfire") [if configured]               │
│      ↓                                                          │
│   4. REPEAT (2-3) for all exercises × rounds                    │
│      ↓                                                          │
│   5. VICTORY ("The Loot")                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 Screen Designs

### 1. Pre-Start Screen

**Purpose**: Preview what's coming, get mentally ready

```
┌─────────────────────────────────────────────┐
│              ← Back                         │
├─────────────────────────────────────────────┤
│                                             │
│           [🖼️ Quest Hero Image]             │
│                                             │
│         ⚔️ IRON ARMS CHALLENGE ⚔️           │
│                                             │
│   "Forge your arms like a blacksmith        │
│    forges legendary weapons"                │
│                                             │
├─────────────────────────────────────────────┤
│   📊 QUEST STATS                            │
│                                             │
│   Rounds: 3     Exercises: 5     ~20 min    │
│                                             │
├─────────────────────────────────────────────┤
│   📋 EXERCISES                              │
│   ┌─────────────────────────────────┐       │
│   │ 1. Push-ups          12-15 reps │       │
│   │ 2. Diamond Push-ups   8-10 reps │       │
│   │ 3. Tricep Dips       10-12 reps │       │
│   │ 4. Bicep Curls       12-15 reps │       │
│   │ 5. Hammer Curls      10-12 reps │       │
│   └─────────────────────────────────┘       │
│                                             │
├─────────────────────────────────────────────┤
│          [🚀 START QUEST]                   │
└─────────────────────────────────────────────┘
```

**Thumb Zone**: Start button at bottom (Green Zone)

---

### 2. Active Exercise Screen

**Purpose**: Focus on the current exercise, clear instructions

```
┌─────────────────────────────────────────────┐
│  ⏸️                    Round 2/3            │
│  ━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━        │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│           [🎬 Exercise Animation]           │
│              (Looping GIF/Video)            │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│              PUSH-UPS                       │
│                                             │
│                 12                          │
│               REPS                          │
│                                             │
│         [How to do it ▼]                   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│         [✅ DONE!]                          │
│                                             │
│    [◀️ -1]  Adjust  [+1 ▶️]                 │
│                                             │
└─────────────────────────────────────────────┘
```

#### For Time-Based Exercises

```
┌─────────────────────────────────────────────┐
│                                             │
│              PLANK HOLD                     │
│                                             │
│               0:45                          │
│              remaining                      │
│                                             │
│   ━━━━━━━━━━━━━━━━●━━━━━░░░░░░░░░          │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│         [⏹️ STOP EARLY]                     │
│                                             │
└─────────────────────────────────────────────┘
```

**Key Elements**:

- **Progress Bar**: Segmented by rounds, shows current position
- **Animation**: Large, clear demonstration
- **Target**: HUGE number, impossible to miss
- **Done Button**: Large, in thumb zone, satisfying to tap

---

### 3. Rest Screen

**Purpose**: Recover, preview next exercise, option to skip

```
┌─────────────────────────────────────────────┐
│              🔥 REST 🔥                     │
├─────────────────────────────────────────────┤
│                                             │
│           [🏕️ Campfire Animation]           │
│                                             │
│                                             │
│                 0:28                        │
│                                             │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░          │
│                                             │
├─────────────────────────────────────────────┤
│   NEXT UP:                                  │
│   ┌─────────────────────────────────┐       │
│   │  [🖼️]  Diamond Push-ups         │       │
│   │        8-10 reps                │       │
│   └─────────────────────────────────┘       │
│                                             │
├─────────────────────────────────────────────┤
│   [+10s]              [READY! →]            │
└─────────────────────────────────────────────┘
```

**Features**:

- Relaxing visual (campfire/forest theme)
- Clear countdown
- Preview of next exercise
- Quick actions: add time or skip

---

### 4. Pause Overlay

**Purpose**: Take a break, options to continue or quit

```
┌─────────────────────────────────────────────┐
│                                             │
│           ░░░░░░░░░░░░░░░░░░░░░░░           │
│           ░                     ░           │
│           ░   ⏸️ PAUSED         ░           │
│           ░                     ░           │
│           ░   Time: 12:34       ░           │
│           ░                     ░           │
│           ░   [▶️ RESUME]       ░           │
│           ░                     ░           │
│           ░   [🔄 Restart Round]░           │
│           ░                     ░           │
│           ░   [🚪 Quit Quest]   ░           │
│           ░       (red)         ░           │
│           ░                     ░           │
│           ░░░░░░░░░░░░░░░░░░░░░░░           │
│                                             │
└─────────────────────────────────────────────┘
```

**Quit Confirmation**:

- "Are you sure? Progress will be lost."
- [Cancel] [Quit Anyway]

---

### 5. Victory Screen

**Purpose**: Celebrate, show rewards, collect feedback

```
┌─────────────────────────────────────────────┐
│                                             │
│           🎆 QUEST COMPLETE! 🎆             │
│                                             │
│           [✨ Victory Animation ✨]          │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│   ⏱️ Duration      📊 Exercises    🔥 Streak│
│      18:32            15            5 days │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│   ⭐ +180 XP   ████████████░░ Level 5      │
│                                             │
│   🏰 The village grows! (overlay revealed)  │
│                                             │
├─────────────────────────────────────────────┤
│   How was it?                               │
│   [😅 Easy]  [😊 Good]  [😤 Hard]           │
│                                             │
├─────────────────────────────────────────────┤
│          [🏠 RETURN HOME]                   │
└─────────────────────────────────────────────┘
```

**Feedback Impact**: the answer moves the level an **adventure** proposes, one rung, and the
adventure screen captions the tag when it did. It takes 3 of the last 5 sessions saying the same
thing (`analyzeDifficultyProgression`), so one bad night changes nothing, and a hero who never
answers is never moved — a missing answer counts as "good".

- Easy ×3 → the next adventure step proposes one rung harder
- Hard ×3 → one rung easier
- Good, or no answer → unchanged

A **quest** keeps the level the hero set on it: nothing here overrides a choice they made by
hand. `suggestDifficultyFromSessions` is the single writer of this rule
([`db/difficultySuggestion.ts`](../../db/difficultySuggestion.ts)).

---

## ⚡ Interactions & Feedback

### Haptics

| Event | Haptic |
|-------|--------|
| Tap "Done" | Heavy impact |
| Timer tick (last 5s) | Light tick |
| Quest Complete | Success pattern |
| Add/remove rep | Light tap |

### Audio

| Event | Sound |
|-------|-------|
| Session Start | Battle horn |
| Exercise Complete | Sword swing |
| Rest Start | Campfire crackle |
| Timer Warning (5s) | Tick-tock |
| Quest Complete | Victory fanfare |

### Animations

- **Rep Counter**: Bounces on tap
- **Progress Bar**: Smooth fill
- **Done Button**: Pulse effect before tap
- **Victory**: Confetti + XP bar fill

---

## 🔧 Technical Implementation

### State Management (Zustand)

```typescript
type SessionStatus = 'idle' | 'running' | 'resting' | 'paused' | 'finished';

interface SessionState {
  // Quest Data
  quest: Quest | null;

  // Progress
  status: SessionStatus;
  currentRoundIndex: number;
  currentExerciseIndex: number;

  // Timing
  startTime: number | null;
  totalPausedTime: number;
  timerStartTimestamp: number | null;
  timerDuration: number;

  // Results (accumulated during session)
  exerciseResults: ExerciseResult[];

  // Actions
  startSession: (quest: Quest) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  quitSession: () => void;
  completeExercise: (resultValue: number) => void;
  skipRest: () => void;
  addRestTime: (seconds: number) => void;
}
```

### Timer Accuracy

```typescript
// Problem: setInterval drifts and stops in background
// Solution: Calculate from timestamps

function useAccurateTimer(duration: number, startTimestamp: number) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimestamp) / 1000;
      const newRemaining = Math.max(0, duration - elapsed);
      setRemaining(newRemaining);

      if (newRemaining <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 100); // 10 FPS for smooth countdown

    return () => clearInterval(interval);
  }, [duration, startTimestamp]);

  return remaining;
}
```

### Screen Wake Lock

```typescript
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// In session start
await activateKeepAwakeAsync();

// In session end or quit
deactivateKeepAwake();
```

### Database Integration

On "Finish", the session is committed to SQLite:

**`completed_sessions`**
- `questId` — link to the original quest
- `performedAt` — timestamp
- `durationSeconds` — `(Date.now() - startTime) - totalPausedTime`
- `userLevel` — snapshot of the user's difficulty setting

**`completed_exercises`**
- One row per exercise performed: `exerciseId`, `roundIndex`, `resultValue` (reps or seconds held)

Audio: preload `tick.mp3`, `whistle.mp3`, `victory.mp3` via `expo-av`; respect system silent
mode unless overridden (fitness apps commonly mix with music).

---

## 📱 Edge Cases

### App Backgrounded

- Timer continues calculating from timestamps
- Optional: auto-pause after 30 seconds

### App Killed

- **MVP**: Accept state loss
- **V2**: Persist state with Zustand middleware

### Android Back Button

- Trigger pause, not exit
- Confirm before quitting

### Notification During Session

- Don't interrupt workout
- Queue notifications for after session

---

## 🎨 Color Coding

Exercise background color based on muscle group:

- Arms: Pastel Pink
- Back: Pastel Blue
- Chest: Pastel Yellow
- Abs: Pastel Green
- Shoulders: Pastel Purple
- Legs: Pastel Orange

This creates visual variety and helps users quickly identify exercise types.

## Related

- [progression.md](progression.md) — what the victory screen grants (XP + derived village reaction)
- [adventures.md](adventures.md) — "no session is wasted" rule when a day's quest is skipped
