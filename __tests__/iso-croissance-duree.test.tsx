// T38, constat 17 of the exit audit ("the demo growth is too short"): the scene's length, measured.
// Camera 0.5 s, site 1.5 s, cross-fade 1.5 s: over at 3 s, not before; and the demo's own pick
// (croissanceDemo) always has a site.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, render } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import { CROISSANCE_CAMERA_MS, CROISSANCE_MS } from "@/components/village/iso/carteDemo";
import { CHANTIER_MS } from "@/components/village/iso/chantier";
import { croissanceDemo } from "@/components/village/iso/croissanceDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
// The real camera, its `vers` only watched: the return is asserted on what it is asked for.
const mockVers = jest.fn();
jest.mock("@/components/village/iso/useCameraIso", () => {
  const actual = jest.requireActual("@/components/village/iso/useCameraIso");
  return {
    ...actual,
    useCameraIso: (...a: unknown[]) => {
      const c = actual.useCameraIso(...a);
      return {
        ...c,
        vers: (v: unknown) => {
          mockVers(v, c.vue());
          c.vers(v);
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
  it("the demo's pick has a site, so the scene lasts 2 s whole (T37)", async () => {
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
      expect(CROISSANCE_MS + CHANTIER_MS - CROISSANCE_CAMERA_MS).toBe(2000);
      await act(() =>
        jest.advanceTimersByTime(CROISSANCE_MS + CHANTIER_MS - CROISSANCE_CAMERA_MS - 50),
      );
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
});
