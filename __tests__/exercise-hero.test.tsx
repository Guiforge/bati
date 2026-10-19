import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { ExerciseHero } from "@/components/session/ExerciseHero";
import { PrepView } from "@/components/session/PrepView";
import { titleBelowPicture } from "@/components/session/sessionArt";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

/**
 * D-57. The intro screen's title is a caption pinned over the picture. On a 360x640 phone at 130 %
 * the picture is about 100 dp and the caption covered two thirds of it, so there the title goes
 * under the picture. Every other screen keeps the caption over the art.
 */

const mount = (nameBelowSmall: boolean, onNameBelowChange?: (below: boolean) => void) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 640 },
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <ExerciseHero
          source={0}
          name="Chop wood"
          minHeight={100}
          fadeTo="#000"
          topInset={0}
          nameBelowSmall={nameBelowSmall}
          onNameBelowChange={onNameBelowChange}
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

const measure = async (w: number, h: number) =>
  act(() => {
    fireEvent(screen.getByTestId("exercise-hero-art"), "layout", {
      nativeEvent: { layout: { width: w, height: h } },
    });
  });

describe("titleBelowPicture", () => {
  test("is true only for a measured picture under 240 dp", () => {
    expect(titleBelowPicture(0)).toBe(false);
    expect(titleBelowPicture(100)).toBe(true);
    expect(titleBelowPicture(239)).toBe(true);
    expect(titleBelowPicture(240)).toBe(false);
  });
});

describe("the title of the intro screen", () => {
  test("goes under a small picture when the screen asks for it", async () => {
    await mount(true);
    await measure(360, 100);

    expect(screen.getByTestId("exercise-hero-name-below")).toBeTruthy();
  });

  test("stays over a picture big enough to hold it", async () => {
    await mount(true);
    await measure(360, 300);

    expect(screen.queryByTestId("exercise-hero-name-below")).toBeNull();
    expect(screen.getByTestId("exercise-hero-name")).toBeTruthy();
  });

  test("stays over a small picture on the screens that did not ask", async () => {
    await mount(false);
    await measure(360, 100);

    expect(screen.queryByTestId("exercise-hero-name-below")).toBeNull();
    expect(screen.getByTestId("exercise-hero-name")).toBeTruthy();
  });
});

describe("D-64, the description of the intro at a small size", () => {
  test("the hero tells its screen when the title went under the picture", async () => {
    const onChange = jest.fn();
    await mount(true, onChange);
    await measure(360, 100);

    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  test("it says false for a picture big enough, so a normal phone keeps its description", async () => {
    const onChange = jest.fn();
    await mount(true, onChange);
    await measure(360, 300);

    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  test("PrepView clamps the description to the lines it is given, and only then", async () => {
    const view = (descriptionLines?: number) => (
      <TamaguiProvider config={config} defaultTheme="dark">
        <PrepView
          kicker="First"
          instruction={{ name: "Chop wood", imagePath: "", description: "A long text." }}
          fallbackName="Chop wood"
          target={null}
          remainingSeconds={null}
          onGo={jest.fn()}
          goTestID="go"
          compact
          descriptionLines={descriptionLines}
        />
      </TamaguiProvider>
    );
    const { rerender } = await render(view(2));
    expect(screen.getByText("A long text.").props.numberOfLines).toBe(2);

    await rerender(view(undefined));
    expect(screen.getByText("A long text.").props.numberOfLines).toBeUndefined();
  });
});
