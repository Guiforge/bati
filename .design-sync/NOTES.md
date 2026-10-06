# design-sync notes (Bati)

- Bati is an Expo React Native + Tamagui app, not a published web package. `.design-sync/web/build.mjs` (cfg `buildCmd`) compiles a web package `bati-ds` into `.design-sync/.cache/pkg` from `.design-sync/web/entry.tsx`: react-native aliased to react-native-web, `@/db` and `@/src/widget` stubbed (SQLite and the Android widget have no web half), images and fonts inlined, CommonJS output (an ESM build made Tamagui's `require("react")` throw), and a `process` shim. Always run it before the converter; the converter takes `--entry .design-sync/.cache/pkg/dist/index.cjs` from cfg `entry`.
- The types come from `tsc -p .design-sync/web/tsconfig.json`. It must keep `incremental: false`: the root tsconfig's `tsBuildInfoFile` lives in `node_modules/.cache/tsbuildinfo`, and sharing it made tsc skip the emit (zero `.d.ts`) and polluted the app's own cache.
- Scope (owner's choice, 2026-10-06): the BD core only, 11 components exported from `entry.tsx`. VillagerLine (the phylactère) is left out: it reads its line from the chorus store. Add a component by exporting it from `entry.tsx` and authoring `previews/<Name>.tsx` and `docs/<Name>.md`.
- `entry.tsx` renames RNW's `<style id="react-native-stylesheet">`: the render check treats the first `[id^="r"]` element as the mount root, and that tag's innerHTML is empty (CSSOM-filled), which read as "root empty" on every card.
- Fonts: `web/fonts.css` declares Alegreya and NotoSans 400/700 from `@expo-google-fonts` (cfg `extraFonts`, package-relative to `.cache/pkg`).
- `ProgressBar.progress` is 0..100; `InkGauge.progress` is 0..1. The inline comment that says so is lost in the emitted `.d.ts`, so the docs say it.
- `GameIcon` props come from cfg `dtsPropsFor` (its `GameIconName` type does not resolve in the emitted `.d.ts`). Keep the union in step with `hooks/useGameIcon.ts`.
- Playwright 1.62.1 in `.ds-sync/` matches the cached chromium-1234.

## Known render warns

- `[RENDER_THIN] ... rendered height is 0px` on most cards: Tamagui wraps the theme in a `display: contents` span, which measures 0 px; the cards render (see the review sheets).

## Re-sync risks

- The device stubs (`web/stubs/`) hide anything a synced component starts reading from the database or the widget: a new import of `@/db` inside a core component renders with defaults, silently.
- The web build is a translation of RN; a component that adopts Reanimated, expo-router or a native module may stop rendering on the web. Watch the render check after any change to `components/common`.
- `bati-ds` bundles `i18n.ts` and the four locale files, and every game-icon SVG as a data URI (~2 MB bundle).
