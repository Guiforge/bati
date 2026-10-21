import { useFocusEffect, useRouter } from "expo-router";
import { type ReactNode, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { SectionLabel } from "@/components/common/SectionLabel";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { ImportFileButton } from "@/components/quests/QuestFileButtons";
import { listAdventures } from "@/db/adventures";
import { isUserExercise, listExercises } from "@/db/exercises";
import { isUserQuest, listQuestTemplates, USER_QUEST_AUTHOR } from "@/db/quests";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** How many of each the page lists: the rest is one tap away in the gallery. */
const SHOWN = 3;

type Row = { id: number; name: string };
type Made = { quests: Row[]; adventures: Row[]; exercises: Row[] };
const NOTHING: Made = { quests: [], adventures: [], exercises: [] };

function ForgeSection({
  testID,
  title,
  rows,
  empty,
  open,
  seeAll,
  create,
  createLabel,
}: {
  testID: string;
  title: string;
  rows: Row[];
  empty: string;
  open: (id: number) => void;
  seeAll: () => void;
  create: () => void;
  createLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <YStack testID={testID} gap="$2">
      <SectionLabel>{title}</SectionLabel>
      {rows.length === 0 ? (
        <Paragraph color="$textSecondary" size="$3">
          {empty}
        </Paragraph>
      ) : (
        rows.slice(0, SHOWN).map((row) => (
          <XStack
            key={row.id}
            testID={`${testID}-${row.id}`}
            minH={44}
            items="center"
            gap="$2"
            onPress={() => open(row.id)}
            pressStyle={{ opacity: 0.7 }}
            accessibilityRole="button"
            accessibilityLabel={row.name}
          >
            <Text flex={1} minW={0} color="$text" fontSize={15} numberOfLines={2}>
              {row.name}
            </Text>
            <ChevronRight size={16} color="$textSecondary" />
          </XStack>
        ))
      )}
      {rows.length > 0 ? (
        <XStack
          testID={`${testID}-all`}
          self="flex-start"
          minH={44}
          items="center"
          gap={4}
          onPress={seeAll}
          pressStyle={{ opacity: 0.7 }}
          accessibilityRole="link"
          accessibilityLabel={t("forge.see_all")}
        >
          <Text fontSize={13} fontWeight="600" color="$primaryText">
            {t("forge.see_all")}
          </Text>
          <ChevronRight size={16} color="$primaryText" />
        </XStack>
      ) : null}
      <AppButton testID={`${testID}-new`} variant="outline" fontSize={16} onPress={create}>
        {createLabel}
      </AppButton>
    </YStack>
  );
}

/**
 * The Forge: what the hero has made, the doors to make more, and the one way in for a file
 * someone sent. It is the village's Forge building (its sheet says "Enter the forge"), and the
 * galleries' "Create" button, and it adds no data: each row opens the screen the galleries
 * already open, each button pushes the route they already push.
 *
 * A root route and not a tab: the tab bar is full, and out here it escapes the gallery stacks'
 * pop-to-top on blur.
 */
export default function ForgeScreen(): ReactNode {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const [made, setMade] = useState<Made>(NOTHING);

  // On focus: coming back from an editor has to show what was just written.
  useFocusEffect(
    useCallback(() => {
      Promise.all([listQuestTemplates(), listAdventures(), listExercises()])
        .then(([quests, adventures, exercises]) => {
          // Newest first: ids only grow, and the page keeps the last three.
          const newest = <T extends { id: number }>(list: T[]) =>
            [...list].sort((a, b) => b.id - a.id);
          setMade({
            quests: newest(quests.filter(isUserQuest)).map((q) => ({
              id: q.id,
              name: localizedTitle(q, language),
            })),
            adventures: newest(
              adventures.filter((a) => a.author === USER_QUEST_AUTHOR && a.isActive === 1),
            ).map((a) => ({ id: a.id, name: localizedTitle(a, language) })),
            exercises: newest(exercises.filter((e) => isUserExercise(e) && !e.retiredAt)).map(
              (e) => ({ id: e.id, name: localizedName(e, language) }),
            ),
          });
        })
        .catch((e: unknown) => reportError("forge.load", e));
    }, [language]),
  );

  return (
    <YStack testID="forge-screen" flex={1} bg="$bgDark">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
          gap: 24,
        }}
      >
        <YStack gap="$2">
          <XStack items="center" gap="$3">
            <AppIconButton
              testID="forge-back"
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t("exercises.go_back")}
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
              numberOfLines={1}
            >
              {t("forge.title")}
            </Text>
          </XStack>
          <Text color="$textSecondary" fontSize={13}>
            {t("forge.subtitle")}
          </Text>
        </YStack>

        <ForgeSection
          testID="forge-quests"
          title={t("forge.quests")}
          rows={made.quests}
          empty={t("forge.quests_empty")}
          open={(id) => router.push(`/quests/${id}` as never)}
          seeAll={() => router.push("/quests" as never)}
          create={() => router.push("/quests/edit" as never)}
          createLabel={t("quests.editor_new_title")}
        />
        <ForgeSection
          testID="forge-adventures"
          title={t("forge.adventures")}
          rows={made.adventures}
          empty={t("forge.adventures_empty")}
          open={(id) => router.push(`/adventures/${id}` as never)}
          seeAll={() => router.push("/adventures" as never)}
          create={() => router.push("/adventures/edit" as never)}
          createLabel={t("adventures.write")}
        />
        <ForgeSection
          testID="forge-exercises"
          title={t("forge.exercises")}
          rows={made.exercises}
          empty={t("forge.exercises_empty")}
          open={(id) => router.push(`/exercises/${id}` as never)}
          seeAll={() => router.push("/exercises?mine=1" as never)}
          create={() => router.push("/exercises/new" as never)}
          createLabel={t("exercise_editor.title_new")}
        />

        {/* The one way in for a file someone sent: a quest or an adventure, the preview reads which. */}
        <YStack gap="$2">
          <ImportFileButton
            label="forge.import"
            hint="forge.import_hint"
            failed="forge.import_failed"
            testID="forge-import"
          />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
