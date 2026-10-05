import { act, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";
import { InkGauge } from "@/components/common/InkGauge";
import { fade, rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

let mockReduced = false;
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduced }));

const flat = (s: unknown) => StyleSheet.flatten(s as never) as Record<string, unknown>;

function gauge(props: Partial<React.ComponentProps<typeof InkGauge>> = {}) {
  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <InkGauge progress={0.4} fill="$resourceGold" testIDPrefix="g" {...props} />
    </TamaguiProvider>
  );
}

describe("InkGauge", () => {
  beforeEach(() => {
    mockReduced = false;
  });

  it("fills to its progress, in the colour it was given, on a framed 10 dp track", async () => {
    const root = await render(gauge({ track: "$gold800" }));
    const fill = root.getByTestId("g-fill");
    expect(flat(fill.props.style).width).toBe("40%");
    expect(fill).toHaveStyle({ backgroundColor: fade(rawColors.resourceGold, 1) });
    const track = flat(fill.parent?.props.style);
    expect(track.height).toBe(10);
    expect(track.borderTopWidth).toBe(1.5);
    expect(track.backgroundColor).toBe(rawColors.gold800);
  });

  it("outlines its track in $borderStrong unless given a frame", async () => {
    const dflt = await render(gauge());
    expect(flat(dflt.getByTestId("g-fill").parent?.props.style).borderTopColor).toBe(
      rawColors.borderStrong,
    );
    const framed = await render(gauge({ frame: rawColors.gold700 }));
    expect(flat(framed.getByTestId("g-fill").parent?.props.style).borderTopColor).toBe(
      rawColors.gold700,
    );
  });

  it("clamps progress to 0..1", async () => {
    const root = await render(gauge({ progress: 3 }));
    expect(flat(root.getByTestId("g-fill").props.style).width).toBe("100%");
  });

  it("draws the figure in the body face, only when given one", async () => {
    const none = await render(gauge());
    expect(none.queryByTestId("g-figure")).toBeNull();
    const root = await render(gauge({ figure: "100 / 250" }));
    const figure = root.getByTestId("g-figure");
    expect(figure).toHaveTextContent("100 / 250");
    expect(flat(figure.props.style).fontFamily).toBe(config.fonts.body.face[700].normal);
  });

  it("sweeps from `from` to progress once, after a beat", async () => {
    jest.useFakeTimers();
    try {
      const root = await render(gauge({ from: 0.1 }));
      const width = () => flat(root.getByTestId("g-fill").props.style).width;
      expect(width()).toBe("10%");
      await act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(width()).toBe("40%");
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows progress at once under reduced motion", async () => {
    mockReduced = true;
    const root = await render(gauge({ from: 0.1 }));
    expect(flat(root.getByTestId("g-fill").props.style).width).toBe("40%");
  });
});
