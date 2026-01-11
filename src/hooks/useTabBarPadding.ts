import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Hook to get consistent padding for tab bar content
 * Prevents content from being hidden behind the floating tab bar
 */
export function useTabBarPadding() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 74;
  const TAB_BAR_MARGIN = 10;

  return {
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_MARGIN + insets.bottom,
  };
}
