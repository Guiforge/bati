---
title: React Native Performance — Best Practices & Antipatterns
type: technical
status: active
updated: 2026-07-18
related: [technical-architecture.md, ../meta/wiki-protocol.md, ../design/design-system.md]
sources: [app.json, stores/session.ts, components/session/PausedOverlay.tsx, app/(tabs)/quests/index.tsx, package.json]
---

# React Native Performance — Best Practices & Antipatterns

## Summary

Performance rules for Bati's actual stack: Expo + React Native 0.81 (New Architecture),
Hermes, React Compiler, Tamagui, Zustand, `@legendapp/list`, `expo-image`, SQLite/Drizzle.
Generic RN advice ("use FlashList", "memoize everything") is filtered to what applies here —
several of those defaults are already in place; this page tracks what's real for this repo.

## Status in this codebase

| Optimization | State |
| --- | --- |
| New Architecture (Fabric/TurboModules/JSI) | On (`newArchEnabled: true` in [app.json](../../app.json)) |
| Hermes engine | On (`jsEngine: "hermes"`) |
| React Compiler (auto-memoization) | On (`experiments.reactCompiler: true`) |
| Virtualized lists | `@legendapp/list` used for quest/adventure galleries — do not regress to `FlatList`/`ScrollView.map` |
| Images | `expo-image` used everywhere images appear — keep it that way, never reach for RN's `Image` |

Because the React Compiler is on, manual `useMemo`/`useCallback` for render-time
memoization is mostly redundant inside components — the compiler already does it. It does
**not** help with the Zustand and Reanimated issues below; those are outside its scope.

## Best practices

1. **Zustand: select the field, not the store.** `useSessionStore((s) => s.quest)` only
   re-renders when `quest` changes. Destructuring the whole store (`const { a, b } =
   useSessionStore()`) re-renders on every state change, including fields the component
   never reads.
2. **Keep list item components stable.** Don't pass inline arrow functions or object
   literals as props to `@legendapp/list` `renderItem` — they defeat recycling by forcing a
   new prop identity every render.
3. **Reanimated: only animate `transform` and `opacity`.** These run entirely on the UI
   thread. `width`, `height`, `backgroundColor`, and other layout-affecting properties force
   a layout pass and are slow.
4. **Never read a shared value on the JS thread** (`sharedValue.value` outside a worklet)
   — it blocks the JS thread waiting on the UI thread. Read it inside `useAnimatedStyle` or
   another worklet instead.
5. **Tamagui: use `styled()` variants, not inline dynamic styles.** `style={{ opacity: x
   }}` with a runtime variable breaks the compiler's flattening/extraction; a variant prop
   keeps the component atomic-CSS-eligible.
6. **SQLite/Drizzle: batch reads, avoid N+1.** `expo-sqlite` calls are async — a loop that
   awaits one query per item (e.g. per exercise, per quest) serializes what should be one
   join or one `inArray` query in `db/`.
7. **Don't do heavy synchronous work during render or in `app/_layout.tsx`** (JSON
   parsing, sorting/filtering large arrays, date-fns chains over full history) — derive
   once in a store action or a memoized selector, not inline in the component body.

## Antipatterns to avoid (and where they already exist here)

- **Whole-store Zustand subscriptions.** [`PausedOverlay.tsx`](../../components/session/PausedOverlay.tsx),
  [`CountdownView.tsx`](../../components/session/CountdownView.tsx), and
  [`BossTauntOverlay.tsx`](../../components/session/BossTauntOverlay.tsx) call
  `useSessionStore()` with no selector, so each re-renders on *any* session state change
  (timer ticks, damage events, etc.), unlike
  [`ActiveExerciseView.tsx`](../../components/session/ActiveExerciseView.tsx), which
  selects individual fields correctly. Fix opportunistically when touching these files —
  not a blocking issue today, but the pattern to avoid in new code.
- **`ScrollView` + `.map()` for unbounded lists.** Fine for a handful of fixed items (e.g.
  a settings screen); wrong for anything that grows with user data (history, exercises) —
  use `@legendapp/list` instead, as the quest/adventure galleries already do.
- **`Image` from `react-native` instead of `expo-image`.** No disk cache on Android,
  synchronous decode on the UI thread, causes flicker. Not present in this codebase today —
  keep new image usage on `expo-image`.
- **Reanimated worklets closing over large objects.** Capture the one property you need,
  not the whole record — shipping a big closure to the UI thread costs a serialization pass.
- **Context for fast-changing state.** Not used for app state here (Zustand owns it) — if
  a new `React.Context` is ever added for something that updates often (a timer, a scroll
  position), every consumer re-renders on each tick; prefer a store selector instead.

## Related

- [technical-architecture.md](technical-architecture.md) — tech stack and state ownership
- [design-system.md](../design/design-system.md) — Tamagui tokens and UI rules
