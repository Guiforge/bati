import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, type TamaguiElement, Text, XStack, YStack } from "tamagui";
import { monsterName } from "@/components/adventures/monsterName";
import { BossLines } from "@/components/bosses/BossLines";
import { BossPictures } from "@/components/bosses/BossPictures";
import { Fold } from "@/components/bosses/Fold";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StatusBand } from "@/components/common/StatusBand";
import { useToast } from "@/components/common/Toast";
import { leavesWithoutAsking } from "@/components/common/useTabLeaveGuard";
import { ChevronLeft } from "@/components/icons";
import { getBossAsset } from "@/constants/assetMap";
import { cleanBossLines, MAX_BOSS_NAME } from "@/db/bossVoice";
import { listMonsters, listOfferedMonsters, type Monster } from "@/db/heroAdventures";
import {
  adventuresUsingBoss,
  createHeroBoss,
  deleteHeroBoss,
  emptyHeroBossDraft,
  getHeroBoss,
  type HeroBossDraft,
  HeroBossInUseError,
  updateHeroBoss,
} from "@/db/heroBosses";
import { MUSCLE_LABELS } from "@/db/labels";
import { type MuscleCode, muscleCodes } from "@/db/schema";
import { useHaptics } from "@/hooks/useHaptics";
import { useKeyboardShown } from "@/hooks/useKeyboardShown";
import { formatList, quoted } from "@/src/i18n/list";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type DialogState = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
};

/** One muscle or none, for the weakness and the resistance. */
function MusclePick({
  testID,
  label,
  value,
  onChange,
  language,
}: {
  testID: string;
  label: string;
  value: MuscleCode | null;
  onChange: (value: MuscleCode | null) => void;
  language: keyof (typeof MUSCLE_LABELS)["arms"];
}) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2" testID={testID}>
      <Text fontWeight="700" fontSize={14} color="$textSecondary">
        {label}
      </Text>
      <XStack flexWrap="wrap" gap="$2">
        <Chip
          testID={`${testID}-none`}
          label={t("boss_editor.no_muscle")}
          selected={value === null}
          tone={value === null ? "primary" : "default"}
          onPress={() => onChange(null)}
        />
        {muscleCodes.map((m) => (
          <Chip
            key={m}
            testID={`${testID}-${m}`}
            label={MUSCLE_LABELS[m][language]}
            selected={value === m}
            tone={value === m ? "primary" : "default"}
            onPress={() => onChange(m)}
          />
        ))}
      </XStack>
    </YStack>
  );
}

/**
 * Where the hero creates a boss, or edits one (`?id=`): a name, the pictures of its forms, the
 * painted monster they fall back to, a weakness and a resistance, and its lines. Reached from the
 * Forge and from the adventure editor's boss picker. No combat number is set here: the pool stays
 * derived from the adventure's steps.
 */
// ponytail: one long form, as the adventure editor is. Ceiling: it grows a section per new field; split the
// load and the two dialogs out when a third screen needs them.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above
export default function BossEditor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { success } = useHaptics();
  const { showSuccess } = useToast();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const bossId = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;

  const [monsters, setMonsters] = useState<readonly Monster[]>([]);
  const [offered, setOffered] = useState<ReadonlySet<string>>(new Set());
  const [draft, setDraft] = useState<HeroBossDraft | null>(null);
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false);
  const [nameMissing, setNameMissing] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const typing = useKeyboardShown();
  const skipGuardRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const nameRef = useRef<TamaguiElement>(null);
  const nameCardY = useRef(0);

  const isDirty = draft !== null && JSON.stringify(draft) !== baseline;
  const navigation = useNavigation();
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (leavesWithoutAsking(navigation, isDirty, skipGuardRef)) return;
      e.preventDefault();
      setDialog({
        title: t("quests.editor_discard_title"),
        body: t("quests.editor_discard_body"),
        confirmLabel: t("quests.editor_discard"),
        cancelLabel: t("common.cancel"),
        destructive: true,
        onConfirm: () => {
          Keyboard.dismiss();
          navigation.dispatch(e.data.action);
        },
      });
    });
  }, [navigation, t, isDirty]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listMonsters(),
      listOfferedMonsters(),
      bossId == null ? null : getHeroBoss(bossId),
    ])
      .then(([all, shown, boss]) => {
        if (cancelled) return;
        setMonsters(all);
        setOffered(new Set(shown.map((m) => m.key)));
        const first = shown[0]?.key ?? all[0]?.key ?? "stone_golem";
        const next: HeroBossDraft = boss
          ? {
              name: boss.name,
              monster: boss.monsterKey ?? first,
              weakness: boss.weakness,
              resistance: boss.resistance,
              lines: boss.lines,
              art: boss.art,
            }
          : emptyHeroBossDraft(first);
        setDraft(next);
        setBaseline(JSON.stringify(next));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        reportError("boss.editorLoad", error);
        setDialog({
          title: t("common.error"),
          body: t("errors.generic"),
          confirmLabel: t("common.close"),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [bossId, t]);

  const monster = monsters.find((m) => m.key === draft?.monster);
  const patch = (next: Partial<HeroBossDraft>) => setDraft((d) => (d ? { ...d, ...next } : d));

  const save = async () => {
    if (!draft || busy) return;
    if (draft.name.trim().length === 0) {
      setNameMissing(true);
      // The name is at the top and the save button at the bottom: take the hero to the message.
      scrollRef.current?.scrollTo({ y: Math.max(0, nameCardY.current - 16), animated: true });
      nameRef.current?.focus();
      return;
    }
    const clean: HeroBossDraft = { ...draft, lines: cleanBossLines(draft.lines) };
    // A promise chain, not `try ... finally`: the React Compiler cannot lower one.
    setBusy(true);
    skipGuardRef.current = true;
    await (bossId == null ? createHeroBoss(clean) : updateHeroBoss(bossId, clean))
      .then(() => {
        success();
        showSuccess(t("boss_editor.saved"));
        router.back();
      })
      .catch((error: unknown) => {
        skipGuardRef.current = false;
        reportError("boss.editorSave", error);
        setDialog({
          title: t("common.error"),
          body: t("boss_editor.save_failed"),
          confirmLabel: t("common.close"),
        });
      });
    setBusy(false);
  };

  const inUse = (using: readonly Parameters<typeof localizedTitle>[0][]) =>
    setDialog({
      title: t("boss_editor.in_use_title"),
      body: t("boss_editor.in_use_body", {
        count: using.length,
        titles: formatList(
          using.map((a) => quoted(localizedTitle(a, language), language)),
          language,
        ),
      }),
      confirmLabel: t("common.close"),
    });

  // A boss an adventure still ends on cannot go (`deleteHeroBoss` refuses too): say so before
  // asking, as the quest editor does, rather than after the hero said yes.
  const confirmDelete = () => {
    if (bossId == null) return;
    getHeroBoss(bossId)
      .then((boss) => (boss ? adventuresUsingBoss(boss.uuid) : []))
      .then((using) => (using.length > 0 ? inUse(using) : askDelete(bossId)))
      .catch((error: unknown) => {
        reportError("boss.deleteCheck", error);
        setDialog({
          title: t("common.error"),
          body: t("errors.generic"),
          confirmLabel: t("common.close"),
        });
      });
  };

  const askDelete = (bossId: number) => {
    setDialog({
      title: t("boss_editor.delete_title", { name: draft?.name.trim() ?? "" }),
      body: t("boss_editor.delete_body"),
      confirmLabel: t("boss_editor.delete_confirm"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        setBusy(true);
        skipGuardRef.current = true;
        deleteHeroBoss(bossId)
          .then(() => router.back())
          .catch((error: unknown) => {
            setBusy(false);
            skipGuardRef.current = false;
            if (error instanceof HeroBossInUseError) {
              inUse(error.using);
              return;
            }
            reportError("boss.delete", error);
            setDialog({
              title: t("common.error"),
              body: t("errors.generic"),
              confirmLabel: t("common.close"),
            });
          });
      },
    });
  };

  return (
    <YStack testID="boss-editor" flex={1} bg="$background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <YStack p="$5" pt={insets.top + 12} gap="$4">
            <XStack items="center" gap="$3">
              <AppIconButton
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t("quests.go_back")}
              >
                <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
              </AppIconButton>
              <Text
                flex={1}
                minW={0}
                fontFamily="$heading"
                fontWeight="700"
                fontSize={20}
                color="$text"
              >
                {bossId == null ? t("boss_editor.title_new") : t("boss_editor.title_edit")}
              </Text>
            </XStack>

            {draft ? (
              <>
                <Card
                  onLayout={(e) => {
                    nameCardY.current = e.nativeEvent.layout.y;
                  }}
                >
                  <YStack gap="$2">
                    <Text fontWeight="700" fontSize={14} color="$textSecondary">
                      {t("adventures.editor_boss_name")}
                    </Text>
                    <Input
                      ref={nameRef}
                      testID="boss-name"
                      height="auto"
                      minH={44}
                      value={draft.name}
                      onChangeText={(name) => {
                        patch({ name });
                        setNameMissing(false);
                      }}
                      maxLength={MAX_BOSS_NAME}
                      bg="$background"
                      borderColor={nameMissing ? "$error" : "$borderStrong"}
                      color="$text"
                    />
                    {nameMissing ? (
                      <Text
                        testID="boss-name-error"
                        accessibilityLiveRegion="polite"
                        fontSize={13}
                        color="$error"
                      >
                        {t("boss_editor.name_missing")}
                      </Text>
                    ) : null}
                  </YStack>
                </Card>

                <YStack gap="$2" testID="boss-monsters">
                  <Text fontWeight="700" fontSize={18} color="$text">
                    {t("boss_editor.monster")}
                  </Text>
                  <XStack flexWrap="wrap" gap="$2">
                    {monsters
                      .filter((m) => offered.has(m.key) || m.key === draft.monster)
                      .map((m) => {
                        const selected = draft.monster === m.key;
                        return (
                          <YStack
                            key={m.key}
                            testID={`boss-monster-${m.key}`}
                            onPress={() => patch({ monster: m.key })}
                            width="31%"
                            gap="$1"
                            p="$1"
                            borderWidth={2}
                            borderColor={selected ? "$primaryText" : "$borderStrong"}
                            rounded="$3"
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityLabel={monsterName(m, language)}
                          >
                            <Image
                              source={getBossAsset(m.bossImagePath)}
                              style={{ width: "100%", aspectRatio: 1, borderRadius: 8 }}
                              contentFit="cover"
                              accessible={false}
                            />
                          </YStack>
                        );
                      })}
                  </XStack>
                </YStack>

                <Text fontWeight="700" fontSize={18} color="$text">
                  {t("adventures.editor_boss_art_title")}
                </Text>
                {monster ? (
                  <BossPictures
                    art={draft.art}
                    monster={monster}
                    monsterLabel={monsterName(monster, language)}
                    onChange={(art) => patch({ art })}
                  />
                ) : null}

                <MusclePick
                  testID="boss-weakness"
                  label={t("boss_editor.weakness")}
                  value={draft.weakness}
                  onChange={(weakness) =>
                    patch({
                      weakness,
                      resistance: weakness === draft.resistance ? null : draft.resistance,
                    })
                  }
                  language={language}
                />
                <Text testID="boss-weakness-easier" fontSize={13} color="$textSecondary">
                  {t("boss_editor.weakness_easier")}
                </Text>
                <MusclePick
                  testID="boss-resistance"
                  label={t("boss_editor.resistance")}
                  value={draft.resistance}
                  onChange={(resistance) =>
                    patch({
                      resistance,
                      weakness: resistance === draft.weakness ? null : draft.weakness,
                    })
                  }
                  language={language}
                />

                <Fold testID="boss-voice-toggle" title={t("boss_editor.voice")}>
                  <BossLines lines={draft.lines} onChange={(lines) => patch({ lines })} />
                </Fold>

                {bossId != null ? (
                  <Text
                    testID="boss-delete"
                    onPress={confirmDelete}
                    minH={44}
                    color="$error"
                    fontWeight="700"
                    accessibilityRole="button"
                  >
                    {t("boss_editor.delete")}
                  </Text>
                ) : null}
              </>
            ) : null}
          </YStack>
        </ScrollView>

        <StatusBand />

        <YStack
          p="$4"
          pb={typing ? 16 : insets.bottom + 16}
          bg="$bgDark"
          borderTopWidth={1}
          borderColor="$borderStrong"
        >
          <AppButton
            testID="boss-save"
            height={56}
            disabled={busy || draft === null}
            aria-disabled={busy || draft === null}
            onPress={save}
          >
            {t("boss_editor.save")}
          </AppButton>
        </YStack>
      </KeyboardAvoidingView>
      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        body={dialog?.body ?? ""}
        confirmLabel={dialog?.confirmLabel ?? ""}
        cancelLabel={dialog?.cancelLabel}
        destructive={dialog?.destructive}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          const confirm = dialog?.onConfirm;
          setDialog(null);
          confirm?.();
        }}
      />
    </YStack>
  );
}
