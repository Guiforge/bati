// T38, constat 17 of the exit audit ("the demo growth is too short"): the scene's length, measured.
// The camera glides to the building first (CROISSANCE_CAMERA_MS), then the moment plays 1 s, then the
// map holds the finished building 1 s: over at 2.7 s from the tap, not before;
// and the demo's own pick (croissanceDemo) always changes stage.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import { CROISSANCE_CAMERA_MS } from "@/components/village/iso/carteDemo";
import { croissanceDemo } from "@/components/village/iso/croissanceDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { STADE_MS, TENUE_MS } from "@/components/village/iso/moment";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
// The real camera, its `vers` only watched: the return is asserted on what it is asked for.
const mockVers = jest.fn();
const mockOrdre: string[] = [];
let mockVue: (() => { zoom: number; x: number; y: number }) | undefined;
jest.mock("@/components/village/iso/useCameraIso", () => {
  const actual = jest.requireActual("@/components/village/iso/useCameraIso");
  return {
    ...actual,
    useCameraIso: (...a: unknown[]) => {
      const c = actual.useCameraIso(...a);
      mockVue = c.vue;
      return {
        ...c,
        vers: (v: unknown) => {
          mockOrdre.push("vers");
          mockVers(v, c.vue());
          c.vers(v);
        },
        glisser: (v: unknown) => {
          mockOrdre.push("glisser");
          c.glisser(v);
        },
      };
    },
  };
});
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });
jest.setTimeout(15_000);

const buildings = buildingCodes.map((code) => ({ code, level: 5 }));

describe("the growth scene's length", () => {
  it("the demo's pick has a site, so the scene lasts the glide plus 2 s whole (T37)", async () => {
    const grown = croissanceDemo(buildings, 0);
    expect(grown).not.toBeNull();
    const [code, ancien] = (grown ?? "").split(":");
    const fin = jest.fn();
    jest.useFakeTimers();
    try {
      await render(
        <GestureHandlerRootView>
          <IsoVillage
            tier={12}
            buildings={buildings}
            width={390}
            height={390}
            croissance={{
              cle: grown ?? "",
              items: [{ code: code as (typeof buildingCodes)[number], oldLevel: Number(ancien) }],
            }}
            onCroissanceFinie={fin}
          />
        </GestureHandlerRootView>,
      );
      expect(STADE_MS + TENUE_MS).toBe(2000);
      const total = CROISSANCE_CAMERA_MS + STADE_MS + TENUE_MS;
      await act(() => jest.advanceTimersByTime(total - 50));
      expect(fin).not.toHaveBeenCalled();
      await act(() => jest.advanceTimersByTime(60));
      expect(fin).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  const montrer = async () => {
    const [code, ancien] = (croissanceDemo(buildings, 0) ?? "").split(":");
    mockVers.mockClear();
    mockOrdre.length = 0;
    jest.useFakeTimers();
    await render(
      <GestureHandlerRootView>
        <IsoVillage
          tier={12}
          buildings={buildings}
          width={390}
          height={390}
          croissance={{
            cle: `${code}:${ancien}`,
            items: [{ code: code as (typeof buildingCodes)[number], oldLevel: Number(ancien) }],
          }}
        />
      </GestureHandlerRootView>,
    );
    await act(() => jest.advanceTimersByTime(600));
  };
  // The way back asks for the view the camera had when the way there was asked.
  const retourne = () => {
    const [aller, retour] = mockVers.mock.calls;
    expect(mockVers).toHaveBeenCalledTimes(2);
    expect(retour?.[0]).toEqual(aller?.[1]);
    expect(retour?.[0]).not.toEqual(aller?.[0]);
  };

  it("then the camera goes back to the view the player had before the scene", async () => {
    try {
      await montrer();
      await act(() => jest.advanceTimersByTime(4000));
      retourne();
    } finally {
      jest.useRealTimers();
    }
  });

  it("the slide toward the building never lands after the return, even if the owner is slow to drop the growth", async () => {
    try {
      // `montrer` never drops the growth: the slide's timer is still armed when the scene ends.
      await montrer();
      // One act: the commit of step 2 (which arms the slide) lands after the scene's end, as on a
      // phone whose render is slow.
      await act(() => jest.advanceTimersByTime(3000));
      await act(() => jest.advanceTimersByTime(3000));
      expect(mockOrdre.at(-1)).toBe("vers");
    } finally {
      jest.useRealTimers();
    }
  });

  it("a tap that skips the scene gives the view back, once", async () => {
    try {
      await montrer();
      const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
      await act(() => {
        tap.begin();
        tap.activate();
        tap.end();
      });
      await act(() => jest.advanceTimersByTime(4000));
      retourne();
    } finally {
      jest.useRealTimers();
    }
  });

  it("a tap during the moment's hold, once the building is finished, gives the view back at once", async () => {
    try {
      await montrer();
      // Past the glide and the moment (700 + 1000 ms from the tap), inside the 1 s hold.
      await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + STADE_MS - 600 + 300));
      expect(mockVers).toHaveBeenCalledTimes(1);
      const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
      await act(() => {
        tap.begin();
        tap.activate();
        tap.end();
      });
      await act(() => jest.advanceTimersByTime(50));
      retourne();
      await act(() => jest.advanceTimersByTime(4000));
      retourne();
    } finally {
      jest.useRealTimers();
    }
  });

  it("a drag during the scene keeps the camera in the hand: no return", async () => {
    try {
      await montrer();
      const pan = createGestureController(getByGestureTestId("iso-geste-pan"));
      await act(() => {
        pan.begin();
        pan.activate();
        pan.update({ translationX: 20, translationY: 0 });
      });
      await act(() => jest.advanceTimersByTime(4000));
      expect(mockVers).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  // The camera ends on the player's view whatever the timing of a tap (measured: a tap between the
  // hold's start and the natural return left it on the forge). Each case is a touch-down, a touch-up,
  // and where the natural return (2700 ms from the tap) falls between them.
  const touche = async (dehors: number, dedans: number) => {
    await montrer();
    const avantVue = mockVers.mock.calls[0]?.[1];
    await act(() => jest.advanceTimersByTime(dehors - 600));
    const pan = createGestureController(getByGestureTestId("iso-geste-pan"));
    const tap = createGestureController(getByGestureTestId("iso-geste-tap"));
    await act(() => {
      pan.begin();
      tap.begin();
    });
    await act(() => jest.advanceTimersByTime(dedans));
    await act(() => {
      tap.activate();
      tap.end();
      pan.end();
    });
    await act(() => jest.advanceTimersByTime(CROISSANCE_CAMERA_MS + 500));
    const fin = mockVue?.();
    expect(fin?.x).toBeCloseTo(avantVue.x, 1);
    expect(fin?.y).toBeCloseTo(avantVue.y, 1);
    expect(fin?.zoom).toBeCloseTo(avantVue.zoom, 2);
  };
  const FIN = CROISSANCE_CAMERA_MS + STADE_MS + TENUE_MS;
  it.each([
    ["down in the hold, up after the natural return", FIN - 300, 400],
    ["down just before the natural return, up long after", FIN - 20, 900],
    ["down in the moment, up in the hold", FIN - 1500, 600],
    ["down in the glide to the building, up in the moment", 800, 600],
    ["down and up in the hold", FIN - 500, 50],
    ["down just after the natural return", FIN + 20, 50],
  ])("%s: the camera ends on the player's view", async (_n, dehors, dedans) => {
    try {
      await touche(dehors, dedans);
    } finally {
      jest.useRealTimers();
    }
  });
});
