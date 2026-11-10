import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionList } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { monsterName } from "@/components/adventures/monsterName";
import { Fold } from "@/components/bosses/Fold";
import { AppButton } from "@/components/common/AppButton";
import { Chip } from "@/components/common/Chip";
import { useToast } from "@/components/common/Toast";
import { Download } from "@/components/icons";
import { TickHeader, TickRow } from "@/components/quests/TickRow";
import {
  getAdventureAsset,
  getBossAsset,
  getExerciseThumb,
  getQuestThumb,
} from "@/constants/assetMap";
import type { Monster } from "@/db/heroAdventures";
import { type BossEnd, shownCover } from "@/src/adventureFile";
import { seededLanguage } from "@/src/i18n/localized";
import { releaseIncomingFile } from "@/src/incomingFile";
import {
  importPack,
  type PackChoices,
  type PackCounts,
  type PackFile,
  PackFileError,
  type PackPreview,
} from "@/src/packFile";
import { reportError } from "@/src/reportError";
import { isSessionLive, useSessionStore } from "@/stores/session";
import type { AppLanguage } from "@/stores/settings";

type Kind = "adventures" | "quests" | "bosses" | "movements";
type Ticks = Record<Kind, ReadonlySet<string>>;

const KINDS: readonly Kind[] = ["adventures", "quests", "bosses", "movements"];

const uuidsOf = (file: PackFile): Record<Kind, string[]> => ({
  adventures: file.adventures.map((a) => a.adventure.uuid),
  quests: file.quests.map((q) => q.quest.uuid),
  bosses: file.bosses.map((b) => b.bossUuid),
  movements: file.movements.map((m) => m.uuid),
});

/**
 * What is ticked when the list opens, and what "All" ticks: everything new to this phone that can
 * arrive. Never what is already here, which a tick would replace, and never a movement the hero
 * has a namesake of, which their own stands in for until they say otherwise.
 */
function fresh(file: PackFile, preview: PackPreview): Ticks {
  const ids = uuidsOf(file);
  const arrives = (p: { here: boolean; importable: boolean } | undefined) =>
    p !== undefined && !p.here && p.importable;
  return {
    adventures: new Set(ids.adventures.filter((_, i) => arrives(preview.adventures[i]))),
    quests: new Set(ids.quests.filter((_, i) => arrives(preview.quests[i]))),
    bosses: new Set(ids.bosses.filter((_, i) => arrives(preview.bosses[i]))),
    movements: new Set(
      ids.movements.filter((_, i) => {
        const p = preview.movements[i];
        return p !== undefined && !p.here && !p.sameName;
      }),
    ),
  };
}

/**
 * What the ticked things bring with them, new to this phone: the quests and the boss of a ticked
 * adventure, the movements of a quest that will be written. Shown ticked and locked, so the count
 * on the button is what arrives.
 */
function broughtAlong(file: PackFile, preview: PackPreview, ticks: Ticks) {
  const adventures = file.adventures.filter((a) => ticks.adventures.has(a.adventure.uuid));
  const steps = new Set(
    adventures.flatMap((a) =>
      a.steps.flatMap((s) => ("own" in s.quest ? [s.quest.own.quest.uuid] : [])),
    ),
  );
  const ends = new Set(
    adventures.flatMap(({ adventure: { end } }) =>
      end.kind === "boss" && end.bossUuid !== undefined ? [end.bossUuid] : [],
    ),
  );
  // A quest already here is used as it is, and one that would lose a slot is left out of the
  // adventure (`stepStatuses`): neither is written, so neither brings anything.
  const quests = new Set(
    file.quests.flatMap((q, i) => {
      const p = preview.quests[i];
      const whole = p !== undefined && !p.here && p.slots === q.slots.length;
      return steps.has(q.quest.uuid) && whole ? [q.quest.uuid] : [];
    }),
  );
  const written = file.quests.filter(
    (q) => ticks.quests.has(q.quest.uuid) || quests.has(q.quest.uuid),
  );
  const named = new Set(
    written.flatMap((q) =>
      q.slots.flatMap((s) => ("own" in s.movement ? [s.movement.own.uuid] : [])),
    ),
  );
  return {
    quests,
    bosses: new Set(
      file.bosses.flatMap((b, i) =>
        ends.has(b.bossUuid) && !preview.bosses[i]?.here && preview.bosses[i]?.importable
          ? [b.bossUuid]
          : [],
      ),
    ),
    movements: new Set(
      file.movements.flatMap((m, i) => {
        const p = preview.movements[i];
        return named.has(m.uuid) && p !== undefined && !p.here && !p.sameName ? [m.uuid] : [];
      }),
    ),
  };
}

/** The hero's quest a live session is playing, if any: it cannot be replaced under the session. */
const playedQuest = (s: Pick<ReturnType<typeof useSessionStore.getState>, "status" | "quest">) =>
  isSessionLive(s.status) ? (s.quest?.id ?? null) : null;

/**
 * A pack someone sent (`src/packFile.ts`), shown before any of it is filed: every adventure,
 * quest, boss and movement it holds, each one a row to tick. Rendered by `app/quest-import.tsx`.
 *
 * What is new arrives ticked. What is already here is left unticked, because ticking it replaces
 * the hero's version: opening the same pack twice changes nothing by accident, and a file cannot
 * overwrite a quest without a gesture. A movement named like one of the hero's own lands on theirs
 * unless they choose to keep both.
 *
 * A boss stays a surprise: an adventure says one waits at the end, and its name, its picture and
 * what a boss on its own looks like sit behind a fold for the hero who wants to check first.
 */
export function PackImport({
  file,
  preview,
  language,
}: {
  file: PackFile;
  preview: PackPreview;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [ticks, setTicks] = useState<Ticks>(() => fresh(file, preview));
  const [busy, setBusy] = useState(false);
  // Read synchronously, unlike the state: a double tap imported twice.
  const working = useRef(false);
  const played = useSessionStore(playedQuest);

  const along = broughtAlong(file, preview, ticks);
  const arriving =
    ticks.adventures.size +
    new Set([...ticks.quests, ...along.quests]).size +
    new Set([...ticks.bosses, ...along.bosses]).size +
    new Set([...ticks.movements, ...along.movements]).size;

  const toggle = (kind: Kind, uuid: string) =>
    setTicks((prev) => {
      const next = new Set(prev[kind]);
      if (!next.delete(uuid)) next.add(uuid);
      return { ...prev, [kind]: next };
    });
  const setAll = (kind: Kind, on: boolean) =>
    setTicks((prev) => ({
      ...prev,
      [kind]: on ? new Set([...prev[kind], ...fresh(file, preview)[kind]]) : new Set<string>(),
    }));

  // No try/finally: the React Compiler does not compile a function that has one.
  const onImport = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    const done = await save(file, chosen(file, preview, ticks));
    working.current = false;
    setBusy(false);
    if ("error" in done) {
      showError(t(done.error));
      return;
    }
    releaseIncomingFile();
    const count = done.adventures + done.quests + done.bosses + done.movements;
    showSuccess(t("packs.import_done", { count }));
    // The Forge lists all four kinds, whichever button or chat opened the file.
    router.dismissTo("/forge" as never);
  };

  const row = { file, preview, ticks, along, played, language, toggle };
  const sections = KINDS.map((kind) => ({
    key: kind,
    kind,
    data: uuidsOf(file)[kind].map((_, index) => index),
  })).filter((s) => s.data.length > 0);

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(index) => String(index)}
        stickySectionHeadersEnabled={false}
        // A screenful and a half: the default ten cut the first screen short on a tall phone.
        initialNumToRender={20}
        // Two screens each way, not the default ten: a row's photo is a `data:` string of 50 KB that
        // every mounted row holds several times over, and a full pack has 250 of them.
        windowSize={5}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
        renderSectionHeader={({ section }) => (
          <TickHeader
            testID={`pack-import-${section.kind}`}
            title={t(`packs.section_${section.kind}`)}
            all={t("packs.all")}
            none={t("packs.none")}
            onAll={() => setAll(section.kind, true)}
            onNone={() => setAll(section.kind, false)}
          />
        )}
        renderItem={({ item, section }) => <Row {...row} kind={section.kind} index={item} />}
      />

      <YStack px="4" pt="2" pb="3" gap="2">
        {arriving === 0 ? (
          <Text fontSize={13} color="textSecondary" style={{ textAlign: "center" }}>
            {t("packs.nothing_ticked")}
          </Text>
        ) : null}
        <AppButton
          testID="pack-import-confirm"
          disabled={busy || arriving === 0}
          icon={
            <Download
              size={18}
              color={`${busy || arriving === 0 ? "textSecondary" : "white"}`}
              strokeWidth={2.5}
            />
          }
          onPress={() => {
            onImport().catch((error: unknown) => reportError("packs.import", error));
          }}
        >
          {t("packs.import_confirm", { count: arriving })}
        </AppButton>
      </YStack>
    </>
  );
}

/**
 * The ticks as the writer takes them. A namesake left unticked is merged into the hero's own, and
 * a quest a session is playing right now is left alone whatever the box says (the live store, not
 * the render: a session that started since still counts).
 */
function chosen(file: PackFile, preview: PackPreview, ticks: Ticks): PackChoices {
  const played = playedQuest(useSessionStore.getState());
  return {
    ...ticks,
    quests: new Set(
      file.quests.flatMap((q, i) =>
        ticks.quests.has(q.quest.uuid) && !(played !== null && preview.quests[i]?.id === played)
          ? [q.quest.uuid]
          : [],
      ),
    ),
    useMine: new Set(
      file.movements.flatMap((m, i) =>
        preview.movements[i]?.sameName && !ticks.movements.has(m.uuid) ? [m.uuid] : [],
      ),
    ),
  };
}

/** The import, or the sentence that says why it failed. Never rejects. */
async function save(file: PackFile, choices: PackChoices): Promise<PackCounts | { error: string }> {
  try {
    return await importPack(file, choices);
  } catch (error) {
    if (error instanceof PackFileError) return { error: `packs.import_${error.reason}` };
    reportError("packs.import", error);
    return { error: "packs.import_failed" };
  }
}

type RowProps = {
  file: PackFile;
  preview: PackPreview;
  ticks: Ticks;
  along: ReturnType<typeof broughtAlong>;
  played: number | null;
  language: AppLanguage;
  toggle: (kind: Kind, uuid: string) => void;
  index: number;
};

function Row({ kind, ...props }: RowProps & { kind: Kind }) {
  if (kind === "adventures") return <AdventureRow {...props} />;
  if (kind === "quests") return <QuestRow {...props} />;
  if (kind === "bosses") return <BossRow {...props} />;
  return <MovementRow {...props} />;
}

function AdventureRow({ file, preview, ticks, language, toggle, index }: RowProps) {
  const { t } = useTranslation();
  const a = file.adventures[index];
  const p = preview.adventures[index];
  if (!a || !p) return null;
  const { adventure } = a;
  const end = adventure.end;
  const note = p.importable
    ? [
        t("packs.adventure_steps", { count: a.steps.length }),
        p.monster ? t("packs.adventure_boss") : null,
        p.here ? t(p.running ? "adventures.import_running" : "packs.here") : null,
      ]
        .filter(Boolean)
        .join(" ")
    : t("adventures.import_unknown_quest");
  return (
    <TickRow
      testID={`pack-import-adventures-${index}`}
      title={adventure.title}
      note={note}
      image={getAdventureAsset(shownCover(adventure))}
      on={ticks.adventures.has(adventure.uuid)}
      disabled={!p.importable}
      onToggle={() => toggle("adventures", adventure.uuid)}
    >
      {p.importable && p.monster && end.kind === "boss" ? (
        <BossReveal
          testID={`pack-import-adventures-${index}-boss`}
          end={end}
          monster={p.monster}
          language={language}
        />
      ) : null}
    </TickRow>
  );
}

function QuestRow({ file, preview, ticks, along, played, language, toggle, index }: RowProps) {
  const { t } = useTranslation();
  const q = file.quests[index];
  const p = preview.quests[index];
  if (!q || !p) return null;
  const uuid = q.quest.uuid;
  const running = played !== null && p.id === played;
  const locked = along.quests.has(uuid);
  const meta = `${t("quests.import_rounds", { count: q.quest.rounds })} · ${t("packs.quest_slots", { count: p.slots })}`;
  const state = () => {
    if (!p.importable) return t("quests.import_unknown_movement");
    if (running) return t("packs.quest_running");
    if (locked) return t("packs.comes_with");
    if (p.here) return t("packs.here");
    return p.slots < q.slots.length ? t("packs.quest_partial") : null;
  };
  return (
    <TickRow
      testID={`pack-import-quests-${index}`}
      title={q.quest.title[seededLanguage(language)]}
      note={[p.importable ? meta : null, state()].filter(Boolean).join("\n")}
      image={getQuestThumb(q.quest.image) ?? undefined}
      on={!running && (locked || ticks.quests.has(uuid))}
      disabled={!p.importable || running || locked}
      onToggle={() => toggle("quests", uuid)}
    />
  );
}

function BossRow({ file, preview, ticks, along, language, toggle, index }: RowProps) {
  const { t } = useTranslation();
  const b = file.bosses[index];
  const p = preview.bosses[index];
  if (!b || !p) return null;
  const locked = along.bosses.has(b.bossUuid);
  const state = () => {
    if (p.here) return t("adventures.import_step_here");
    if (!p.importable) return t("packs.boss_unknown");
    return locked ? t("packs.comes_with") : undefined;
  };
  return (
    <TickRow
      testID={`pack-import-bosses-${index}`}
      title={b.name || (p.monster ? monsterName(p.monster, language) : b.monster)}
      note={state()}
      on={locked || ticks.bosses.has(b.bossUuid)}
      disabled={p.here || !p.importable || locked}
      onToggle={() => toggle("bosses", b.bossUuid)}
    >
      {p.monster && !p.here ? (
        <BossReveal
          testID={`pack-import-bosses-${index}-boss`}
          end={b}
          monster={p.monster}
          language={language}
        />
      ) : null}
    </TickRow>
  );
}

function MovementRow({ file, preview, ticks, along, toggle, index }: RowProps) {
  const { t } = useTranslation();
  const m = file.movements[index];
  const p = preview.movements[index];
  if (!m || !p) return null;
  const locked = along.movements.has(m.uuid);
  const on = locked || ticks.movements.has(m.uuid);
  const state = () => {
    if (p.here) return t("quests.import_have");
    if (p.sameName) return t("packs.same_name");
    return locked ? t("packs.comes_with") : undefined;
  };
  return (
    <TickRow
      testID={`pack-import-movements-${index}`}
      title={m.name}
      note={state()}
      image={getExerciseThumb(m.image)}
      on={on}
      disabled={p.here || locked}
      onToggle={() => toggle("movements", m.uuid)}
    >
      {p.sameName ? (
        // The same choice as the box, in words: unticked, the hero's own movement stands in.
        <XStack gap="2" flexWrap="wrap">
          <Chip
            testID={`pack-import-movements-${index}-mine`}
            label={t("packs.use_mine")}
            selected={!on}
            onPress={() => (on ? toggle("movements", m.uuid) : undefined)}
          />
          <Chip
            testID={`pack-import-movements-${index}-both`}
            label={t("packs.keep_both")}
            selected={on}
            onPress={() => (on ? undefined : toggle("movements", m.uuid))}
          />
        </XStack>
      ) : null}
    </TickRow>
  );
}

/**
 * A boss, for the hero who would rather see it than be surprised: its name and its picture, the
 * sender's when the file has one. Folded shut, so nothing of it shows until it is asked for, and
 * nobody has to file a stranger's picture without a way to look at it first.
 */
function BossReveal({
  testID,
  end,
  monster,
  language,
}: {
  testID: string;
  end: BossEnd;
  monster: Monster;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  return (
    <Fold testID={testID} size={14} title={t("packs.see_boss")}>
      <XStack gap="3" items="center">
        <Image
          testID={`${testID}-art`}
          source={getBossAsset(monster.bossImagePath, 0, undefined, end.art)}
          style={{ width: 96, height: 96, borderRadius: 12 }}
          contentFit="cover"
          accessible={false}
        />
        <Text flex={1} color="text" fontWeight="600">
          {end.name || monsterName(monster, language)}
        </Text>
      </XStack>
    </Fold>
  );
}
