import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { monsterName } from "@/components/adventures/monsterName";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { useToast } from "@/components/common/Toast";
import { Download, Info } from "@/components/icons";
import { ADVENTURE_ASSETS, getAdventureAsset } from "@/constants/assetMap";
import {
  type AdventureFile,
  AdventureFileError,
  type AdventurePreview,
  importAdventure,
} from "@/src/adventureFile";
import { releaseIncomingFile } from "@/src/incomingFile";
import { reportError } from "@/src/reportError";
import type { AppLanguage } from "@/stores/settings";

/**
 * An adventure someone sent, shown before it is filed with the hero's own: its cover, its text,
 * its end, and for each step whether the quest is already on this phone, arrives with the
 * adventure, or is unknown to this version and left out. One button, no per-step choice: the hero
 * edits or retires it afterwards with the adventure editor. Rendered by `app/quest-import.tsx`.
 */
export function AdventureImport({
  file,
  preview,
  language,
}: {
  file: AdventureFile;
  preview: AdventurePreview;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [asCopy, setAsCopy] = useState(false);
  const [busy, setBusy] = useState(false);
  // Read synchronously, unlike the state: a double tap imported twice.
  const working = useRef(false);

  const { adventure } = file;
  const { existing, running } = preview;
  // A run under way forces the copy, so the chips are not offered and the button says "add".
  const updating = existing !== null && !asCopy && !running;
  const cover = coverKey(adventure.cover);

  // No try/finally: the React Compiler does not compile a function that has one.
  const onImport = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    const done = await save(file, asCopy);
    working.current = false;
    setBusy(false);
    if ("error" in done) {
      showError(t(done.error));
      return;
    }
    releaseIncomingFile();
    showSuccess(t(done.updated ? "adventures.import_updated" : "adventures.import_done"));
    // Down to the gallery, then the adventure on it, whichever button or chat opened the file.
    router.dismissTo("/adventures" as never);
    router.push(`/adventures/${done.id}` as never);
  };

  return (
    <>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
      >
        <Image
          source={getAdventureAsset(cover)}
          style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 12 }}
          contentFit="cover"
        />
        <YStack gap="$2">
          <Text
            testID="adventure-import-title"
            fontFamily="$heading"
            fontWeight="700"
            fontSize={22}
            color="$text"
          >
            {adventure.title}
          </Text>
          {adventure.description ? (
            <Paragraph color="$textSecondary" numberOfLines={6}>
              {adventure.description}
            </Paragraph>
          ) : null}
          <Text color="$textSecondary" fontSize={14}>
            {preview.monster
              ? t("adventures.editor_summary_boss", {
                  name: bossLabel(adventure.end, monsterName(preview.monster, language)),
                })
              : t("adventures.editor_end_route")}
          </Text>
          {preview.monsterUnknown ? (
            <Text testID="adventure-import-boss-unknown" color="$textSecondary" fontSize={13}>
              {t("adventures.import_boss_unknown")}
            </Text>
          ) : null}
        </YStack>

        {existing ? (
          <Card gap="$3" testID="adventure-import-existing">
            <XStack gap="$2" items="center">
              {/* Neutral: meeting an adventure you already have is the normal case, not a warning. */}
              <Info size={18} color="$textSecondary" />
              <Text flex={1} color="$text" fontWeight="700">
                {t("adventures.import_existing", { title: existing.title })}
              </Text>
            </XStack>
            {running ? (
              <Text testID="adventure-import-running" color="$textSecondary" fontSize={13}>
                {t("adventures.import_running")}
              </Text>
            ) : (
              <XStack gap="$2" flexWrap="wrap">
                <Chip
                  testID="adventure-import-update"
                  label={t("adventures.import_choice_update")}
                  tone={asCopy ? "default" : "primary"}
                  onPress={() => setAsCopy(false)}
                />
                <Chip
                  testID="adventure-import-copy"
                  label={t("adventures.import_choice_copy")}
                  tone={asCopy ? "primary" : "default"}
                  onPress={() => setAsCopy(true)}
                />
              </XStack>
            )}
          </Card>
        ) : null}

        <YStack gap="$2">
          <Text fontWeight="700" fontSize={14} color="$textSecondary">
            {t("adventures.import_steps")}
          </Text>
          {preview.steps.map((step, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a file's steps have no id, and a quest can appear twice.
            <StepRow key={i} index={i} step={step} />
          ))}
        </YStack>
      </ScrollView>

      <YStack px="$4" pt="$2" pb="$3">
        <AppButton
          testID="adventure-import-confirm"
          disabled={busy}
          icon={<Download size={18} color={busy ? "$textSecondary" : "$white"} strokeWidth={2.5} />}
          onPress={() => {
            onImport().catch((error: unknown) => reportError("adventures.import", error));
          }}
        >
          {t(updating ? "adventures.import_confirm_update" : "adventures.import_confirm")}
        </AppButton>
      </YStack>
    </>
  );
}

function StepRow({ index, step }: { index: number; step: AdventurePreview["steps"][number] }) {
  const { t } = useTranslation();
  return (
    <XStack
      testID={`adventure-import-step-${index}`}
      gap="$3"
      items="center"
      p="$2"
      opacity={step.status === "missing" ? 0.5 : 1}
    >
      <Text color="$textSecondary" fontWeight="700" width={20}>
        {index + 1}
      </Text>
      <YStack flex={1}>
        <Text color="$text" fontWeight="600" numberOfLines={2}>
          {step.title}
        </Text>
        <Text fontSize={13} color="$textSecondary">
          {t(`adventures.import_step_${step.status}`)}
        </Text>
      </YStack>
    </XStack>
  );
}

/** The name the file's sender gave their boss, else the painted one's. */
function bossLabel(end: AdventureFile["adventure"]["end"], painted: string): string {
  return (end.kind === "boss" && end.name) || painted;
}

/** The file's cover when this version has that art, else the default cover. */
function coverKey(cover: string | null): string {
  return cover !== null && Object.hasOwn(ADVENTURE_ASSETS, cover)
    ? cover
    : (Object.keys(ADVENTURE_ASSETS)[0] ?? "");
}

/** The import, or the sentence that says why it failed. Never rejects. */
async function save(
  file: AdventureFile,
  asCopy: boolean,
): Promise<{ id: number; updated: boolean } | { error: string }> {
  try {
    return await importAdventure(file, { asCopy });
  } catch (error) {
    if (error instanceof AdventureFileError) return { error: `adventures.import_${error.reason}` };
    reportError("adventures.import", error);
    return { error: "adventures.import_failed" };
  }
}
