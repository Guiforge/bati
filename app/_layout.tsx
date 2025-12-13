import { Stack } from "expo-router";
import "../global.css";
import "../i18n";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
