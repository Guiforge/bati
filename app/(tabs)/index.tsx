import { ScrollView } from "react-native";
import { YStack } from "tamagui";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeStage } from "@/components/home/HomeStage";
import { OathCard } from "@/components/home/OathCard";
import { RestNote } from "@/components/home/RestNote";
import { StatsOverview } from "@/components/home/StatsOverview";
import { VillageTeaser } from "@/components/home/VillageTeaser";
import { SessionRecoveryBanner } from "@/components/session/SessionRecoveryCard";

/**
 * THESIS: Home is the hero's HUD — fixed chrome frames a living center stage.
 * Refused default: a scrolling stack of same-size stat cards under a greeting.
 * OWN-WORLD: void ground, hairline-framed chrome strips, electric blue for the
 * one action, gold for all progression, adventure art as the only scene.
 * STORY: where I am (top strip), tonight's quest (stage, one tap to PLAY),
 * what my effort built (village band).
 * FIRST VIEWPORT: status strip pinned top; adventure scene + PLAY commanding
 * the center; oath and lifetime legend below; village band pinned bottom.
 * FORM: HUD frame — candidate 3 of the grounded list, seed 8f3d5359;
 * challengers discarded (none beat it without breaking the committed identity).
 */
export default function HomeScreen() {
  return (
    <YStack flex={1} bg="$background">
      {/* HUD top chrome: identity, level, XP, streak — owns the top inset, never scrolls */}
      <HomeHeader />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <YStack px="$4" pt="$3" gap="$4">
          {/* An interrupted session outranks any suggestion — it renders nothing when there is
              none to resume. Without it, quitting mid-quest left no trace anywhere. */}
          <SessionRecoveryBanner />

          {/* Center stage: tonight's scene, one action that starts it */}
          <HomeStage />

          {/* Advice, never a gate: the stage still offers a session underneath it */}
          <RestNote />

          {/* Chosen objective (shows a swear-CTA when none is active) */}
          <OathCard />

          {/* Lifetime legend: one line, not a stat-card grid */}
          <StatsOverview />
        </YStack>
      </ScrollView>

      {/* HUD bottom chrome: the world the training built — never scrolls */}
      <VillageTeaser />
    </YStack>
  );
}
