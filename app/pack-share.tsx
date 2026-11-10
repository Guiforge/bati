import { useRouter } from "expo-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spinner, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Button } from "@/components/common/Button";
import { Paragraph } from "@/components/common/Paragraph";
import { useToast } from "@/components/common/Toast";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { ChevronLeft, Share2 } from "@/components/icons";
import { TickHeader, TickRow } from "@/components/quests/TickRow";
import {
  getAdventureAsset,
  getBossAsset,
  getExerciseThumb,
  getQuestThumb,
} from "@/constants/assetMap";
import { type Adventure, listAdventures } from "@/db/adventures";
import { type Exercise, isUserExercise, listExercises } from "@/db/exercises";
import { type HeroBoss, listHeroBosses } from "@/db/heroBosses";
import {
  isUserQuest,
  listQuestTemplates,
  type QuestTemplate,
  USER_QUEST_AUTHOR,
} from "@/db/quests";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { type PackPick, packToShare, sharePack } from "@/src/packFile";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type Kind = keyof PackPick;
type Made = {
  adventures: Adventure[];
  quests: QuestTemplate[];
  bosses: HeroBoss[];
  movements: Exercise[];
};
type Ticks = Record<Kind, ReadonlySet<number>>;

const KINDS: readonly Kind[] = ["adventures", "quests", "bosses", "movements"];
const everything = (made: Made): Ticks => ({
  adventures: new Set(made.adventures.map((a) => a.id)),
  quests: new Set(made.quests.map((q) => q.id)),
  bosses: new Set(made.bosses.map((b) => b.id)),
  movements: new Set(made.movements.map((e) => e.id)),
});

/** What the hero has made and still uses: a retired movement or adventure only travels with what names it. */
async function readMade(): Promise<Made> {
  const [quests, adventures, exercises, bosses] = await Promise.all([
    listQuestTemplates(),
    listAdventures(),
    listExercises(),
    listHeroBosses(),
  ]);
  return {
    adventures: adventures.filter((a) => a.author === USER_QUEST_AUTHOR && a.isActive === 1),
    quests: quests.filter(isUserQuest),
    bosses,
    movements: exercises.filter((e) => isUserExercise(e) && !e.retiredAt),
  };
}

/**
 * Everything the hero made, each one a row to tick, sent as one file (`src/packFile.ts`). Opened
 * from the Forge. All of it is ticked on arrival, since sending a friend the lot is why the screen
 * exists; the pictures show in the rows, and the dialog before the share sheet says how many leave
 * the phone, because a photo of a living room is easy to forget in a list of forty movements.
 *
 * What a ticked thing needs comes along whether its own row is ticked or not: `packToShare` adds
 * an adventure's quests and its boss, and a quest's movements.
 */
export default function PackShareScreen(): ReactNode {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const { showError } = useToast();
  const { ask, dialog } = useConfirmDialog();
  // Null until the read finishes: a page that has not read yet does not claim nothing was made.
  const [made, setMade] = useState<Made | null>(null);
  const [failed, setFailed] = useState(false);
  const [ticks, setTicks] = useState<Ticks | null>(null);
  const [busy, setBusy] = useState(false);
  // Read synchronously, unlike the state: a double tap prepared the file twice.
  const working = useRef(false);

  useEffect(() => {
    let alive = true;
    readMade()
      .then((read) => {
        if (!alive) return;
        setMade(read);
        setTicks(everything(read));
      })
      .catch((error: unknown) => {
        reportError("packs.share.read", error);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const picked = ticks
    ? ticks.adventures.size + ticks.quests.size + ticks.bosses.size + ticks.movements.size
    : 0;
  const empty =
    made !== null &&
    made.adventures.length + made.quests.length + made.bosses.length + made.movements.length === 0;

  const toggle = (kind: Kind, id: number) =>
    setTicks((prev) => {
      if (!prev) return prev;
      const next = new Set(prev[kind]);
      if (!next.delete(id)) next.add(id);
      return { ...prev, [kind]: next };
    });
  const setAll = (kind: Kind, on: boolean) =>
    setTicks((prev) =>
      prev && made ? { ...prev, [kind]: on ? everything(made)[kind] : new Set<number>() } : prev,
    );

  const fail = (error: unknown) => {
    reportError("packs.share", error);
    showError(t("packs.share_failed"));
  };

  // No try/finally: the React Compiler does not compile a function that has one.
  const onShare = async () => {
    if (!ticks || working.current) return;
    working.current = true;
    setBusy(true);
    const out = await packToShare({
      adventures: [...ticks.adventures],
      quests: [...ticks.quests],
      bosses: [...ticks.bosses],
      movements: [...ticks.movements],
    }).catch((error: unknown) => {
      fail(error);
      return undefined;
    });
    working.current = false;
    setBusy(false);
    if (out === undefined) return;
    const { counts, photos, leftOut, json } = out;
    ask({
      title: t("packs.share_title"),
      // What the file holds, which is more than what was ticked when something came along.
      body: [
        t("packs.share_count", {
          count: counts.adventures + counts.quests + counts.bosses + counts.movements,
        }),
        photos > 0 ? t("packs.share_photos", { count: photos }) : null,
        leftOut > 0 ? t("quests.share_photos_left", { count: leftOut }) : null,
      ]
        .filter(Boolean)
        .join(" "),
      confirmLabel: t("quests.share_confirm"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        sharePack(json).catch(fail);
      },
    });
  };

  const rows = made ? rowsOf(made, language, t) : null;
  const sections = rows
    ? KINDS.map((kind) => ({ key: kind, kind, data: rows[kind] })).filter((s) => s.data.length > 0)
    : [];

  return (
    <YStack testID="pack-share-screen" flex={1} bg="background" pt={insets.top} pb={insets.bottom}>
      <XStack px="4" py="3" items="center" gap="3">
        <Button
          size="3"
          hitSlop={8}
          circular
          chromeless
          onPress={() => router.back()}
          aria-label={t("quests.go_back")}
          icon={<ChevronLeft size={24} color="text" />}
        />
        <XStack flex={1} items="center" gap="2">
          <Share2 size={20} color="primaryText" />
          <Text fontFamily="heading" fontSize={22} fontWeight="700" color="text">
            {t("packs.share_title")}
          </Text>
        </XStack>
      </XStack>

      <Status loading={made === null && !failed} failed={failed} empty={empty} />

      {ticks && !empty ? (
        <>
          <SectionList
            sections={sections}
            keyExtractor={(row) => String(row.id)}
            stickySectionHeadersEnabled={false}
            // A screenful and a half: the default ten cut the first screen short on a tall phone.
            initialNumToRender={20}
            // Two screens each way, not the default ten: a row's photo is a `data:` string of 50 KB that
            // every mounted row holds several times over, and a full pack has 250 of them.
            windowSize={5}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
            renderSectionHeader={({ section }) => (
              <TickHeader
                testID={`pack-share-${section.kind}`}
                title={t(`packs.section_${section.kind}`)}
                all={t("packs.all")}
                none={t("packs.none")}
                onAll={() => setAll(section.kind, true)}
                onNone={() => setAll(section.kind, false)}
              />
            )}
            renderItem={({ item, section }) => (
              <TickRow
                testID={`pack-share-${section.kind}-${item.id}`}
                title={item.title}
                note={item.note}
                image={item.image}
                on={ticks[section.kind].has(item.id)}
                onToggle={() => toggle(section.kind, item.id)}
              />
            )}
          />
          <YStack px="4" pt="2" pb="3" gap="2">
            {picked === 0 ? (
              <Text fontSize={13} color="textSecondary" style={{ textAlign: "center" }}>
                {t("packs.nothing_ticked")}
              </Text>
            ) : null}
            <AppButton
              testID="pack-share-confirm"
              disabled={busy || picked === 0}
              // A full pack takes seconds to prepare: the button says it is at work.
              icon={
                busy ? (
                  <Spinner testID="pack-share-busy" size="small" color="textSecondary" />
                ) : (
                  <Share2
                    size={18}
                    color={`${picked === 0 ? "textSecondary" : "white"}`}
                    strokeWidth={2.5}
                  />
                )
              }
              onPress={() => {
                onShare().catch((error: unknown) => reportError("packs.share", error));
              }}
            >
              {t("quests.share_confirm")}
            </AppButton>
          </YStack>
        </>
      ) : null}
      {dialog}
    </YStack>
  );
}

/** Before the list, or instead of it: the read under way, the read that failed, nothing made yet. */
function Status({ loading, failed, empty }: { loading: boolean; failed: boolean; empty: boolean }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <YStack p="6" items="center">
        <Spinner testID="pack-share-loading" size="large" color="primaryText" />
      </YStack>
    );
  }
  if (!failed && !empty) return null;
  return (
    <YStack p="4">
      <Paragraph testID="pack-share-empty" color="textSecondary">
        {t(failed ? "packs.share_failed" : "packs.share_empty")}
      </Paragraph>
    </YStack>
  );
}

type RowData = {
  id: number;
  title: string;
  note?: string;
  image?: Parameters<typeof TickRow>[0]["image"];
};

function rowsOf(
  made: Made,
  language: ReturnType<typeof useSettingsStore.getState>["language"],
  t: ReturnType<typeof useTranslation>["t"],
): Record<Kind, RowData[]> {
  return {
    adventures: made.adventures.map((a) => ({
      id: a.id,
      title: localizedTitle(a, language),
      image: getAdventureAsset(a.imagePath ?? ""),
    })),
    quests: made.quests.map((q) => ({
      id: q.id,
      title: localizedTitle(q, language),
      note: `${t("quests.import_rounds", { count: q.rounds })} · ${t("packs.quest_slots", { count: q.exercises.length })}`,
      image: getQuestThumb(q.imagePath) ?? undefined,
    })),
    bosses: made.bosses.map((b) => ({
      id: b.id,
      title: b.name,
      image: getBossAsset(b.monster, 0, undefined, b.art),
    })),
    movements: made.movements.map((e) => ({
      id: e.id,
      title: localizedName(e, language),
      image: getExerciseThumb(e.imagePath),
    })),
  };
}
