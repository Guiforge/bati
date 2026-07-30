// `@expo/metro-runtime` MUST be the first import to ensure Fast Refresh works on web.
import "@expo/metro-runtime";

import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "./src/widget";

// This file should only import and register roots/handlers. No components or exports belong here.
renderRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
