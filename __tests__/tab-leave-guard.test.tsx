import { renderHook } from "@testing-library/react-native";
import { interceptTabPress, useTabLeaveGuard } from "@/components/common/useTabLeaveGuard";

const mockNavigate = jest.fn();
// Tabs: Home (0), Adventures (1, the editor's tab, focused), Journal (2).
const tabs = {
  getState: () => ({
    index: 1,
    routes: [
      { key: "home-key", name: "index" },
      { key: "adv-key", name: "adventures" },
      { key: "journal-key", name: "journal" },
    ],
  }),
  navigate: mockNavigate,
};

async function press(dirty: boolean, target: string, skip = false) {
  const skipRef = { current: skip };
  const confirm = jest.fn();
  const view = await renderHook(() => useTabLeaveGuard(dirty, skipRef, confirm));
  const preventDefault = jest.fn();
  interceptTabPress({ target, preventDefault }, tabs);
  return { skipRef, confirm, preventDefault, view };
}

describe("tab leave guard", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("a dirty form keeps the hero on the editor when ANOTHER tab is pressed, and asks first", async () => {
    const { confirm, preventDefault } = await press(true, "journal-key");
    expect(preventDefault).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("confirming leaves without a second question, for the tab that was pressed", async () => {
    const { confirm, skipRef } = await press(true, "journal-key");
    confirm.mock.calls[0][0]();
    expect(skipRef.current).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith("journal");
  });

  it("pressing the editor's own tab is left to popToTop and beforeRemove", async () => {
    const { confirm, preventDefault } = await press(true, "adv-key");
    expect(preventDefault).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("a clean form lets the tab change through", async () => {
    const { confirm, preventDefault } = await press(false, "journal-key");
    expect(preventDefault).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("an unmounted editor stops guarding", async () => {
    const { view, confirm } = await press(true, "journal-key");
    confirm.mockClear();
    await view.unmount();
    interceptTabPress({ target: "home-key", preventDefault: jest.fn() }, tabs);
    expect(confirm).not.toHaveBeenCalled();
  });
});
