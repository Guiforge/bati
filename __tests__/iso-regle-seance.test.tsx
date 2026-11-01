// T38, the roadmap's rule: the village computes and animates nothing during a session or a GPS
// outing ("never between Start and the victory"). How the app keeps it: a session and an outing are
// one route (`/session`) pushed on the root Stack over the tabs, so the Village screen is not
// focused, and everything that moves on the map is gated on `useIsFocused`: the ambient clock
// (horloge.ts: "does not start out of focus", "cancels on leaving", in iso-horloge.test.tsx) and the
// walkers (useMarcheurs.ts, `actif = focus && !reduit`). The one thing those tests stub is the
// focus itself; this renders a real router with the app's shape and reads what the Village sees.
import { act, screen } from "@testing-library/react-native";
import { router, Stack, Tabs, useIsFocused } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module component
function Village() {
  return <Text testID="village-focus">{String(useIsFocused())}</Text>;
}

describe("the village rests during a session or an outing (roadmap rule)", () => {
  it("is out of focus once /session is pushed over the tabs, and focused again on return", async () => {
    // The app's shape: a root Stack holding the tabs and /session.
    await renderRouter(
      {
        _layout: () => <Stack screenOptions={{ headerShown: false }} />,
        "(tabs)/_layout": () => (
          <Tabs screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="village" />
          </Tabs>
        ),
        "(tabs)/village": Village,
        session: () => <Text testID="seance">session</Text>,
      },
      { initialUrl: "/village" },
    );
    expect((await screen.findByTestId("village-focus")).props.children).toBe("true");
    await act(() => router.push("/session"));
    expect(await screen.findByTestId("seance")).toBeTruthy();
    expect(
      screen.getByTestId("village-focus", { includeHiddenElements: true }).props.children,
    ).toBe("false");
    await act(() => router.back());
    expect((await screen.findByTestId("village-focus")).props.children).toBe("true");
  });
});
