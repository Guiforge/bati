const mockExisting = new Set<string>();

jest.mock("expo-file-system", () => ({
  File: class {
    mockUri: string;
    constructor(mockUri: string) {
      this.mockUri = mockUri;
    }
    get exists() {
      return mockExisting.has(this.mockUri);
    }
  },
}));
jest.mock("@/src/exercisePhoto", () => ({
  encodePhoto: jest.fn((_uri: string, width: number) => Promise.resolve(`data:${width}`)),
}));
jest.mock("@/db/preferences", () => ({
  deletePreference: jest.fn(() => Promise.resolve()),
  preferences: { setCustomAvatarUri: jest.fn(() => Promise.resolve()) },
}));

import { deletePreference, preferences } from "@/db/preferences";
import { AVATAR_SIZE, portLegacyAvatar } from "@/src/customAvatar";

beforeEach(() => {
  jest.clearAllMocks();
  mockExisting.clear();
});

test("a cache path still on disk becomes the data URI backups carry", async () => {
  mockExisting.add("file:///cache/ImagePicker/a.jpg");

  await expect(portLegacyAvatar("file:///cache/ImagePicker/a.jpg")).resolves.toBe(
    `data:${AVATAR_SIZE}`,
  );
  expect(preferences.setCustomAvatarUri).toHaveBeenCalledWith(`data:${AVATAR_SIZE}`);
});

test("a path Android already purged is forgotten, without dating a preset choice", async () => {
  await expect(portLegacyAvatar("file:///cache/ImagePicker/gone.jpg")).resolves.toBeNull();

  // A delete: a dated "" would beat a photo picked on another phone at the next merge.
  expect(deletePreference).toHaveBeenCalledWith("customAvatarUri");
  expect(preferences.setCustomAvatarUri).not.toHaveBeenCalled();
});
