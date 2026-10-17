import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, schema, transactionOrFallback } from "./client";
import { uuidv7 } from "./uuid";

const { sessionPhotos, completedQuest } = schema;

export const MAX_SESSION_PHOTOS = 3;
/** Longest side, in px (roadmap J-01). */
export const JOURNAL_PHOTO_SIDE = 1080;
/** A broken encode, not a photo: 1080 px at compress 0.6 is ~100-200 KB. */
const MAX_IMAGE_BYTES = 520_000;
const JPEG_PREFIX = "data:image/jpeg;base64,";

export class SessionPhotosFullError extends Error {}

/** The width `encodePhoto` needs so the longest side is `JOURNAL_PHOTO_SIDE`, never upscaling. */
export function journalPhotoWidth(width: number, height: number): number {
  const side = Math.max(width, height);
  return Math.max(1, Math.round(width * Math.min(1, JOURNAL_PHOTO_SIDE / side)));
}

/**
 * Whether a JPEG carries an APP1 `Exif` segment (camera, date, GPS). Walks the segment headers
 * from the start of the file to the start of the scan, where metadata cannot be any more.
 */
export function hasExif(jpeg: Uint8Array): boolean {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return false;
  let at = 2;
  while (at + 4 <= jpeg.length) {
    if (jpeg[at] !== 0xff) return false;
    const marker = jpeg[at + 1];
    if (marker === 0xda) return false;
    const length = ((jpeg[at + 2] ?? 0) << 8) | (jpeg[at + 3] ?? 0);
    if (marker === 0xe1) {
      const tag = String.fromCharCode(...Array.from(jpeg.subarray(at + 4, at + 8)));
      if (tag === "Exif") return true;
    }
    at += 2 + length;
  }
  return false;
}

function fromDataUri(dataUri: string): Uint8Array {
  const raw = atob(dataUri.slice(JPEG_PREFIX.length));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** The stored bytes as the data URI every image in the app is rendered from. */
export function toDataUri(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return `${JPEG_PREFIX}${btoa(binary)}`;
}

/** The live photos of a session, in order, as data URIs. */
export async function listSessionPhotos(
  sessionUuid: string,
): Promise<{ uuid: string; image: string }[]> {
  const rows = await db
    .select({ uuid: sessionPhotos.uuid, image: sessionPhotos.image })
    .from(sessionPhotos)
    .where(and(eq(sessionPhotos.sessionUuid, sessionUuid), isNull(sessionPhotos.deletedAt)))
    .orderBy(asc(sessionPhotos.sortOrder), asc(sessionPhotos.uuid));
  return rows.map((r) => ({ uuid: r.uuid, image: toDataUri(r.image) }));
}

/**
 * Store a photo `encodePhoto` produced. It is the write boundary: a data URI that is not a small
 * JPEG without EXIF is refused, and the fourth live photo is refused. Returns the new uuid.
 */
export async function addSessionPhoto(sessionUuid: string, dataUri: string): Promise<string> {
  if (!dataUri.startsWith(JPEG_PREFIX)) throw new Error("Photo is not a JPEG data URI");
  const bytes = fromDataUri(dataUri);
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Photo is too large");
  if (hasExif(bytes)) throw new Error("Photo still carries EXIF data");

  const uuid = uuidv7();
  await transactionOrFallback(async (tx) => {
    const [live] = await tx
      .select({ n: sql<number>`count(*)` })
      .from(sessionPhotos)
      .where(and(eq(sessionPhotos.sessionUuid, sessionUuid), isNull(sessionPhotos.deletedAt)));
    if ((live?.n ?? 0) >= MAX_SESSION_PHOTOS) throw new SessionPhotosFullError();
    // Removed rows count for the order, so a place is never reused.
    await tx.insert(sessionPhotos).values({
      uuid,
      sessionUuid,
      sortOrder: sql`(SELECT ifnull(max(sortOrder), -1) + 1 FROM session_photos WHERE sessionUuid = ${sessionUuid})`,
      image: bytes,
      updatedAt: sql`unixepoch()`,
    });
  });
  return uuid;
}

/**
 * Remove a photo and keep its row, emptied, for the other device. The stamp is never older than
 * the row it removes, as `nextEditStamp` and `deleted_content`: a phone whose clock runs ahead
 * cannot make a removal lose.
 */
export async function removeSessionPhoto(uuid: string): Promise<void> {
  await db
    .update(sessionPhotos)
    .set({
      image: new Uint8Array(0),
      deletedAt: sql`max(unixepoch(), ${sessionPhotos.updatedAt} + 1)`,
      updatedAt: sql`max(unixepoch(), ${sessionPhotos.updatedAt} + 1)`,
    })
    .where(and(eq(sessionPhotos.uuid, uuid), isNull(sessionPhotos.deletedAt)));
}

/** How many live photos each session has, in one query: a Journal page asks for all its cards. */
export async function photoCounts(uuids: string[]): Promise<Map<string, number>> {
  if (uuids.length === 0) return new Map();
  const rows = await db
    .select({ uuid: sessionPhotos.sessionUuid, n: sql<number>`count(*)` })
    .from(sessionPhotos)
    .where(
      and(
        sql`${sessionPhotos.sessionUuid} IN (${sql.join(
          uuids.map((u) => sql`${u}`),
          sql`, `,
        )})`,
        isNull(sessionPhotos.deletedAt),
      ),
    )
    .groupBy(sessionPhotos.sessionUuid);
  return new Map(rows.map((r) => [r.uuid, Number(r.n)]));
}

/**
 * The first live photo of a session, or null. The Journal card asks for one image, not three.
 */
export async function firstSessionPhoto(sessionUuid: string): Promise<string | null> {
  const [row] = await db
    .select({ image: sessionPhotos.image })
    .from(sessionPhotos)
    .where(and(eq(sessionPhotos.sessionUuid, sessionUuid), isNull(sessionPhotos.deletedAt)))
    .orderBy(asc(sessionPhotos.sortOrder), asc(sessionPhotos.uuid))
    .limit(1);
  return row ? toDataUri(row.image) : null;
}

/** Bytes of live photos. `length()` of a BLOB is read from the row header: no image is loaded. */
export async function photosBytes(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`total(length(${sessionPhotos.image}))` })
    .from(sessionPhotos)
    .where(isNull(sessionPhotos.deletedAt));
  return Number(row?.n ?? 0);
}

/** What the notebook shows for a session: its uuid (the photos' key) and its note. */
export async function readNotebook(
  sessionId: number,
): Promise<{ uuid: string | null; notes: string } | null> {
  const [row] = await db
    .select({ uuid: completedQuest.uuid, notes: completedQuest.notes })
    .from(completedQuest)
    .where(eq(completedQuest.id, sessionId))
    .limit(1);
  return row ?? null;
}
