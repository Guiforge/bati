---
title: React Native Performance — Best Practices & Antipatterns
type: technical
status: active
updated: 2026-07-22
related: [technical-architecture.md, ../meta/wiki-protocol.md, ../design/design-system.md]
sources: [app.json, babel.config.js, stores/session.ts, components/session/PausedOverlay.tsx, app/(tabs)/quests/index.tsx, app/(tabs)/journal/index.tsx, package.json]
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
| New Architecture (Fabric/TurboModules/JSI) | On — `newArchEnabled=true` in [android/gradle.properties](../../android/gradle.properties), which Expo generates by default from SDK 53 on. There is no key in `app.json`, and adding one would only restate the default. |
| Hermes engine | On (`jsEngine: "hermes"`) |
| React Compiler (auto-memoization) | On (`experiments.reactCompiler: true`) |
| Virtualized lists | `@legendapp/list` used for quest/adventure galleries — do not regress to `FlatList`/`ScrollView.map` |
| Images | `expo-image` used everywhere images appear — keep it that way, never reach for RN's `Image` |

Because the React Compiler is on, manual `useMemo`/`useCallback` for render-time
memoization is mostly redundant inside components — the compiler already does it. It does
**not** help with the Zustand and Reanimated issues below; those are outside its scope.

## Quick-win rules (ranked by effort × impact)

Compiled from the general RN performance guides, then filtered to what applies to
*this* stack and isn't already handled. Sorted easiest-first; impact breaks ties.
Anything a generic article recommends that's missing here is in "Already covered" below —
don't re-add it.

| # | Rule | Effort | Impact | Status here |
| --- | --- | --- | --- | --- |
| 1 | **Profile on release builds only.** Dev builds are 2–5× slower (unminified, runtime checks) — never chase a jank number in dev. | trivial | high (diagnosis) | habit |
| 2 | **Ship bundled art as WebP**, sized to display resolution. ~25–35% smaller than PNG/JPEG → less memory + smaller binary. | low | high | **done** — 131 files converted by [`scripts/to-webp.py`](../../scripts/to-webp.py), 51.5 MB → 15.0 MB (**−71%**). Not yet sized to display resolution: sources stay 1024². |
| 3 | **Strip `console.*` in production** via `babel-plugin-transform-remove-console` (add to [babel.config.js](../../babel.config.js) prod env). Each call has bridge/JS overhead. | low | medium | **not done** — plugin not installed |
| 4 | **Set `expo-image` `cachePolicy="memory-disk"`** (and a stable `recyclingKey` for images inside `@legendapp/list`) to kill flicker + redundant decodes. | low | medium | default policy today; none set explicitly |
| 5 | **Debounce rapid inputs** (search/filter fields) so keystrokes don't fan out into renders/queries. | low | medium | no debounce in repo yet |
| 6 | **`InteractionManager.runAfterInteractions()`** for heavy work triggered by navigation, so transitions land at 60fps first. | medium | med-high | used in [journal](../../app/(tabs)/journal/index.tsx); extend to other heavy screens |
| 7 | **Paginate / window growing SQLite reads** (history, completed sets) — load a page, not the whole table, as user data grows. | medium | high (scales with data) | fine at today's data size; watch history views |
| 8 | **Lazy-load rare/heavy screens** so they parse on first visit, not at startup (improves TTI). | medium | medium | not applied |

### Already covered — don't re-add

Generic guides push these; the stack already gives them, so skip:

- **React.memo / useCallback / useMemo for render memoization** → React Compiler does it ([app.json](../../app.json) `reactCompiler: true`).
- **FlashList / FastImage / native-stack navigator** → we use `@legendapp/list`, `expo-image`, and Expo Router (native stack by default).
- **Hermes, New Architecture (Fabric/TurboModules/JSI)** → both already on (see status table above).
- **StyleSheet over inline styles / PureComponent** → we use Tamagui `styled()` variants and function components; N/A.
- **Tree-shake date-fns imports** → already imported per-function (`import { format } from "date-fns"`), no barrel; no lodash in the tree.

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
