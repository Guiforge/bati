import { useEffect, useState } from "react";
import { H1, Paragraph, Progress, YStack } from "tamagui";

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onFinish();
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      justifyContent="center"
      alignItems="center"
      padding="$6"
      gap="$6"
    >
      <H1 color="$color" fontWeight="900" fontSize={48}>
        🏰 Bati
      </H1>
      <Paragraph color="$color" opacity={0.6} fontSize={16}>
        Building your village...
      </Paragraph>

      <YStack width="80%" gap="$2">
        <Progress value={progress} size="$2" backgroundColor="$bgLight">
          <Progress.Indicator animation="bouncy" backgroundColor="$primary" />
        </Progress>
        <Paragraph color="$color" opacity={0.4} fontSize={12} textAlign="center">
          {progress}%
        </Paragraph>
      </YStack>
    </YStack>
  );
}
