import { renderHook } from "@testing-library/react-native";
import { useTabLeaveGuard } from "@/components/common/useTabLeaveGuard";

const mockNavigate = jest.fn();
let tabPress: ((e: { target: string; preventDefault: () => void }) => void) | undefined;
jest.mock("expo-router", () => ({
  useNavigation: () => ({
    getParent: () => ({
      addListener: (_: string, cb: typeof tabPress) => {
        tabPress = cb;
        return () => undefined;
      },
      getState: () => ({ routes: [{ key: "home-key", name: "index" }] }),
      navigate: mockNavigate,
    }),
  }),
}));

async function press(dirty: boolean, skip = false) {
  const skipRef = { current: skip };
  const confirm = jest.fn();
  await renderHook(() => useTabLeaveGuard(dirty, skipRef, confirm));
  const preventDefault = jest.fn();
  tabPress?.({ target: "home-key", preventDefault });
  return { skipRef, confirm, preventDefault };
}

describe("useTabLeaveGuard", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("a dirty form keeps the hero on the editor and asks first", async () => {
    const { confirm, preventDefault } = await press(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("confirming leaves without a second question, for the tab that was pressed", async () => {
    const { confirm, skipRef } = await press(true);
    confirm.mock.calls[0][0]();
    expect(skipRef.current).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith("index");
  });

  it("a clean form lets the tab change through", async () => {
    const { confirm, preventDefault } = await press(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
});
