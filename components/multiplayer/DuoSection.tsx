import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Share } from "react-native";
import { XStack, YStack } from "tamagui";
import { RuleDisclosure } from "@/components/common/RuleDisclosure";
import {
  NBar,
  NBlock,
  NButton,
  NImage,
  NKicker,
  NMuted,
  NText,
} from "@/components/journal/nocturne";
import { getBossAsset } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { fallenTogether, readDuoWeek } from "@/db/duo";
import { cancelInvite, listInvites, listPairs, MAX_PAIRS, type Pair } from "@/db/pairs";
import { getActivePause } from "@/db/pause";
import { type DuoWeek, isoWeekOf, previousWeek, weekStart } from "@/src/multiplayer/duoWeek";
import { MULTIPLAYER_ENABLED } from "@/src/multiplayer/flag";
import { lastSentOn, replyLink, sendCoups } from "@/src/multiplayer/sendCoups";
import { weeklyBoss } from "@/src/multiplayer/weeklyBoss";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * The duo challenge on the Bosses screen (multiplayer lot 1, LOT1-SPEC.md § 5.2 and 5.3): one card
 * per companion, the most advanced one open, the others folded to a line; the waiting invitations;
 * the "fallen together" count. Nothing here when the flag is off.
 */
type Card = {
  pair: Pair;
  current: DuoWeek;
  last: DuoWeek | null;
  pauseUnsent: boolean;
};

type Loaded = { cards: Card[]; invites: { id: string; madeAt: Date }[]; fallen: number };

/** S10: a pause touched this week and nothing went out since it began. */
async function pauseUnsent(pair: Pair, week: DuoWeek): Promise<boolean> {
  if (week.result !== "frozen") return false;
  const pause = await getActivePause();
  if (pause === null) return false;
  const sent = await lastSentOn(pair.id);
  return sent === null || sent < pause.from;
}

async function load(now: Date): Promise<Loaded> {
  const week = isoWeekOf(now);
  const [pairs, invites, fallen] = await Promise.all([
    listPairs(),
    listInvites(),
    fallenTogether(),
  ]);
  const cards = await Promise.all(
    pairs.map(async (pair): Promise<Card> => {
      const current = await readDuoWeek(pair, week, now);
      const before = pair.createdAt < weekStart(week);
      return {
        pair,
        current,
        last: before ? await readDuoWeek(pair, previousWeek(week), now) : null,
        pauseUnsent: await pauseUnsent(pair, current),
      };
    }),
  );
  // The most advanced week first: it is the one card left open.
  const progress = (c: Card) =>
    Math.min(1, c.current.mine.hits / c.current.mine.goal) +
    Math.min(1, (c.current.theirs?.hits ?? 0) / (c.current.theirs?.goal ?? 1));
  cards.sort((a, b) => progress(b) - progress(a));
  return { cards, invites, fallen };
}

const pct = (hits: number, goal: number) => Math.min(100, Math.round((hits / goal) * 100));

function stateKey(card: Card): string {
  const { current, pauseUnsent: unsent } = card;
  if (current.result === "fallen") return card.pair.duel ? "duelBoth" : "fallen";
  if (current.result === "frozen") return unsent ? "pauseUnsent" : "frozen";
  if (current.result === "inProgress") {
    if (current.theirs === null && current.mine.hits === 0) return "first";
    return current.mine.hits >= current.mine.goal ? "mineKept" : "inProgress";
  }
  return current.result;
}

export function DuoSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    load(new Date())
      .then(setLoaded)
      .catch((error: unknown) => reportError("duo.load", error));
  }, []);
  useFocusEffect(refresh);

  if (!MULTIPLAYER_ENABLED || loaded === null) return null;

  const date = (at: Date) =>
    getDateTimeFormat(language, { day: "numeric", month: "short" }).format(at);
  const fail = (context: string) => (error: unknown) => reportError(context, error);
  const invite = () => router.push("/pairing" as never);
  const { cards, invites, fallen } = loaded;
  const open = openId ?? cards[0]?.pair.id ?? null;

  const lines = (card: Card, boss: string) => {
    const { mine, theirs } = card.current;
    const name = card.pair.name;
    const duel = card.pair.duel;
    return {
      mine: duel
        ? t("duo.mine_pct", { pct: pct(mine.hits, mine.goal) })
        : t("duo.mine", { hits: mine.hits, goal: mine.goal }),
      theirs:
        theirs === null
          ? t("duo.theirs_none", { name })
          : duel
            ? t("duo.theirs_pct", { name, pct: pct(theirs.hits, theirs.goal) })
            : t("duo.theirs", {
                name,
                hits: theirs.hits,
                goal: theirs.goal,
                date: date(theirs.receivedAt),
              }),
      // TalkBack says the facts in one breath (§ 5.2).
      label: t("duo.card_label", {
        boss,
        name,
        mine: duel
          ? t("duo.pct_of", { pct: pct(mine.hits, mine.goal) })
          : t("duo.count_of", { hits: mine.hits, goal: mine.goal }),
        theirs:
          theirs === null
            ? t("duo.nothing_yet")
            : duel
              ? t("duo.pct_of", { pct: pct(theirs.hits, theirs.goal) })
              : t("duo.count_of", { hits: theirs.hits, goal: theirs.goal }),
      }),
    };
  };

  const cardOf = (card: Card) => {
    const { boss, affix } = weeklyBoss(card.pair.id, isoWeekOf(new Date()));
    const bossName = t(`bosses.${boss}.name`);
    const fallenNow = card.current.result === "fallen";
    const text = lines(card, bossName);
    return (
      <NBlock key={card.pair.id} gap={10} testID={`duo-card-${card.pair.name}`}>
        <YStack gap={8} accessible accessibilityLabel={text.label}>
          <NKicker>{t("duo.kicker")}</NKicker>
          <XStack gap={11} items="center">
            {/* A change of state fades the picture in; with reduced motion the line below says it all. */}
            <YStack
              key={card.current.result}
              transition={reducedMotion ? undefined : "lazy"}
              opacity="1 enter:0"
            >
              <NImage
                source={getBossAsset(boss, 0, fallenNow ? "defeated" : undefined)}
                size={56}
                round
              />
            </YStack>
            <YStack flex={1} gap={2}>
              <NText fontWeight="500">
                {t("duo.boss_line", { boss: bossName, affix: t(`duo.affix.${affix}`) })}
              </NText>
              <NMuted testID={`duo-state-${card.pair.name}`}>
                {t(`duo.state.${stateKey(card)}`)}
              </NMuted>
            </YStack>
          </XStack>
          <YStack gap={4}>
            <NText>{text.mine}</NText>
            <NBar progress={pct(card.current.mine.hits, card.current.mine.goal)} />
          </YStack>
          <YStack gap={4}>
            <NText>{text.theirs}</NText>
            <NBar
              progress={
                card.current.theirs ? pct(card.current.theirs.hits, card.current.theirs.goal) : 0
              }
            />
          </YStack>
        </YStack>
        {card.last !== null && card.last.result !== "inProgress" ? (
          <NMuted testID={`duo-last-${card.pair.name}`}>{t(`duo.last.${card.last.result}`)}</NMuted>
        ) : null}
        <RuleDisclosure
          label={t("duo.rule_label")}
          text={t("duo.rule")}
          testID={`duo-rule-${card.pair.name}`}
        />
        {card.pair.reply ? (
          <YStack gap={6}>
            <NMuted>{t("duo.reply_pending", { name: card.pair.name })}</NMuted>
            <NButton
              testID={`duo-reply-${card.pair.name}`}
              onPress={() => {
                const reply = card.pair.reply;
                if (reply) Share.share({ message: replyLink(reply) }).catch(fail("duo.reply"));
              }}
            >
              {t("duo.reply_send")}
            </NButton>
          </YStack>
        ) : null}
        <XStack gap={8} flexWrap="wrap">
          <YStack flex={1} minW={150}>
            <NButton
              variant="primary"
              block
              minH={48}
              testID={`duo-send-${card.pair.name}`}
              onPress={() => sendCoups(card.pair).then(refresh, fail("duo.send"))}
            >
              {t("duo.send")}
            </NButton>
          </YStack>
          <YStack flex={1} minW={150}>
            <NButton
              block
              minH={48}
              testID={`duo-qr-${card.pair.name}`}
              onPress={() => router.push(`/duo-code?pair=${card.pair.id}` as never)}
            >
              {t("duo.show_qr")}
            </NButton>
          </YStack>
        </XStack>
      </NBlock>
    );
  };

  const folded = (card: Card) => {
    const { boss } = weeklyBoss(card.pair.id, isoWeekOf(new Date()));
    return (
      <NBlock
        key={card.pair.id}
        testID={`duo-folded-${card.pair.name}`}
        onPress={() => setOpenId(card.pair.id)}
        minH={48}
      >
        <XStack gap={11} items="center">
          <NImage source={getBossAsset(boss)} size={40} round />
          <NText flex={1}>
            {t("duo.fold_line", { name: card.pair.name, state: t(`duo.state.${stateKey(card)}`) })}
          </NText>
        </XStack>
      </NBlock>
    );
  };

  return (
    <YStack gap={8} testID="duo-section" width="100%" maxW={520} self="center">
      {cards.length === 0 ? (
        <NBlock gap={10}>
          <NText>{t("duo.intro")}</NText>
        </NBlock>
      ) : (
        cards.map((card) => (card.pair.id === open ? cardOf(card) : folded(card)))
      )}
      {invites.map((pending) => (
        <NBlock key={pending.id} gap={8} testID="duo-invite-pending">
          <NMuted>{t("duo.invite_pending", { date: date(pending.madeAt) })}</NMuted>
          <NButton
            testID="duo-invite-cancel"
            onPress={() => cancelInvite(pending.id).then(refresh, fail("duo.cancel"))}
          >
            {t("duo.cancel")}
          </NButton>
        </NBlock>
      ))}
      {cards.length < MAX_PAIRS ? (
        <NButton block minH={48} testID="duo-invite" onPress={invite}>
          {t("duo.invite")}
        </NButton>
      ) : null}
      {fallen > 0 || cards.length > 0 ? (
        <NMuted testID="duo-fallen-count">{t("duo.fallen_count", { count: fallen })}</NMuted>
      ) : null}
    </YStack>
  );
}
