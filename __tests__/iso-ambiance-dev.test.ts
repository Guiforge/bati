import { forceEnDev, useAmbianceDev } from "@/components/village/iso/ambianceDev";
import { echafaudageDessine } from "@/components/village/iso/chantier";
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

describe("the old art's vector scaffold", () => {
  test("never drawn over a painted building, still drawn for an unpainted one or a new plot", () => {
    expect(echafaudageDessine("campfire", false)).toBe(false);
    expect(echafaudageDessine("windmill", false)).toBe(true);
    expect(echafaudageDessine("campfire", true)).toBe(true);
  });
});
