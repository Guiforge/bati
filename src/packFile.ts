import { invalidateAdventures } from "@/db/adventures";
import { BOSS_ART_STATES } from "@/db/bossVoice";
import { type TransactionTx, transactionOrFallback } from "@/db/client";
import {
  type Exercise,
  invalidateExercisesCache,
  isUserExercise,
  listExercises,
  officialByName,
} from "@/db/exercises";
import { listMonsters, MIN_STEPS, type Monster } from "@/db/heroAdventures";
import { createHeroBoss, getHeroBoss, getHeroBossByUuid } from "@/db/heroBosses";
import {
  invalidateQuestTemplates,
  isUserQuest,
  listQuestTemplates,
  type QuestTemplate,
} from "@/db/quests";
import {
  type AdventureFile,
  AdventureFileError,
  adventureAside,
  artRef,
  type BossEnd,
  canFile,
  carriedEnd,
  fileEnd,
  ownBody,
  type Picture,
  PLACEHOLDER,
  parseAdventureBody,
  parseBoss,
  photoRef,
  previewAdventure,
  putPicturesBack,
  writeImportedAdventure,
} from "@/src/adventureFile";
import {
  isRecord,
  MAX_PACK_BYTES,
  movementToFile,
  type OwnMovement,
  ownMovement,
  parseQuestBody,
  type QuestBody,
  QuestFileError,
  type Slot,
  shareJsonFile,
  writeImportedQuest,
  writeOwnMovement,
} from "@/src/questFile";
import type { AppLanguage } from "@/stores/settings";

/**
 * Everything a hero made, or the part of it they ticked, as one file: their movements, quests,
 * bosses and adventures. The quest and adventure files send one thing; this sends a friend the lot.
 *
 * Each thing is listed once and named by its uuid wherever it is used: a quest's slot is
 * `{ ref }` into `movements`, an adventure's step `{ ref }` into `quests` and its end `{ ref }`
 * into `bosses`. A movement five quests use travels once, photo included. The reader resolves the
 * references as it goes, so what it returns is ordinary quest bodies and adventure files, and the
 * previews and the writers of `questFile` and `adventureFile` are the ones that run.
 *
 * Held to what those files are held to (R66 to R68, R122 to R125), plus a cap on each list and a
 * size of its own (`MAX_PACK_BYTES`). Nothing here is written before the hero has seen the list
 * and ticked what comes in (`components/quests/PackImport.tsx`).
 */
const KIND = "bati-pack";
const VERSION = 1;
/** Far past what a hero writes by hand; the size limit is what a real pack meets first. */
const MAX_MOVEMENTS = 1_000;
const MAX_QUESTS = 300;
const MAX_BOSSES = 100;
const MAX_ADVENTURES = 100;

export type PackBoss = BossEnd & { bossUuid: string };

/** A pack as read: every reference resolved, so a quest holds its movements and an adventure its quests. */
export type PackFile = {
  kind: typeof KIND;
  version: typeof VERSION;
  movements: OwnMovement[];
  quests: QuestBody[];
  bosses: PackBoss[];
  adventures: AdventureFile[];
};

type Ref = { ref: string };

/** A pack as written: the same lists, with a reference where `PackFile` holds the thing. */
type Wire = {
  kind: typeof KIND;
  version: typeof VERSION;
  movements: OwnMovement[];
  quests: {
    quest: QuestBody["quest"];
    slots: { movement: { official: string } | Ref; target: Slot["target"] }[];
  }[];
  bosses: BossEnd[];
  adventures: {
    adventure: Omit<AdventureFile["adventure"], "end"> & {
      end: AdventureFile["adventure"]["end"] | ({ kind: "boss" } & Ref);
    };
    steps: { quest: { official: string } | Ref; narrative: string; outro: string }[];
  }[];
};

/** Every reason a pack is refused. The screen says each one as `packs.import_<reason>`. */
export const PACK_FILE_REFUSALS = ["unreadable", "not_a_pack", "newer"] as const;

export class PackFileError extends Error {
  readonly reason: (typeof PACK_FILE_REFUSALS)[number];
  constructor(reason: PackFileError["reason"]) {
    super(`Pack file refused: ${reason}`);
    this.reason = reason;
  }
}

export type PackCounts = { movements: number; quests: number; bosses: number; adventures: number };

// ---------------------------------------------------------------------------------------------
// Reading. Everything below reads a file from someone else, so nothing in it is trusted.
// ---------------------------------------------------------------------------------------------

/**
 * Hands the thread back between two batches. Vouching for a photo decodes it whole, and a full
 * pack holds 500: read in one go, the screen froze for as long as that took.
 */
const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const BATCH = 16;

function list(value: unknown, max: number): unknown[] {
  // A pack of quests alone has no `bosses`: an absent list is an empty one.
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new PackFileError("not_a_pack");
  // The length is read before any element, and a later Bati may raise the cap.
  if (value.length > max) throw new PackFileError("newer");
  return value;
}

/** Each entry read once, by its uuid. A uuid listed twice is refused: the import writes by uuid. */
async function byUuid<T>(
  items: unknown[],
  read: (item: unknown) => T,
  key: (parsed: T) => string,
): Promise<Map<string, T>> {
  const out = new Map<string, T>();
  for (const [i, item] of items.entries()) {
    if (i % BATCH === BATCH - 1) await breathe();
    const parsed = read(item);
    if (out.has(key(parsed))) throw new PackFileError("not_a_pack");
    out.set(key(parsed), parsed);
  }
  return out;
}

async function read(data: unknown): Promise<PackFile> {
  if (!isRecord(data) || data.kind !== KIND) throw new PackFileError("not_a_pack");
  if (typeof data.version !== "number" || !Number.isInteger(data.version) || data.version < 1) {
    throw new PackFileError("not_a_pack");
  }
  if (data.version > VERSION) throw new PackFileError("newer");
  // In the order they name each other: a quest its movements, an adventure its quests and its boss.
  const movements = await byUuid(list(data.movements, MAX_MOVEMENTS), ownMovement, (m) => m.uuid);
  const quests = await byUuid(
    list(data.quests, MAX_QUESTS),
    (q) => parseQuestBody(q, movements),
    (q) => q.quest.uuid,
  );
  const bosses = await byUuid(list(data.bosses, MAX_BOSSES), parseBoss, (b) => b.bossUuid);
  const adventures = await byUuid(
    list(data.adventures, MAX_ADVENTURES),
    (a) => parseAdventureBody(a, { quests, bosses }),
    (a) => a.adventure.uuid,
  );
  if (movements.size + quests.size + bosses.size + adventures.size === 0) {
    throw new PackFileError("not_a_pack");
  }
  return {
    kind: KIND,
    version: VERSION,
    movements: [...movements.values()],
    quests: [...quests.values()],
    bosses: [...bosses.values()],
    adventures: [...adventures.values()],
  };
}

/** A parsed JSON value, checked field by field. Throws a `PackFileError` saying why it is refused. */
export async function parsePackData(data: unknown): Promise<PackFile> {
  try {
    return await read(data);
  } catch (error) {
    // The quest and adventure readers speak their own errors; anything else is a bug and goes up.
    if (error instanceof QuestFileError || error instanceof AdventureFileError) {
      throw new PackFileError(
        error.reason === "newer" || error.reason === "unreadable" ? error.reason : "not_a_pack",
      );
    }
    throw error;
  }
}

export const packCounts = (file: PackFile): PackCounts => ({
  movements: file.movements.length,
  quests: file.quests.length,
  bosses: file.bosses.length,
  adventures: file.adventures.length,
});

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

/** What the hero ticked to send, by row id. What a ticked thing needs comes along unasked. */
export type PackPick = {
  movements: readonly number[];
  quests: readonly number[];
  bosses: readonly number[];
  adventures: readonly number[];
};

export type PackToShare = {
  /** The exact string that was read back and that `sharePack` writes. */
  json: string;
  /** What the file holds: the ticked things and what they brought with them. */
  counts: PackCounts;
  /** Pictures in the file, and those the size limit or the reader left out. */
  photos: number;
  leftOut: number;
};

type Pictures = [string, Picture][];

/** A pack being put together: the file, what is already listed in it, and its pictures set aside. */
type Draft = {
  wire: Wire;
  listed: { movements: Set<string>; bosses: Set<string> };
  /** Hero quests the adventures name: they come along, ticked or not. */
  named: Set<string>;
  /** By rank under the budget: what is seen first is the last to be left out. */
  set: {
    photos: Pictures;
    covers: Pictures;
    movements: Pictures;
    fresh: Pictures;
    forms: Pictures;
  };
};

/** `end` is what `fileEnd` wrote, the boss's art under the placeholder; `art` is the pictures themselves. */
function addBoss(draft: Draft, end: BossEnd, art: BossEnd["art"]) {
  if (end.bossUuid === undefined || draft.listed.bosses.has(end.bossUuid)) return;
  draft.listed.bosses.add(end.bossUuid);
  draft.wire.bosses.push(end);
  for (const form of BOSS_ART_STATES) {
    const stored = art?.[form];
    if (!stored || !end.art?.[form]) continue;
    (form === "fresh" ? draft.set.fresh : draft.set.forms).push([
      `boss:${end.bossUuid}:${form}`,
      { stored, cover: true, refs: [artRef(end, form)] },
    ]);
  }
}

function addMovement(draft: Draft, own: OwnMovement, stored: string | undefined) {
  if (draft.listed.movements.has(own.uuid)) return;
  draft.listed.movements.add(own.uuid);
  draft.wire.movements.push(own);
  if (stored) draft.set.movements.push([own.uuid, { stored, cover: false, refs: [own] }]);
}

async function addAdventure(draft: Draft, id: number) {
  const aside = await adventureAside(id);
  if (!aside) return;
  const { end, ...head } = aside.file.adventure;
  // A boss the hero made is listed and named; a painted monster stays where it is, a key and a voice.
  const ref = end.kind === "boss" && aside.boss ? end.bossUuid : undefined;
  if (end.kind === "boss" && ref !== undefined) addBoss(draft, end, aside.boss?.art);
  const adventure: Wire["adventures"][number]["adventure"] = {
    ...head,
    end: ref === undefined ? end : { kind: "boss", ref },
  };
  if (aside.photo) {
    draft.set.photos.push([
      `adventure:${head.uuid}`,
      { stored: aside.photo, cover: true, refs: [photoRef(adventure)] },
    ]);
  }
  draft.wire.adventures.push({
    adventure,
    steps: aside.file.steps.map(({ quest, narrative, outro }) => {
      if ("official" in quest) return { quest, narrative, outro };
      draft.named.add(quest.own.quest.uuid);
      return { quest: { ref: quest.own.quest.uuid }, narrative, outro };
    }),
  });
}

function addQuest(draft: Draft, quest: QuestTemplate, catalogue: Exercise[]) {
  // What the receiver would refuse stays out. `adventureAside` asked the same question of the
  // same quest, so a step never names one that is not listed.
  const own = ownBody(quest, catalogue);
  if (!own) return;
  const photoOf = new Map(own.aside.map((a) => [a.slot === "cover" ? "cover" : a.key, a.stored]));
  const cover = photoOf.get("cover");
  if (cover) {
    draft.set.covers.push([
      `quest:${own.body.quest.uuid}`,
      { stored: cover, cover: true, refs: [own.body.quest] },
    ]);
  }
  draft.wire.quests.push({
    quest: own.body.quest,
    slots: own.body.slots.map(({ movement, target }) => {
      if ("official" in movement) return { movement, target };
      addMovement(draft, movement.own, photoOf.get(movement.own.uuid));
      return { movement: { ref: movement.own.uuid }, target };
    }),
  });
}

/** A movement ticked on its own: read as its receiver would, its photo set aside like the others. */
function addOwnMovement(draft: Draft, exercise: Exercise) {
  const raw = movementToFile(exercise);
  const stored = raw.image.startsWith("data:") ? raw.image : undefined;
  try {
    addMovement(draft, ownMovement({ ...raw, image: stored ? PLACEHOLDER : raw.image }), stored);
  } catch (error) {
    // A name past four times its limit, which the editor does not prevent: it stays here.
    if (!(error instanceof QuestFileError)) throw error;
  }
}

async function addOwnBoss(draft: Draft, id: number) {
  const boss = await getHeroBoss(id);
  // A boss whose painted monster this build does not ship has nothing to fall back to over there.
  if (!boss?.monsterKey) return;
  const end = fileEnd({ end: { kind: "boss", monster: boss.monsterKey } }, boss);
  if (end.kind === "boss") addBoss(draft, end, boss.art);
}

/**
 * The ticked things as the file another phone reads, with what they need: an adventure brings its
 * hero quests and its boss, a quest its hero movements. Held to R125 like the two other files:
 * each quest and movement goes through the reader's own parser and is written as parsed, one it
 * refuses stays out, the pictures go back in under the size limit (adventure photos, quest covers,
 * movement photos, then the bosses'), and the string is read back by `parsePackData` before it is
 * returned. Throws when nothing ticked can travel.
 */
export async function packToShare(pick: PackPick): Promise<PackToShare> {
  const [templates, catalogue] = await Promise.all([listQuestTemplates(), listExercises()]);
  const draft: Draft = {
    wire: { kind: KIND, version: VERSION, movements: [], quests: [], bosses: [], adventures: [] },
    listed: { movements: new Set(), bosses: new Set() },
    named: new Set(),
    set: { photos: [], covers: [], movements: [], fresh: [], forms: [] },
  };

  // Adventures first: they say which quests and which bosses come along.
  for (const id of pick.adventures) await addAdventure(draft, id);
  const quests = new Set(pick.quests);
  for (const quest of templates) {
    const named = quest.uuid !== null && draft.named.has(quest.uuid);
    if (isUserQuest(quest) && (quests.has(quest.id) || named)) addQuest(draft, quest, catalogue);
  }
  const movements = new Set(pick.movements);
  for (const exercise of catalogue) {
    if (isUserExercise(exercise) && movements.has(exercise.id)) addOwnMovement(draft, exercise);
  }
  for (const id of pick.bosses) await addOwnBoss(draft, id);

  const { set, wire } = draft;
  const { photos, leftOut } = putPicturesBack(
    wire,
    new Map([...set.photos, ...set.covers, ...set.movements, ...set.fresh, ...set.forms]),
    MAX_PACK_BYTES,
  );
  const json = JSON.stringify(wire);
  let back: PackFile;
  try {
    back = await parsePackData(JSON.parse(json));
  } catch (error) {
    const reason = error instanceof PackFileError ? error.reason : String(error);
    throw new Error(`pack file fails its own reader: ${reason}`);
  }
  return { json, counts: packCounts(back), photos, leftOut };
}

/** Writes the file `packToShare` returned and hands it to the share sheet, named by the day. */
export async function sharePack(json: string): Promise<void> {
  await shareJsonFile(`bati-${new Date().toISOString().slice(0, 10)}`, json);
}

// ---------------------------------------------------------------------------------------------
// Preview and import
// ---------------------------------------------------------------------------------------------

const lower = (name: string) => name.trim().toLowerCase();

/** The hero's own movements in use, by name: what a movement of the file can be merged into. */
function mineByName(catalogue: readonly Exercise[]): Map<string, Exercise> {
  const out = new Map<string, Exercise>();
  for (const e of catalogue) {
    // The first of two namesakes: a name is no key (0036), and the hero can keep both instead.
    if (isUserExercise(e) && !e.retiredAt && !out.has(lower(e.enName))) out.set(lower(e.enName), e);
  }
  return out;
}

/** The quest without the slots whose seed movement this version lacks: it arrives without them. */
function available(body: QuestBody, catalogue: readonly Exercise[]): QuestBody {
  return {
    ...body,
    slots: body.slots.filter(
      ({ movement }) => !("official" in movement) || officialByName(catalogue, movement.official),
    ),
  };
}

/** What importing each entry would do, in the file's order. One reading for the screen and the writer. */
export type PackPreview = {
  /** `here`: on this phone by uuid, and left as it is. `sameName`: the hero has one named alike. */
  movements: { here: boolean; sameName: boolean }[];
  /** `slots`: those that arrive. None, and the quest cannot be imported. */
  quests: { here: boolean; id: number | null; slots: number; importable: boolean }[];
  /** `monster`: the painted one it falls back to. Null when this version lacks it: no import. */
  bosses: { here: boolean; monster: Monster | null; importable: boolean }[];
  /**
   * `running`: a run of the hero's copy is under way, so a ticked one arrives beside it.
   * `monster`: the boss it ends on, null for a route (or a boss this version lacks).
   */
  adventures: { here: boolean; running: boolean; monster: Monster | null; importable: boolean }[];
};

export async function previewPack(file: PackFile, language: AppLanguage): Promise<PackPreview> {
  const [catalogue, templates, monsters] = await Promise.all([
    listExercises(),
    listQuestTemplates(),
    listMonsters(),
  ]);
  const uuids = new Set(catalogue.filter(isUserExercise).map((e) => e.uuid));
  const names = mineByName(catalogue);
  return {
    movements: file.movements.map((m) => {
      const here = uuids.has(m.uuid);
      return { here, sameName: !here && names.has(lower(m.name)) };
    }),
    quests: file.quests.map((q) => {
      const mine = templates.find((t) => isUserQuest(t) && t.uuid === q.quest.uuid);
      const slots = available(q, catalogue).slots.length;
      return { here: mine !== undefined, id: mine?.id ?? null, slots, importable: slots > 0 };
    }),
    bosses: await Promise.all(
      file.bosses.map(async (b) => {
        const monster = monsters.find((m) => m.key === b.monster) ?? null;
        return {
          here: (await getHeroBossByUuid(b.bossUuid)) !== null,
          monster,
          importable: monster !== null && carriedEnd(b, b.bossUuid) !== null,
        };
      }),
    ),
    adventures: await Promise.all(
      file.adventures.map(async (a) => {
        const preview = await previewAdventure(a, language);
        return {
          here: preview.existing !== null,
          running: preview.running,
          monster: preview.monster,
          importable: preview.steps.filter((s) => s.status !== "missing").length >= MIN_STEPS,
        };
      }),
    ),
  };
}

/** What the hero ticked to bring in, by uuid. */
export type PackChoices = {
  movements: ReadonlySet<string>;
  quests: ReadonlySet<string>;
  bosses: ReadonlySet<string>;
  adventures: ReadonlySet<string>;
  /**
   * Movements of the file that do not arrive: the hero's own movement of the same name stands in
   * for each, in every quest of the file that names it.
   */
  useMine: ReadonlySet<string>;
};

/**
 * Writes what the hero ticked as their own, in one transaction, and returns how many of each were
 * written. Movements, quests, bosses, then adventures, sharing the rows they make: a quest an
 * adventure names and the hero also ticked is one quest.
 *
 * Recognised by uuid, like the two other files. A ticked quest or adventure already here is
 * updated in place, which is why the screen leaves those unticked; a movement or a boss already
 * here is left as it is, ticked or not. A movement in `useMine` is never written: the hero's
 * movement of that name takes its place, found again here by name and never by an id the screen
 * handed over.
 *
 * A quest loses the slots whose seed movement this version lacks; one left with none, an
 * adventure with fewer than two steps and a boss whose monster this version lacks are skipped,
 * as the screen showed them.
 */
export async function importPack(file: PackFile, choices: PackChoices): Promise<PackCounts> {
  const [catalogue, templates, monsters] = await Promise.all([
    listExercises(),
    listQuestTemplates(),
    listMonsters(),
  ]);
  const before = new Set(catalogue.map((e) => e.id));

  const write = transactionOrFallback(async (tx) => {
    const ctx: Writing = {
      tx,
      catalogue,
      templates,
      monsters,
      written: new Map(),
      brought: new Map(),
    };
    await writeMovements(ctx, file, choices);
    const quests = await writeQuests(ctx, file, choices);
    const bosses = await writeBosses(ctx, file, choices);
    const adventures = await writeAdventures(ctx, file, choices);
    // Rows that did not exist before: a merged movement and one already here are not arrivals.
    const movements = new Set([...ctx.written.values()].filter((id) => !before.has(id))).size;
    return { movements, quests, bosses, adventures };
  });

  // After the transaction, whatever its outcome: the writers invalidate as they go, so a read in
  // between may have cached rows a rollback then took back.
  return write.finally(() => {
    invalidateExercisesCache();
    invalidateQuestTemplates();
    invalidateAdventures();
  });
}

/** One import: its transaction, what this phone held when it began, and the rows made so far. */
type Writing = {
  tx: TransactionTx;
  catalogue: Exercise[];
  templates: readonly QuestTemplate[];
  monsters: readonly Monster[];
  written: Map<string, number>;
  brought: Map<string, number>;
};

async function writeMovements(ctx: Writing, file: PackFile, choices: PackChoices) {
  const mine = new Set(ctx.catalogue.filter(isUserExercise).map((e) => e.uuid));
  const names = mineByName(ctx.catalogue);
  // The stand-ins first: a quest written below then lands on them, and so does a ticked movement.
  for (const m of file.movements) {
    const stand = choices.useMine.has(m.uuid) && !mine.has(m.uuid) && names.get(lower(m.name));
    if (stand) ctx.written.set(m.uuid, stand.id);
  }
  for (const m of file.movements) {
    if (choices.movements.has(m.uuid)) await writeOwnMovement(ctx.tx, m, ctx);
  }
}

async function writeQuests(ctx: Writing, file: PackFile, choices: PackChoices): Promise<number> {
  let done = 0;
  for (const q of file.quests) {
    const body = available(q, ctx.catalogue);
    if (!choices.quests.has(q.quest.uuid) || body.slots.length === 0) continue;
    const existing = ctx.templates.find((t) => isUserQuest(t) && t.uuid === q.quest.uuid);
    const id = await writeImportedQuest(ctx.tx, body, { ...ctx, existing });
    ctx.brought.set(q.quest.uuid, id);
    done += 1;
  }
  return done;
}

async function writeBosses(ctx: Writing, file: PackFile, choices: PackChoices): Promise<number> {
  let done = 0;
  for (const b of file.bosses) {
    const monster = ctx.monsters.find((m) => m.key === b.monster);
    const carried = carriedEnd(b, b.bossUuid);
    if (!choices.bosses.has(b.bossUuid) || !monster || !carried) continue;
    // A boss already here (by uuid) is kept as it is, as inside an adventure.
    if (await getHeroBossByUuid(carried.uuid, ctx.tx)) continue;
    await createHeroBoss(
      { ...carried.draft, monster: monster.key },
      { uuid: carried.uuid, exec: ctx.tx },
    );
    done += 1;
  }
  return done;
}

async function writeAdventures(
  ctx: Writing,
  file: PackFile,
  choices: PackChoices,
): Promise<number> {
  let done = 0;
  for (const a of file.adventures) {
    if (!choices.adventures.has(a.adventure.uuid)) continue;
    if (!canFile(a, ctx.catalogue, ctx.templates)) continue;
    await writeImportedAdventure(ctx.tx, a, { ...ctx, asCopy: false });
    done += 1;
  }
  return done;
}
