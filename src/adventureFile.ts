import { ADVENTURE_ASSETS, type AdventureAssetKey } from "@/constants/assetMap";
import { invalidateAdventures } from "@/db/adventures";
import {
  BOSS_LINE_MOMENTS,
  clip,
  type HeroBossLines,
  MAX_BOSS_LINE,
  MAX_BOSS_LINES,
  MAX_BOSS_NAME,
  noBossLines,
} from "@/db/bossVoice";
import { type TransactionTx, transactionOrFallback } from "@/db/client";
import { invalidateExercisesCache, listExercises, officialByName } from "@/db/exercises";
import {
  fileHeroAdventure,
  findHeroAdventureByUuid,
  type HeroAdventureDraft,
  hasActiveRun,
  listMonsters,
  loadHeroAdventureDraft,
  MAX_DESCRIPTION,
  MAX_STEP_TEXT,
  MAX_STEPS,
  MAX_TITLE,
  MIN_STEPS,
  type Monster,
} from "@/db/heroAdventures";
import {
  getQuestTemplateById,
  invalidateQuestTemplates,
  isUserQuest,
  listQuestTemplates,
  type QuestTemplate,
} from "@/db/quests";
import { uuidv7 } from "@/db/uuid";
import { localizedTitle, seededLanguage } from "@/src/i18n/localized";
import {
  fileStem,
  isRecord,
  MAX_FILE_BYTES,
  name,
  parseQuestBody,
  parseQuestData,
  type QuestBody,
  type QuestFile,
  QuestFileError,
  questToFile,
  safeImage,
  shareJsonFile,
  text,
  uuid,
  writeImportedQuest,
} from "@/src/questFile";
import type { AppLanguage } from "@/stores/settings";

/**
 * An adventure the hero wrote, as a file another phone can open: a quest file with a cover, an end
 * and up to eight quests in it. A seed quest travels by its English title, a hero quest travels
 * whole (its own movements and their photos inside), exactly the `quest` + `slots` of a quest file.
 *
 * Nothing else travels: no run, no victory, no boss HP, weakness or resistance (recomputed from the
 * monster on arrival), no sort order, no sender, no date. The file is someone else's bytes on
 * arrival, so every field of it is read by name into a fresh object (`parseAdventureData`).
 */
const KIND = "bati-adventure";
/** 2 only when the file carries a boss's voice; a file without one is written as 1, so an older build opens it. */
const VERSION = 2;
/** A bundled art key or a boss key: never a path, never a URL. */
const KEY_RE = /^[a-z0-9_]{1,64}$/;
/** What a photo the file does not carry reads as, in the receiver's quest. */
const PLACEHOLDER = "assets/placeholder.jpg";

export type AdventureFile = {
  kind: typeof KIND;
  version: 1 | 2;
  adventure: {
    /** uuid v7, the row's `adventures.uuid`. */
    uuid: string;
    /** One text: the hero writes once, the row repeats it in four columns. */
    title: string;
    description: string;
    /**
     * An `ADVENTURE_ASSETS` key, never a picture. For an adventure with a photo cover it is the
     * bundled cover kept as the fallback, so a Bati that predates `photo` shows a real cover.
     */
    cover: string | null;
    /**
     * The hero's own cover photo, a `data:` image `safeImage` vouches for. Optional and read by
     * name, so an older version ignores it and a file without one is unchanged (still version 1 or 2:
     * a version 3 would have told older builds to update for a picture).
     */
    photo?: string;
    end:
      | { kind: "route" }
      | { kind: "boss"; monster: string; name?: string; lines?: HeroBossLines };
  };
  steps: {
    quest: { official: string } | { own: QuestBody };
    /** "Before you set out". */
    narrative: string;
    /** "On the way back". */
    outro: string;
  }[];
};

/** Every reason a file is refused. The screen says each one as `adventures.import_<reason>`. */
export const ADVENTURE_FILE_REFUSALS = [
  "unreadable",
  "not_an_adventure",
  "newer",
  "unknown_quest",
] as const;

export class AdventureFileError extends Error {
  readonly reason: (typeof ADVENTURE_FILE_REFUSALS)[number];
  constructor(reason: AdventureFileError["reason"]) {
    super(`Adventure file refused: ${reason}`);
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------------------------
// Reading. Everything below reads a file from someone else, so nothing in it is trusted.
// ---------------------------------------------------------------------------------------------

const FROM_QUEST_REASON: Record<QuestFileError["reason"], AdventureFileError["reason"]> = {
  unreadable: "unreadable",
  not_a_quest: "not_an_adventure",
  newer: "newer",
  unknown_movement: "not_an_adventure",
};

function key(value: unknown): string {
  if (typeof value !== "string" || !KEY_RE.test(value))
    throw new AdventureFileError("not_an_adventure");
  return value;
}

function step(value: unknown): AdventureFile["steps"][number] {
  if (!isRecord(value) || !isRecord(value.quest)) throw new AdventureFileError("not_an_adventure");
  const q = value.quest;
  const official = Object.hasOwn(q, "official");
  if (official === Object.hasOwn(q, "own")) throw new AdventureFileError("not_an_adventure");
  return {
    quest: official ? { official: name(q.official) } : { own: parseQuestBody(q.own) },
    narrative: clip(text(value.narrative, MAX_STEP_TEXT, true), MAX_STEP_TEXT),
    outro: clip(text(value.outro, MAX_STEP_TEXT, true), MAX_STEP_TEXT),
  };
}

function end(value: unknown): AdventureFile["adventure"]["end"] {
  if (!isRecord(value) || typeof value.kind !== "string")
    throw new AdventureFileError("not_an_adventure");
  if (value.kind === "route") return { kind: "route" };
  // A kind this version lacks is a newer Bati's.
  if (value.kind !== "boss") throw new AdventureFileError("newer");
  // A well-formed key this version lacks is kept and handled at preview: it arrives as a route.
  const boss: Extract<AdventureFile["adventure"]["end"], { kind: "boss" }> = {
    kind: "boss",
    monster: key(value.monster),
  };
  // Set only when present, so `parse(write(a))` still equals `write(a)` for a file without a voice.
  if (value.name !== undefined) boss.name = clip(text(value.name, MAX_BOSS_NAME), MAX_BOSS_NAME);
  if (value.lines !== undefined) boss.lines = lines(value.lines);
  return boss;
}

function lines(value: unknown): HeroBossLines {
  if (!isRecord(value)) throw new AdventureFileError("not_an_adventure");
  const out = noBossLines();
  // Unknown moments (a later `resist`) are ignored.
  for (const m of BOSS_LINE_MOMENTS) {
    const list = value[m];
    if (list === undefined) continue;
    if (!Array.isArray(list)) throw new AdventureFileError("not_an_adventure");
    // Cut before reading any element: a long array costs nothing, and a later Bati may allow more.
    out[m] = list
      .slice(0, MAX_BOSS_LINES)
      .map((item) => clip(text(item, MAX_BOSS_LINE), MAX_BOSS_LINE))
      .filter(Boolean);
  }
  return out;
}

function read(data: unknown): AdventureFile {
  if (!isRecord(data) || data.kind !== KIND || !isRecord(data.adventure)) {
    throw new AdventureFileError("not_an_adventure");
  }
  if (typeof data.version !== "number" || !Number.isInteger(data.version) || data.version < 1) {
    throw new AdventureFileError("not_an_adventure");
  }
  if (data.version > VERSION) throw new AdventureFileError("newer");
  // The length is read before any element, so a million-element array costs nothing.
  if (!Array.isArray(data.steps) || data.steps.length < MIN_STEPS) {
    throw new AdventureFileError("not_an_adventure");
  }
  // A later Bati may raise the cap.
  if (data.steps.length > MAX_STEPS) throw new AdventureFileError("newer");
  const a = data.adventure;
  return {
    kind: KIND,
    version: data.version as 1 | 2,
    adventure: {
      uuid: uuid(a.uuid),
      title: clip(name(a.title, MAX_TITLE), MAX_TITLE),
      description: clip(text(a.description, MAX_DESCRIPTION, true), MAX_DESCRIPTION),
      // A well-formed key this version lacks is a newer Bati's art (default cover on import); a
      // URL, a picture or a path is no Bati's file.
      cover: a.cover === null ? null : key(a.cover),
      ...coverPhoto(a.photo),
      end: end(a.end),
    },
    steps: data.steps.map(step),
  };
}

/** A photo that is not a vouched-for `data:` image is dropped, never a reason to refuse the file: the cover key stands. */
function coverPhoto(value: unknown): { photo?: string } {
  const photo = safeImage(value);
  return photo?.startsWith("data:") ? { photo } : {};
}

/** A parsed JSON value, checked field by field. Throws an `AdventureFileError` saying why it is refused. */
export function parseAdventureData(data: unknown): AdventureFile {
  try {
    return read(data);
  } catch (error) {
    // The quest readers speak `QuestFileError`; anything else is a bug and goes up untouched.
    if (error instanceof QuestFileError)
      throw new AdventureFileError(FROM_QUEST_REASON[error.reason]);
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

export type AdventureToFile = {
  file: AdventureFile;
  /** The exact string that was read back and that `shareAdventure` writes. */
  json: string;
  /** Distinct pictures in the file, quest covers included. */
  photos: number;
  /** Distinct pictures that are not in the file: too big for the budget, or the reader would drop them. */
  leftOut: number;
  /** Steps of the adventure that are not in the file: their quest is gone, or the reader would refuse it. */
  stepsLeft: number;
};

const utf8Length = (s: string) => new TextEncoder().encode(s).length;

type Picture = { stored: string; cover: boolean; refs: { image: string | null }[] };

/** The end as the file carries it: version 2 only with a voice, so a file without one opens on an older build. */
function fileEnd({ end, voice }: HeroAdventureDraft): Pick<AdventureFile, "version"> & {
  end: AdventureFile["adventure"]["end"];
} {
  const voiced =
    end.kind === "boss" &&
    (voice.name !== "" || BOSS_LINE_MOMENTS.some((m) => voice.lines[m].length > 0));
  return voiced
    ? { version: 2, end: { ...end, name: voice.name, lines: voice.lines } }
    : { version: 1, end };
}

/**
 * The hero's adventure as the file another phone reads, or null when fewer than two steps can
 * travel. Bati never writes a file its own reader would refuse (R125): each hero quest goes
 * through `parseQuestBody` and is written as parsed, a step that fails stays out and is counted,
 * photos go in under a byte budget charged per occurrence, one `safeImage` would drop is never
 * sent, and the string is read back by `parseAdventureData` before it is returned.
 */
export async function adventureToFile(id: number): Promise<AdventureToFile | null> {
  const draft = await loadHeroAdventureDraft(id);
  if (!draft?.uuid)
    throw new Error(`Adventure ${id} is not an adventure of the hero, or has no uuid`);
  const [templates, catalogue] = await Promise.all([listQuestTemplates(), listExercises()]);
  const byId = new Map(templates.map((q) => [q.id, q]));

  const steps: AdventureFile["steps"] = [];
  // Keyed by the quest uuid for a cover and the movement uuid for a movement, in order of first
  // appearance: step order, the cover, then the slots.
  const pictures = new Map<string, Picture>();
  let stepsLeft = 0;

  for (const s of draft.steps) {
    const quest = byId.get(s.questId);
    if (!quest) {
      stepsLeft += 1;
      continue;
    }
    if (!isUserQuest(quest)) {
      steps.push({ quest: { official: quest.enTitle }, narrative: s.narrative, outro: s.outro });
      continue;
    }
    const own = ownBody(quest, catalogue);
    if (!own) {
      // What the receiver would refuse (a text past 4x its limit, 0 slots) stays out and is counted.
      stepsLeft += 1;
      continue;
    }
    registerPictures(pictures, own);
    steps.push({ quest: { own: own.body }, narrative: s.narrative, outro: s.outro });
  }
  if (steps.length < MIN_STEPS) return null;

  const { end, version } = fileEnd(draft);
  const ownPhoto = draft.imagePath.startsWith("data:") ? draft.imagePath : null;
  const file: AdventureFile = {
    kind: KIND,
    version,
    adventure: {
      uuid: draft.uuid,
      title: draft.title,
      description: draft.description,
      ...fileCover(draft.imagePath),
      end,
    },
    steps,
  };

  const { photos, leftOut } = putPicturesBack(file, withCoverPhoto(file, ownPhoto, pictures));

  const json = JSON.stringify(file);
  try {
    parseAdventureData(JSON.parse(json));
  } catch (error) {
    const reason = error instanceof AdventureFileError ? error.reason : String(error);
    throw new Error(`adventure file fails its own reader: ${reason}`);
  }
  return { file, json, photos, leftOut, stepsLeft };
}

export type QuestToShare = { file: QuestFile; json: string; photos: number; leftOut: number };

/**
 * A hero quest as the file another phone reads, held to the same rules as an adventure's (R125):
 * parsed as its receiver would, photos under the byte budget, the string read back before it is
 * returned. Throws when the receiver's reader would refuse the quest.
 */
export async function questToShare(questId: number): Promise<QuestToShare> {
  const [quest, catalogue] = await Promise.all([getQuestTemplateById(questId), listExercises()]);
  if (!quest || !isUserQuest(quest)) throw new Error(`Quest ${questId} is not a quest of the hero`);
  const own = ownBody(quest, catalogue);
  if (!own) throw new Error(`Quest ${questId} would be refused by its own reader`);
  const pictures = new Map<string, Picture>();
  registerPictures(pictures, own);
  const file: QuestFile = { kind: "bati-quest", version: 1, ...own.body };
  const { photos, leftOut } = putPicturesBack(file, pictures);
  const json = JSON.stringify(file);
  parseQuestData(JSON.parse(json));
  return { file, json, photos, leftOut };
}

/** A photo rides in `photo`, under the placeholder until the budget decides; `cover` keeps a bundled key an older version can draw. */
function fileCover(imagePath: string): Pick<AdventureFile["adventure"], "cover" | "photo"> {
  if (!imagePath.startsWith("data:")) return { cover: imagePath };
  return { cover: Object.keys(ADVENTURE_ASSETS)[0] ?? null, photo: PLACEHOLDER };
}

/**
 * The pictures to put back, the adventure's own photo first: it is the image seen first, so it is
 * the last to be left out. A photo that does not fit is dropped from `photo`, and `cover` stands.
 */
function withCoverPhoto(
  file: AdventureFile,
  photo: string | null,
  pictures: ReadonlyMap<string, Picture>,
): ReadonlyMap<string, Picture> {
  if (!photo) return pictures;
  const ref: Picture["refs"][number] = {
    get image() {
      return file.adventure.photo ?? null;
    },
    set image(value: string | null) {
      if (value === null) delete file.adventure.photo;
      else file.adventure.photo = value;
    },
  };
  return new Map([
    [`adventure:${file.adventure.uuid}`, { stored: photo, cover: true, refs: [ref] }],
    ...pictures,
  ]);
}

/**
 * A hero quest as the receiver's reader would return it, its pictures set aside under the
 * placeholder, or null when that reader would refuse it.
 */
function ownBody(
  quest: QuestTemplate,
  catalogue: Awaited<ReturnType<typeof listExercises>>,
): { body: QuestBody; aside: { key: string; stored: string; slot: number | "cover" }[] } | null {
  const raw = questToFile(quest, catalogue);
  const aside: { key: string; stored: string; slot: number | "cover" }[] = [];
  if (raw.quest.image?.startsWith("data:")) {
    aside.push({ key: `quest:${raw.quest.uuid}`, stored: raw.quest.image, slot: "cover" });
    raw.quest.image = PLACEHOLDER;
  }
  for (const [slot, { movement }] of raw.slots.entries()) {
    if ("own" in movement && movement.own.image.startsWith("data:")) {
      aside.push({ key: movement.own.uuid, stored: movement.own.image, slot });
      movement.own.image = PLACEHOLDER;
    }
  }
  try {
    return { body: parseQuestBody(raw), aside };
  } catch (error) {
    if (error instanceof QuestFileError) return null;
    throw error;
  }
}

/** Puts each picture back in every occurrence while the file stays under the limit, in step order. */
function putPicturesBack(
  file: object,
  pictures: ReadonlyMap<string, Picture>,
): { photos: number; leftOut: number } {
  // The budget is exact: a picture replaces the placeholder inside the same quotes, and base64 is
  // ASCII that JSON does not escape, so each replacement adds `length - PLACEHOLDER.length` bytes.
  const base = utf8Length(JSON.stringify(file));
  if (base > MAX_FILE_BYTES) throw new Error("adventure file is over the limit before any photo");
  let budget = MAX_FILE_BYTES - base;
  let photos = 0;
  let leftOut = 0;
  for (const { stored, cover, refs } of pictures.values()) {
    // A picture the reader would drop is not sent, not charged and not counted as sent.
    const cost = (stored.length - PLACEHOLDER.length) * refs.length;
    if (safeImage(stored) !== null && cost <= budget) {
      for (const r of refs) r.image = stored;
      budget -= cost;
      photos += 1;
      continue;
    }
    leftOut += 1;
    // A cover left out reads as no cover at all, as `questToFile` writes a quest without one.
    if (cover) for (const r of refs) r.image = null;
  }

  return { photos, leftOut };
}

/** Remembers each set-aside picture, and every parsed object that must hold it again. */
function registerPictures(
  pictures: Map<string, Picture>,
  own: NonNullable<ReturnType<typeof ownBody>>,
) {
  for (const { key, stored, slot } of own.aside) {
    // `parseQuestBody` builds new objects, and keeps the slots in order.
    const owner = slot === "cover" ? own.body.quest : ownOf(own.body, slot);
    const picture = pictures.get(key) ?? { stored, cover: slot === "cover", refs: [] };
    picture.refs.push(owner);
    pictures.set(key, picture);
  }
}

function ownOf(body: QuestBody, slot: number): { image: string | null } {
  const movement = body.slots[slot]?.movement;
  if (!movement || !("own" in movement)) throw new Error("A set-aside picture lost its movement");
  return movement.own;
}

/** Writes the file `adventureToFile` returned and hands it to the share sheet. */
export async function shareAdventure(json: string, title: string): Promise<void> {
  await shareJsonFile(`${fileStem(title, "adventure")}.bati-adventure.json`, json);
}

// ---------------------------------------------------------------------------------------------
// Preview and import
// ---------------------------------------------------------------------------------------------

export type StepPreview = {
  /** here: the quest is on this phone. brings: the file carries it. missing: this version lacks it. */
  status: "here" | "brings" | "missing";
  /** The local quest, when it is here. */
  questId: number | null;
  /** The local title (localized) or the file's, in the hero's language. */
  title: string;
};

export type AdventurePreview = {
  steps: StepPreview[];
  /** The hero's adventure with this uuid, retired included. */
  existing: { id: number; title: string } | null;
  /** A run of `existing` is under way: it arrives as a copy, forced. */
  running: boolean;
  /** Null for a route. */
  monster: Monster | null;
  /** A boss this version lacks: it arrives as a route. */
  monsterUnknown: boolean;
};

type StepStatus = { status: StepPreview["status"]; quest: QuestTemplate | null };

/** One reading for the preview and the import, so they cannot disagree. */
function stepStatuses(
  file: AdventureFile,
  catalogue: Awaited<ReturnType<typeof listExercises>>,
  templates: readonly QuestTemplate[],
): StepStatus[] {
  return file.steps.map(({ quest }) => {
    if ("official" in quest) {
      // A hero quest of the same name is never the seed one.
      const seed = templates.find((q) => !isUserQuest(q) && q.enTitle === quest.official) ?? null;
      return { status: seed ? "here" : "missing", quest: seed };
    }
    const here = templates.find((q) => isUserQuest(q) && q.uuid === quest.own.quest.uuid) ?? null;
    if (here) return { status: "here", quest: here };
    // A quest naming a seed movement this version lacks is left out like a seed quest it lacks.
    const writable = quest.own.slots.every(
      (s) => !("official" in s.movement) || officialByName(catalogue, s.movement.official),
    );
    return { status: writable ? "brings" : "missing", quest: null };
  });
}

/** What an import would do, read before it does it. */
export async function previewAdventure(
  file: AdventureFile,
  language: AppLanguage,
): Promise<AdventurePreview> {
  const [catalogue, templates, monsters] = await Promise.all([
    listExercises(),
    listQuestTemplates(),
    listMonsters(),
  ]);
  const statuses = stepStatuses(file, catalogue, templates);
  const here = await findHeroAdventureByUuid(file.adventure.uuid);
  const e = file.adventure.end;
  const monster = e.kind === "boss" ? (monsters.find((m) => m.key === e.monster) ?? null) : null;
  return {
    steps: file.steps.map(({ quest }, i) => ({
      status: statuses[i]?.status ?? "missing",
      questId: statuses[i]?.quest?.id ?? null,
      title: statuses[i]?.quest
        ? localizedTitle(statuses[i].quest, language)
        : "official" in quest
          ? quest.official
          : quest.own.quest.title[seededLanguage(language)],
    })),
    existing: here,
    running: here ? await hasActiveRun(here.id) : false,
    monster,
    monsterUnknown: e.kind === "boss" && monster === null,
  };
}

/**
 * Files the adventure with the hero's own, in one transaction: the quests it brings (missing hero
 * movements with them), then the adventure. A hero quest already here (by uuid) is reused as it
 * is, never rewritten here: the file has no say over what the hero edited. A seed quest this
 * version lacks is left out and the steps stay contiguous. Same uuid already here: updated in
 * place and brought back, unless a run of it is under way, then written as a copy.
 *
 * No `can()`, no quota, nowhere on this path: import was always free.
 *
 * ponytail: "never rewritten" holds on this device. A quest the hero edited on device A and that
 * device B has not received yet is created new on B at `now`, newer than the edit, so the next
 * merge hands A the friend's version of it. The same hole the quest-file import has. Fix: date a
 * quest created from a file in the past, which makes the tombstones win (`honourTombstones`); do
 * it the day a hero reports an edit lost this way.
 */
export async function importAdventure(
  file: AdventureFile,
  { asCopy }: { asCopy: boolean },
): Promise<{ id: number; updated: boolean }> {
  const [catalogue, templates, monsters] = await Promise.all([
    listExercises(),
    listQuestTemplates(),
    listMonsters(),
  ]);
  const statuses = stepStatuses(file, catalogue, templates);
  const kept = file.steps.flatMap((s, i) => {
    const st = statuses[i];
    return st && st.status !== "missing" ? [{ step: s, quest: st.quest }] : [];
  });
  if (kept.length < MIN_STEPS) throw new AdventureFileError("unknown_quest");

  const a = file.adventure;
  const e = a.end;
  const monster = e.kind === "boss" ? monsters.find((m) => m.key === e.monster) : undefined;
  // The photo wins over the bundled cover kept beside it for older versions.
  const cover =
    a.photo ??
    (a.cover !== null && Object.hasOwn(ADVENTURE_ASSETS, a.cover)
      ? a.cover
      : (Object.keys(ADVENTURE_ASSETS)[0] as AdventureAssetKey));

  const write = transactionOrFallback(async (tx) => {
    const written = new Map<string, number>();
    const brought = new Map<string, number>();
    const steps: HeroAdventureDraft["steps"] = [];
    for (const { step: s, quest } of kept) {
      // Not on this phone, so it is a hero quest the file carries (a seed one would be "here").
      const questId = quest?.id ?? (await bring(tx, s, { catalogue, written, brought }));
      steps.push({ questId, narrative: s.narrative, outro: s.outro });
    }
    const draft: HeroAdventureDraft = {
      title: a.title,
      description: a.description,
      imagePath: cover,
      end: monster ? { kind: "boss", monster: monster.key } : { kind: "route" },
      voice:
        monster && e.kind === "boss"
          ? { name: e.name ?? "", lines: e.lines ?? noBossLines() }
          : { name: "", lines: noBossLines() },
      steps,
    };
    return fileHeroAdventure(draft, asCopy ? uuidv7() : a.uuid, tx);
  });

  // After the transaction, whatever its outcome: the writers invalidate as they go, so a read in
  // between may have cached rows a rollback then took back.
  return write.finally(() => {
    invalidateExercisesCache();
    invalidateQuestTemplates();
    invalidateAdventures();
  });
}

/** The quest a step carries, written once however many steps name it. */
async function bring(
  tx: TransactionTx,
  step: AdventureFile["steps"][number],
  ctx: {
    catalogue: Awaited<ReturnType<typeof listExercises>>;
    written: Map<string, number>;
    brought: Map<string, number>;
  },
): Promise<number> {
  if (!("own" in step.quest)) throw new Error("A step with no quest reached the writer");
  const own = step.quest.own;
  const done = ctx.brought.get(own.quest.uuid);
  if (done !== undefined) return done;
  const id = await writeImportedQuest(tx, own, {
    catalogue: ctx.catalogue,
    existing: undefined,
    written: ctx.written,
  });
  ctx.brought.set(own.quest.uuid, id);
  return id;
}
