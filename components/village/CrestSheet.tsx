import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { FormSheet } from "@/components/common/FormSheet";
import { Check, ChevronRight } from "@/components/icons";
import { Crest, type CrestShape } from "@/components/village/Crest";
import { PRACTICE_KEY, sentence } from "@/components/village/crestText";
import { ANIMAL_TOKEN } from "@/constants/animalColors";
import type { Crest as CrestData } from "@/db/crest";
import {
  ANIMAL_OF,
  type Animal,
  PRACTICES,
  type Practice,
  practiceOfAnimal,
} from "@/db/crestRules";
import { preferences } from "@/db/preferences";
import { reportError } from "@/src/reportError";

/** One sheet, two views: the stack of two modals this would be is where the ghost panes come from. */
export type CrestView = "why" | "pick";

const ORDER: readonly Animal[] = ["bear", "stag", "horse", "salmon", "ermine", "boar"];

type Props = {
  view: CrestView | null;
  /** Null before the reveal: there is no shield to explain. */
  crest: CrestData | null;
  onView: (view: CrestView) => void;
  onClose: () => void;
  /** A choice was written: the caller reads the crest again. */
  onChanged: () => void;
};

/** The practices done in the first 8, the most often first, ties in the fixed order. */
const barsOf = (crest: CrestData): [Practice, number][] =>
  PRACTICES.map((p): [Practice, number] => [p, crest.evidence.firstEight[p]])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

function Link({ testID, label, onPress }: { testID: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <XStack items="center" gap="$1">
        <Text fontSize={15} fontWeight="600" color="$primaryText">
          {label}
        </Text>
        <ChevronRight size={16} color="$primaryText" />
      </XStack>
    </Pressable>
  );
}

/** Writes the choice and closes: no confirmation, going back is one tap more. `auto` is written, never deleted. */
function useChoose(onChanged: () => void, onClose: () => void) {
  return (value: Animal | "auto") => {
    preferences
      .setCrestAnimal(value)
      .then(() => {
        onChanged();
        onClose();
      })
      .catch((error) => reportError("village.crestChoice", error));
  };
}

function Why({
  crest,
  onView,
  choose,
}: {
  crest: CrestData;
  onView: (v: CrestView) => void;
  choose: (v: Animal | "auto") => void;
}) {
  const { t } = useTranslation();
  const { first, firstEight, totals, secondFromSessions } = crest.evidence;
  const firstPractice = practiceOfAnimal(first);
  const list = barsOf(crest)
    .map(([p, n]) => `${t(PRACTICE_KEY[p])} ${n}`)
    .join(", ");

  if (crest.manual) {
    return (
      <>
        <Text testID="crest-why-chosen" fontSize={15} color="$text">
          {firstPractice === undefined
            ? t("village.crest_why_chosen_mixed", { list })
            : t("village.crest_why_chosen", {
                animal: t(`village.crest_the_${first}`),
                n: firstEight[firstPractice],
                part: t(`village.crest_count_${firstPractice}`),
              })}
        </Text>
        <Text fontSize={14} color="$textSecondary">
          {t("village.crest_why_diamond")}
        </Text>
        {/* One group: the parent's gap would add 12 to the 44 dp each link already takes. */}
        <YStack testID="crest-why-links">
          <Link
            testID="crest-why-reset"
            label={t("village.crest_why_reset")}
            onPress={() => choose("auto")}
          />
          <Link
            testID="crest-why-pick"
            label={t("village.crest_why_pick")}
            onPress={() => onView("pick")}
          />
        </YStack>
      </>
    );
  }

  const secondPractice =
    secondFromSessions === null ? undefined : practiceOfAnimal(secondFromSessions);
  const sessions = PRACTICES.reduce((sum, p) => sum + totals[p], 0);
  return (
    <>
      <Text fontSize={15} color="$text">
        {t("village.crest_why_intro")}
      </Text>
      <Text fontSize={13} color="$textSecondary">
        {t("village.crest_why_bars")}
      </Text>
      <YStack gap="$2">
        {barsOf(crest).map(([p, n]) => (
          <XStack key={p} items="center" gap="$3">
            <Text width={96} fontSize={14} color="$text">
              {sentence(t(PRACTICE_KEY[p]))}
            </Text>
            <YStack flex={1} height={8} rounded={4} bg="$borderStrong">
              <YStack
                height={8}
                rounded={4}
                width={`${(n * 100) / 8}%`}
                bg={ANIMAL_TOKEN[ANIMAL_OF[p]]}
              />
            </YStack>
            <Text width={20} fontSize={14} color="$textSecondary" style={{ textAlign: "right" }}>
              {n}
            </Text>
          </XStack>
        ))}
      </YStack>
      {first === "boar" ? (
        <Text testID="crest-why-boar" fontSize={15} color="$text">
          {t("village.crest_why_boar", { list })}
        </Text>
      ) : null}
      {crest.animal === "boar" && crest.quarters && crest.quarters[0] !== crest.quarters[1] ? (
        <Text fontSize={13} color="$textSecondary">
          {t("session.feast_reveal_boar_colors", {
            first: t(PRACTICE_KEY[crest.quarters[0]]),
            second: t(PRACTICE_KEY[crest.quarters[1]]),
          })}
        </Text>
      ) : null}
      <Text testID="crest-why-shield" fontSize={15} color="$text">
        {[
          t(`village.crest_why_center_${crest.animal}`),
          crest.longestFlame > 0 ? t("village.crest_why_flame") : null,
          crest.rings > 0 ? t("village.crest_why_rings") : null,
        ]
          .filter(Boolean)
          .join(" ")}
      </Text>
      {secondFromSessions !== null && secondPractice !== undefined ? (
        <YStack testID="crest-why-second" gap="$1">
          <Text fontSize={15} fontWeight="600" color="$text">
            {t("session.tonight_join", {
              second: sentence(t(`village.crest_${secondFromSessions}`)),
              first: t(`village.crest_to_${first}`),
            })}
          </Text>
          <Text fontSize={14} color="$textSecondary">
            {t(`session.tonight_join_body_${secondFromSessions}`, {
              n: totals[secondPractice],
              total: sessions,
            })}
          </Text>
        </YStack>
      ) : null}
      <Link
        testID="crest-why-pick"
        label={t("village.crest_why_pick")}
        onPress={() => onView("pick")}
      />
    </>
  );
}

function Option({
  testID,
  shape,
  label,
  sub,
  selected,
  onPress,
}: {
  testID: string;
  shape: CrestShape;
  label: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{ minHeight: 44 }}
    >
      <XStack
        items="center"
        gap="$3"
        p="$2"
        rounded="$4"
        borderWidth={1}
        borderColor={selected ? "$primary" : "$borderStrong"}
      >
        <Crest crest={shape} size={24} />
        <YStack flex={1}>
          <Text fontSize={15} fontWeight="600" color={selected ? "$primaryText" : "$text"}>
            {label}
          </Text>
          <Text fontSize={13} color="$textSecondary">
            {sub}
          </Text>
        </YStack>
        {selected ? <Check size={18} color="$primaryText" /> : null}
      </XStack>
    </Pressable>
  );
}

function Pick({ crest, choose }: { crest: CrestData; choose: (v: Animal | "auto") => void }) {
  const { t } = useTranslation();
  const { first, firstEight, boarQuarters } = crest.evidence;
  const shape = (animal: Animal): CrestShape => ({
    animal,
    manual: false,
    second: null,
    quarters: animal === "boar" ? boarQuarters : null,
    longestFlame: 0,
    rings: 0,
  });
  const stage = (s: "sessions" | "chosen") => t(`village.crest_stage_${crest.optionStages[s]}`);
  const firstPractice = practiceOfAnimal(first);
  const autoSelected = !crest.manual;
  return (
    <YStack gap="$2" role="radiogroup">
      <Option
        testID="crest-pick-auto"
        shape={shape(first)}
        label={`${t("village.crest_pick_auto", { animal: t(`village.crest_the_${first}`) })} · ${stage("sessions")}`}
        sub={
          firstPractice === undefined
            ? sentence(t("village.crest_pick_desc_boar"))
            : t("village.crest_pick_auto_sub", {
                practice: sentence(t(PRACTICE_KEY[firstPractice])),
                n: firstEight[firstPractice],
              })
        }
        selected={autoSelected}
        onPress={() => choose("auto")}
      />
      {ORDER.filter((a) => a !== first).map((a) => (
        <Option
          key={a}
          testID={`crest-pick-${a}`}
          shape={shape(a)}
          label={`${sentence(t(`village.crest_the_${a}`))} · ${stage("chosen")}`}
          sub={t(`village.crest_pick_desc_${a}`)}
          selected={!autoSelected && crest.animal === a}
          onPress={() => choose(a)}
        />
      ))}
    </YStack>
  );
}

/**
 * "Why the Bear?" and "Your animal": the one sheet behind every door to the crest (the big
 * feast's link, the Village's shield, the Settings row), so they cannot drift apart.
 */
export function CrestSheet({ view, crest, onView, onClose, onChanged }: Props) {
  const { t } = useTranslation();
  const choose = useChoose(onChanged, onClose);
  // Mounted on the first opening only: a sheet behind every Village visit is dead weight.
  const [mounted, setMounted] = useState(false);
  if (view !== null && !mounted) setMounted(true);
  // Same as VillageDetailSheet: back closes the sheet first, and the router never sees the press.
  // Only while the sheet is drawn: a crest gone null under an open view renders nothing to close.
  const open = view !== null && crest !== null;
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);
  if (!mounted || crest === null) return null;

  return (
    <FormSheet
      open={view !== null}
      title={
        view === "pick"
          ? t("village.crest_pick_title")
          : t(`village.crest_why_title_${crest.animal}`)
      }
      onClose={onClose}
    >
      {view === "pick" ? (
        <Pick crest={crest} choose={choose} />
      ) : (
        <>
          <XStack justify="center">
            <Crest crest={crest} size={96} />
          </XStack>
          <Why crest={crest} onView={onView} choose={choose} />
        </>
      )}
    </FormSheet>
  );
}
