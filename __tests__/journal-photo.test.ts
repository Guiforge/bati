const mockDelete = jest.fn();
const mockEncode = jest.fn(async (_uri: string, _width: number) => "data:image/jpeg;base64,AAAA");
const mockAdd = jest.fn(async (_uuid: string, _image: string) => "id");
let mockFull = false;
const mockPick = jest.fn();

jest.mock("expo-file-system", () => ({
  Paths: { cache: { uri: "file:///data/cache/" } },
  File: function File(this: { uri: string; delete: () => void }, uri: string) {
    this.uri = uri;
    this.delete = () => mockDelete(uri);
  },
}));
jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
  launchImageLibraryAsync: (options: unknown) => mockPick(options),
}));
jest.mock("@/src/exercisePhoto", () => ({
  encodePhoto: (uri: string, width: number) => mockEncode(uri, width),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, transactionOrFallback: jest.fn() }));
jest.mock("@/db/sessionPhotos", () => {
  const actual = jest.requireActual("@/db/sessionPhotos");
  return {
    ...actual,
    addSessionPhoto: (uuid: string, image: string) => {
      if (mockFull) return Promise.reject(new actual.SessionPhotosFullError());
      return mockAdd(uuid, image);
    },
  };
});

import { chooseSessionPhotos } from "@/src/journalPhoto";

beforeEach(() => {
  jest.clearAllMocks();
  mockFull = false;
});

const asset = (uri: string) => ({ uri, width: 4000, height: 3000 });

test("asks the picker for the places left, and encodes at 1080 on the long side", async () => {
  mockPick.mockResolvedValue({ canceled: false, assets: [asset("file:///data/cache/a.jpg")] });
  expect(await chooseSessionPhotos("s", 1)).toBe("added");
  expect(mockPick).toHaveBeenCalledWith(
    expect.objectContaining({ selectionLimit: 2, allowsMultipleSelection: true }),
  );
  expect(mockEncode).toHaveBeenCalledWith("file:///data/cache/a.jpg", 1080);
  expect(mockAdd).toHaveBeenCalledWith("s", "data:image/jpeg;base64,AAAA");
});

test("never opens the picker at three", async () => {
  expect(await chooseSessionPhotos("s", 3)).toBe("full");
  expect(mockPick).not.toHaveBeenCalled();
});

test("deletes the picker's cache copy, and only a file under the app cache", async () => {
  mockPick.mockResolvedValue({
    canceled: false,
    assets: [asset("file:///data/cache/a.jpg"), asset("content://media/external/42")],
  });
  await chooseSessionPhotos("s", 0);
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockDelete).toHaveBeenCalledWith("file:///data/cache/a.jpg");
});

test("deletes the copy even when the encode fails", async () => {
  mockPick.mockResolvedValue({ canceled: false, assets: [asset("file:///data/cache/a.jpg")] });
  mockEncode.mockRejectedValueOnce(new Error("boom"));
  await expect(chooseSessionPhotos("s", 0)).rejects.toThrow("boom");
  expect(mockDelete).toHaveBeenCalledWith("file:///data/cache/a.jpg");
});

test("a photo refused as the fourth stops the batch and says so", async () => {
  mockFull = true;
  mockPick.mockResolvedValue({ canceled: false, assets: [asset("file:///data/cache/a.jpg")] });
  expect(await chooseSessionPhotos("s", 2)).toBe("full");
  expect(mockDelete).toHaveBeenCalledWith("file:///data/cache/a.jpg");
});

test("a cancelled pick changes nothing", async () => {
  mockPick.mockResolvedValue({ canceled: true, assets: [] });
  expect(await chooseSessionPhotos("s", 0)).toBe("cancelled");
});
