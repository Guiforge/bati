// Perf audit 3: does a long session grow the tree? 50 waves on the full map, the host nodes counted
// after each: past the first few (the effects and the walkers are mounted by a wave and gone with
// it) the count must come back to the same number, and an unmount must leave nothing behind.
import assert from "node:assert/strict";
import "react-native-gesture-handler/jestSetup";
import { act, render, screen } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import { etatCarte, stadeDemo } from "@/components/village/iso/carteDemo";
import {
  cibleVague,
  type Depart,
  DepartContext,
  HorlogeContext,
} from "@/components/village/iso/horloge";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

let horloge: Reanimated.SharedValue<number> | undefined;
let depart: Reanimated.SharedValue<Depart> | undefined;
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Hote() {
  const c = Reanimated.useSharedValue(0);
  horloge = c;
  const d = Reanimated.useSharedValue<Depart>({ n: 0, c0: 0 });
  depart = d;
  const { visible, montres } = etatCarte(12, true);
  return (
    <HorlogeContext.Provider value={c}>
      <DepartContext.Provider value={d}>
        <IsoCarte visible={visible} montres={montres} stade={(code) => stadeDemo(code, 12)} />
      </DepartContext.Provider>
    </HorlogeContext.Provider>
  );
}

type N = { children: (N | string)[] | null };
const compter = (n: N | string | null): number =>
  n === null || typeof n === "string"
    ? 0
    : 1 + (n.children ?? []).reduce<number>((s, e) => s + compter(e), 0);
const noeuds = () => {
  const json = screen.toJSON() as N | N[] | null;
  return (Array.isArray(json) ? json : [json]).reduce<number>((s, n) => s + compter(n), 0);
};

/**
 * A wave the way horloge.ts `touche` starts one (a start signal, the clock heading for the next
 * rest pose), played a moment, then the clock set on that rest pose: what the wave plans and what
 * it leaves are in the tree, not the 20 s of frames between (a full-length wave costs jest 200 MB
 * of fake-timer frames).
 */
const vague = (c0: number) => {
  assert(horloge && depart);
  return act(() => {
    depart?.set({ n: (depart?.get().n ?? 0) + 1, c0 });
    horloge?.set(c0 + 1000);
    jest.advanceTimersByTime(1000);
    horloge?.set(cibleVague(c0));
    jest.advanceTimersByTime(25_000);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  // jest keeps every console line of a test, act warnings with their stacks: 50 waves of them were the heap.
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => jest.useRealTimers());
jest.setTimeout(120_000);

test("50 waves leave the tree the size it had after the first", async () => {
  await render(<Hote />);
  const repos = noeuds();
  const apres: number[] = [];
  let c0 = 0;
  for (let i = 0; i < 50; i++) {
    await vague(c0);
    c0 = cibleVague(c0);
    apres.push(noeuds());
  }
  // A wave's lights and animals go with it: only a few nodes of a wave's last pose (4 measured) stay.
  expect(Math.max(...apres)).toBeLessThanOrEqual(repos + 10);
  // And the last waves leave no more than the first ones did.
  expect(Math.max(...apres.slice(5))).toBeLessThanOrEqual(Math.max(...apres.slice(0, 5)));
});

test("50 mounts and unmounts leave no node behind", async () => {
  await render(<Hote />);
  const un = noeuds();
  await screen.unmount();
  for (let i = 0; i < 50; i++) {
    await render(<Hote />);
    expect(noeuds()).toBe(un);
    await screen.unmount();
  }
});
