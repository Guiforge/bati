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
import { UUID_V7_RE } from "@/db/uuid";

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

/** Why a file was refused, as a key under `quests.import_*` the screen can say. */
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
      image: quest.imagePath,
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
  const stem = quest.enTitle.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "quest";
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

function text(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string" || value.length > max) throw new QuestFileError("not_a_quest");
  return value;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new QuestFileError("not_a_quest");
  // The writers clamp every number to its range (`createQuestTemplate`, `createUserExercise`);
  // this only makes sure it is one.
  return Math.round(value);
}

/** A uuid v7, lowercase, as `db/uuid.ts` writes them: the key of a row, so nothing looser. */
function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_V7_RE.test(value)) throw new QuestFileError("not_a_quest");
  return value;
}

function oneOf<T extends string>(values: readonly T[], value: unknown): T {
  if (!values.includes(value as T)) throw new QuestFileError("not_a_quest");
  return value as T;
}

function text4(value: unknown): Text4 {
  if (!isRecord(value)) throw new QuestFileError("not_a_quest");
  const en = text(value.en);
  // A missing translation reads as English, as every untranslated seed row already does.
  const or = (v: unknown) => (v === undefined || v === "" ? en : text(v));
  return { en, fr: or(value.fr), de: or(value.de), es: or(value.es) };
}

/**
 * A picture from someone else's phone: a JPEG, PNG or WebP carried in the file, or the name of a
 * picture this app ships. Never a URL, which `getExerciseAsset` would fetch. A quest arriving
 * with `https://` art would turn its every display into a request to a stranger's server, a
 * tracking pixel the privacy policy promises does not exist; `file:` and `content:` would point
 * at whatever is on this phone. Anything else becomes the placeholder.
 */
export function safeImage(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_IMAGE_CHARS) return null;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) return value;
  if (/^[A-Za-z0-9_\-./]+$/.test(value) && !value.includes("..")) return value;
  return null;
}

function ownMovement(value: unknown): OwnMovement {
  if (!isRecord(value)) throw new QuestFileError("not_a_quest");
  if (!Array.isArray(value.muscles)) throw new QuestFileError("not_a_quest");
  return {
    uuid: uuid(value.uuid),
    name: text(value.name, 120),
    description: text(value.description),
    image: safeImage(value.image) ?? "assets/placeholder.jpg",
    muscles: [...new Set(value.muscles.map((m) => oneOf(muscleCodes, m)))],
    style: oneOf(exerciseStyles, value.style),
    difficulty: oneOf(difficultyCodes, value.difficulty),
    equipment: oneOf(equipmentCodes, value.equipment),
    pattern: value.pattern == null ? null : oneOf(movementPatterns, value.pattern),
    measure: value.measure == null ? null : oneOf(questTargetTypes, value.measure),
    secondsPerRep: count(value.secondsPerRep),
  };
}

function slot(value: unknown): Slot {
  if (!isRecord(value) || !isRecord(value.movement) || !isRecord(value.target)) {
    throw new QuestFileError("not_a_quest");
  }
  const movement =
    "official" in value.movement
      ? { official: text(value.movement.official, 120) }
      : { own: ownMovement(value.movement.own) };
  const min = count(value.target.min);
  const max = count(value.target.max);
  return {
    movement,
    target: {
      type: oneOf(questTargetTypes, value.target.type),
      min: Math.min(min, max),
      max: Math.max(min, max),
    },
  };
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
  if (typeof data.version !== "number" || data.version > VERSION) throw new QuestFileError("newer");
  if (!Array.isArray(data.slots) || data.slots.length === 0 || data.slots.length > MAX_SLOTS) {
    throw new QuestFileError("not_a_quest");
  }
  const q = data.quest;
  return {
    kind: KIND,
    version: VERSION,
    quest: {
      uuid: uuid(q.uuid),
      title: text4(q.title),
      description: text4(q.description),
      rounds: count(q.rounds),
      restSeconds: count(q.restSeconds),
      roundRestSeconds: q.roundRestSeconds == null ? null : count(q.roundRestSeconds),
      image: safeImage(q.image),
    },
    slots: data.slots.map(slot),
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
 */
export async function importQuest(file: QuestFile): Promise<ImportedQuest> {
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
 * Opens the file picker and reads what the hero chose. Null when they backed out.
 *
 * `*` and not `application/json`: a file that went through a chat app often comes back typed as
 * `application/octet-stream`, and Android's picker greys out what does not match.
 */
export async function pickQuestFile(): Promise<QuestFile | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ["*/*"] });
  if (picked.canceled || !picked.result) return null;
  const file = picked.result;
  // A provider that reports no size is refused too: `text()` would read whatever it is whole.
  if (file.size == null || file.size > MAX_FILE_BYTES) throw new QuestFileError("not_a_quest");
  return parseQuestFile(await file.text());
}
