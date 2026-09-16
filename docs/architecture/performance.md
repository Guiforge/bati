---
title: React Native Performance — Best Practices & Antipatterns
type: technical
status: active
updated: 2026-09-16
related: [technical-architecture.md, ../meta/wiki-protocol.md, ../design/design-system.md]
sources: [app.json, babel.config.js, __tests__/react-compiler-coverage.test.ts, hooks/useReloadOnChange.ts, stores/session.ts, components/session/PausedOverlay.tsx, app/(tabs)/quests/index.tsx, app/(tabs)/journal/index.tsx, package.json]
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
| React Compiler (auto-memoization) | On (`experiments.reactCompiler: true`), and held file by file by a ratchet: see [below](#the-compiler-gives-up-in-silence) |
| Virtualized lists | `@legendapp/list` used for quest/adventure galleries — do not regress to `FlatList`/`ScrollView.map` |
| Images | `expo-image` used everywhere images appear — keep it that way, never reach for RN's `Image` |

Because the React Compiler is on, manual `useMemo`/`useCallback` for render-time
memoization is mostly redundant inside components — the compiler already does it. It does
**not** help with the Zustand and Reanimated issues below; those are outside its scope.

### The compiler gives up in silence

A release build runs the compiler with `panicThreshold: "NONE"` (babel-preset-expo). When it meets
a construct it cannot lower, it leaves the **whole** component or hook unmemoized and says nothing:
no warning, no failed build. On 2026-09-15 that was fifteen screens and hooks at once, Home's quick
actions, the quest details, the Village, the victory screen and the Journal among them, while their
comments still said "no manual memo, the compiler does it".

[`__tests__/react-compiler-coverage.test.ts`](../../__tests__/react-compiler-coverage.test.ts)
passes every file under `app/`, `components/` and `hooks/` through the plugin the preset resolves,
and fails on any compile error. A deliberate bail-out goes in its `ALLOWED` list with the reason,
and a stale entry fails too, so the list only shrinks. What made them bail, and the smallest
rewrite that keeps the behaviour:

| The compiler cannot lower | Write instead |
| --- | --- |
| `try ... finally` | `await work().catch(onError); cleanup();` (the catch never rethrows) |
| `?.`, `??`, `&&`, a ternary inside a `try` | the body in a function of its own, or a `.then().catch()` chain |
| `const { [key]: _, ...rest } = obj` | `Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key))` |
| `sharedValue.value = x` in a component body or a plain callback | `sharedValue.set(x)` (a worklet may keep `.value`) |
| a ref read or written during render | read it in the effect or the handler that needs it |

## Quick-win rules (ranked by effort × impact)

Compiled from the general RN performance guides, then filtered to what applies to
*this* stack and isn't already handled. Sorted easiest-first; impact breaks ties.
Anything a generic article recommends that's missing here is in "Already covered" below —
don't re-add it.

| # | Rule | Effort | Impact | Status here |
| --- | --- | --- | --- | --- |
| 1 | **Profile on release builds only.** Dev builds are 2–5× slower (unminified, runtime checks) — never chase a jank number in dev. | trivial | high (diagnosis) | `npm run android:release` installs the shipped build as `com.guiforge.bati.perf`, beside the real one; see AGENTS.md § Measuring like the release |
| 2 | **Ship bundled art as WebP**, sized to display resolution. ~25–35% smaller than PNG/JPEG → less memory + smaller binary. | low | high | **done** — 131 files converted by [`scripts/to-webp.py`](../../scripts/to-webp.py), 51.5 MB → 15.0 MB (**−71%**). Sizing done in two passes: [`scripts/fit-small-art.py`](../../scripts/fit-small-art.py) shrinks small-slot art in place, [`scripts/thumb-exercises.py`](../../scripts/thumb-exercises.py) derives 128px thumbnails for the exercise art (which stays 1280 for the session hero). |
| 3 | **Strip `console.*` in production** via `babel-plugin-transform-remove-console`. Each call has bridge/JS overhead. | low | medium | **done** — [babel.config.js](../../babel.config.js) applies it when `NODE_ENV=production`, keeping `console.error` because that is what `reportError()` writes to. |
| 4 | **Set `expo-image` `cachePolicy="memory-disk"`** (and a stable `recyclingKey` for images inside `@legendapp/list`) to kill flicker + redundant decodes. | low | medium | default policy today; none set explicitly |
| 5 | **Debounce rapid inputs** (search/filter fields) so keystrokes don't fan out into renders/queries. | low | medium | no debounce in repo yet |
| 6 | **`InteractionManager.runAfterInteractions()`** for heavy work triggered by navigation, so transitions land at 60fps first. | medium | med-high | no longer used anywhere; the [journal](../../app/(tabs)/journal/index.tsx) skips the work instead, re-reading on focus only when `getJournalVersion` changed |
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

- **Whole-store Zustand subscriptions.** `useSessionStore()` with no selector re-renders on
  *any* session state change — timer ticks, damage events, the lot. This section used to name
  `PausedOverlay`, `CountdownView` and `BossTauntOverlay` as the offenders; all three select
  individual fields now, and nothing in the session screens subscribes to a whole store. The
  screens *under* a session count too: the quest details and Home stay mounted beneath it, and the
  first subscribed to the whole store while Home subscribed to `status`, which flips twice a set.
  Both select the action alone now and read `useSessionStore.getState().status` at the tap. Kept as
  the pattern to avoid in new code, not as a debt to go and pay.
- **Re-reading a whole screen on every focus.** A tab stays mounted, so `useFocusEffect` runs on
  every return. Home ran 51 queries each time whether anything had changed or not. Its blocks go
  through [`useReloadOnChange`](../../hooks/useReloadOnChange.ts) now, which re-reads only when
  `getChangeVersion()` moved: SQLite's `total_changes()` for this connection, and the day. It
  covers every write without a list of tables to keep in step, and relies on reads never writing,
  which `__tests__/db-change-version.test.ts` holds for Home. The Journal does the same with its
  own narrower `getJournalVersion`.
- **`ScrollView` + `.map()` for unbounded lists.** Fine for a handful of fixed items (e.g.
  a settings screen); wrong for anything that grows with user data (history, exercises) —
  use `@legendapp/list` instead, as the quest/adventure galleries already do.
- **`Image` from `react-native` instead of `expo-image`.** No disk cache on Android,
  synchronous decode on the UI thread, causes flicker. Not present in this codebase today —
  keep new image usage on `expo-image`.
- **A big image in a small slot.** An image's memory cost is its *source* resolution, not the
  size it renders at: a 1280² WebP decodes to ~6.5 MB of bitmap whether it fills the screen or a
  56px tile. The exercise picker sheet showed ten of them at once and janked every single frame
  — 450 ms median, `Slow bitmap uploads` on 100% of frames — while the Journal tab, measured the
  same way, sat at 27 ms with zero. Pointing those rows at 128px thumbnails
  (`getExerciseThumb`, not `getExerciseAsset`) took it to 34 ms and 0 slow uploads. When art is
  shared between a hero slot and a list, derive a second copy; do not shrink the original.

  One image is enough when it lands at the wrong moment. The villager cameos were 768x1024 —
  ~3.1 MB of bitmap with their alpha channel — drawn into a slot `cameoAnchor.ts` caps at 200dp,
  and mounted *over the running session screen*, which is the one place in this app where a
  dropped frame is a tap the hero has to make twice. `scripts/fit-small-art.py` excluded them on
  the strength of an older 38%-of-the-window ceiling that the shipped anchor had already replaced
  with 22%/200dp: the exclusion outlived the number it was reasoning about. At 480x640 they cost
  a third of that and 2.6 MB less APK. **When art is excluded from a downscale, the exclusion
  cites a number — go and check that number is still the one the code uses.**
- **An infinite animation that ignores focus.** Tabs stay mounted, so a `withRepeat(..., -1)`
  started on one tab keeps running under every other screen. The village embers did: after one
  visit to the Village, the Quests list scrolled at 30 ms a frame instead of 16, with the UI
  thread at 70 % on a screen drawing nothing. A looping ambient animation reads `useIsFocused()`
  and stops when it is false: `FlameFlicker` cancels its loop, `VillageEmbers` unmounts (which
  cancels too). `__tests__/ambient-animations-focus.test.tsx` holds both.
- **An ambient animation with no end, even on the screen you are looking at.** Focus was only
  half of it. While the screen *is* up, an endless loop never lets the window go idle, and idle
  is not a performance nicety: `uiautomator dump` waits for it, so Maestro, TalkBack and every
  accessibility reader wait for it. Home, untouched, with its streak flame lit: 578 frames in
  10 s, 16 % of a core on the UI thread, 13 % on the render thread, and four dumps out of four
  failing with `could not get idle state` after 11 s. The Village, untouched: 602 frames, 31 %,
  same failure. Both now run a bounded burst and stop, which took each screen to **0 frames,
  under 2 % of a core, and a dump that answers in 2 s**, and the Village's own scroll off a flat
  p50 of 31 ms with every frame janky, down to 16 to 25 ms over three passes. The flame gusts
  four times (4.8 s) on focus; each ember climbs once (the field is out after about 10 s). Coming
  back to the tab plays it again, which is the only time anyone is looking.

  Three measurements are worth keeping, because they decide the shape of any ambient effect
  added later. First, **writing a shared value the value it already holds costs nothing**:
  Reanimated's `useAnimatedStyle` diffs before it commits, so a hold inside a sequence draws no
  frames at all.
  A gust-then-rest loop that ran for ever was measured at 57 to 70 frames in 10 s with 1.6 s
  rests, and its dumps passed. Second, **a rest only buys idle if every loop on the screen rests
  at the same moment**: nine embers on nine schedules always leave one of them moving, so there
  the only reachable quiet is the one after the last climb. One clock for a whole field, or no
  loop at all. Third, **a loop that ticks is not free even when it draws nothing**: the resting
  version still held about 10 % of a core against 1.9 % once the animation had actually finished.
  The tick is the reason these effects end rather than idle politely.
- **Tamagui's `Progress` under a clock.** The bar under the rest, the timed set and the warm-up
  movement was a `Progress`, and on the Fairphone it held the JS thread at 33 to 42 % of a core
  and drew ~40 frames a second for as long as any of those screens was up, against 0 % on a set
  counted in reps. The spring was not the whole story: the warm-up's `Progress` had no
  `transition` and cost the same 41 %. All three draw a
  [`TimerBar`](../../components/session/TimerBar.tsx) now, a plain width that steps with the
  numeral. Same flow, three passes each (16/09):

  | Screen | Before: frames / 10 s, JS | After: frames / 10 s, JS |
  | --- | --- | --- |
  | Rest | ~400, 33-42 % | 20, 6 % |
  | Timed set (Plank) | ~350, 42 % | 20, 8-10 % |
  | Warm-up movement | 563, 41 % | 19-21, 6-7 % |
  | Set in reps (control) | 0, 0 % | 0, 0 % |

  Two things were tried and left out, because the numbers said so. Easing the step on the UI
  thread with a Reanimated `withTiming` (250 ms) kept JS at 6 % but drew ~170 frames at a 29 ms
  p50 with the UI thread at 30 %: an ease across 1/45th of a track is not worth a thread. And
  moving the numeral and the bar into their own component, so a tick stopped re-rendering the
  whole rest, measured the same 6 %: what is left is the tick's own frame (a 112px numeral
  relaid out once a second), not the view around it. `__tests__/timer-bar.test.tsx` fails if
  `Progress` is imported anywhere again, or if the bar grows an animation.
- **Measuring a scroll on a screen that does not scroll.** On a Fairphone 6 (release build, empty
  hero) "Home scrolls at 29 ms a frame, Quests at 19". Home fits its viewport, so the swipe scrolled
  nothing: the up swipe started on the scene, Tamagui fired its `onPress` on release, and the
  number was the quest screen opening (JS at 66 then 94 % in the two seconds after it, three passes
  out of three). Tamagui 2's Android press handler has no distance check and relies on a scroll view
  terminating the press; where none scrolls, **a drag is a press**. Home claims any touch past a
  10 dp slop (`dragCancelsPress` in [`app/(tabs)/index.tsx`](../../app/(tabs)/index.tsx), held by
  `__tests__/home-drag-cancels-press.test.tsx`); another non-scrolling screen with big pressables
  needs the same, or the handler moves to the root layout. Before trusting a scroll number, check
  the screen moved.
- **Reading `Janky frames (legacy)` and the p50 as what the hero sees.** Both count any frame over
  16 ms from its intended vsync, which on a phone with buffer stuffing includes waiting behind the
  previous frame. The same Adventures swipes read p50 30, 17 and 28 ms over three passes, with
  `Janky frames` (the deadline-based count) at 1.4, 0.8 and 1.4 %, under the Quests witness's
  2.0-2.1 %. Compare `Janky frames` and `Number Frame deadline missed` first; a legacy p50 that
  moves without them is pipeline state, not content.
- **`flat` on a `Card` is an iOS saving.** Tamagui passes `shadowRadius`/`shadowOpacity` through to
  React Native, which draws them on iOS only; Android draws a shadow from `elevation`, which `Card`
  never sets. Keep list cards `flat`, but a slow Android scroll is not a shadow.
- **Reanimated worklets closing over large objects.** Capture the one property you need,
  not the whole record — shipping a big closure to the UI thread costs a serialization pass.
- **Context for fast-changing state.** Not used for app state here (Zustand owns it) — if
  a new `React.Context` is ever added for something that updates often (a timer, a scroll
  position), every consumer re-renders on each tick; prefer a store selector instead.

## Binary size

Measured on the published `bati-1.13.0.apk` (67.1 MiB, arm64-only, R8 + resource shrinking),
compressed sizes as stored in the zip:

| Part | Size | Notes |
| --- | --- | --- |
| `lib/arm64-v8a` (25 `.so`) | 23.6 MiB | Hermes, Reanimated, RN core — stored uncompressed, see below |
| 320 `.webp` | 21.3 MiB | stored, not deflated; already WebP and already sized once (rule 2 above) |
| `index.android.bundle` | 8.1 MiB | JS — 14% of it was unused Lucide icons |
| 3 `.dex` | 6.2 MiB | after R8 |
| 24 `.ttf` | 5.9 MiB | 18 Noto weights for the 2 the app loads — see below |
| everything else | ~1.7 MiB | resources, 203 PNGs, XML |

**Metro does not tree-shake, so a barrel import ships the whole package.** It drops an
*unreferenced* module happily; it cannot drop one a barrel referenced. Both of the wins above
are the same bug:

- `import { NotoSans_400Regular } from "@expo-google-fonts/noto-sans"` runs the package's
  `index.js`, which `require`s all 18 weights — all 18 landed in the APK for the two the app
  loads. Per-weight subpaths (`.../noto-sans/400Regular`) took it from 24 fonts to 6, **−4.7 MiB**.
- `import { Sparkles } from "@tamagui/lucide-icons"` pulled all **1761** icon modules, 1.87 MB of
  source and 14% of the bundle, for the 74 the app draws. Every icon now comes through
  [`components/icons.ts`](../../components/icons.ts), which re-exports from the per-icon
  subpaths: 3398 modules instead of 5081, **−1.24 MiB** of Hermes bytecode (like-for-like
  `expo export`, and the bundle is *stored* in the APK, not deflated, so that comes off whole).

Before reaching for a `paths` entry in `tsconfig.json` to make subpath types resolve: Expo's
Metro *and* jest-expo read tsconfig paths as runtime resolution, so a mapping meant for `tsc`
alone breaks every suite that renders one. [`types/lucide-icons.d.ts`](../../types/lucide-icons.d.ts)
is an ambient declaration, which neither resolver can see.

Two things this measurement settles, against guesses that sound plausible:

- `assets/icon.png` is 2.6 MiB of 16-bit PNG, but it never ships — prebuild re-encodes it into
  the launcher mipmaps, and the APK holds 0.64 MiB of PNG in total. It is checkout weight, not
  binary weight.
- The 17 MiB of `assets/game-icons.net.svg-foreground-white` is 4171 files of which
  [`hooks/useGameIcon.ts`](../../hooks/useGameIcon.ts) names 21. Only those 21 are in the APK
  (20 `.svg`, 33 KiB). Also checkout weight only.

**Native libraries were stored, not compressed.** Expo defaults
`expo.useLegacyPackaging` to false, which leaves the `.so` uncompressed and page-aligned so
Android maps them straight out of the APK. That is the right trade for a Play install and the
wrong one here, where the whole APK is what people download from F-Droid and from GitHub
Releases: those 23.6 MiB deflate to 8.0 MiB.
[`plugins/withAndroidReleaseFlags.js`](../../plugins/withAndroidReleaseFlags.js) flips it back, and
turns off Fresco's GIF decoders in the same pass (0.56 MiB — Fresco only backs react-native's
`<Image>`, which nothing here uses, and `assets/` holds no GIF). Android extracts the libraries
at install instead, so the device carries roughly 8 MiB more; that is the price. WebP stays
enabled on purpose — the same argument applies and a wrong call there is 295 blank images.

What is left is the 21 MiB of art. Every file is already WebP and has been through one sizing
pass; a second pass has to start by measuring the slot each one actually renders into, the way
the exercise thumbnails were derived — not by re-compressing blind.

[`.github/workflows/release.yml`](../../.github/workflows/release.yml) fails the release over
55 MiB. It is a ratchet: lower it after a release that measures under it, never raise it to make
a build pass.

## Related

- [technical-architecture.md](technical-architecture.md) — tech stack and state ownership
- [design-system.md](../design/design-system.md) — Tamagui tokens and UI rules
