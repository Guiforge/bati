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

import { encodePhoto, MAX_PHOTO_WIDTH } from "@/src/exercisePhoto";

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
