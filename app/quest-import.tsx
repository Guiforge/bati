import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Paragraph, Spinner, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { useToast } from "@/components/common/Toast";
import { Check, ChevronLeft, Download, Info } from "@/components/icons";
import { getExerciseThumb, getQuestThumb } from "@/constants/assetMap";
import type { QuestTemplate } from "@/db/quests";
import { formatTarget } from "@/db/targets";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { incomingFile, releaseIncomingFile } from "@/src/incomingFile";
import {
  editQuestFile,
  type ImportedQuest,
  importQuest,
  type PreviewSlot,
  previewQuest,
  type QuestFile,
  QuestFileError,
  type QuestPreview,
  readQuestFile,
} from "@/src/questFile";
import { reportError } from "@/src/reportError";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

type Loaded =
  | { status: "loading" }
  | { status: "refused"; reason: QuestFileError["reason"] }
  | { status: "ready"; file: QuestFile; preview: QuestPreview };

/**
 * A quest someone sent, shown before it is filed with the hero's own.
 *
 * Every door to an import ends here: the editor's button (`ImportQuestButton`, through the
 * picker) and a file tapped in a chat or a download, which Android opens Bati with
 * (`app/+native-intent.tsx`). One screen, one writer (`importQuest`).
 *
 * The hero can rename the quest and leave movements out; a seed movement this version lacks is
 * left out for them rather than refusing the whole quest. A file carrying the uuid of one of
 * their quests says it will update that quest, and offers to keep both instead.
 */
export default function QuestImportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useToast();
  const language = useSettingsStore((s) => s.language);
  // A counter, not the URI: see `src/incomingFile.ts`. It changes for every file opened.
  const { n } = useLocalSearchParams<{ n?: string }>();

  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [title, setTitle] = useState("");
  // The language the field was filled in: comparing against another would read as a rename.
  const [titleLanguage, setTitleLanguage] = useState<AppLanguage>(language);
  const [keep, setKeep] = useState<boolean[]>([]);
  const [asCopy, setAsCopy] = useState(false);
  const [busy, setBusy] = useState(false);
  // Read synchronously, unlike the state: a double tap imported twice.
  const working = useRef(false);

  // Read at once: a `content://` grant lasts as long as the activity that received it.
  useEffect(() => {
    let alive = true;
    // A second file opened over this screen starts from nothing, not from the first one's choices.
    setLoaded({ status: "loading" });
    setAsCopy(false);
    load(incomingFile(n))
      .then((result) => {
        if (!alive) return;
        if (result.status === "ready") {
          // The language at the moment of reading: the field is the hero's from here on.
          const lang = useSettingsStore.getState().language;
          setTitleLanguage(lang);
          setTitle(result.file.quest.title[lang]);
          setKeep(result.preview.slots.map((s) => s.available));
        }
        setLoaded(result);
      })
      .catch((error: unknown) => reportError("quests.import.read", error));
    return () => {
      alive = false;
    };
  }, [n]);

  // Opened from a chat, there is nothing under this screen to go back to.
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/quests" as never));

  const kept = keep.filter(Boolean).length;
  const canImport = loaded.status === "ready" && kept > 0 && title.trim() !== "" && !busy;
  const updating = loaded.status === "ready" && loaded.preview.existing !== null && !asCopy;

  const onImport = async () => {
    if (loaded.status !== "ready" || working.current) return;
    working.current = true;
    setBusy(true);
    const done = await save(
      editQuestFile(loaded.file, { title, language: titleLanguage, keep, asCopy }),
    );
    working.current = false;
    setBusy(false);
    if ("error" in done) {
      showError(t(done.error));
      return;
    }
    releaseIncomingFile();
    showSuccess(t(done.updated ? "quests.import_updated" : "quests.import_done"));
    // Down to the gallery, then the quest on it: back from the quest lands on the gallery. A
    // replace left a second tab navigator on the stack, and `dismissTo` the quest alone kept the
    // empty editor the picker was opened from underneath it.
    router.dismissTo("/quests" as never);
    router.push(`/quests/${done.id}` as never);
  };

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          hitSlop={8}
          circular
          chromeless
          onPress={leave}
          aria-label={t("quests.go_back", "Go back")}
          icon={<ChevronLeft size={24} color="$text" />}
        />
        <XStack flex={1} items="center" gap="$2">
          <Download size={20} color="$primaryText" />
          <Text fontFamily="$heading" fontSize={22} fontWeight="700" color="$text">
            {t("quests.import_title")}
          </Text>
        </XStack>
      </XStack>

      {loaded.status === "loading" ? (
        <YStack p="$6" items="center">
          <Spinner testID="quest-import-loading" size="large" color="$primaryText" />
        </YStack>
      ) : null}

      {loaded.status === "refused" ? <Refused reason={loaded.reason} onLeave={leave} /> : null}

      {loaded.status === "ready" ? (
        <>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
          >
            <QuestHead
              quest={loaded.file.quest}
              language={language}
              title={title}
              onTitle={setTitle}
            />

            {loaded.preview.existing ? (
              <ExistingQuest
                quest={loaded.preview.existing}
                language={language}
                asCopy={asCopy}
                onChange={setAsCopy}
              />
            ) : null}

            <YStack gap="$2">
              <Text fontWeight="700" fontSize={14} color="$textSecondary">
                {t("quests.import_movements")}
              </Text>
              {loaded.preview.slots.some((s) => s.available && !alreadyHere(s)) ? (
                <Text fontSize={13} color="$textSecondary">
                  {t("quests.import_unticked_hint")}
                </Text>
              ) : null}
              {loaded.file.slots.map((slot, i) => (
                <SlotRow
                  // biome-ignore lint/suspicious/noArrayIndexKey: a file's slots have no id, and a movement can appear twice.
                  key={i}
                  index={i}
                  slot={slot}
                  preview={loaded.preview.slots[i]}
                  on={keep[i] === true}
                  language={language}
                  onToggle={() => setKeep((prev) => prev.map((k, j) => (j === i ? !k : k)))}
                />
              ))}
            </YStack>
          </ScrollView>

          <YStack px="$4" pt="$2" pb="$3" gap="$2">
            {kept === 0 ? (
              <Text fontSize={13} color="$textSecondary" style={{ textAlign: "center" }}>
                {t("quests.import_none_kept")}
              </Text>
            ) : null}
            <AppButton
              testID="quest-import-confirm"
              disabled={!canImport}
              icon={
                <Download
                  size={18}
                  color={canImport ? "$white" : "$textSecondary"}
                  strokeWidth={2.5}
                />
              }
              onPress={() => {
                onImport().catch((error: unknown) => reportError("quests.import", error));
              }}
            >
              {t(updating ? "quests.import_confirm_update" : "quests.import_confirm")}
            </AppButton>
          </YStack>
        </>
      ) : null}
    </YStack>
  );
}

/** The file at `uri` and what importing it would do, or why it is refused. Never rejects. */
async function load(uri: string | null): Promise<Loaded> {
  try {
    if (!uri) throw new QuestFileError("unreadable");
    const file = await readQuestFile(uri);
    const preview = await previewQuest(file);
    // Nothing left to tick is a dead end: say what would fix it instead.
    if (!preview.slots.some((s) => s.available)) throw new QuestFileError("unknown_movement");
    return { status: "ready", file, preview };
  } catch (error) {
    if (error instanceof QuestFileError) return { status: "refused", reason: error.reason };
    // Not the file's fault: a provider that failed, a database that did not answer.
    reportError("quests.import.read", error);
    return { status: "refused", reason: "unreadable" };
  }
}

/** The cover, the title the hero can change, and what the sender wrote about the quest. */
function QuestHead({
  quest,
  language,
  title,
  onTitle,
}: {
  quest: QuestFile["quest"];
  language: AppLanguage;
  title: string;
  onTitle: (title: string) => void;
}) {
  const { t } = useTranslation();
  const description = quest.description[language];
  // A file from 2.7.0 names the placeholder, which has no thumbnail: no empty frame for it.
  const cover = getQuestThumb(quest.image);
  return (
    <>
      {cover ? (
        <Image
          source={cover}
          style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 12 }}
          contentFit="cover"
        />
      ) : null}
      <YStack gap="$2">
        <Text fontWeight="700" fontSize={14} color="$textSecondary">
          {t("quests.editor_name", "Name")}
        </Text>
        <Input
          testID="quest-import-title"
          value={title}
          onChangeText={onTitle}
          maxLength={120}
          bg="$background"
          borderColor="$borderStrong"
          color="$text"
        />
        {description ? (
          <Paragraph color="$textSecondary" numberOfLines={6}>
            {description}
          </Paragraph>
        ) : null}
        <Text fontSize={13} color="$textSecondary">
          {t("quests.import_rounds", { count: quest.rounds })}
        </Text>
      </YStack>
    </>
  );
}

/** The import, or the sentence that says why it failed. Never rejects. */
async function save(file: QuestFile): Promise<ImportedQuest | { error: string }> {
  try {
    return await importQuest(file);
  } catch (error) {
    if (error instanceof QuestFileError) return { error: `quests.import_${error.reason}` };
    reportError("quests.import", error);
    return { error: "quests.import_failed" };
  }
}

function Refused({ reason, onLeave }: { reason: QuestFileError["reason"]; onLeave: () => void }) {
  const { t } = useTranslation();
  return (
    <YStack p="$4" gap="$3">
      <Card gap="$3">
        <Paragraph testID="quest-import-refused" color="$text">
          {t(`quests.import_${reason}`)}
        </Paragraph>
      </Card>
      <AppButton variant="outline" onPress={onLeave}>
        {t("quests.go_back", "Go back")}
      </AppButton>
    </YStack>
  );
}

/** The hero's own quest this file would update, and the choice to keep both instead. */
function ExistingQuest({
  quest,
  language,
  asCopy,
  onChange,
}: {
  quest: QuestTemplate;
  language: AppLanguage;
  asCopy: boolean;
  onChange: (asCopy: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card gap="$3" testID="quest-import-existing">
      <XStack gap="$2" items="center">
        {/* Neutral: meeting a quest you already have is the normal case, not a warning. */}
        <Info testID="quest-import-existing-icon" size={18} color="$textSecondary" />
        <Text flex={1} color="$text" fontWeight="700">
          {t("quests.import_existing", { title: localizedTitle(quest, language) })}
        </Text>
      </XStack>
      <XStack gap="$2" flexWrap="wrap">
        <Chip
          testID="quest-import-update"
          label={t("quests.import_choice_update")}
          tone={asCopy ? "default" : "primary"}
          onPress={() => onChange(false)}
        />
        <Chip
          testID="quest-import-copy"
          label={t("quests.import_choice_copy")}
          tone={asCopy ? "primary" : "default"}
          onPress={() => onChange(true)}
        />
      </XStack>
    </Card>
  );
}

/** Already on this phone (seed or the hero's own copy): it comes with the quest, nothing to choose. */
function alreadyHere(preview: PreviewSlot | undefined): boolean {
  return preview?.available === true && preview.exercise !== null;
}

/** One movement of the file, ticked to come in. A seed movement this version lacks cannot be. */
function SlotRow({
  index,
  slot,
  preview,
  on,
  language,
  onToggle,
}: {
  index: number;
  slot: QuestFile["slots"][number];
  preview: PreviewSlot | undefined;
  on: boolean;
  language: AppLanguage;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const exercise = preview?.exercise ?? null;
  const available = preview?.available === true;
  const own = "own" in slot.movement ? slot.movement.own : null;
  const official = "official" in slot.movement ? slot.movement.official : "";
  const label = exercise ? localizedName(exercise, language) : (own?.name ?? official);
  const target = preview?.target ?? { type: slot.target.type, value: slot.target.max };

  if (exercise && alreadyHere(preview)) {
    return (
      <XStack testID={`quest-import-have-${index}`} gap="$3" items="center" p="$2">
        <Image
          source={getExerciseThumb(exercise.imagePath)}
          style={{ width: 48, height: 48, borderRadius: 8 }}
        />
        <YStack flex={1}>
          <Text color="$text" fontWeight="600" numberOfLines={2}>
            {label}
          </Text>
          <Text fontSize={13} color="$textSecondary" numberOfLines={1}>
            {formatTarget(target, language)}
          </Text>
          <Text fontSize={13} color="$textSecondary" numberOfLines={1}>
            {t("quests.import_have")}
          </Text>
        </YStack>
      </XStack>
    );
  }

  return (
    <Pressable
      testID={`quest-import-slot-${index}`}
      disabled={!available}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: !available }}
      accessibilityLabel={label}
      onPress={onToggle}
    >
      <XStack
        gap="$3"
        items="center"
        p="$2"
        rounded="$4"
        borderWidth={1}
        borderColor="$borderStrong"
        opacity={on ? 1 : 0.5}
      >
        <Image
          source={getExerciseThumb(exercise?.imagePath ?? own?.image ?? "")}
          style={{ width: 48, height: 48, borderRadius: 8 }}
        />
        <YStack flex={1}>
          <Text color="$text" fontWeight="600" numberOfLines={2}>
            {label}
          </Text>
          <Text fontSize={13} color="$textSecondary" numberOfLines={1}>
            {available ? formatTarget(target, language) : t("quests.import_missing_movement")}
          </Text>
        </YStack>
        <YStack
          width={28}
          height={28}
          rounded="$2"
          borderWidth={2}
          borderColor="$borderStrong"
          bg={on ? "$primary" : "transparent"}
          items="center"
          justify="center"
        >
          {on ? <Check size={18} color="$white" strokeWidth={3} /> : null}
        </YStack>
      </XStack>
    </Pressable>
  );
}
