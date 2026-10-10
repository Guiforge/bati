import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { BackHandler } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { CrestAnimalRow } from "@/components/settings/CrestAnimalRow";
import { CrestSheet, type CrestView } from "@/components/village/CrestSheet";
import * as crestDb from "@/db/crest";
import {
  ANIMALS,
  type Animal,
  type CrestSession,
  crestAnimals,
  type Practice,
} from "@/db/crestRules";
import { preferences } from "@/db/preferences";
import { i18n } from "@/i18n";
import config from "@/tamagui.config";

/** The sheet is verified on a device; here the rule runs for real and only the frame is a stand-in. */
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("@/components/common/FormSheet", () => ({
  FormSheet: (p: { open: boolean; title: string; children: ReactNode }) => {
    const { Text, View } = require("react-native");
    return p.open ? (
      <View>
        <Text testID="sheet-title">{p.title}</Text>
        {p.children}
      </View>
    ) : null;
  },
}));

let n = 0;
const one = (p: Practice | "none", extra: Partial<CrestSession> = {}): CrestSession => {
  n += 1;
  const base = {
    uuid: String(n).padStart(6, "0"),
    outing: null,
    strength: 0,
    calisthenics: 0,
    yoga: 0,
    cardio: 0,
  };
  const s = p === "run" ? { ...base, cardio: 1 } : p === "none" ? base : { ...base, [p]: 1 };
  return { ...s, ...extra };
};
const seq = (...parts: [Practice, number][]) =>
  parts.flatMap(([p, k]) => Array.from({ length: k }, () => one(p)));

function crestOf(
  sessions: CrestSession[],
  choice: Animal | "auto" = "auto",
  marks: Pick<crestDb.Crest, "longestFlame" | "rings"> = { longestFlame: 0, rings: 0 },
): crestDb.Crest {
  const animals = crestAnimals(sessions, choice);
  if (animals === null) throw new Error("no crest");
  return { ...animals, ...marks, revealedAt: new Date("2020-01-01") };
}

const FIVE_OF_EIGHT = seq(["strength", 5], ["yoga", 2], ["calisthenics", 1]);

const wrap = (ui: ReactNode) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        {ui}
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

function sheet(
  crest: crestDb.Crest | null,
  view: CrestView,
  onClose = jest.fn(),
  onChanged = jest.fn(),
) {
  return wrap(
    <CrestSheet
      view={view}
      crest={crest}
      onView={jest.fn()}
      onClose={onClose}
      onChanged={onChanged}
    />,
  );
}

let write: jest.SpyInstance;
beforeAll(() => i18n.changeLanguage("fr"));
afterAll(() => i18n.changeLanguage("en"));
beforeEach(() => {
  write = jest.spyOn(preferences, "setCrestAnimal").mockResolvedValue();
});
afterEach(() => jest.restoreAllMocks());

describe("Pourquoi l'Ours ?", () => {
  it("the animal of the sessions: title, bars and the shield's sentence", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "why");
    expect(screen.getByTestId("sheet-title").props.children).toBe("Pourquoi l'Ours ?");
    expect(screen.getByText(/L'animal vient de ce que tu fais le plus souvent/)).toBeTruthy();
    expect(screen.getByText("Force")).toBeTruthy();
    expect(screen.getByText("Callisthénie")).toBeTruthy();
    expect(screen.getByText("Au centre, ton ours.")).toBeTruthy();
    expect(screen.queryByTestId("crest-why-second")).toBeNull();
  });

  it("the bars say what they count, above them, in every state", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "why");
    expect(screen.getByText("Tes 8 premières séances")).toBeTruthy();
    await screen.unmount();
    await sheet(crestOf([...seq(["strength", 8]), ...seq(["run", 30])]), "why");
    expect(screen.getByText("Tes 8 premières séances")).toBeTruthy();
  });

  it("the sentence names only what the shield draws: A, a flame and no ring", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT, "auto", { longestFlame: 3, rings: 0 }), "why");
    expect(screen.getByTestId("crest-why-shield").props.children).toBe(
      "Au centre, ton ours. En haut, ta flamme la plus longue.",
    );
  });

  it("C: a flame and rings", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT, "auto", { longestFlame: 3, rings: 2 }), "why");
    expect(screen.getByTestId("crest-why-shield").props.children).toBe(
      "Au centre, ton ours. En haut, ta flamme la plus longue. En bas, un anneau par année du village.",
    );
  });

  it("a hero with no flame hears of the animal alone", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "why");
    expect(screen.getByTestId("crest-why-shield").props.children).toBe("Au centre, ton ours.");
  });

  it("the shield is drawn at 96, the size that carries flames and rings", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "why");
    expect(screen.getByRole("image").props.style.width).toBe(96);
  });

  it("a second animal says when it joined", async () => {
    await sheet(crestOf([...seq(["strength", 8]), ...seq(["run", 30])]), "why");
    expect(screen.getByText("Un cerf rejoint l'ours")).toBeTruthy();
    expect(screen.getByText(/30 de tes 38 séances sont de l'endurance/)).toBeTruthy();
  });

  it("the boar: the split of the first 8 and the colors of its shield", async () => {
    await sheet(crestOf(seq(["strength", 3], ["run", 3], ["yoga", 2])), "why");
    expect(screen.getByTestId("sheet-title").props.children).toBe("Pourquoi le Sanglier ?");
    expect(
      screen.getByText("Tes 8 premières séances se partagent : force 3, endurance 3, yoga 2."),
    ).toBeTruthy();
    expect(screen.getByText(/Les couleurs de l'écu/)).toBeTruthy();
  });

  it("a chosen animal: whose choice it is, and one tap back writes auto", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT, "stag"), "why");
    expect(screen.getByTestId("sheet-title").props.children).toBe("Pourquoi le Cerf ?");
    expect(
      screen.getByText("Choisi par toi. Tes séances, elles, donnent l'ours : 5 de force sur 8."),
    ).toBeTruthy();
    expect(screen.getByText("Le petit losange sur ton écu le rappelle.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Reprendre l'animal de tes séances"));
    expect(write).toHaveBeenCalledWith("auto");
  });

  it("keeps the two links of a chosen animal in one group", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT, "stag"), "why");
    expect(screen.getByTestId("crest-why-links")).toBeTruthy();
  });

  it("hardware back closes the open sheet first, and only then", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    const onClose = jest.fn();
    await sheet(crestOf(FIVE_OF_EIGHT), "why", onClose);
    const press = spy.mock.calls.at(-1)?.[1] as () => boolean;
    expect(press()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("registers no back handler while closed", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    await wrap(
      <CrestSheet
        view={null}
        crest={crestOf(FIVE_OF_EIGHT)}
        onView={jest.fn()}
        onClose={jest.fn()}
        onChanged={jest.fn()}
      />,
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it("a pick equal to the sessions' animal reads as the sessions' own, never as a choice", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT, "bear"), "why");
    expect(screen.queryByTestId("crest-why-chosen")).toBeNull();
    expect(screen.queryByText(/losange/)).toBeNull();
    expect(screen.getByText("Au centre, ton ours.")).toBeTruthy();
  });

  it("nothing to explain before the reveal", async () => {
    await sheet(null, "why");
    expect(screen.queryByTestId("sheet-title")).toBeNull();
  });
});

describe("Ton animal", () => {
  // 8 of strength, then 35 of yoga: the bear has 8 sessions of its own, the journal has 43.
  const LONG = crestOf([...seq(["strength", 8]), ...seq(["yoga", 35])]);

  it("each option writes its animal, the first writes auto", async () => {
    for (const a of ANIMALS.filter((x) => x !== "bear")) {
      write.mockClear();
      const { unmount } = await sheet(crestOf(FIVE_OF_EIGHT), "pick");
      await fireEvent.press(screen.getByTestId(`crest-pick-${a}`));
      expect(write).toHaveBeenCalledWith(a);
      await unmount();
    }
    write.mockClear();
    await sheet(crestOf(FIVE_OF_EIGHT, "stag"), "pick");
    await fireEvent.press(screen.getByTestId("crest-pick-auto"));
    expect(write).toHaveBeenLastCalledWith("auto");
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
  });

  it("M1: a written choice tells the caller to read the crest again, then closes", async () => {
    const onChanged = jest.fn();
    const onClose = jest.fn();
    await sheet(crestOf(FIVE_OF_EIGHT), "pick", onClose, onChanged);
    await fireEvent.press(screen.getByTestId("crest-pick-stag"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("a failed write changes nothing and closes nothing", async () => {
    write.mockRejectedValue(new Error("disk"));
    const onChanged = jest.fn();
    const onClose = jest.fn();
    await sheet(crestOf(FIVE_OF_EIGHT), "pick", onClose, onChanged);
    await fireEvent.press(screen.getByTestId("crest-pick-stag"));
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(onChanged).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on a choice, with no confirmation", async () => {
    const onClose = jest.fn();
    await sheet(crestOf(FIVE_OF_EIGHT), "pick", onClose);
    await fireEvent.press(screen.getByTestId("crest-pick-stag"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("the stage follows the rule: own count for the sessions' animal, all sessions for a pick", async () => {
    await sheet(LONG, "pick");
    expect(screen.getByText("Celui de tes séances (l'ours) · jeune")).toBeTruthy();
    expect(screen.getByText("Force, 5 séances sur 8".replace("5", "8"))).toBeTruthy();
    expect(screen.getByText("Le cerf · adulte")).toBeTruthy();
    expect(screen.getByText("Le sanglier · adulte")).toBeTruthy();
  });

  it("lists the five others, with what they are", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "pick");
    expect(screen.getByText("course, marche, cardio")).toBeTruthy();
    expect(screen.getByText("yoga et mobilité")).toBeTruthy();
    expect(screen.getByText("un peu de tout")).toBeTruthy();
    expect(screen.queryByTestId("crest-pick-bear")).toBeNull();
  });

  it("the current choice is selected, the sessions' animal when none was made", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "pick");
    expect(screen.getByTestId("crest-pick-auto").props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId("crest-pick-stag").props.accessibilityState.checked).toBe(false);
  });

  it("a chosen animal is the selected one", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT, "stag"), "pick");
    expect(screen.getByTestId("crest-pick-stag").props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId("crest-pick-auto").props.accessibilityState.checked).toBe(false);
  });
});

describe("the Settings row", () => {
  const mountRow = (crest: crestDb.Crest | null) => {
    jest.spyOn(crestDb, "getCrest").mockResolvedValue(crest);
    return wrap(<CrestAnimalRow />);
  };

  it("is hidden before the reveal", async () => {
    await mountRow(null);
    await waitFor(() => expect(crestDb.getCrest).toHaveBeenCalled());
    expect(screen.queryByTestId("settings-crest-animal")).toBeNull();
  });

  it("says the animal, never the village's, and opens the choice", async () => {
    await mountRow(crestOf(FIVE_OF_EIGHT));
    await screen.findByText("Ton animal");
    expect(screen.getByText("l'ours")).toBeTruthy();
    expect(screen.queryByText(/ de /)).toBeNull();
    await fireEvent.press(screen.getByTestId("settings-crest-animal"));
    expect(screen.getByTestId("sheet-title").props.children).toBe("Ton animal");
  });

  it("follows the choice", async () => {
    await mountRow(crestOf(FIVE_OF_EIGHT, "stag"));
    expect(await screen.findByText("le cerf")).toBeTruthy();
  });
});

describe("the words", () => {
  it.each(["fr", "de", "en", "es"])("%s names the six animals, titles and descriptions", (lng) => {
    const t = i18n.getFixedT(lng);
    for (const a of ANIMALS) {
      for (const k of ["crest_why_title", "crest_why_center", "crest_pick_desc", "crest_the"]) {
        const key = `village.${k}_${a}`;
        expect(t(key)).not.toBe(key);
      }
    }
    for (const k of ["crest_why_bars", "crest_why_flame", "crest_why_rings", "crest_why_diamond"])
      expect(t(`village.${k}`)).not.toBe(`village.${k}`);
    expect(t("village.crest_why_title_stag")).toBe(
      {
        fr: "Pourquoi le Cerf ?",
        de: "Warum der Hirsch?",
        en: "Why the Stag?",
        es: "¿Por qué el ciervo?",
      }[lng as "fr"],
    );
  });
});
