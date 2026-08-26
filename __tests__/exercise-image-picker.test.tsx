/**
 * A hero's photo lives *in the row*, as a data URI.
 *
 * A backup is `VACUUM INTO` of the database file alone (`db/backup.ts`), so a `file://` path
 * would survive on this phone and arrive broken on the next one — and `expo-image-picker`'s own
 * URI lives in a cache directory Android may clear underneath it. The price is row size, which is
 * why nothing gets encoded before it has been resized.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn(), t: (key: string) => key } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

const mockSave = jest.fn();
const mockResize = jest.fn();

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: () => {
      const context = {
        resize: (...args: unknown[]) => {
          mockResize(...args);
          return context;
        },
        renderAsync: () => Promise.resolve({ saveAsync: (...a: unknown[]) => mockSave(...a) }),
      };
      return context;
    },
  },
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

const mockShowError = jest.fn();
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({
    showError: (...args: unknown[]) => mockShowError(...args),
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
    showToast: jest.fn(),
  }),
}));

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string }) => unknown) => {
    const state = { language: "en" };
    return selector ? selector(state) : state;
  },
}));

import { act, fireEvent, render } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { ImageChoiceField } from "@/components/common/ImageChoiceField";
import { EXERCISE_THUMB_ASSETS, getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { encodePhoto, MAX_PHOTO_WIDTH } from "@/src/exercisePhoto";
import config from "@/tamagui.config";

describe("encodePhoto", () => {
  beforeEach(() => {
    mockResize.mockClear();
    mockSave.mockReset();
  });

  it("resizes before encoding, and returns a data URI", async () => {
    mockSave.mockResolvedValue({ base64: "QUJD" });

    const result = await encodePhoto("file:///tmp/huge.jpg");

    // Resize first, or a 4000 px photo bloats the database and every automatic backup with it.
    expect(mockResize).toHaveBeenCalledWith({ width: MAX_PHOTO_WIDTH });
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ base64: true }));
    expect(result).toBe("data:image/jpeg;base64,QUJD");
  });

  it("throws rather than storing an empty picture", async () => {
    mockSave.mockResolvedValue({ base64: undefined });

    await expect(encodePhoto("file:///tmp/x.jpg")).rejects.toThrow();
  });
});

describe("picking a photo", () => {
  const requestPermission = jest.requireMock("expo-image-picker")
    .requestMediaLibraryPermissionsAsync as jest.Mock;
  const launchLibrary = jest.requireMock("expo-image-picker").launchImageLibraryAsync as jest.Mock;

  async function tapPhotoTile() {
    // `await` on the render: RNTL 14 hands back a promise here, and awaiting a plain result is
    // harmless — the same call in the older suites returns the tree directly.
    const screen = await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <ImageChoiceField
          value="assets/placeholder.webp"
          onChange={onChange}
          choices={Object.keys(EXERCISE_THUMB_ASSETS)}
          resolve={getExerciseAsset}
          resolveThumb={getExerciseThumb}
          aspect={[1, 1]}
        />
      </TamaguiProvider>,
    );

    // The tiles live behind the preview, which is the control.
    await act(async () => fireEvent.press(screen.getByTestId("image-choice-preview")));
    await act(async () => fireEvent.press(screen.getByTestId("image-choice-photo")));
    return screen;
  }

  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
    mockShowError.mockClear();
    requestPermission.mockClear();
    launchLibrary.mockClear();
    mockSave.mockResolvedValue({ base64: "QUJD" });
    requestPermission.mockResolvedValue({ granted: true });
    launchLibrary.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///tmp/a.jpg" }] });
  });

  it("stores the encoded photo when one is chosen", async () => {
    await tapPhotoTile();

    expect(onChange).toHaveBeenCalledWith("data:image/jpeg;base64,QUJD");
  });

  it("says so when the photo permission is refused, instead of doing nothing", async () => {
    // A silently-declined permission is what made the avatar row inert forever.
    requestPermission.mockResolvedValue({ granted: false });

    await tapPhotoTile();

    expect(launchLibrary).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("changes nothing, and says nothing, when the hero backs out of the picker", async () => {
    launchLibrary.mockResolvedValue({ canceled: true });

    await tapPhotoTile();

    expect(onChange).not.toHaveBeenCalled();
    // Backing out is not a failure; a toast here would be the app scolding a decision.
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it("reports a failed encode and leaves the tile usable again", async () => {
    mockSave.mockResolvedValue({ base64: undefined });

    const screen = await tapPhotoTile();

    expect(onChange).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalled();
    // `finally` put `busy` back: without it the tile stays greyed out and dead.
    expect(screen.getByTestId("image-choice-photo").props.accessibilityState.disabled).toBeFalsy();
  });
});
