import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { BossArena } from "@/components/session/BossArena";
import { getHpPercent, getPhaseFromHp, getPhaseTint } from "@/components/session/bossPhase";
import config from "@/tamagui.config";

/**
 * The damage trail is the one piece of state in the arena: the bar holds at the old HP so the
 * hit is legible, then drains. Two ways it breaks — never draining (the trail sticks at full and
 * every boss looks untouched), or never holding (it teleports and there is no hit to see).
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/i18n", () => ({ __esModule: true, default: { changeLanguage: jest.fn() } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

let mockReducedMotion = false;
jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

const TOTAL_HP = 400;

function arena(currentHp: number) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <BossArena
          currentHp={currentHp}
          totalHp={TOTAL_HP}
          bossName="The Stone Golem"
          bossImagePath="assets/images/bosses/stone_golem.jpg"
          weaknessMuscle="legs"
          lastDamage={
            currentHp < TOTAL_HP
              ? { damage: TOTAL_HP - currentHp, isCritical: false, weaknessBonus: false }
              : null
          }
        />
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}

type Rendered = Awaited<ReturnType<typeof render>>;

/** Widths the two bars actually render at — [trail, live]. */
function barWidths(root: Rendered): (string | number | undefined)[] {
  return ["boss-hp-trail", "boss-hp-fill"].map((id) => {
    const style = root.getByTestId(id).props.style;
    const flat: Record<string, unknown> = Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : ((style ?? {}) as Record<string, unknown>);
    return flat.width as string | number | undefined;
  });
}

describe("bossPhase", () => {
  it("maps HP to the four phases at their thresholds", () => {
    expect(getPhaseFromHp(100)).toBe(1);
    expect(getPhaseFromHp(75)).toBe(1);
    expect(getPhaseFromHp(74)).toBe(2);
    expect(getPhaseFromHp(50)).toBe(2);
    expect(getPhaseFromHp(49)).toBe(3);
    expect(getPhaseFromHp(25)).toBe(3);
    expect(getPhaseFromHp(24)).toBe(4);
    expect(getPhaseFromHp(0)).toBe(4);
  });

  it("leaves a boss at full power untinted and tints every wounded phase", () => {
    expect(getPhaseTint(1)).toBeNull();
    expect(getPhaseTint(2)).not.toBeNull();
    expect(getPhaseTint(4)).not.toBeNull();
  });

  it("clamps, and survives a fight seeded with no HP at all", () => {
    expect(getHpPercent(200, 400)).toBe(50);
    expect(getHpPercent(-10, 400)).toBe(0);
    expect(getHpPercent(900, 400)).toBe(100);
    // totalHp 0 would divide by zero and render a NaN% width.
    expect(getHpPercent(0, 0)).toBe(0);
  });
});

describe("BossArena damage trail", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("holds the trail at the old HP after a hit, then drains it to the new one", async () => {
    const root = await render(arena(TOTAL_HP));
    expect(barWidths(root)).toEqual(["100%", "100%"]);

    // A set lands: HP drops to half.
    await act(() => {
      root.rerender(arena(200));
    });

    // The live bar moved immediately; the trail still shows where HP was.
    expect(barWidths(root)).toEqual(["100%", "50%"]);

    await act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Trail caught up — the chunk has finished draining.
    expect(barWidths(root)).toEqual(["50%", "50%"]);
  });

  it("skips the hold entirely when reduced motion is on", async () => {
    mockReducedMotion = true;
    const root = await render(arena(TOTAL_HP));

    await act(() => {
      root.rerender(arena(100));
    });

    // No timer advanced: both bars are already at the new value.
    expect(barWidths(root)).toEqual(["25%", "25%"]);
  });
});
