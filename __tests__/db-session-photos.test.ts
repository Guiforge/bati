import { clientMock, createTestDb } from "./helpers/testDb";

/** A JPEG skeleton: SOI, optional APP1 Exif, a comment, start of scan. Enough for the segment walk. */
function jpegBytes(withExif: boolean): Uint8Array {
  const exif = [0xff, 0xe1, 0x00, 0x0a, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00];
  const comment = [0xff, 0xfe, 0x00, 0x04, 0x68, 0x69];
  return Uint8Array.from([
    0xff,
    0xd8,
    ...(withExif ? exif : []),
    ...comment,
    0xff,
    0xda,
    0,
    2,
    0xff,
    0xd9,
  ]);
}
function dataUri(bytes: Uint8Array): string {
  return `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("session photos and notes", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());

  const photos = () => require("../db/sessionPhotos") as typeof import("../db/sessionPhotos");
  const completed = () => require("../db/completed") as typeof import("../db/completed");
  const journal = () => require("../db/journal") as typeof import("../db/journal");

  async function session(): Promise<{ id: number; uuid: string }> {
    const id = await completed().createCompletedSession({
      questId: null,
      durationSeconds: 600,
      xpEarned: 40,
      exercises: [{ exerciseId: 1, sortOrder: 0, result: { type: "reps", value: 10 } }],
    });
    const row = t.sqlite.prepare("SELECT uuid FROM completed_sessions WHERE id = ?").get(id) as {
      uuid: string;
    };
    return { id, uuid: row.uuid };
  }
  const rows = (uuid: string) =>
    t.sqlite
      .prepare("SELECT * FROM session_photos WHERE sessionUuid = ? ORDER BY sortOrder")
      .all(uuid) as { uuid: string; sortOrder: number; deletedAt: number | null; image: Buffer }[];

  test("hasExif sees an APP1 Exif segment and nothing else", () => {
    expect(photos().hasExif(jpegBytes(true))).toBe(true);
    expect(photos().hasExif(jpegBytes(false))).toBe(false);
    expect(photos().hasExif(Uint8Array.from([1, 2, 3]))).toBe(false);
  });

  test("a photo with EXIF, a non-JPEG and an oversized one are refused", async () => {
    const { uuid } = await session();
    await expect(photos().addSessionPhoto(uuid, dataUri(jpegBytes(true)))).rejects.toThrow(/EXIF/);
    await expect(photos().addSessionPhoto(uuid, "data:image/png;base64,AAAA")).rejects.toThrow();
    const big = Uint8Array.from([0xff, 0xd8, ...new Array(600_000).fill(0)]);
    await expect(photos().addSessionPhoto(uuid, dataUri(big))).rejects.toThrow(/large/);
    expect(rows(uuid)).toHaveLength(0);
  });

  test("a stored photo comes back as the same bytes, stored as a BLOB", async () => {
    const { uuid } = await session();
    const id = await photos().addSessionPhoto(uuid, dataUri(jpegBytes(false)));
    expect(Buffer.from(rows(uuid)[0]?.image ?? []).equals(Buffer.from(jpegBytes(false)))).toBe(
      true,
    );
    expect(
      t.sqlite.prepare("SELECT typeof(image) AS t FROM session_photos WHERE uuid = ?").get(id),
    ).toEqual({ t: "blob" });
    expect((await photos().listSessionPhotos(uuid)).map((p) => p.image)).toEqual([
      dataUri(jpegBytes(false)),
    ]);
  });

  test("the fourth photo is refused, a removed one frees its place, an order is never reused", async () => {
    const { uuid } = await session();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++)
      ids.push(await photos().addSessionPhoto(uuid, dataUri(jpegBytes(false))));
    await expect(photos().addSessionPhoto(uuid, dataUri(jpegBytes(false)))).rejects.toBeInstanceOf(
      photos().SessionPhotosFullError,
    );
    await photos().removeSessionPhoto(ids[1] ?? "");
    const fourth = await photos().addSessionPhoto(uuid, dataUri(jpegBytes(false)));
    const all = rows(uuid);
    expect(all.map((r) => r.sortOrder)).toEqual([0, 1, 2, 3]);
    expect(all.find((r) => r.uuid === fourth)?.sortOrder).toBe(3);
    const removed = all.find((r) => r.uuid === ids[1]);
    expect(removed?.image.length).toBe(0);
    expect(removed?.deletedAt).not.toBeNull();
    expect((await photos().listSessionPhotos(uuid)).length).toBe(3);
  });

  test("photoSummaries, firstSessionPhoto and photosBytes read live rows only", async () => {
    const { uuid } = await session();
    const a = await photos().addSessionPhoto(uuid, dataUri(jpegBytes(false)));
    await photos().addSessionPhoto(uuid, dataUri(jpegBytes(false)));
    await photos().removeSessionPhoto(a);
    const summary = (await photos().photoSummaries([uuid, "nope"])).get(uuid);
    expect(summary?.count).toBe(1);
    expect(summary?.first).not.toBe(a);
    expect(await photos().firstSessionPhoto(uuid)).toBe(dataUri(jpegBytes(false)));
    expect(await photos().photosBytes()).toBeGreaterThanOrEqual(jpegBytes(false).length);
  });

  test("journalPhotoWidth gives 1080 on the long side and never upscales", () => {
    expect(photos().journalPhotoWidth(4000, 3000)).toBe(1080);
    expect(photos().journalPhotoWidth(3000, 4000)).toBe(810);
    expect(photos().journalPhotoWidth(800, 600)).toBe(800);
  });

  test("deleting a session removes its photos", async () => {
    const { id, uuid } = await session();
    await photos().addSessionPhoto(uuid, dataUri(jpegBytes(false)));
    expect(await completed().deleteSession(id)).toBe("deleted");
    expect(rows(uuid)).toHaveLength(0);
  });

  test("the journal version moves when a note or a photo changes", async () => {
    const { id, uuid } = await session();
    const v0 = await journal().getJournalVersion();
    await completed().updateSessionNotes(id, "a word");
    const v1 = await journal().getJournalVersion();
    expect(v1).not.toBe(v0);
    const p = await photos().addSessionPhoto(uuid, dataUri(jpegBytes(false)));
    const v2 = await journal().getJournalVersion();
    expect(v2).not.toBe(v1);
    await photos().removeSessionPhoto(p);
    expect(await journal().getJournalVersion()).not.toBe(v2);
  });

  test("updateSessionNotes trims, stamps, grows the stamp, clears, and refuses 501 characters", async () => {
    const { id } = await session();
    const stamp = () =>
      t.sqlite
        .prepare("SELECT notesEditedAt AS s, notes FROM completed_sessions WHERE id = ?")
        .get(id) as {
        s: number;
        notes: string;
      };
    await completed().updateSessionNotes(id, "  first  ");
    const one = stamp();
    expect(one.notes).toBe("first");
    await completed().updateSessionNotes(id, "second");
    expect(stamp().s).toBeGreaterThan(one.s);
    await completed().updateSessionNotes(id, "");
    expect(stamp().notes).toBe("");
    await expect(completed().updateSessionNotes(id, "x".repeat(501))).rejects.toThrow();
    await completed().updateSessionNotes(id, "x".repeat(500));
  });
});
