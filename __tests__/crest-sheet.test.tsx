import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { BackHandler, Dimensions, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { CrestAnimalRow } from "@/components/settings/CrestAnimalRow";
import { CrestSheet, type CrestView } from "@/components/village/CrestSheet";
import * as crestDb from "@/db/crest";
import { DELIVERED_COATS } from "@/db/crestCoat";
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
// The bears only: the yoga animal stands for "a portrait that has not shipped" whatever the real
// table holds.
jest.mock("@/constants/animalPortraits", () => {
  const real = jest.requireActual("@/constants/animalPortraits");
  return {
    ANIMAL_PORTRAITS: Object.fromEntries(
      Object.entries(real.ANIMAL_PORTRAITS).filter(([slug]) => slug.startsWith("bear-")),
    ),
  };
});
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

const tree = (ui: ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    }}
  >
    <TamaguiProvider config={config} defaultTheme="dark">
      {ui}
    </TamaguiProvider>
  </SafeAreaProvider>
);
const wrap = (ui: ReactNode) => render(tree(ui));

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
let shipped: string[];
beforeAll(() => i18n.changeLanguage("fr"));
afterAll(() => i18n.changeLanguage("en"));
beforeEach(() => {
  shipped = [...DELIVERED_COATS];
  write = jest.spyOn(preferences, "setCrestAnimal").mockResolvedValue();
  jest.spyOn(crestDb, "portraitOf").mockResolvedValue("bear-young");
});
afterEach(() => {
  jest.restoreAllMocks();
  const set = DELIVERED_COATS as Set<string>;
  set.clear();
  for (const slug of shipped) set.add(slug);
});

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
      screen.getByText("Tes 8 premières séances se partagent : endurance 3, force 3, yoga 2."),
    ).toBeTruthy();
    // The tie reads the most recent first in the fact and in the colours alike.
    expect(screen.getByText(/Les couleurs de l'écu.*endurance et force/)).toBeTruthy();
  });

  it("a chosen animal: whose choice it is, and one tap back writes auto", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT, "stag"), "why");
    expect(screen.getByTestId("sheet-title").props.children).toBe("Pourquoi le Cerf ?");
    expect(
      screen.getByText(
        "Choisi par toi. Tes séances, elles, donnent l'ours : 5 séances de force sur 8.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Le petit losange sur ton écu le rappelle.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Reprendre l'animal de tes séances"));
    expect(write).toHaveBeenCalledWith("auto");
  });

  it("keeps the two links of a chosen animal in one group", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT, "stag"), "why");
    const group = screen.getByTestId("crest-why-links");
    expect(within(group).getByTestId("crest-why-reset")).toBeTruthy();
    expect(within(group).getByTestId("crest-why-pick")).toBeTruthy();
  });

  const props = (view: CrestView | null, crest: crestDb.Crest | null) => (
    <CrestSheet
      view={view}
      crest={crest}
      onView={jest.fn()}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />
  );

  it("takes its back handler off when the sheet closes or unmounts", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    const v = await wrap(props("why", crestOf(FIVE_OF_EIGHT)));
    const remove = jest.spyOn(spy.mock.results[0]?.value, "remove");
    await v.rerender(tree(props(null, crestOf(FIVE_OF_EIGHT))));
    expect(remove).toHaveBeenCalledTimes(1);
    await v.rerender(tree(props("why", crestOf(FIVE_OF_EIGHT))));
    const again = jest.spyOn(spy.mock.results[1]?.value, "remove");
    await v.unmount();
    expect(again).toHaveBeenCalledTimes(1);
  });

  it("listens to back only while it draws: a crest gone null under an open view is not drawn", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    const v = await wrap(props("why", crestOf(FIVE_OF_EIGHT)));
    const remove = jest.spyOn(spy.mock.results[0]?.value, "remove");
    await v.rerender(tree(props("why", null)));
    expect(remove).toHaveBeenCalledTimes(1);
    const calls = spy.mock.calls.length;
    await v.rerender(tree(props("why", null)));
    expect(spy.mock.calls.length).toBe(calls);
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

  it.each([
    ["stag", "crest-pick-stag"],
    ["auto", "crest-pick-auto"],
  ] as const)(
    "pressing the choice already on show (%s) only closes: no write, no change",
    async (choice, id) => {
      const onChanged = jest.fn();
      const onClose = jest.fn();
      await sheet(crestOf(FIVE_OF_EIGHT, choice), "pick", onClose, onChanged);
      await fireEvent.press(screen.getByTestId(id));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(write).not.toHaveBeenCalled();
      expect(onChanged).not.toHaveBeenCalled();
    },
  );

  it("pressing the sessions' option writes auto when the stored pick merely equals their animal", async () => {
    // Stored `bear`, sessions say bear: the shield reads as auto, the stored value is not.
    const crest = crestOf(FIVE_OF_EIGHT, "bear");
    expect(crest.manual).toBe(false);
    const onChanged = jest.fn();
    await sheet(crest, "pick", jest.fn(), onChanged);
    await fireEvent.press(screen.getByTestId("crest-pick-auto"));
    await waitFor(() => expect(write).toHaveBeenCalledWith("auto"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
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

  it("no option carries a stage: a pick never moves it, so it would read the same six times", async () => {
    await sheet(LONG, "pick");
    expect(screen.getByText("Celui de tes séances (l'ours)")).toBeTruthy();
    expect(screen.getByText("Force, 5 séances sur 8".replace("5", "8"))).toBeTruthy();
    expect(screen.getByText("Le cerf")).toBeTruthy();
    expect(screen.getByText("Le sanglier")).toBeTruthy();
  });

  it("every option's subtitle starts with a capital, like the sessions' option", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "pick");
    expect(screen.getByText("Vélo")).toBeTruthy();
    expect(screen.getByText("Un peu de tout")).toBeTruthy();
    expect(screen.getByText("Force, 5 séances sur 8")).toBeTruthy();
  });

  it("a boar hero's sessions option says the boar and a capitalised 'a bit of everything'", async () => {
    await sheet(crestOf(seq(["strength", 3], ["run", 3], ["yoga", 2])), "pick");
    expect(screen.getByText("Celui de tes séances (le sanglier)")).toBeTruthy();
    // Once: the boar is not offered again among the others.
    expect(screen.getAllByText("Un peu de tout")).toHaveLength(1);
  });

  it("lists the five others, with what they are", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "pick");
    expect(screen.getByText("Course, marche, cardio")).toBeTruthy();
    expect(screen.getByText("Yoga et mobilité")).toBeTruthy();
    expect(screen.getByText("Un peu de tout")).toBeTruthy();
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

describe("the stage line under the options", () => {
  const SAID = {
    fr: [
      "Quel que soit ton choix, ton animal est jeune.",
      "Quel que soit ton choix, ton animal est adulte.",
      "Quel que soit ton choix, ton animal est vénérable.",
      "Quel que soit ton choix, ton animal est légendaire.",
    ],
    en: [
      "Whichever you choose, your animal keeps its stage: young.",
      "Whichever you choose, your animal keeps its stage: adult.",
      "Whichever you choose, your animal keeps its stage: venerable.",
      "Whichever you choose, your animal keeps its stage: legendary.",
    ],
    de: [
      "Welches du auch wählst, dein Tier ist jung.",
      "Welches du auch wählst, dein Tier ist erwachsen.",
      "Welches du auch wählst, dein Tier ist ehrwürdig.",
      "Welches du auch wählst, dein Tier ist legendär.",
    ],
    es: [
      "Elijas el que elijas, tu animal es joven.",
      "Elijas el que elijas, tu animal es adulto.",
      "Elijas el que elijas, tu animal es venerable.",
      "Elijas el que elijas, tu animal es legendario.",
    ],
  } as const;
  // 8 sessions (young), then the thresholds of the sessions' animal: 40, 200, 500.
  const LEVELS = [
    FIVE_OF_EIGHT,
    seq(["strength", 40]),
    seq(["strength", 200]),
    seq(["strength", 500]),
  ];

  it.each(
    (["fr", "en", "de", "es"] as const).flatMap((lang) =>
      [0, 1, 2, 3].map((i) => [lang, i] as const),
    ),
  )("says the stage in %s, level %d", async (lang, i) => {
    await i18n.changeLanguage(lang);
    try {
      await sheet(crestOf(LEVELS[i] ?? []), "pick");
      expect(screen.getByTestId("crest-pick-stage").props.children).toBe(SAID[lang][i]);
    } finally {
      await i18n.changeLanguage("fr");
    }
  });

  it("a hand-picked animal keeps the sessions' stage, and the line says it", async () => {
    await sheet(crestOf(seq(["strength", 200]), "salmon"), "pick");
    expect(screen.getByTestId("crest-pick-stage").props.children).toBe(
      "Quel que soit ton choix, ton animal est vénérable.",
    );
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

describe("the coat choice", () => {
  const ADULT = seq(["strength", 40]);
  const won = { longestFlame: 5, rings: 0 } as const;
  const ships = () => (DELIVERED_COATS as Set<string>).add("bear-adult-rare");
  const coat = (value: "auto" | "usual") =>
    jest.spyOn(preferences, "getCrestCoat").mockResolvedValue(value);

  it("is absent while the rare coat's portrait has not shipped, won or not", async () => {
    (DELIVERED_COATS as Set<string>).delete("bear-adult-rare");
    coat("auto");
    await sheet(crestOf(ADULT, "auto", won), "why");
    expect(screen.queryByTestId("crest-coat")).toBeNull();
  });

  it("is absent when the coat ships and is not won, and for a young animal", async () => {
    ships();
    coat("auto");
    await sheet(crestOf(ADULT, "auto", { longestFlame: 4, rings: 0 }), "why");
    expect(screen.queryByTestId("crest-coat")).toBeNull();
    await screen.unmount();
    await sheet(crestOf(FIVE_OF_EIGHT, "auto", won), "why");
    expect(screen.queryByTestId("crest-coat")).toBeNull();
  });

  it("offers the usual coat and the rare one by name, the stored choice checked", async () => {
    ships();
    coat("usual");
    await sheet(crestOf(ADULT, "auto", won), "why");
    const usual = await screen.findByTestId("crest-coat-usual");
    expect(within(usual).getByText("Pelage habituel")).toBeTruthy();
    expect(within(screen.getByTestId("crest-coat-rare")).getByText("Pelage cannelle")).toBeTruthy();
    expect(usual.props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByTestId("crest-coat-rare").props.accessibilityState).toEqual({
      checked: false,
    });
  });

  it("writes the choice, reads the portrait again and keeps the sheet open", async () => {
    ships();
    coat("auto");
    const set = jest.spyOn(preferences, "setCrestCoat").mockResolvedValue();
    const onClose = jest.fn();
    const onChanged = jest.fn();
    await sheet(crestOf(ADULT, "auto", won), "why", onClose, onChanged);
    const reads = () => (crestDb.portraitOf as jest.Mock).mock.calls.length;
    await fireEvent.press(await screen.findByTestId("crest-coat-usual"));
    await waitFor(() => expect(set).toHaveBeenCalledWith("usual"));
    await waitFor(() =>
      expect(screen.getByTestId("crest-coat-usual").props.accessibilityState).toEqual({
        checked: true,
      }),
    );
    expect(reads()).toBe(2);
    expect(onClose).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("crest-coat-usual"));
    expect(set).toHaveBeenCalledTimes(1);
  });
});

describe("the portrait in the sheet", () => {
  it("draws the animal's portrait beside the shield when it has shipped", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "why");
    expect(await screen.findByTestId("animal-portrait")).toBeTruthy();
    expect(crestDb.portraitOf).toHaveBeenCalledWith({ longestFlame: 0 }, "bear", "young");
  });

  it("draws none, and no empty frame, for an animal that has not", async () => {
    await sheet(crestOf(seq(["yoga", 8])), "why");
    expect(screen.getByTestId("crest-why-shield")).toBeTruthy();
    expect(screen.queryByTestId("animal-portrait")).toBeNull();
  });
});

describe("the legend under the portrait", () => {
  it("names the stage and the rare coat the portrait wears", async () => {
    jest.spyOn(crestDb, "portraitOf").mockResolvedValue("bear-legendary-rare");
    await sheet(crestOf(seq(["strength", 500]), "auto", { longestFlame: 5, rings: 0 }), "why");
    expect(await screen.findByText("Un ours légendaire, pelage cannelle.")).toBeTruthy();
  });

  it("names the winter coat when winter is what it wears", async () => {
    jest.spyOn(crestDb, "portraitOf").mockResolvedValue("bear-adult-winter");
    await sheet(crestOf(seq(["strength", 40])), "why");
    expect(await screen.findByText("Un ours adulte, pelage d'hiver.")).toBeTruthy();
  });

  it("names the stage alone for a young animal in its base coat", async () => {
    await sheet(crestOf(FIVE_OF_EIGHT), "why");
    expect(await screen.findByText("Un jeune ours.")).toBeTruthy();
  });

  it("holds its line and says nothing while the coat is being read", async () => {
    jest.spyOn(crestDb, "portraitOf").mockReturnValue(new Promise(() => {}));
    await sheet(crestOf(seq(["strength", 500])), "why");
    expect(screen.getByTestId("crest-legend").props.children).toBe(" ");
    expect(screen.queryByText(/ours légendaire/)).toBeNull();
  });

  it("reads the bare stage when the portrait has not shipped, with nothing to wait for", async () => {
    await sheet(crestOf(seq(["yoga", 8])), "why");
    expect(screen.getByText("Un jeune saumon.")).toBeTruthy();
  });
});

describe("the legend's reserve", () => {
  afterEach(() => jest.restoreAllMocks());

  it("holds two lines at 130 % font, not 38 dp", async () => {
    const real = Dimensions.get("window");
    jest.spyOn(Dimensions, "get").mockImplementation(() => ({ ...real, fontScale: 1.3 }) as never);
    await sheet(crestOf(FIVE_OF_EIGHT), "why");
    const box = StyleSheet.flatten(screen.getByTestId("crest-legend").props.style);
    expect(box.minHeight).toBeGreaterThanOrEqual(Math.ceil(38 * 1.3));
  });
});

describe("the legend's copy", () => {
  it("has a key for every animal at every stage, in the four languages", () => {
    for (const lng of ["fr", "en", "de", "es"]) {
      const t = i18n.getFixedT(lng);
      for (const animal of ANIMALS) {
        for (const stage of ["young", "adult", "venerable", "legendary"]) {
          expect(i18n.exists(`village.crest_${animal}_${stage}`, { lng })).toBe(true);
          expect(t(`village.crest_${animal}_${stage}`)).not.toMatch(/^village\./);
        }
      }
    }
  });
});
