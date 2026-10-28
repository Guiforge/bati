import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spinner, Text, XStack, YStack } from "tamagui";
import { AdventureImport } from "@/components/adventures/AdventureImport";
import { AppButton } from "@/components/common/AppButton";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { Input } from "@/components/common/Input";
import { Paragraph } from "@/components/common/Paragraph";
import { useToast } from "@/components/common/Toast";
import { Check, ChevronLeft, Download, Info } from "@/components/icons";
import { ImportClashes } from "@/components/quests/ImportNotes";
import { getExerciseThumb, getQuestThumb } from "@/constants/assetMap";
import { MIN_STEPS } from "@/db/heroAdventures";
import type { QuestTemplate } from "@/db/quests";
import { formatTarget } from "@/db/targets";
import {
  type AdventureFile,
  AdventureFileError,
  type AdventurePreview,
  parseAdventureData,
  previewAdventure,
} from "@/src/adventureFile";
import { localizedName, localizedTitle, seededLanguage } from "@/src/i18n/localized";
import { incomingFile, releaseIncomingFile } from "@/src/incomingFile";
import {
  editQuestFile,
  type ImportedQuest,
  importQuest,
  isRecord,
  type PreviewSlot,
  parseQuestData,
  previewQuest,
  type QuestFile,
  QuestFileError,
  type QuestPreview,
  readBatiFile,
} from "@/src/questFile";
import { reportError } from "@/src/reportError";
import { isSessionLive, useSessionStore } from "@/stores/session";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

/** What the file turned out to be. Null while that is unknown: a refusal before the kind is read. */
type FileKind = "quest" | "adventure";

type Loaded =
  | { status: "loading" }
  // `message` is an i18n key: the sentence depends on the kind, which a size or a read can refuse before it is known.
  | { status: "refused"; kind: FileKind | null; message: string }
  | { status: "ready"; file: QuestFile; preview: QuestPreview }
  | { status: "adventure"; file: AdventureFile; preview: AdventurePreview };

/**
 * A quest or an adventure someone sent, shown before it is filed with the hero's own. The file
 * says which it is (`kind`), and the screen shows the matching preview: this one for a quest,
 * `AdventureImport` for an adventure.
 *
 * Every door to an import ends here: the editor's button (`ImportFileButton`, through the
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
  const [titleLanguage, setTitleLanguage] = useState(seededLanguage(language));
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
    load(incomingFile(n), useSettingsStore.getState().language)
      .then((result) => {
        if (!alive) return;
        if (result.status === "ready") {
          // The language at the moment of reading: the field is the hero's from here on.
          const lang = seededLanguage(useSettingsStore.getState().language);
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

  // Opened from a chat, there is nothing under this screen to go back to: the gallery of the
  // file's kind (a kind never learned goes to the quests).
  const leave = () =>
    router.canGoBack() ? router.back() : router.replace(galleryOf(loaded) as never);

  // Whether the quest this would update is being played. A boolean selector: no churn per tick.
  const existing = loaded.status === "ready" ? loaded.preview.existing : null;
  const running = useSessionStore((s) => playsQuest(s, existing));
  // A session keeps its own copy of the quest, so updating the hero's here would not corrupt it,
  // but its recap would read slots that are not the ones played. The copy is offered instead.
  // ponytail: only this door is guarded. The quest editor and the sync merge can rewrite the same
  // quest mid-session too; harmless for the same reason (the session owns its copy and
  // `saveSession` writes by exerciseId and sortOrder), and the editor is a deliberate walk.

  const kept = keep.filter(Boolean).length;
  const canImport = loaded.status === "ready" && kept > 0 && title.trim() !== "" && !busy;
  const updating = existing !== null && !asCopy && !running;

  const arrivesTicked = (name: string) =>
    loaded.status === "ready" &&
    loaded.file.slots.some(
      ({ movement }, i) => keep[i] && "own" in movement && movement.own.name === name,
    );

  const onImport = async () => {
    if (loaded.status !== "ready" || working.current) return;
    working.current = true;
    setBusy(true);
    // The live store, not the render: a session that started since the last render still counts.
    const playingNow = playsQuest(useSessionStore.getState(), loaded.preview.existing);
    const done = await save(
      editQuestFile(loaded.file, {
        title,
        language: titleLanguage,
        keep,
        asCopy: asCopy || playingNow,
      }),
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
    <YStack flex={1} bg="background" pt={insets.top} pb={insets.bottom}>
      <XStack px="4" py="3" items="center" gap="3">
        <Button
          size="3"
          hitSlop={8}
          circular
          chromeless
          onPress={leave}
          aria-label={t("quests.go_back")}
          icon={<ChevronLeft size={24} color="text" />}
        />
        <XStack flex={1} items="center" gap="2">
          <Download size={20} color="primaryText" />
          <Text fontFamily="heading" fontSize={22} fontWeight="700" color="text">
            {t(headerTitle(loaded))}
          </Text>
        </XStack>
      </XStack>

      <OtherStates loaded={loaded} language={language} onLeave={leave} />

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
                running={running}
                onChange={setAsCopy}
              />
            ) : null}

            {/* An unticked movement does not arrive, so it sits beside nothing. */}
            <ImportClashes
              names={loaded.preview.clashes.filter(arrivesTicked)}
              gameNames={loaded.preview.gameNames.filter(arrivesTicked)}
              gameQuests={loaded.preview.gameQuests}
            />

            <YStack gap="2">
              <Text fontWeight="700" fontSize={14} color="textSecondary">
                {t("quests.import_movements")}
              </Text>
              {loaded.preview.slots.some((s) => s.available && !alreadyHere(s)) ? (
                <Text fontSize={13} color="textSecondary">
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

          <YStack px="4" pt="2" pb="3" gap="2">
            {kept === 0 ? (
              <Text fontSize={13} color="textSecondary" style={{ textAlign: "center" }}>
                {t("quests.import_none_kept")}
              </Text>
            ) : null}
            <AppButton
              testID="quest-import-confirm"
              disabled={!canImport}
              icon={
                <Download
                  size={18}
                  color={`${canImport ? "white" : "textSecondary"}`}
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

/** Everything but the quest preview: the spinner, a refusal, and the adventure preview. */
function OtherStates({
  loaded,
  language,
  onLeave,
}: {
  loaded: Loaded;
  language: AppLanguage;
  onLeave: () => void;
}) {
  if (loaded.status === "loading") {
    return (
      <YStack p="6" items="center">
        <Spinner testID="quest-import-loading" size="large" color="primaryText" />
      </YStack>
    );
  }
  if (loaded.status === "refused") return <Refused message={loaded.message} onLeave={onLeave} />;
  if (loaded.status === "adventure") {
    return <AdventureImport file={loaded.file} preview={loaded.preview} language={language} />;
  }
  return null;
}

/** The same live test the store applies when a session starts (`isSessionLive`), on one quest. */
function playsQuest(
  s: Pick<ReturnType<typeof useSessionStore.getState>, "status" | "quest">,
  existing: QuestTemplate | null,
) {
  return existing !== null && isSessionLive(s.status) && s.quest?.id === existing.id;
}

function galleryOf(loaded: Loaded): string {
  const adventure =
    loaded.status === "adventure" || (loaded.status === "refused" && loaded.kind === "adventure");
  return adventure ? "/adventures" : "/quests";
}

/** The header names the file once it is known, never the door that opened the screen. */
function headerTitle(loaded: Loaded): string {
  if (loaded.status === "ready") return "quests.import_title";
  if (loaded.status === "adventure") return "adventures.import_title";
  if (loaded.status !== "refused") return "common.file_received";
  if (loaded.kind === "quest") return "quests.import_title";
  return loaded.kind === "adventure" ? "adventures.import_title" : "common.file_received";
}

const refused = (kind: FileKind | null, message: string): Loaded => ({
  status: "refused",
  kind,
  message,
});

/**
 * The file at `uri` and what importing it would do, or why it is refused. Never rejects. The read
 * can refuse before the kind is known (not JSON, too big), so its two sentences hold for both.
 */
async function load(uri: string | null, language: AppLanguage): Promise<Loaded> {
  if (!uri) return refused(null, "adventures.import_unreadable");
  let data: unknown;
  try {
    data = await readBatiFile(uri);
  } catch (error) {
    if (error instanceof QuestFileError) {
      return refused(
        null,
        error.reason === "unreadable"
          ? "adventures.import_unreadable"
          : "adventures.import_not_an_adventure",
      );
    }
    // Not the file's fault: a provider that failed.
    reportError("quests.import.read", error);
    return refused(null, "adventures.import_unreadable");
  }
  if (isRecord(data) && data.kind === "bati-adventure") return loadAdventure(data, language);
  if (isRecord(data) && data.kind === "bati-quest") return loadQuest(data);
  return refused(null, "adventures.import_not_an_adventure");
}

async function loadAdventure(data: unknown, language: AppLanguage): Promise<Loaded> {
  try {
    const file = parseAdventureData(data);
    const preview = await previewAdventure(file, language);
    // Too few of its steps exist here: say what would fix it instead of a preview to nothing.
    if (preview.steps.filter((s) => s.status !== "missing").length < MIN_STEPS) {
      throw new AdventureFileError("unknown_quest");
    }
    return { status: "adventure", file, preview };
  } catch (error) {
    if (error instanceof AdventureFileError) {
      return refused("adventure", `adventures.import_${error.reason}`);
    }
    // A database that did not answer.
    reportError("quests.import.read", error);
    return refused("adventure", "adventures.import_unreadable");
  }
}

async function loadQuest(data: unknown): Promise<Loaded> {
  try {
    const file = parseQuestData(data);
    const preview = await previewQuest(file);
    // Nothing left to tick is a dead end: say what would fix it instead.
    if (!preview.slots.some((s) => s.available)) throw new QuestFileError("unknown_movement");
    return { status: "ready", file, preview };
  } catch (error) {
    if (error instanceof QuestFileError) return refused("quest", `quests.import_${error.reason}`);
    // Not the file's fault: a database that did not answer.
    reportError("quests.import.read", error);
    return refused("quest", "quests.import_unreadable");
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
  const description = quest.description[seededLanguage(language)];
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
      <YStack gap="2">
        <Text fontWeight="700" fontSize={14} color="textSecondary">
          {t("quests.editor_name")}
        </Text>
        <Input
          testID="quest-import-title"
          value={title}
          onChangeText={onTitle}
          maxLength={120}
          bg="background"
          borderColor="borderStrong"
          color="text"
        />
        {description ? (
          <Paragraph color="textSecondary" numberOfLines={6}>
            {description}
          </Paragraph>
        ) : null}
        <Text fontSize={13} color="textSecondary">
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

function Refused({ message, onLeave }: { message: string; onLeave: () => void }) {
  const { t } = useTranslation();
  return (
    <YStack p="4" gap="3">
      <Card gap="3">
        <Paragraph testID="quest-import-refused" color="text">
          {t(message)}
        </Paragraph>
      </Card>
      <AppButton variant="outline" onPress={onLeave}>
        {t("quests.go_back")}
      </AppButton>
    </YStack>
  );
}

/** The hero's own quest this file would update, and the choice to keep both instead. */
function ExistingQuest({
  quest,
  language,
  asCopy,
  running,
  onChange,
}: {
  quest: QuestTemplate;
  language: AppLanguage;
  asCopy: boolean;
  running: boolean;
  onChange: (asCopy: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card gap="3" testID="quest-import-existing">
      <XStack gap="2" items="center">
        {/* Neutral: meeting a quest you already have is the normal case, not a warning. */}
        <Info testID="quest-import-existing-icon" size={18} color="textSecondary" />
        <Text flex={1} color="text" fontWeight="700">
          {t("quests.import_existing", { title: localizedTitle(quest, language) })}
        </Text>
      </XStack>
      {running ? (
        <Text testID="quest-import-running" color="textSecondary" fontSize={13}>
          {t("quests.import_running")}
        </Text>
      ) : (
        <XStack gap="2" flexWrap="wrap">
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
      )}
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
      <XStack testID={`quest-import-have-${index}`} gap="3" items="center" p="2">
        <Image
          source={getExerciseThumb(exercise.imagePath)}
          style={{ width: 48, height: 48, borderRadius: 8 }}
        />
        <YStack flex={1}>
          <Text color="text" fontWeight="600" numberOfLines={2}>
            {label}
          </Text>
          <Text fontSize={13} color="textSecondary" numberOfLines={1}>
            {formatTarget(target, language)}
          </Text>
          <Text fontSize={13} color="textSecondary" numberOfLines={1}>
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
        gap="3"
        items="center"
        p="2"
        rounded="4"
        borderWidth={1}
        borderColor="borderStrong"
        opacity={on ? 1 : 0.5}
      >
        <Image
          source={getExerciseThumb(exercise?.imagePath ?? own?.image ?? "")}
          style={{ width: 48, height: 48, borderRadius: 8 }}
        />
        <YStack flex={1}>
          <Text color="text" fontWeight="600" numberOfLines={2}>
            {label}
          </Text>
          <Text fontSize={13} color="textSecondary" numberOfLines={1}>
            {available ? formatTarget(target, language) : t("quests.import_missing_movement")}
          </Text>
        </YStack>
        <YStack
          width={28}
          height={28}
          rounded="2"
          borderWidth={2}
          borderColor="borderStrong"
          bg={`${on ? "primary" : "transparent"}`}
          items="center"
          justify="center"
        >
          {on ? <Check size={18} color="white" strokeWidth={3} /> : null}
        </YStack>
      </XStack>
    </Pressable>
  );
}
