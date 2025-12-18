import { Platform } from "react-native";

// TypeScript doesn't understand React Native's platform file resolution
// (.web.tsx / .native.tsx). We pick the implementation at runtime.
export const QuestCarousel: typeof import("./QuestCarousel.native").QuestCarousel =
    Platform.OS === "web"
        ? (require("./QuestCarousel.web") as typeof import("./QuestCarousel.web")).QuestCarousel
        : (require("./QuestCarousel.native") as typeof import("./QuestCarousel.native")).QuestCarousel;
