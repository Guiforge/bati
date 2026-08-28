// @tamagui/lucide-icons publishes a subpath per icon, which is how components/icons.ts keeps
// 1684 unused icons out of the bundle — but its exports map declares no "types" condition, so
// tsc cannot follow those subpaths and every icon would come back as `any`.
//
// A `paths` entry in tsconfig.json looks like the fix and is not: Expo's Metro and jest-expo
// both read tsconfig paths as *runtime* resolution, so pointing at the .d.ts directory breaks
// every test suite that renders an icon. An ambient declaration is invisible to both.
//
// Each subpath gets the root's full export set rather than its own one icon. That is wider than
// the truth — nothing stops `.../icons/Sparkles` from type-checking an import of `Trophy` — but
// the only file that imports these is generated with the name matching the path, and the
// alternative is a second list of 77 names to keep in sync with the first.
declare module "@tamagui/lucide-icons/icons/*" {
  export * from "@tamagui/lucide-icons";
}
