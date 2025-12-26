# Quest Session Specification

## 1. Overview
This document outlines the technical and design specification for the "Quest Session" feature. This is the core loop where users perform workouts. The experience should feel like a "Fantasy RPG" battle, using the comic book aesthetic defined in the project's visual identity.

## 2. Visual Identity & UX Principles
*   **Style**: Vibrant, "Franco-Belgian" comic book aesthetic. Thick outlines, bold colors.
*   **Typography**: Readable sans-serif for instructions; stylized "comic" font for big numbers (timers, rep counts).
*   **Ergonomics**:
    *   **Touch Targets**: Primary actions (Complete, Pause) must be >44pt (Green Zone).
    *   **Safe Areas**: Critical UI elements must respect device safe areas (notch, home indicator).
*   **Feedback**:
    *   **Haptics**: Heavy impact on "Complete", light tick on countdowns.
    *   **Audio**: "Battle start" sound, "Victory" fanfare, "Tick-tock" tension during rest.

## 3. Data Structures

### 3.1 Session State (Zustand Store)
The session state must be robust enough to handle app backgrounding and restoration.

```typescript
import { Quest } from '@/db/quests';

type SessionStatus = 'idle' | 'running' | 'resting' | 'paused' | 'finished';

interface SessionState {
  // Static Data
  quest: Quest | null;
  
  // Dynamic State
  status: SessionStatus;
  currentRoundIndex: number; // 0-based
  currentExerciseIndex: number; // 0-based
  
  // Timing
  startTime: number | null; // Date.now() when session started
  totalPausedTime: number; // Accumulator for pause duration
  
  // Active Timer (for Time-based exercises or Rest)
  timerStartTimestamp: number | null; // Date.now() when current timer started
  timerDuration: number; // Target duration in seconds
  
  // Actions
  startSession: (quest: Quest) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  quitSession: () => void;
  
  // Progression
  completeExercise: (resultValue: number) => void; // resultValue = reps done or seconds held
  skipRest: () => void;
  addRestTime: (seconds: number) => void;
}
```

## 4. User Flow & Screens

### 4.1 Pre-Start (Quest Detail)
*   **Context**: User selects a quest from the Carousel.
*   **UI**:
    *   Hero Image: Comic-style illustration of the quest theme.
    *   Stats: Rounds, Total Exercises, Est. Duration.
    *   List: Scrollable list of exercises.
    *   **Action**: "Start Quest" (Floating Action Button or fixed bottom bar).

### 4.2 Active Exercise (The "Battle")
*   **Layout**:
    *   **Top**: Progress Bar (Segmented: `Round 1/3`).
    *   **Center**:
        *   **Media**: Animated GIF/WebP of the exercise (comic style).
        *   **Counter**: HUGE font.
            *   *Reps*: "12 Reps" (Static).
            *   *Time*: Countdown timer (Dynamic).
    *   **Bottom (Thumb Zone)**:
        *   **Primary**: "DONE!" Button (Large, Green/Primary Color).
        *   **Secondary**: "Pause" (Top-right or small icon).
*   **Behavior**:
    *   **Reps**: User performs reps, taps "DONE!".
    *   **Time**: Timer counts down. At 0, plays sound + haptic. Auto-transition to Rest? (Prefer manual "Done" to confirm completion).

### 4.3 Rest Screen (The "Campfire")
*   **Layout**:
    *   **Background**: Dimmed or "Campfire" thematic background.
    *   **Center**: Large Countdown Timer.
    *   **Next Up**: Card showing the *next* exercise (Name + Thumbnail).
    *   **Controls**:
        *   "+10s" (Small button).
        *   "Skip Rest" (Large button, "Ready!").
*   **Logic**:
    *   If `restSeconds == 0` in Quest config, skip this screen entirely.

### 4.4 Paused Overlay
*   **Trigger**: User taps Pause or backgrounds app (optional auto-pause).
*   **UI**: Modal overlay with blurred background.
*   **Options**:
    *   "Resume" (Big).
    *   "Restart Round".
    *   "Quit Quest" (Destructive, red).

### 4.5 Victory Screen (The "Loot")
*   **Visuals**: Confetti, "QUEST COMPLETE" banner, XP bar filling up.
*   **Stats**: Total Time, Total Reps.
*   **Input**: "How was it?" (Difficulty rating: Easy/Medium/Hard) -> Adjusts user level logic.
*   **Action**: "Finish" -> Saves to DB -> Navigates Home.

## 5. Database Integration

Upon "Finish", the session is committed to SQLite.

### 5.1 Tables
1.  **`completed_sessions`**:
    *   `questId`: Link to original quest.
    *   `performedAt`: Timestamp.
    *   `durationSeconds`: `(Date.now() - startTime) - totalPausedTime`.
    *   `userLevel`: Snapshot of user difficulty setting.
2.  **`completed_exercises`**:
    *   Iterate through the session log.
    *   Record `exerciseId`, `roundIndex`, `resultValue` (reps/time).

## 6. Technical Implementation Details

### 6.1 Timer Accuracy
*   **Problem**: `setInterval` drifts and stops in background.
*   **Solution**:
    *   Store `timerStartTimestamp` (Date.now()).
    *   In `useInterval` (100ms tick), calculate `remaining = duration - (Date.now() - timerStartTimestamp)`.
    *   This ensures accuracy even if the user switches apps.

### 6.2 Wake Lock
*   Use `expo-keep-awake` to prevent screen dimming during the session.
*   Activate on `startSession`, deactivate on `quitSession` or `finished`.

### 6.3 Audio System
*   Preload sounds: `tick.mp3`, `whistle.mp3`, `victory.mp3`.
*   Use `expo-av`.
*   Respect system silent mode (optional, but fitness apps usually override or mix with music).

## 7. Edge Cases
*   **App Killed**: If the OS kills the app, state is lost unless persisted.
    *   *MVP*: Accept state loss.
    *   *V2*: Persist `SessionState` to `AsyncStorage` on every state change (Zustand `persist` middleware).
*   **Back Button**: Android hardware back button should trigger "Pause" state, not exit immediately.