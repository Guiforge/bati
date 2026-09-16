import { keepIfSame } from "@/src/sameContent";

test("a fresh Map, Set or object with the same content keeps the old identity", () => {
  const configs = new Map([[3, { level: "hard" }]]);
  expect(keepIfSame(configs, new Map([[3, { level: "hard" }]]))).toBe(configs);
  const pinned = new Set([1, 2]);
  expect(keepIfSame(pinned, new Set([1, 2]))).toBe(pinned);

  const changed = new Map([[3, { level: "easy" }]]);
  expect(keepIfSame(configs, changed)).toBe(changed);
  const progress = { adventureId: 1, completedCount: 2 };
  expect(keepIfSame<typeof progress | null>(null, progress)).toBe(progress);
  expect(keepIfSame<typeof progress | null>(progress, null)).toBeNull();
});
