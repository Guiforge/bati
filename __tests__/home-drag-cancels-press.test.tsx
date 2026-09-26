import { act, render, screen } from "@testing-library/react-native";
import type { GestureResponderEvent } from "react-native";
import { TamaguiProvider, YStack } from "tamagui";

import HomeScreen from "@/app/(tabs)/index";
import config from "@/tamagui.config";

/**
 * Home fits its viewport on most phones, so its ScrollView never scrolls and never takes a touch
 * away from the pressable under it. Tamagui fires `onPress` on release whatever the finger did in
 * between, so a swipe up the scene opened the quest screen. On a Fairphone 6 that navigation was
 * measured as "Home scrolls at 29 ms a frame".
 *
 * RNTL does not run the responder negotiation, so these drive the handlers the way it does: the
 * screen's capture handler is asked on every move, and a yes terminates the pressable's press.
 */

jest.mock("@/components/chorus/screenCues", () => ({
  useScreenGuide: () => {},
  useComebackCue: () => {},
}));
jest.mock("@/components/home/HomeHeader", () => ({ HomeHeader: () => null }));
jest.mock("@/components/home/HomeStage", () => ({ HomeStage: () => null }));
jest.mock("@/components/home/QuickActions", () => ({ QuickActions: () => null }));
jest.mock("@/components/home/UpdateCard", () => ({ UpdateCard: () => null }));
jest.mock("@/components/home/SyncCard", () => ({ SyncCard: () => null }));
jest.mock("@/components/session/SessionRecoveryCard", () => ({
  SessionRecoveryBanner: () => null,
}));

let clock = 1;

/** One finger, from (100, 100) to (100 + dx, 100 + dy). */
function touch(dx: number, dy: number) {
  clock += 1;
  const record = {
    touchActive: true,
    startPageX: 100,
    startPageY: 100,
    startTimeStamp: 0,
    currentPageX: 100 + dx,
    currentPageY: 100 + dy,
    currentTimeStamp: clock,
    previousPageX: 100,
    previousPageY: 100,
    previousTimeStamp: 0,
  };
  return {
    nativeEvent: { touches: [{}] },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: clock,
      touchBank: [record],
    },
  } as unknown as GestureResponderEvent;
}

type Handlers = {
  onStartShouldSetResponderCapture: (e: GestureResponderEvent) => boolean;
  onMoveShouldSetResponderCapture: (e: GestureResponderEvent) => boolean;
  onResponderGrant: (e: GestureResponderEvent) => boolean;
  onResponderTerminationRequest: (e: GestureResponderEvent) => boolean;
};

async function homeHandlers(): Promise<Handlers> {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <HomeScreen />
    </TamaguiProvider>,
  );
  return screen.getByTestId("home-screen").props as Handlers;
}

/** A fresh touch that has travelled (dx, dy): does the screen take it from the press? */
function claims(home: Handlers, dx: number, dy: number) {
  home.onStartShouldSetResponderCapture(touch(0, 0));
  return home.onMoveShouldSetResponderCapture(touch(dx, dy));
}

test("a swipe over Home is taken from the pressable under it, a tap is not", async () => {
  const home = await homeHandlers();

  expect(claims(home, 3, 4)).toBe(false);
  expect(claims(home, 0, -40)).toBe(true);
  expect(claims(home, 40, 0)).toBe(true);
});

test("taking the touch blocks no native scroll and gives it back when asked", async () => {
  const home = await homeHandlers();

  expect(home.onResponderGrant(touch(0, -40))).toBe(false);
  expect(home.onResponderTerminationRequest(touch(0, -40))).toBe(true);
});

/**
 * Why any of this exists. The day Tamagui stops pressing on a release after a drag, this fails:
 * the capture above is then dead weight, and should go.
 */
test("a Tamagui pressable still presses on a release after a drag, and yields when asked", async () => {
  const onPress = jest.fn();
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <YStack testID="door" onPress={onPress} pressStyle={{ opacity: 0.8 }} />
    </TamaguiProvider>,
  );
  const door = screen.getByTestId("door").props as Handlers & {
    onResponderMove: (e: GestureResponderEvent) => void;
    onResponderRelease: (e: GestureResponderEvent) => void;
  };

  await act(() => {
    door.onResponderGrant(touch(0, 0));
    door.onResponderMove(touch(0, 400));
    door.onResponderRelease(touch(0, 400));
  });
  expect(onPress).toHaveBeenCalledTimes(1);

  expect(door.onResponderTerminationRequest(touch(0, 400))).toBe(true);
});
