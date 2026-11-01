// T32: the village sound wakes JS only when the camera's coarse key changes: no timer at rest, one
// update for a zoom change, none for a fine drag. Also: the sound files exist and fit in 1 MB, and
// the map does not import the store (and with it the database).
import * as fs from "node:fs";
import * as path from "node:path";
import { act, renderHook } from "@testing-library/react-native";
import { useSharedValue } from "react-native-reanimated";
import { useSonVillage } from "@/components/village/iso/useSonVillage";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));
const mockSetVillage = jest.fn();
jest.mock("@/src/sounds", () => ({ setVillage: (n: unknown) => mockSetVillage(n) }));

const ici = (f: string) => path.join(__dirname, "..", f);

test("no timer at rest, one update per zoom step, none for a fine drag", async () => {
  const spy = jest.spyOn(global, "setInterval");
  const { result } = await renderHook(() => {
    const zoom = useSharedValue(0.3);
    const x = useSharedValue(0);
    const y = useSharedValue(0);
    useSonVillage({
      suivi: { zoom, x, y },
      sonActif: true,
      zmin: 0.3,
      zmax: 1,
      aire: { w: 400, h: 600 },
      ambiance: "jour",
      construits: ["forge"],
    });
    return { zoom, x };
  });
  await act(async () => {});
  expect(spy).not.toHaveBeenCalled();
  const depart = mockSetVillage.mock.calls.length;
  await act(async () => {
    result.current.x.set(3); // under the 40 dp step
    await new Promise((r) => setTimeout(r, 50));
  });
  expect(mockSetVillage).toHaveBeenCalledTimes(depart);
  await act(async () => {
    result.current.zoom.set(0.8);
    await new Promise((r) => setTimeout(r, 50));
  });
  expect(mockSetVillage).toHaveBeenCalledTimes(depart + 1);
  expect(spy).not.toHaveBeenCalled();
});

test("the sound files exist and weigh under 1 MB together", () => {
  const dossier = ici("assets/sounds/village");
  const sources = fs.readFileSync(ici("src/sounds.ts"), "utf8");
  const refs = [...sources.matchAll(/village\/([\w-]+\.ogg)/g)].map((m) => m[1] ?? "");
  expect(refs.length).toBe(5);
  let total = 0;
  for (const f of refs) {
    expect(fs.existsSync(path.join(dossier, f))).toBe(true);
    total += fs.statSync(path.join(dossier, f)).size;
  }
  expect(total).toBeLessThan(1_000_000);
});

test("the map's sound hook does not import the settings store", () => {
  const hook = fs.readFileSync(ici("components/village/iso/useSonVillage.ts"), "utf8");
  expect(hook).not.toContain("@/stores");
  expect(hook).not.toContain("setInterval");
});
