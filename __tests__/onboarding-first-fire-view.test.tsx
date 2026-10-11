import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

/**
 * The naming screen's plate (components/onboarding/FirstFire.tsx): the name the hero sees in the
 * field is the name set on the painting, and it is only there while the name is one the app
 * accepts. `lit` and `name` are the whole contract between the screen and the plate, and nothing
 * else reads them.
 */
let mockReducedMotion = false;
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReducedMotion }));

import { FirstFire } from "@/components/onboarding/FirstFire";
import config from "@/tamagui.config";

async function plate(name: string, lit: boolean, height = 213) {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <FirstFire name={name} lit={lit} />
    </TamaguiProvider>,
  );
  // The band measures itself before it captions anything.
  const band = screen.getByTestId("onboarding-first-fire").children[0];
  await fireEvent(band as never, "layout", { nativeEvent: { layout: { width: 360, height } } });
}

beforeEach(() => {
  mockReducedMotion = false;
});

test("a valid name is set on the painting, character for character", async () => {
  await plate("Haut-Rempart", true);

  expect(screen.getByTestId("onboarding-village-caption")).toHaveTextContent("Haut-Rempart");
});

test("no caption while the name is not one the app accepts", async () => {
  await plate("Ke", false);

  expect(screen.queryByTestId("onboarding-village-caption")).toBeNull();
});

test("no caption on a band the keyboard has folded away", async () => {
  await plate("Kerbati", true, 20);

  expect(screen.queryByTestId("onboarding-village-caption")).toBeNull();
});

test("under reduced motion the caption is there from the first frame", async () => {
  mockReducedMotion = true;
  await plate("Kerbati", true);

  expect(screen.getByTestId("onboarding-village-caption")).toHaveTextContent("Kerbati");
});
