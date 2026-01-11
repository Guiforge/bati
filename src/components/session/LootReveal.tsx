import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Text, YStack } from "tamagui";
import { CHEST_ASSETS } from "@/src/constants/assetMap";
import type { ResourceLoot } from "@/src/db/resources";
import { useHaptics } from "@/src/hooks/useHaptics";

type Props = {
  loot: ResourceLoot;
  onDismiss: () => void;
};

function hasLoot(loot: ResourceLoot) {
  return loot.gold > 0 || loot.materials.length > 0;
}

export function LootReveal({ loot, onDismiss }: Props) {
  const { t } = useTranslation();
  const { impact, success } = useHaptics();

  const [phase, setPhase] = useState<"falling" | "closed" | "opening">("falling");

  const fallY = useSharedValue(-260);
  const chestScale = useSharedValue(1);
  const chestRotate = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  const canShow = useMemo(() => hasLoot(loot), [loot]);

  useEffect(() => {
    if (!canShow) return;

    // Entrance: fall from top with heavy "thud".
    fallY.value = -260;
    chestScale.value = 1;
    chestRotate.value = 0;
    ringOpacity.value = 0;
    overlayOpacity.value = 1;

    fallY.value = withSpring(
      0,
      {
        damping: 14,
        stiffness: 180,
        mass: 1.1,
      },
      (finished) => {
        if (!finished) return;
        scheduleOnRN(impact);
        scheduleOnRN(setPhase, "closed");

        // Anticipation: single white-ish pulse ring.
        ringOpacity.value = 1;
        ringScale.value = 0.6;
        ringScale.value = withTiming(1.7, { duration: 480, easing: Easing.out(Easing.quad) });
        ringOpacity.value = withTiming(0, { duration: 520, easing: Easing.out(Easing.quad) });

        // Subtle shake.
        chestRotate.value = withSequence(
          withTiming(-6, { duration: 60 }),
          withTiming(6, { duration: 60 }),
          withTiming(-4, { duration: 60 }),
          withTiming(4, { duration: 60 }),
          withTiming(0, { duration: 60 })
        );
      }
    );
  }, [canShow, chestRotate, chestScale, fallY, impact, ringOpacity, ringScale, overlayOpacity]);

  const chestStyle = useAnimatedStyle<ViewStyle>(() => {
    return {
      transform: [
        { translateY: fallY.value },
        { scale: chestScale.value },
        { rotateZ: `${chestRotate.value}deg` },
      ] as unknown as ViewStyle["transform"],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    return {
      opacity: ringOpacity.value,
      transform: [{ scale: ringScale.value }],
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  if (!canShow) return null;

  const handlePress = () => {
    if (phase === "closed") {
      impact();

      setPhase("opening");

      // Reveal: burst/explosion (< 0.3s), then fade overlay out into Rewards Manifest.
      chestScale.value = withSequence(
        withTiming(1.12, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(0.88, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(0.6, { duration: 70, easing: Easing.in(Easing.quad) })
      );
      chestRotate.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );

      ringOpacity.value = 1;
      ringScale.value = 0.7;
      ringScale.value = withTiming(2.2, { duration: 260, easing: Easing.out(Easing.quad) });
      ringOpacity.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) });

      // Keep chest open visible for 1 second before fading out
      setTimeout(() => {
        overlayOpacity.value = withTiming(
          0,
          { duration: 400, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (!finished) return;
            scheduleOnRN(onDismiss);
          }
        );
      }, 1000);

      scheduleOnRN(success);
      scheduleOnRN(impact);
    }
  };

  return (
    <Animated.View
      style={[
        { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
        overlayStyle,
      ]}
    >
      <YStack fullscreen bg="$bgDarker">
        <YStack asChild flex={1} onPress={handlePress}>
          <Pressable>
            <YStack flex={1} items="center" justifyContent="center" gap="$5">
              {/* Pulse ring */}
              <Animated.View style={ringStyle}>
                <YStack
                  width={240}
                  height={240}
                  borderRadius={999}
                  borderWidth={2}
                  borderColor="$text"
                  opacity={0.25}
                />
              </Animated.View>

              {/* Chest Image */}
              <Animated.View style={chestStyle}>
                <YStack
                  items="center"
                  justifyContent="center"
                  width={240}
                  height={240}
                  shadowColor={phase === "opening" ? "$goldGlow" : "$etherealGlow"}
                  shadowOpacity={0.8}
                  shadowRadius={32}
                >
                  <Image
                    source={
                      phase === "opening" ? CHEST_ASSETS.chest_open : CHEST_ASSETS.chest_close
                    }
                    style={{ width: 220, height: 220 }}
                    contentFit="contain"
                    transition={100}
                  />
                </YStack>
              </Animated.View>

              {/* Copy */}
              {phase === "closed" ? (
                <YStack items="center" gap="$2">
                  <Text
                    fontFamily="$heading"
                    fontWeight="700"
                    textTransform="uppercase"
                    letterSpacing={3}
                    color="$textSecondary"
                    textAlign="center"
                  >
                    {t("session.loot_tap_to_open")}
                  </Text>
                </YStack>
              ) : null}
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </Animated.View>
  );
}
