import { Stack } from "expo-router";

export default function SessionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="countdown" />
      <Stack.Screen name="exercise" />
      <Stack.Screen name="rest" />
      <Stack.Screen name="victory" />
    </Stack>
  );
}
