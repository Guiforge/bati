import { LinearGradient } from "expo-linear-gradient"; // Standard Expo
import { useEffect, useMemo, useState } from "react";
import { Dimensions } from "react-native";
import { getTokenValue, H1, Image, Paragraph, Progress, Text, XStack, YStack } from "tamagui";

interface SplashScreenProps {
  onFinish: () => void;
  isReady: boolean;
}

const LOADING_MESSAGES = [
  "Forging your destiny...",
  "Calibrating gravity...",
  "Scouting the terrain...",
  "Awakening the inner fire...",
];

const { width, height } = Dimensions.get("window");

export function SplashScreen({ onFinish, isReady }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);

  const bgImage = useMemo(() => {
    const images = [
      require("@/assets/splash-bg1.jpg"),
      require("@/assets/splash-bg2.jpg"),
      require("@/assets/splash-bg3.jpg"),
    ];
    return images[Math.floor(Math.random() * images.length)];
  }, []);

  // Simulation de chargement
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90 && !isReady) return 90;
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Change message occasionally
        if (Math.random() > 0.85) {
          setMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
        }
        return prev + Math.floor(Math.random() * 3) + 2; // Un peu plus rapide
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isReady]);

  useEffect(() => {
    if (progress >= 100) onFinish();
  }, [progress, onFinish]);

  const bgDark = getTokenValue("$bgDark") || "#0B0F19";

  return (
    <YStack flex={1} bg="$bgDark">
      {/* 1. BACKGROUND IMAGE (FULL SCREEN) */}
      <Image
        source={bgImage}
        width={width}
        height={height}
        position="absolute"
        resizeMode="cover"
        opacity={0.8}
      />

      {/* 2. GRADIENT OVERLAY (Pour la lisibilité en bas) */}
      <LinearGradient
        colors={["transparent", "rgba(11, 15, 25, 0.4)", bgDark]}
        style={{ position: "absolute", width, height }}
        locations={[0, 0.5, 0.9]}
      />

      {/* 3. CONTENU UI */}
      <YStack flex={1} justify="space-between" p="$6" pt="$12" pb="$10">
        {/* TOP: LOGO & TITRE */}
        <XStack justify="center">
          <YStack gap="$4">
            <Image
              source={require("@/assets/app-icon.png")}
              width={80}
              height={80}
              borderRadius="$4"
              shadowColor="$primaryGlow"
              shadowRadius={20}
            />
            <H1
              fontFamily="$heading"
              color="$text"
              fontSize={52}
              lineHeight={52}
              letterSpacing={8}
              fontWeight="900"
              textShadowColor="rgba(0,0,0,0.8)"
              textShadowRadius={10}
            >
              BATI
            </H1>
          </YStack>
        </XStack>

        {/* BOTTOM: LOADING HUD */}
        <YStack gap="$4">
          {/* Message RPG flottant */}
          <Paragraph
            fontFamily="$heading"
            color="$text"
            fontSize={16}
            opacity={0.9}
            textShadowColor="$bgDark"
            textShadowRadius={4}
          >
            {message}
          </Paragraph>

          {/* Barre de Progression "High Tech" */}
          <YStack>
            <Progress
              value={progress}
              height={4}
              bg="rgba(255,255,255,0.1)"
              overflow="hidden"
              borderCurve="continuous"
            >
              <Progress.Indicator
                bg="$primary"
                animation="bouncy"
                shadowColor="$primary"
                shadowRadius={10} // Effet laser
                shadowOpacity={1}
              />
            </Progress>

            <XStack justify="space-between" mt="$2">
              <Text fontFamily="$body" fontSize={10} color="$textSecondary">
                v3.0.0
              </Text>
              <Text fontFamily="$heading" fontSize={12} color="$primary">
                {progress}%
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
