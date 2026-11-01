// FIN-MAG tour 0: the sprite-sheet player picks the right drawing at each instant, shows nothing
// at rest, shows one still drawing in reduced motion, and costs the reveal no animated node.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import * as Reanimated from "react-native-reanimated";
import { FigeContext } from "@/components/village/iso/fige";
import { HorlogeContext } from "@/components/village/iso/horloge";
import { PlancheJeu } from "@/components/village/iso/PlancheJeu";
import {
  decalage,
  dessinA,
  dureePlanche,
  EFFET_PLANCHE,
  PLANCHE_ECLAT as P,
} from "@/components/village/iso/planche";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
let mockReduit = false;
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));

configure({ defaultIncludeHiddenElements: true });

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: Record<string, number>[] };

type Noeud = { props?: Record<string, unknown>; children?: unknown[] | null };
const animes = (n: unknown): number => {
  if (typeof n !== "object" || n === null) return 0;
  const { props, children } = n as Noeud;
  const propre =
    props?.jestAnimatedStyle === undefined && props?.animatedProps === undefined ? 0 : 1;
  return (children ?? []).reduce<number>((a, c) => a + animes(c), propre);
};

const SOURCE = 1;
const W = 64;
const H = 108;
let sv: Reanimated.SharedValue<number>;
let horloge: Reanimated.SharedValue<number>;

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
const Jeu = ({
  avecT = true,
  boucle,
  depart,
}: {
  avecT?: boolean;
  boucle?: number;
  depart?: number;
}) => {
  sv = Reanimated.useSharedValue(-1);
  horloge = Reanimated.useSharedValue(0);
  return (
    <HorlogeContext.Provider value={horloge}>
      <PlancheJeu
        source={SOURCE}
        planche={P}
        w={W}
        h={H}
        t={avecT ? sv : undefined}
        boucle={boucle}
        depart={depart}
        testID="jeu"
      />
    </HorlogeContext.Provider>
  );
};

const decale = () => {
  const [x, y] = (getAnimatedStyle(screen.getByTestId("jeu-image") as never).transform ?? []).map(
    (o) => Object.values(o)[0],
  );
  return { x, y };
};

describe("the sheet's pure side", () => {
  test("12 frames a second, 8 drawings, a 4 x 2 sheet, each drawing shown at least once", () => {
    expect(P.fps).toBe(12);
    expect(P.colonnes * P.lignes).toBe(8);
    expect(new Set(P.tenues).size).toBe(8);
    expect(dureePlanche(P)).toBe(1000);
    // Held drawings exist (12 ticks for 8 drawings) and the order never goes back.
    expect(P.tenues.length).toBeGreaterThan(8);
    for (const [i, d] of P.tenues.entries()) expect(d).toBeGreaterThanOrEqual(P.tenues[i - 1] ?? 0);
  });

  test("picks the drawing of each tick over the whole clip, one tick every 1/12 s", () => {
    for (const [tic, d] of P.tenues.entries()) {
      const debut = (tic * 1000) / 12;
      expect(dessinA(debut + 0.5, P)).toBe(d);
      expect(dessinA(debut + 1000 / 12 - 0.5, P)).toBe(d);
    }
    expect(dessinA(0, P)).toBe(0);
    expect(dessinA(250, P)).toBe(P.tenues[3]);
    // The last tick of the clip shows the last drawing (the reveal plays only ECLAT_MS of it).
    expect(dessinA(dureePlanche(P) - 1, P)).toBe(7);
  });

  test("nothing at rest: before the start and after the end there is no drawing", () => {
    expect(dessinA(-1, P)).toBe(-1);
    expect(dessinA(Number.NaN, P)).toBe(-1);
    expect(dessinA(1000, P)).toBe(-1);
    expect(dessinA(5000, P)).toBe(-1);
    expect(decalage(-1, P, W, H).x).toBe(-P.colonnes * W);
  });

  test("a drawing's place on the sheet: columns then rows", () => {
    expect(decalage(0, P, W, H)).toEqual({ x: -0, y: -0 });
    expect(decalage(3, P, W, H)).toEqual({ x: -3 * W, y: -0 });
    expect(decalage(4, P, W, H)).toEqual({ x: -0, y: -H });
    expect(decalage(7, P, W, H)).toEqual({ x: -3 * W, y: -H });
  });

  test("the flag is off: the Svg stays the default path", () => {
    expect(EFFET_PLANCHE).toBe(false);
  });
});

describe("the player, rendered", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    mockReduit = false;
  });

  test("one animated node, a transform alone, one layout size: the sheet's", async () => {
    await render(<Jeu />);
    expect(animes(screen.toJSON())).toBe(1);
    const st = StyleSheet.flatten(screen.getByTestId("jeu-image").props.style) as {
      width: number;
      height: number;
    };
    expect([st.width, st.height]).toEqual([4 * W, 2 * H]);
    const animee = Object.keys(getAnimatedStyle(screen.getByTestId("jeu-image") as never));
    expect(animee.filter((k) => k !== "width" && k !== "height")).toEqual(["transform"]);
    // The clip cuts what overflows, at one drawing's size.
    expect(StyleSheet.flatten(screen.getByTestId("jeu").props.style)).toMatchObject({
      width: W,
      height: H,
      overflow: "hidden",
    });
  });

  test("at rest the sheet is slid out of the clip; each instant brings its own drawing", async () => {
    await render(<Jeu />);
    expect(decale().x).toBe(-4 * W);
    for (const ms of [0, 100, 250, 480, 700, 900]) {
      await act(() => {
        sv.set(ms);
        jest.advanceTimersByTime(20);
      });
      const d = dessinA(ms, P);
      const o = decalage(d, P, W, H);
      expect(decale()).toEqual({ x: o.x, y: o.y });
    }
    await act(() => {
      sv.set(1000);
      jest.advanceTimersByTime(20);
    });
    expect(decale().x).toBe(-4 * W);
  });

  test("`depart` holds the sheet out of the clip until that time (the burst leaves with the new stage)", async () => {
    await render(<Jeu depart={320} />);
    await act(() => {
      sv.set(300);
      jest.advanceTimersByTime(20);
    });
    expect(decale().x).toBe(-4 * W);
    await act(() => {
      sv.set(330);
      jest.advanceTimersByTime(20);
    });
    expect(decale()).toEqual({ x: -0, y: -0 });
  });

  test("without a clock of its own it reads the ambient one, looping at `boucle`", async () => {
    await render(<Jeu avecT={false} boucle={5000} />);
    await act(() => {
      horloge.set(5250);
      jest.advanceTimersByTime(20);
    });
    expect(decale()).toEqual(decalage(dessinA(250, P), P, W, H));
    await act(() => {
      horloge.set(5000 * 3 + 2000);
      jest.advanceTimersByTime(20);
    });
    expect(decale().x).toBe(-4 * W);
  });

  test("reduced motion: one still drawing, no animated node", async () => {
    mockReduit = true;
    await render(<Jeu />);
    expect(animes(screen.toJSON())).toBe(0);
    const st = StyleSheet.flatten(screen.getByTestId("jeu-image").props.style) as {
      transform: Record<string, number>[];
    };
    const o = decalage(P.fixe, P, W, H);
    expect(st.transform).toEqual([{ translateX: o.x }, { translateY: o.y }]);
  });

  test("the frozen mode reads as reduced motion", async () => {
    await render(
      <FigeContext.Provider value={true}>
        <Jeu />
      </FigeContext.Provider>,
    );
    expect(animes(screen.toJSON())).toBe(0);
  });
});
