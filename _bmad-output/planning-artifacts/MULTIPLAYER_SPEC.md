# 🎮 MULTIPLAYER - PROXIMITY FEATURES SPECIFICATION

**Date:** 2026-01-06  
**Feature ID:** PHASE-6-MULTIPLAYER  
**Status:** SPECIFICATION (Not Implemented)  
**Effort Estimate:** 4-6 weeks (1 developer)

---

## 🎯 Vision Statement

> "Train together, compete locally, no server needed. Use Bluetooth/WiFi Direct to transform solo workouts into shared epic battles."

**Core Principle:** Offline-first multiplayer. No internet, no account, just proximity.

---

## 📋 Feature Set

### **MVP Features (Phase 6.1):**
1. **Local Discovery** - Find nearby users via Bluetooth
2. **Co-op Boss Fights** - 2-4 players damage same boss
3. **Workout Sync** - Share session progress in real-time
4. **Local Leaderboards** - See friends' stats (cached locally)

### **Future Features (Phase 6.2+):**
5. **Challenges** - Send workout challenges to friends
6. **Gift Sending** - Share resources/loot
7. **Village Visiting** - View friends' villages
8. **Team Adventures** - Multi-step co-op campaigns

---

## 🏗️ Technical Architecture

### **Technology Stack:**

| Component | Library | Purpose |
|-----------|---------|---------|
| **Bluetooth LE** | `react-native-ble-plx` | Device discovery, data transfer |
| **WiFi Direct** | `react-native-wifi-p2p` (Android) | High-speed transfer (optional) |
| **State Management** | Zustand + custom hooks | Multiplayer state |
| **Data Sync** | Custom P2P protocol | Session sync logic |

### **Why Bluetooth LE?**
- ✅ Works on iOS + Android
- ✅ No pairing required (discoverable mode)
- ✅ Low power consumption
- ✅ ~10m range (perfect for gym)
- ✅ Transfer speed: ~1-2 MB/s (sufficient for session data)

### **Why NOT WiFi Direct?**
- ❌ Android only (iOS doesn't support)
- ❌ Complex setup
- ❌ Battery drain

**Decision:** Use Bluetooth LE as primary, WiFi Direct as optional Android enhancement.

---

## 🔄 P2P Sync Protocol

### **Data Model:**

```typescript
// Multiplayer session state
interface MultiplayerSession {
  sessionId: string;           // UUID
  mode: "coop_boss" | "challenge" | "spectate";
  participants: Participant[];
  boss?: BossFightState;
  startTime: number;
  syncInterval: number;        // ms between syncs (default: 2000)
}

interface Participant {
  userId: string;              // Device UUID (generated on first use)
  userName: string;            // Village name
  avatar: string;              // Avatar ID
  isHost: boolean;             // Host controls boss state
  currentDamage: number;       // This session
  isActive: boolean;           // Still connected?
  lastSyncTime: number;        // Timestamp of last update
}

interface BossFightState {
  bossId: number;              // Boss type
  totalHp: number;
  currentHp: number;
  phase: number;               // Boss phase (1-4)
  participants: {
    [userId: string]: {
      damageDealt: number;
      exercisesCompleted: number;
    };
  };
}
```

### **Sync Messages:**

```typescript
// Message types sent via Bluetooth
type P2PMessage = 
  | { type: "DISCOVER"; payload: UserProfile }
  | { type: "JOIN_REQUEST"; payload: { sessionId: string; user: UserProfile } }
  | { type: "JOIN_ACCEPT"; payload: { sessionId: string } }
  | { type: "JOIN_REJECT"; payload: { reason: string } }
  | { type: "SESSION_START"; payload: { boss: BossFightState } }
  | { type: "EXERCISE_COMPLETE"; payload: { damage: number; exerciseId: number } }
  | { type: "BOSS_UPDATE"; payload: { currentHp: number; phase: number } }
  | { type: "SESSION_END"; payload: { winners: string[]; rewards: Loot } }
  | { type: "DISCONNECT"; payload: { userId: string } };

interface UserProfile {
  userId: string;
  userName: string;
  avatar: string;
  level: number;
  totalSessions: number;
}
```

---

## 📱 User Flow: Co-op Boss Fight

### **Step 1: Host Creates Session**

```
┌─────────────────────────────────────────────┐
│  BOSS FIGHT: THE IRON GOLEM                 │
│                                             │
│  [Solo] [Multiplayer]                       │
│                      ↑                      │
└──────────────────────┼──────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────┐
│  CREATE MULTIPLAYER SESSION                 │
│                                             │
│  🔍 Searching for nearby players...         │
│                                             │
│  Discoverable as: "Guiforge"                │
│                                             │
│  Found:                                     │
│  • Alex (Level 12)  [INVITE]                │
│  • Marie (Level 8)  [INVITE]                │
│                                             │
│  [Start with 0 players]                     │
└─────────────────────────────────────────────┘
```

**Technical:**
- Host starts advertising via Bluetooth (BLE Peripheral mode)
- Device broadcasts: `{type: "DISCOVER", userName, level, avatar}`
- Range: ~10 meters
- Other devices scan and show in list

---

### **Step 2: Players Join**

```
┌─────────────────────────────────────────────┐
│  NEARBY SESSIONS                            │
│                                             │
│  👹 Guiforge's Boss Fight                   │
│     The Iron Golem • 2/4 players            │
│     [JOIN]                                  │
│                                             │
│  ⚔️ Marie's Challenge                       │
│     Arms workout • 1/2 players              │
│     [JOIN]                                  │
└─────────────────────────────────────────────┘
```

**Technical:**
- Joining device scans for BLE advertisers
- Sends `JOIN_REQUEST` message
- Host shows confirmation popup
- Host sends `JOIN_ACCEPT` or `JOIN_REJECT`

---

### **Step 3: Lobby (Pre-Fight)**

```
┌─────────────────────────────────────────────┐
│  LOBBY: THE IRON GOLEM                      │
│                                             │
│  Players (3/4):                             │
│  • 👑 Guiforge (Host, Level 12)             │
│  • Alex (Level 10)                          │
│  • Marie (Level 8)                          │
│                                             │
│  Boss HP: 500                               │
│  Estimated time: 20 min per player          │
│                                             │
│  [Wait for more] [START FIGHT]              │
└─────────────────────────────────────────────┘
```

**Technical:**
- Lobby state synced every 1 second
- Host controls "Start" button
- On start, host sends `SESSION_START` with boss state

---

### **Step 4: Synchronized Fight**

```
┌─────────────────────────────────────────────┐
│  🏋️ YOUR WORKOUT (Active)                   │
│                                             │
│  PUSH-UPS                                   │
│  15 REPS                                    │
│  [DONE]                                     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  👹 BOSS HP: ████████████░░░░ 320/500       │
│                                             │
│  Team Damage:                               │
│  • Guiforge: 95 dmg  (Active 🔥)            │
│  • Alex: 60 dmg      (Resting)              │
│  • Marie: 45 dmg     (Active 🔥)            │
└─────────────────────────────────────────────┘
```

**Technical:**
- Each player runs their own session locally
- On exercise complete, send `EXERCISE_COMPLETE` with damage
- Host (or all devices) update boss HP
- Sync every 2 seconds (configurable)
- Visual: Real-time damage numbers appear on all screens

**Data Flow:**
```
Player A completes exercise
  ↓
Calculate damage locally (12 dmg)
  ↓
Broadcast: {type: "EXERCISE_COMPLETE", damage: 12}
  ↓
All devices receive message
  ↓
Update boss HP: 500 - 12 = 488
  ↓
Update UI (boss HP bar animates down)
```

---

### **Step 5: Victory (Shared)**

```
┌─────────────────────────────────────────────┐
│  🎆 BOSS DEFEATED! 🎆                       │
│                                             │
│  Team Time: 18:32                           │
│  Total Damage: 500                          │
│                                             │
│  MVP: Guiforge (180 dmg)                    │
│                                             │
│  YOUR REWARDS:                              │
│  ⭐ +250 XP  🪙 +75 Gold  👹 +1 Token        │
│                                             │
│  Team Bonus: +50 XP 🎁                      │
│                                             │
│  [RETURN HOME]                              │
└─────────────────────────────────────────────┘
```

**Technical:**
- Boss HP reaches 0
- Host sends `SESSION_END` with final stats
- Each player saves their session locally
- Bonus XP for co-op (e.g., +20%)
- Confetti + haptics on all devices

---

## 🔒 Edge Cases & Error Handling

### **Connection Loss:**

**Scenario:** Player loses Bluetooth connection mid-fight.

**Handling:**
1. Detect disconnect (no sync for 10 seconds)
2. Mark player as "Disconnected" in UI
3. **Option A (Lenient):** Boss HP stays same, other players continue
4. **Option B (Strict):** Boss HP scales down (remove disconnected player's damage)

**Recommendation:** Option A (lenient). Disconnects happen, don't punish the team.

**Code:**
```typescript
// stores/multiplayer.ts
function handlePlayerDisconnect(userId: string) {
  const player = participants.find(p => p.userId === userId);
  if (player) {
    player.isActive = false;
    // Send notification to other players
    broadcastMessage({
      type: "DISCONNECT",
      payload: { userId }
    });
  }
}
```

---

### **Host Disconnect:**

**Scenario:** Host (who controls boss state) loses connection.

**Handling:**
1. Detect host disconnect
2. **Elect new host** (player with highest level, or first joined)
3. New host takes over boss state sync
4. Continue fight

**Code:**
```typescript
function electNewHost() {
  const activePlayers = participants.filter(p => p.isActive && !p.isHost);
  if (activePlayers.length === 0) {
    // Session ends if no one left
    endSession("host_disconnect");
    return;
  }
  
  // Sort by level, then join time
  const newHost = activePlayers.sort((a, b) => b.level - a.level)[0];
  newHost.isHost = true;
  
  broadcastMessage({
    type: "HOST_CHANGE",
    payload: { newHostId: newHost.userId }
  });
}
```

---

### **Cheating / Data Integrity:**

**Scenario:** Malicious user sends fake damage values.

**Mitigation:**
1. **Validate damage on each device** (based on exercise targets)
2. **Cap damage** to reasonable values (e.g., max 50 dmg per exercise)
3. **Majority consensus** (if 3/4 players agree on boss HP, ignore outlier)

**Code:**
```typescript
function validateDamage(damage: number, exercise: Exercise): number {
  const maxDamage = exercise.targetMax * 2; // 2x max reps = cap
  return Math.min(damage, maxDamage);
}
```

---

### **Boss HP Desync:**

**Scenario:** Players have different boss HP values (due to packet loss).

**Handling:**
1. Host is **source of truth**
2. Every 5 seconds, host broadcasts `BOSS_UPDATE` with authoritative HP
3. Non-host devices reconcile their local state

**Code:**
```typescript
// Host broadcasts periodically
setInterval(() => {
  if (isHost) {
    broadcastMessage({
      type: "BOSS_UPDATE",
      payload: { currentHp: bossFightState.currentHp, phase: bossFightState.phase }
    });
  }
}, 5000);

// Non-hosts listen and sync
function handleBossUpdate(message: BossUpdateMessage) {
  if (!isHost) {
    bossFightState.currentHp = message.payload.currentHp;
    bossFightState.phase = message.payload.phase;
  }
}
```

---

## 🎨 UI Components (New)

### **1. MultiplayerLobby.tsx**
- Shows participants
- "Start" button (host only)
- "Leave" button (all)

### **2. NearbySessionsList.tsx**
- Scans for BLE advertisers
- Shows list of joinable sessions
- "Refresh" button

### **3. MultiplayerBossHpBar.tsx**
- Extends BossHpBar
- Shows team damage breakdown
- Real-time participant status (active/resting/disconnected)

### **4. TeamDamageOverlay.tsx**
- Floating overlay during fight
- Shows each player's damage
- MVP indicator (crown icon)

---

## 📊 Database Changes

### **New Tables:**

```sql
-- Store multiplayer sessions history
CREATE TABLE multiplayer_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL,             -- "coop_boss" | "challenge"
  boss_id INTEGER,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  participants_json TEXT NOT NULL, -- JSON array of Participant[]
  created_at INTEGER DEFAULT (unixepoch())
);

-- Track user's multiplayer stats
CREATE TABLE multiplayer_stats (
  user_id TEXT PRIMARY KEY,      -- Local device UUID
  total_coop_sessions INTEGER DEFAULT 0,
  total_coop_wins INTEGER DEFAULT 0,
  total_damage_dealt INTEGER DEFAULT 0,
  mvp_count INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT (unixepoch())
);
```

---

## 🔐 Privacy & Permissions

### **Required Permissions:**

**iOS:**
- `NSBluetoothAlwaysUsageDescription` - "Find nearby workout buddies"

**Android:**
- `BLUETOOTH` - BLE communication
- `BLUETOOTH_ADMIN` - Scan for devices
- `ACCESS_FINE_LOCATION` - Required for BLE scan (Android 10+)

### **User Control:**

- **Opt-in:** Multiplayer is OFF by default
- **Settings toggle:** "Enable Multiplayer" in Settings
- **Discoverable mode:** Must explicitly start hosting to be visible
- **No personal data:** Only share userName, avatar, level (no real name, email, etc.)

---

## 🧪 Testing Strategy

### **Unit Tests:**
- P2P message serialization/deserialization
- Damage calculation validation
- Boss HP sync logic

### **Integration Tests:**
- Mock Bluetooth connection
- Simulate join/leave scenarios
- Test host election

### **Manual Tests:**
- Real devices (iOS + Android)
- Test in gym environment (range, interference)
- Stress test: 4 players, 20 min session

---

## 📈 Metrics & Analytics (Local)

Track locally (no server):

| Metric | Storage |
|--------|---------|
| Total co-op sessions | `multiplayer_stats.total_coop_sessions` |
| Co-op win rate | `total_coop_wins / total_coop_sessions` |
| Average damage per session | `total_damage_dealt / total_coop_sessions` |
| MVP count | `multiplayer_stats.mvp_count` |

Display in Journal/Stats page.

---

## 🚀 Implementation Phases

### **Phase 6.1 (MVP - 4 weeks):**
- [x] Bluetooth LE setup (react-native-ble-plx)
- [x] Device discovery & pairing
- [x] P2P protocol implementation
- [x] Co-op boss fight (2-4 players)
- [x] Basic UI (Lobby, Session, Victory)
- [x] Edge case handling (disconnect, desync)

### **Phase 6.2 (Polish - 2 weeks):**
- [x] Challenges feature
- [x] Local leaderboards
- [x] Gift sending
- [x] Improved animations (team damage, MVP reveal)

### **Phase 6.3 (Future):**
- [ ] Village visiting
- [ ] Team adventures
- [ ] WiFi Direct (Android enhancement)

---

## 🎯 Success Criteria

**Feature is successful if:**
- ✅ 2+ users can connect via Bluetooth within 10 seconds
- ✅ Co-op boss fight runs smoothly (no desync)
- ✅ Connection is stable for 20+ min sessions
- ✅ No data loss on disconnect/reconnect
- ✅ MVP calculation is fair and accurate
- ✅ Users report "this is awesome!" 🎉

---

## 📚 Resources & References

**Libraries:**
- [react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx) - Bluetooth LE
- [react-native-wifi-p2p](https://github.com/kirillzyusko/react-native-wifi-p2p) - WiFi Direct (Android)

**Tutorials:**
- [BLE Basics](https://learn.adafruit.com/introduction-to-bluetooth-low-energy)
- [P2P Game Sync](https://www.gamedeveloper.com/programming/peer-to-peer-game-networking)

**Similar Apps:**
- Pokémon GO (local raids)
- Strava (group activities)
- Zwift (multiplayer cycling)

---

**Ready to code the future of social fitness?** 🚀💪

