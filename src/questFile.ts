import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { transactionOrFallback } from "@/db/client";
import {
  createUserExercise,
  type Exercise,
  invalidateExercisesCache,
  isUserExercise,
  listExercises,
  officialByName,
  SECONDS_PER_REP_RANGE,
  unretireUserExercise,
} from "@/db/exercises";
import {
  createQuestTemplate,
  getQuestTemplateById,
  invalidateQuestTemplates,
  isUserQuest,
  listQuestTemplates,
  type QuestSlotDraft,
  type QuestTemplate,
  USER_QUEST_AUTHOR,
  updateQuestMeta,
  writeQuestSlots,
} from "@/db/quests";
import {
  difficultyCodes,
  equipmentCodes,
  exerciseStyles,
  movementPatterns,
  muscleCodes,
  questTargetTypes,
} from "@/db/schema";
import { clampToRange, REST_RANGE, ROUNDS_RANGE, type Target, targetRangeFor } from "@/db/targets";
import { UUID_V7_RE, uuidv7 } from "@/db/uuid";
import { NON_REP_STYLE } from "@/db/workUnits";

/**
 * A quest the hero wrote, as a file another phone can open.
 *
 * A file and not a link or a QR code: a hero's own movement carries its photo in the row
 * (`src/exercisePhoto.ts`, about 40 KB), and a QR code holds three. The share sheet carries it to
 * a chat, a mail or a drive, and the receiving hero imports it from the quest editor.
 *
 * Seed movements travel by their English name and are found again in the receiving catalogue
 * (`officialByName`, seed rows only); the hero's own travel whole, photo included, and land as
 * that phone's hero's own. The file holds nothing else: no session, no history, no name of the
 * hero who sent it.
 *
 * The quest and every hero movement travel with their uuid (0066), the name they keep across
 * phones. A second import of the same quest updates it in place, and a movement the receiver
 * already has is the one the slot points at, renamed or not.
 */
const KIND = "bati-quest";
const VERSION = 1;
/** Ten times a resized photo: room for a big one, not for a file built to fill a phone. */
const MAX_IMAGE_CHARS = 400_000;
const MAX_TEXT = 2_000;
/** A title or a movement name: longer than any seed one, short enough for a card and a file name. */
const MAX_NAME = 120;
/** Twice the editor's own photos (`MAX_PHOTO_WIDTH`): 4 MB decoded at most, per picture. */
const MAX_IMAGE_SIDE = 1_024;
const MAX_SLOTS = 40;
const MAX_FILE_BYTES = 8_000_000;

type Text4 = { en: string; fr: string; de: string; es: string };

type OwnMovement = {
  uuid: string;
  name: string;
  description: string;
  image: string;
  muscles: Exercise["muscles"];
  style: Exercise["style"];
  difficulty: Exercise["difficulty"];
  equipment: Exercise["equipment"];
  pattern: Exercise["pattern"];
  measure: Exercise["measure"];
  secondsPerRep: number;
};

type Slot = {
  movement: { official: string } | { own: OwnMovement };
  target: {
    type: QuestTemplate["exercises"][number]["baseTarget"]["type"];
    min: number;
    max: number;
  };
};

export type QuestFile = {
  kind: typeof KIND;
  version: typeof VERSION;
  quest: {
    uuid: string;
    title: Text4;
    description: Text4;
    rounds: number;
    restSeconds: number;
    roundRestSeconds: number | null;
    image: string | null;
  };
  slots: Slot[];
};

/**
 * Every reason a file is refused. The import button says each one as `quests.import_<reason>`, so
 * the list is a value and not only a type: a test holds each against the four locales, and a
 * reason renamed here without its sentence would show the hero a raw key.
 */
export const QUEST_FILE_REFUSALS = [
  "unreadable",
  "not_a_quest",
  "newer",
  "unknown_movement",
] as const;

export class QuestFileError extends Error {
  readonly reason: (typeof QUEST_FILE_REFUSALS)[number];
  constructor(reason: QuestFileError["reason"]) {
    super(`Quest file refused: ${reason}`);
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

/**
 * Throws on a hero row with no uuid: after 0066 only a row written in raw SQL (a dev seed) lacks
 * one, and a file without it could never be recognised on a second import.
 */
function nameOf(uuid: string | null, what: string): string {
  if (uuid === null) throw new Error(`${what} has no uuid to travel under`);
  return uuid;
}

export function questToFile(quest: QuestTemplate, catalogue: readonly Exercise[]): QuestFile {
  const byId = new Map(catalogue.map((e) => [e.id, e]));
  return {
    kind: KIND,
    version: VERSION,
    quest: {
      uuid: nameOf(quest.uuid, `Quest ${quest.id}`),
      title: { en: quest.enTitle, fr: quest.frTitle, de: quest.deTitle, es: quest.esTitle },
      description: {
        en: quest.enDescription,
        fr: quest.frDescription,
        de: quest.deDescription,
        es: quest.esDescription,
      },
      rounds: quest.rounds,
      restSeconds: quest.restSeconds,
      roundRestSeconds: quest.roundRestSeconds,
      // `questHead` reads a coverless quest as the placeholder; it travels as no cover at all.
      image: quest.imagePath === "assets/placeholder.jpg" ? null : quest.imagePath,
    },
    slots: quest.exercises.flatMap((slot) => {
      const ex = byId.get(slot.exerciseId);
      if (!ex) return [];
      const movement = isUserExercise(ex)
        ? {
            own: {
              uuid: nameOf(ex.uuid, `Exercise ${ex.id}`),
              // A hero writes in one language and the row repeats it in all four.
              name: ex.enName,
              description: ex.enDescription,
              image: ex.imagePath,
              muscles: ex.muscles,
              style: ex.style,
              difficulty: ex.difficulty,
              equipment: ex.equipment,
              pattern: ex.pattern,
              measure: ex.measure,
              secondsPerRep: ex.secondsPerRep,
            },
          }
        : { official: ex.enName };
      return [{ movement, target: { ...slot.baseTarget } }];
    }),
  };
}

/** Writes the quest to a file and hands it to the share sheet. */
export async function shareQuest(questId: number): Promise<void> {
  const [quest, catalogue] = await Promise.all([getQuestTemplateById(questId), listExercises()]);
  if (!quest) throw new Error(`Quest ${questId} not found`);
  if (!(await Sharing.isAvailableAsync())) throw new Error("No share sheet available");

  // The title is the file name the receiver sees in their chat, so it says which quest it is.
  // Cut at 50 letters: a file name is 255 bytes on Android, and four-byte letters plus the
  // 16-byte suffix reach it at 60.
  const stem =
    [...quest.enTitle.replace(/[^\p{L}\p{N}]+/gu, "-")]
      .slice(0, 50)
      .join("")
      .replace(/^-|-$/g, "") || "quest";
  const file = new File(Paths.cache, `${stem}.bati-quest.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(questToFile(quest, catalogue)));

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: file.name,
    UTI: "public.json",
  });
}

// ---------------------------------------------------------------------------------------------
// Reading. Everything below reads a file from someone else, so nothing in it is trusted.
// ---------------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Characters that change how a text is drawn without being part of it: controls (Cc), and the
 * invisible format marks (Cf: zero-width spaces, bidi overrides, word joiners, BOM) that let a
 * title render reversed or a movement pass for a seed one. Line breaks and tabs are left to
 * `text()`. Kept: ZWNJ and ZWJ (U+200C, U+200D), which Persian, Indic scripts and emoji sequences
 * need. Tag characters go too: invisible after any letter, they let "Push-ups" plus a tail pass
 * for the seed name, and a subdivision flag is not worth that.
 */
const INVISIBLE = /(?!\n|\t|\u{200C}|\u{200D})[\p{Cc}\p{Cf}]/gu;

/**
 * A text from the file, cleaned, trimmed and cut to `max`. A title or a name is one line (`\n`
 * and `\t` become spaces); a description keeps its line breaks. Far past `max` is not a quest an
 * editor wrote, and is refused rather than cut.
 */
function text(value: unknown, max: number, multiline = false): string {
  if (typeof value !== "string" || value.length > max * 4) throw new QuestFileError("not_a_quest");
  const flat = multiline ? value : value.replace(/[\n\t]/g, " ");
  // By code point: a cut through a surrogate pair leaves half an emoji at the end.
  return [...flat.replace(INVISIBLE, "").trim()].slice(0, max).join("").trim();
}

/** A text the row cannot do without: an empty title or name is a file no editor wrote. */
function name(value: unknown, max = MAX_NAME): string {
  const clean = text(value, max);
  if (clean === "") throw new QuestFileError("not_a_quest");
  return clean;
}

/**
 * A number, held to the range the editors' steppers allow. The writers clamp again on the way in
 * (`createQuestTemplate`, `createUserExercise`); this is so the preview never shows a hero
 * "1000000 rounds" that the quest will not have.
 */
function count(value: unknown, range: { min: number; max: number }): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new QuestFileError("not_a_quest");
  return clampToRange(value, range);
}

/** A uuid v7, lowercase, as `db/uuid.ts` writes them: the key of a row, so nothing looser. */
function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_V7_RE.test(value)) throw new QuestFileError("not_a_quest");
  return value;
}

/**
 * A code from one of the app's lists. A string this version does not know is a list a newer one
 * grew, so the hero is told to update rather than that the file is not a quest.
 */
function oneOf<T extends string>(values: readonly T[], value: unknown): T {
  if (values.includes(value as T)) return value as T;
  throw new QuestFileError(typeof value === "string" ? "newer" : "not_a_quest");
}

/** Four translations of one text. The English one is required for a title, never for a description. */
function text4(value: unknown, max: number, required: boolean): Text4 {
  if (!isRecord(value)) throw new QuestFileError("not_a_quest");
  const read = (v: unknown) => (required ? text(v, max) : text(v, max, true));
  const en = required ? name(value.en, max) : read(value.en);
  // A missing translation reads as English, as every untranslated seed row already does.
  const or = (v: unknown) => (v === undefined ? en : read(v) || en);
  return { en, fr: or(value.fr), de: or(value.de), es: or(value.es) };
}

/**
 * Width and height of a JPEG, PNG or WebP, read from its header. Null when the header is not one
 * this reads, which `safeImage` treats as a picture it cannot vouch for.
 */
export function imageSize(bytes: Uint8Array): Size | null {
  const r = reader(bytes);
  if (r.ascii(0, 8) === "\x89PNG\r\n\x1a\n") return { width: r.u32be(16), height: r.u32be(20) };
  if (r.ascii(0, 4) === "RIFF" && r.ascii(8, 4) === "WEBP") return webpSize(r);
  if (r.at(0) === 0xff && r.at(1) === 0xd8) return jpegSize(r);
  return null;
}

type Size = { width: number; height: number };
type Reader = ReturnType<typeof reader>;

function reader(bytes: Uint8Array) {
  const at = (i: number) => bytes[i] ?? 0;
  const u16be = (i: number) => (at(i) << 8) | at(i + 1);
  const u16le = (i: number) => at(i) | (at(i + 1) << 8);
  return {
    length: bytes.length,
    at,
    u16be,
    u16le,
    u24le: (i: number) => u16le(i) | (at(i + 2) << 16),
    u32be: (i: number) => u16be(i) * 0x10000 + u16be(i + 2),
    ascii: (i: number, n: number) => String.fromCharCode(...bytes.subarray(i, i + n)),
  };
}

function webpSize(r: Reader): Size | null {
  const chunk = r.ascii(12, 4);
  if (chunk === "VP8 ") return { width: r.u16le(26) & 0x3fff, height: r.u16le(28) & 0x3fff };
  if (chunk === "VP8X") return { width: 1 + r.u24le(24), height: 1 + r.u24le(27) };
  if (chunk !== "VP8L") return null;
  const b = (i: number) => r.at(21 + i);
  return {
    width: 1 + (((b(1) & 0x3f) << 8) | b(0)),
    height: 1 + (((b(3) & 0xf) << 10) | (b(2) << 2) | ((b(1) & 0xc0) >> 6)),
  };
}

/** Segment by segment to the first frame header: SOF0 to SOF15, minus DHT, JPG and DAC. */
function jpegSize(r: Reader): Size | null {
  let i = 2;
  while (i + 9 < r.length && r.at(i) === 0xff) {
    const marker = r.at(i + 1);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: r.u16be(i + 7), height: r.u16be(i + 5) };
    }
    i += 2 + r.u16be(i + 2);
  }
  return null;
}

/**
 * A picture from someone else's phone: a JPEG, PNG or WebP carried in the file, or the name of a
 * picture this app ships. Never a URL, which `getExerciseAsset` would fetch. A quest arriving
 * with `https://` art would turn its every display into a request to a stranger's server, a
 * tracking pixel the privacy policy promises does not exist; `file:` and `content:` would point
 * at whatever is on this phone. Anything else becomes the placeholder.
 *
 * A carried picture is sized from its header too: a few hundred KB of PNG can be a 16000 px
 * square, a gigabyte of memory on every screen that draws it.
 */
export function safeImage(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_IMAGE_CHARS) return null;
  const data = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/.exec(value);
  if (data) {
    let size: ReturnType<typeof imageSize>;
    try {
      size = imageSize(Uint8Array.from(atob(data[1] ?? ""), (c) => c.charCodeAt(0)));
    } catch {
      return null;
    }
    if (!size || size.width < 1 || size.height < 1) return null;
    return size.width <= MAX_IMAGE_SIDE && size.height <= MAX_IMAGE_SIDE ? value : null;
  }
  if (/^[A-Za-z0-9_\-./]+$/.test(value) && !value.includes("..")) return value;
  return null;
}

function ownMovement(value: unknown): OwnMovement {
  if (!isRecord(value)) throw new QuestFileError("not_a_quest");
  if (!Array.isArray(value.muscles)) throw new QuestFileError("not_a_quest");
  return {
    uuid: uuid(value.uuid),
    name: name(value.name),
    description: text(value.description, MAX_TEXT, true),
    image: safeImage(value.image) ?? "assets/placeholder.jpg",
    // A muscle this version does not know is left out: the movement still trains the others.
    muscles: [...new Set(value.muscles.filter((m) => muscleCodes.includes(m)))],
    style: oneOf(exerciseStyles, value.style),
    difficulty: oneOf(difficultyCodes, value.difficulty),
    equipment: oneOf(equipmentCodes, value.equipment),
    // A pattern only groups movements in the picker, so one this version lacks reads as none.
    pattern: movementPatterns.find((p) => p === value.pattern) ?? null,
    measure: value.measure == null ? null : oneOf(questTargetTypes, value.measure),
    secondsPerRep: count(value.secondsPerRep, SECONDS_PER_REP_RANGE),
  };
}

function slot(value: unknown): Slot {
  if (!isRecord(value) || !isRecord(value.movement) || !isRecord(value.target)) {
    throw new QuestFileError("not_a_quest");
  }
  const own = "official" in value.movement ? null : ownMovement(value.movement.own);
  const movement: Slot["movement"] = own ? { own } : { official: name(value.movement.official) };
  const type = oneOf(questTargetTypes, value.target.type);
  // The widest range the type allows: a seed movement's style is only known on this phone, and
  // the writer narrows it then (`targetRangeFor`), as `previewQuest` does for the screen.
  const range = targetRangeFor(type, own?.style ?? NON_REP_STYLE);
  const min = count(value.target.min, range);
  const max = count(value.target.max, range);
  return { movement, target: { type, min: Math.min(min, max), max: Math.max(min, max) } };
}

/** The file's text, checked field by field. Throws a `QuestFileError` saying why it is refused. */
export function parseQuestFile(raw: string): QuestFile {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new QuestFileError("unreadable");
  }
  if (!isRecord(data) || data.kind !== KIND || !isRecord(data.quest)) {
    throw new QuestFileError("not_a_quest");
  }
  if (typeof data.version !== "number" || !Number.isInteger(data.version) || data.version < 1) {
    throw new QuestFileError("not_a_quest");
  }
  if (data.version > VERSION) throw new QuestFileError("newer");
  if (!Array.isArray(data.slots) || data.slots.length === 0 || data.slots.length > MAX_SLOTS) {
    throw new QuestFileError("not_a_quest");
  }
  const q = data.quest;
  return {
    kind: KIND,
    version: VERSION,
    quest: {
      uuid: uuid(q.uuid),
      title: text4(q.title, MAX_NAME, true),
      description: text4(q.description, MAX_TEXT, false),
      rounds: count(q.rounds, ROUNDS_RANGE),
      restSeconds: count(q.restSeconds, REST_RANGE),
      roundRestSeconds: q.roundRestSeconds == null ? null : count(q.roundRestSeconds, REST_RANGE),
      image: safeImage(q.image),
    },
    slots: data.slots.map(slot),
  };
}

/** One slot of a file, as the preview shows it: the movement it lands on, if this phone has it. */
export type PreviewSlot = {
  /** The seed movement, or the hero's own copy already here. Null for one the file brings. */
  exercise: Exercise | null;
  /** False for a seed movement this version does not have: it cannot be imported. */
  available: boolean;
  /** The target as it will be written: the file's, in the range of the movement it lands on. */
  target: Target;
};

export type QuestPreview = {
  slots: PreviewSlot[];
  /** The hero's own quest this file would update, when it carries that quest's uuid. */
  existing: QuestTemplate | null;
};

/**
 * What an import would do, read before it does it. The preview screen shows it so a hero sees a
 * quest that replaces one of theirs before it does, and can leave out a movement this version
 * lacks instead of being refused the whole quest.
 */
export async function previewQuest(file: QuestFile): Promise<QuestPreview> {
  const [catalogue, templates] = await Promise.all([listExercises(), listQuestTemplates()]);
  return {
    slots: file.slots.map((s) => {
      const target = (style: Exercise["style"] | undefined) => ({
        type: s.target.type,
        value: clampToRange(s.target.max, targetRangeFor(s.target.type, style)),
      });
      if ("official" in s.movement) {
        const official = officialByName(catalogue, s.movement.official) ?? null;
        return {
          exercise: official,
          available: official !== null,
          target: target(official?.style),
        };
      }
      const own = s.movement.own;
      const here = catalogue.find((e) => isUserExercise(e) && e.uuid === own.uuid) ?? null;
      return { exercise: here, available: true, target: target(here?.style ?? own.style) };
    }),
    existing: templates.find((q) => isUserQuest(q) && q.uuid === file.quest.uuid) ?? null,
  };
}

/** What the hero changed on the preview before importing. */
export type QuestFileEdits = {
  /** The title as shown, in the hero's language. */
  title: string;
  language: keyof Text4;
  /** One per slot of the file: false leaves that movement out. */
  keep: readonly boolean[];
  /** Import beside the hero's own copy instead of updating it. */
  asCopy: boolean;
};

/**
 * The file as the hero chose to import it. A retitled quest carries the new title in all four
 * languages, as a quest the hero wrote does; an untouched one keeps the sender's translations.
 */
export function editQuestFile(file: QuestFile, edits: QuestFileEdits): QuestFile {
  const title = [...edits.title.replace(INVISIBLE, "").trim()].slice(0, MAX_NAME).join("");
  const renamed = title !== "" && title !== file.quest.title[edits.language];
  return {
    ...file,
    quest: {
      ...file.quest,
      uuid: edits.asCopy ? uuidv7() : file.quest.uuid,
      title: renamed ? { en: title, fr: title, de: title, es: title } : file.quest.title,
    },
    slots: file.slots.filter((_, i) => edits.keep[i] === true),
  };
}

/** What an import did: the quest's id, and whether it was already here and has been updated. */
export type ImportedQuest = { id: number; updated: boolean };

/**
 * Writes the quest, and the movements it brings, as this phone's hero's own.
 *
 * Recognised by uuid, never by name. A quest already here (imported before, or the hero's own
 * sent back to them) is updated in place, so its id, its history and its place in the gallery
 * stay. A movement already here is the one the slot points at and is left as it is: the receiver
 * may have edited their copy, and the file has no say over it. A retired one comes back, since
 * the hero is choosing it again.
 *
 * Every seed movement is checked before anything is written, and the writes run in one
 * transaction (`transactionOrFallback`): a file naming a movement this version lacks, or a write
 * that fails halfway, leaves no movement without its quest.
 *
 * A file that borrows the uuid of a quest the receiver wrote overwrites that quest. Only someone
 * who was sent it could know it, and the update is what a second import of that quest is for.
 * The preview (`app/quest-import.tsx`) says so before it happens and offers a copy instead.
 *
 * A file emptied of every slot is refused: a quest with no movement cannot be started.
 */
export async function importQuest(file: QuestFile): Promise<ImportedQuest> {
  if (file.slots.length === 0) throw new QuestFileError("not_a_quest");
  const [catalogue, templates] = await Promise.all([listExercises(), listQuestTemplates()]);

  const officials = file.slots.map((s) =>
    "official" in s.movement ? officialByName(catalogue, s.movement.official) : undefined,
  );
  if (file.slots.some((s, i) => "official" in s.movement && !officials[i])) {
    throw new QuestFileError("unknown_movement");
  }

  const mine = new Map(
    catalogue.flatMap((e) => (isUserExercise(e) && e.uuid !== null ? [[e.uuid, e] as const] : [])),
  );
  const existing = templates.find((q) => isUserQuest(q) && q.uuid === file.quest.uuid);
  const q = file.quest;
  const head = {
    enTitle: q.title.en,
    frTitle: q.title.fr,
    deTitle: q.title.de,
    esTitle: q.title.es,
    enDescription: q.description.en,
    frDescription: q.description.fr,
    deDescription: q.description.de,
    esDescription: q.description.es,
    rounds: q.rounds,
    restSeconds: q.restSeconds,
    roundRestSeconds: q.roundRestSeconds,
    imagePath: q.image,
  };

  const write = transactionOrFallback(async (tx) => {
    // A file naming one movement twice gets one row, not two.
    const written = new Map<string, number>();
    const slots: QuestSlotDraft[] = [];
    for (const [i, s] of file.slots.entries()) {
      const official = officials[i];
      if (official) {
        slots.push({
          exerciseId: official.id,
          images: [],
          baseTarget: s.target,
          style: official.style,
        });
        continue;
      }
      if (!("own" in s.movement)) continue;
      const own = s.movement.own;
      const here = mine.get(own.uuid);
      if (here?.retiredAt) await unretireUserExercise(here.id, tx);
      const exerciseId =
        written.get(own.uuid) ??
        here?.id ??
        (await createUserExercise(
          {
            name: own.name,
            description: own.description,
            imagePath: own.image,
            muscles: own.muscles,
            style: own.style,
            difficulty: own.difficulty,
            equipment: own.equipment,
            pattern: own.pattern,
            measure: own.measure,
            secondsPerRep: own.secondsPerRep,
          },
          { uuid: own.uuid, exec: tx },
        ));
      written.set(own.uuid, exerciseId);
      slots.push({ exerciseId, images: [], baseTarget: s.target, style: here?.style ?? own.style });
    }

    if (existing) {
      await updateQuestMeta(existing.id, head, tx);
      await writeQuestSlots(tx, existing.id, slots);
      return existing.id;
    }
    return createQuestTemplate(
      { ...head, author: USER_QUEST_AUTHOR, uuid: q.uuid, exercises: slots },
      tx,
    );
  });

  // After the transaction, whatever its outcome: the writers invalidate as they go, so a read in
  // between may have cached rows a rollback then took back.
  const id = await write.finally(() => {
    invalidateExercisesCache();
    invalidateQuestTemplates();
  });
  return { id, updated: existing !== undefined };
}

/**
 * Reads a quest file at `uri`: one the picker returned, or one another app opened Bati with (a
 * `content://` from a chat or from Files). Read at once, the grant to a
 * `content://` lasts as long as the activity that received it.
 */
export async function readQuestFile(uri: string): Promise<QuestFile> {
  // A provider's URI only. Both doors hand one over (the picker and a tapped file), and a path
  // into the filesystem could be `/dev/zero`, which reports no size and never ends.
  // ponytail: Android only. iOS's picker hands over a `file://` copy, which this refuses; the
  // day iOS ships, accept the picker's own copies here.
  if (!uri.startsWith("content://")) throw new QuestFileError("unreadable");
  const file = new File(uri);
  // A provider that reports no size gets its text measured instead, which costs one read.
  // ponytail: that read is unbounded when the provider lies about its size. The picker and the
  //           open-with door both hand over a real file; bound the read the day a provider that
  //           streams without a size shows up.
  if (file.size != null && file.size > MAX_FILE_BYTES) throw new QuestFileError("not_a_quest");
  const raw = await file.text();
  if (raw.length > MAX_FILE_BYTES) throw new QuestFileError("not_a_quest");
  return parseQuestFile(raw);
}

/**
 * Opens the file picker on any file and returns the one the hero chose. Null when they backed out.
 *
 * `*` and not `application/json`: a file that went through a chat app often comes back typed as
 * `application/octet-stream`, and Android's picker greys out what does not match.
 */
export async function pickQuestFile(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ["*/*"] });
  if (picked.canceled || !picked.result) return null;
  return picked.result.uri;
}
