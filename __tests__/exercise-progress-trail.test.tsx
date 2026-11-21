import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { ProgressTrail } from "@/components/exercises/ProgressTrail";
import config from "@/tamagui.config";
import "@/i18n";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
    Circle: View,
    Defs: View,
    Line: View,
    LinearGradient: View,
    Path: View,
    Stop: View,
  };
});
const mockBests = jest.fn();
jest.mock("@/db/personalRecords", () => ({
  getExerciseSessionBests: (...args: unknown[]) => mockBests(...args),
}));

const point = (sessionId: number, best: number) => ({
  sessionId,
  best,
  at: new Date(2026, 0, sessionId),
});
const exercise = { id: 1, perSide: false };

const wrapped = () => (
  <TamaguiProvider config={config} defaultTheme="dark">
    <ProgressTrail exercise={exercise} type="reps" record={8} />
  </TamaguiProvider>
);

describe("ProgressTrail", () => {
  test("claims nothing with fewer than two sessions", async () => {
    mockBests.mockResolvedValue([point(1, 8)]);
    await render(wrapped());
    await waitFor(() => expect(mockBests).toHaveBeenCalled());
    expect(screen.queryByTestId("exercise-progress-reps")).toBeNull();
  });

  test("writes the first and the last value at the ends, with the unit", async () => {
    mockBests.mockResolvedValue([point(5, 6), point(7, 8), point(9, 7)]);
    await render(wrapped());
    expect((await screen.findByTestId("exercise-progress-first")).props.children).toMatch(/6/);
    expect(screen.getByTestId("exercise-progress-last").props.children).toMatch(/7/);
  });

  test("lists the sessions behind the chart, each linking to its night", async () => {
    mockBests.mockResolvedValue([point(5, 6), point(7, 8), point(9, 7)]);
    await render(wrapped());
    await screen.findByTestId("exercise-progress-reps");
    expect(screen.queryAllByTestId("exercise-progress-session")).toHaveLength(0);

    await fireEvent.press(screen.getByTestId("exercise-progress-reps-toggle"));
    const rows = screen.getAllByTestId("exercise-progress-session");
    expect(rows).toHaveLength(3);

    await fireEvent.press(rows[0] as (typeof rows)[number]);
    expect(mockPush).toHaveBeenCalledWith("/journal/9");
  });
});
