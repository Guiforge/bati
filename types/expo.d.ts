// The same reference `expo-env.d.ts` carries — but that file is gitignored and only written by
// the dev server, so a fresh checkout (CI, a contributor's first `tsc`) type-checks without it.
// This copy is versioned, so every machine sees the same ambient types.
/// <reference types="expo/types" />
