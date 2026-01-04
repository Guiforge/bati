import { useEffect, useState } from "react";
import { H1, Paragraph, Progress, Text, XStack, YStack } from "tamagui";

interface SplashScreenProps {
  onFinish: () => void;
  isReady: boolean;
}

const LOADING_MESSAGES = [
  "Sharpening axes...",
  "Summoning the Coach...",
  "Scaring goblins...",
  "Polishing armor...",
  "Brewing potions...",
  "Consulting the elders...",
  "Stretching hamstrings...",
  "Loading heavy weights...",
];

export function SplashScreen({ onFinish, isReady }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        // If we are not ready, stall at 90%
        if (prev >= 90 && !isReady) {
          return 90;
        }

        if (prev >= 100) {
          clearInterval(interval);
          onFinish();
          return 100;
        }

        // Randomly change message
        if (Math.random() > 0.7) {
          setMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
        }
        return prev + Math.floor(Math.random() * 5) + 1; // Random increment
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onFinish, isReady]);

  return (
    <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$6">
      <H1 color="$color" fontWeight="900" fontSize={48}>
        🏰 Bati
      </H1>

      <YStack width="80%" gap="$4">
        <Paragraph
          color="$color"
          opacity={0.8}
          fontSize={16}
          fontWeight="bold"
          style={{ textAlign: "center" }}
        >
          {message}
        </Paragraph>

        <YStack>
          <Progress
            value={progress}
            size="$4"
            background="$bgLight"
            borderWidth={2}
            borderColor="$color"
          >
            <Progress.Indicator background="$primary" animation="quick" />
          </Progress>
          <XStack justify="flex-end" mt="$1">
            <Text color="$color" opacity={0.6} fontSize={12} fontWeight="bold">
              {progress}%
            </Text>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
