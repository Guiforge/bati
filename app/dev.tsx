import { ChevronLeft } from "@tamagui/lucide-icons";
import { and, eq, lt } from "drizzle-orm";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import {
  calculateUserLevelFromXp,
  db,
  getTotalXp,
  getXpForLevel,
  listAdventures,
  schema,
  startAdventureRun,
} from "@/db";
import { getOrCreateBossFight } from "@/db/bossFights";
import { useUserStore } from "@/stores/user";

// Dev-only screen: no i18n, no polish. Reachable from Settings, and only under __DEV__.

const { completedQuest, adventureRunSteps, bossFights } = schema;

// Levels are derived from the XP sum of completed sessions, so faking a level means faking a
// session. This one row carries the marker so it can be removed again instead of piling up.
const DEV_XP_NOTE = "__dev_xp";

async function setDevLevel(level: number): Promise<void> {
  await db.delete(completedQuest).where(eq(completedQuest.notes, DEV_XP_NOTE));
  const realXp = await getTotalXp();
  const targetXp = getXpForLevel(level);
  // Real sessions can already put the hero above the target: XP is only ever added, never
  // deducted, so going down means deleting real history — not this screen's job.
  if (targetXp > realXp) {
    await db.insert(completedQuest).values({
      xpEarned: targetXp - realXp,
      durationSeconds: 0,
      notes: DEV_XP_NOTE,
    });
  }
}

export default function DevScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setHasFinishedOnboarding = useUserStore((s) => s.setHasFinishedOnboarding);

  const [xp, setXp] = useState(0);
  const [status, setStatus] = useState("");

  const refresh = useCallback(() => {
    getTotalXp()
      .then(setXp)
      .catch(() => setStatus("XP read failed"));
  }, []);

  useEffect(refresh, [refresh]);

  const level = calculateUserLevelFromXp(xp);

  const jumpLevel = useCallback(
    (delta: number) => {
      setDevLevel(Math.max(1, level + delta))
        .then(() => {
          setStatus("");
          refresh();
        })
        .catch(() => setStatus("Level change failed"));
    },
    [level, refresh],
  );

  const clearDevXp = useCallback(() => {
    db.delete(completedQuest)
      .where(eq(completedQuest.notes, DEV_XP_NOTE))
      .then(() => {
        setStatus("");
        refresh();
      })
      .catch(() => setStatus("Reset failed"));
  }, [refresh]);

  // Boss adventures are campaigns whose last step is the fight, so getting there normally means
  // playing every step before it. This completes them and drops straight into the final step.
  const startBossFight = useCallback(
    async (nearlyDead: boolean) => {
      const boss = (await listAdventures()).find((a) => a.kind === "boss");
      if (!boss) {
        setStatus("No boss adventure in the seed data");
        return;
      }

      const run = await startAdventureRun({ adventureId: boss.id });
      const last = run.steps[run.steps.length - 1];
      if (!last) {
        setStatus("Boss adventure has no steps");
        return;
      }

      const now = new Date();
      await db
        .update(adventureRunSteps)
        .set({ status: "completed", completedAt: now })
        .where(
          and(
            eq(adventureRunSteps.runId, run.run.id),
            lt(adventureRunSteps.stepIndex, last.stepIndex),
          ),
        );
      await db
        .update(adventureRunSteps)
        .set({ status: "active", startedAt: now, completedAt: null, completedSessionId: null })
        .where(eq(adventureRunSteps.id, last.id));

      // One session cannot normally take a boss from full HP to zero, so the victory screen is
      // otherwise a multi-session wait to look at.
      const fight = await getOrCreateBossFight(boss.id);
      if (fight) {
        await db
          .update(bossFights)
          .set({ currentHp: nearlyDead ? 1 : fight.totalHp, defeatedAt: null })
          .where(eq(bossFights.id, fight.id));
      }

      router.push(`/quests/${last.questId}?level=medium&runStepId=${last.id}` as never);
    },
    [router],
  );

  const runBossFight = useCallback(
    (nearlyDead: boolean) => {
      startBossFight(nearlyDead).catch((e: unknown) => {
        setStatus(e instanceof Error ? e.message : "Boss fight failed");
      });
    },
    [startBossFight],
  );

  if (!__DEV__) return null;

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          circular
          chromeless
          onPress={() => router.back()}
          icon={<ChevronLeft size={24} color="$text" />}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        />
        <Text fontSize={20} fontWeight="700" color="$text">
          Dev tools
        </Text>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card p="$4" gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            Hero level {level} — {xp} XP
          </Text>
          <XStack gap="$2">
            <AppButton fullWidth={false} variant="secondary" onPress={() => jumpLevel(-1)}>
              -1
            </AppButton>
            <AppButton fullWidth={false} onPress={() => jumpLevel(1)}>
              +1
            </AppButton>
            <AppButton fullWidth={false} onPress={() => jumpLevel(5)}>
              +5
            </AppButton>
            <AppButton fullWidth={false} variant="secondary" onPress={clearDevXp}>
              Clear fake XP
            </AppButton>
          </XStack>
          <Paragraph fontSize="$2" color="$textSecondary">
            Going down only removes fake XP: real sessions keep their levels.
          </Paragraph>
        </Card>

        <Card p="$4" gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            Boss fight
          </Text>
          <AppButton onPress={() => runBossFight(false)}>Jump to boss fight</AppButton>
          <AppButton variant="secondary" onPress={() => runBossFight(true)}>
            Jump to boss fight (1 HP)
          </AppButton>
        </Card>

        <Card p="$4" gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            Onboarding
          </Text>
          <AppButton
            variant="secondary"
            onPress={() => {
              setHasFinishedOnboarding(false).catch(() => setStatus("Reset failed"));
            }}
          >
            Replay onboarding
          </AppButton>
        </Card>

        {status ? (
          <Text fontSize="$2" color="$textSecondary">
            {status}
          </Text>
        ) : null}
      </RNScrollView>
    </YStack>
  );
}
