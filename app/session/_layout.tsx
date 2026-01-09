import { Stack } from "expo-router";
import config from "../../tamagui.config";

export default function SessionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: {
          // Prevent default white flashes between screens.
          backgroundColor: config.tokens.color.bgDarker.val,
        },
      }}
    >
      <Stack.Screen name="boss-intro" />
      <Stack.Screen name="warmup" />
      <Stack.Screen name="countdown" />
      <Stack.Screen name="exercise" />
      <Stack.Screen name="rest" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="victory" />
    </Stack>
  );
}
