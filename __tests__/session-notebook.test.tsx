import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
type Leave = { preventDefault: () => void; data: { action: unknown } };
let mockLeaveListeners: ((e: Leave) => void)[] = [];
const mockDispatch = jest.fn();
const mockNavigation = {
  addListener: (_name: string, fn: (e: Leave) => void) => {
    mockLeaveListeners.push(fn);
    return () => {
      mockLeaveListeners = mockLeaveListeners.filter((l) => l !== fn);
    };
  },
  dispatch: (action: unknown) => mockDispatch(action),
};
jest.mock("expo-router", () => ({ useNavigation: () => mockNavigation }));
jest.mock("@/db/client", () => ({ db: {}, schema: {} }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

let mockPhotos: { uuid: string; image: string }[] = [];
let mockNotes = "";
const mockSave = jest.fn(async (_id: number, _text: string) => {});
const mockRemove = jest.fn(async (_uuid: string) => {});
const mockChoose = jest.fn(async (_uuid: string, _live: number) => "added" as const);

jest.mock("@/db/completed", () => ({
  MAX_NOTE_CHARS: 500,
  updateSessionNotes: (id: number, text: string) => mockSave(id, text),
}));
jest.mock("@/db/sessionPhotos", () => ({
  MAX_SESSION_PHOTOS: 3,
  readNotebook: async () => ({ uuid: "s-uuid", notes: mockNotes }),
  listSessionPhotos: async () => mockPhotos,
  removeSessionPhoto: (uuid: string) => mockRemove(uuid),
}));
jest.mock("@/src/journalPhoto", () => ({
  chooseSessionPhotos: (uuid: string, live: number) => mockChoose(uuid, live),
}));

import { SessionNotebook } from "@/components/journal/SessionNotebook";
import config from "@/tamagui.config";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const photo = (n: number) => ({ uuid: `p${n}`, image: "data:image/jpeg;base64,AAAA" });

async function mount(props: Partial<React.ComponentProps<typeof SessionNotebook>> = {}) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <SessionNotebook sessionId={7} {...props} />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("session-notebook")).toBeTruthy());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPhotos = [];
  mockNotes = "";
});

test("a note is written from the row id alone and saved trimmed by the writer", async () => {
  await mount();
  await act(async () => {
    await fireEvent.press(screen.getByTestId("notebook-note-edit"));
  });
  const input = screen.getByTestId("notebook-note-input");
  expect(input.props.maxLength).toBe(500);
  await act(async () => {
    await fireEvent.changeText(input, "  felt strong ");
  });
  await act(async () => {
    await fireEvent.press(screen.getByTestId("notebook-note-save"));
  });
  expect(mockSave).toHaveBeenCalledWith(7, "  felt strong ");
  await waitFor(() => expect(screen.getByTestId("notebook-note")).toBeTruthy());
});

test("an existing note is shown and offered for editing", async () => {
  mockNotes = "Rain, good legs";
  await mount();
  expect(screen.getByText("Rain, good legs")).toBeTruthy();
  expect(screen.getByText("journal.note_edit")).toBeTruthy();
});

test("the add button asks the picker for the photos already there, and is gone at three", async () => {
  mockPhotos = [photo(1)];
  await mount();
  await act(async () => {
    await fireEvent.press(screen.getByTestId("notebook-photo-add"));
  });
  expect(mockChoose).toHaveBeenCalledWith("s-uuid", 1);
});

test("at three photos there is nothing left to add", async () => {
  mockPhotos = [photo(1), photo(2), photo(3)];
  await mount();
  expect(screen.queryByTestId("notebook-photo-add")).toBeNull();
});

test("note mode opens on the editor and shows no photo controls", async () => {
  mockPhotos = [photo(1)];
  await mount({ mode: "note", startEditing: true });
  expect(screen.getByTestId("notebook-note-input")).toBeTruthy();
  expect(screen.queryByTestId("notebook-photo-add")).toBeNull();
});

describe("leaving with an unsaved note", () => {
  const leave = async () => {
    const e = { preventDefault: jest.fn(), data: { action: { type: "GO_BACK" } } };
    await act(() => {
      for (const l of mockLeaveListeners) l(e);
    });
    return e;
  };

  beforeEach(() => {
    mockLeaveListeners = [];
  });

  test("is stopped and asked about once the text differs from the saved note", async () => {
    mockNotes = "Rain";
    await mount();
    await act(async () => {
      await fireEvent.press(screen.getByTestId("notebook-note-edit"));
    });
    // Opened but untouched: nothing to lose, nothing asked.
    expect((await leave()).preventDefault).not.toHaveBeenCalled();

    await act(async () => {
      await fireEvent.changeText(screen.getByTestId("notebook-note-input"), "Rain, strong legs");
    });
    expect((await leave()).preventDefault).toHaveBeenCalledTimes(1);
    expect(screen.getByText("quests.editor_discard_title")).toBeTruthy();
    expect(mockDispatch).not.toHaveBeenCalled();

    // "Discard" lets the very same exit through.
    await act(async () => {
      await fireEvent.press(screen.getByText("quests.editor_discard"));
    });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "GO_BACK" });
  });

  test("lets a saved note go without a question", async () => {
    await mount();
    await act(async () => {
      await fireEvent.press(screen.getByTestId("notebook-note-edit"));
    });
    await act(async () => {
      await fireEvent.changeText(screen.getByTestId("notebook-note-input"), "Done");
    });
    await act(async () => {
      await fireEvent.press(screen.getByTestId("notebook-note-save"));
    });
    expect((await leave()).preventDefault).not.toHaveBeenCalled();
  });

  test("the victory screen's composer is not guarded", async () => {
    await mount({ mode: "note", startEditing: true });
    await act(async () => {
      await fireEvent.changeText(screen.getByTestId("notebook-note-input"), "Typing");
    });
    expect((await leave()).preventDefault).not.toHaveBeenCalled();
  });
});
