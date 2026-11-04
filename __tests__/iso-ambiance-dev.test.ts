// Flags are off under jest: only the campfire is painted here.
jest.mock("@/constants/isoPoc", () => ({
  ...jest.requireActual("@/constants/isoPoc"),
  BLD_PEINTS: { campfire: true },
}));

import { forceEnDev, useAmbianceDev } from "@/components/village/iso/ambianceDev";
import { choisirLumiere } from "@/components/village/iso/lumiere";

describe("village light forced from the dev screen", () => {
  test("forced night wins over a day hour, in dev only", () => {
    useAmbianceDev.getState().set("nuit");
    const { force } = useAmbianceDev.getState();
    const base = { jourSeul: true, plus: false, heure: 12 };
    expect(choisirLumiere({ ...base, force: forceEnDev(true, force) })).toBe("nuit");
    expect(choisirLumiere({ ...base, force: forceEnDev(false, force) })).toBe("jour");
    useAmbianceDev.getState().set(undefined);
    expect(choisirLumiere({ ...base, force: forceEnDev(true, undefined) })).toBe("jour");
  });
});
