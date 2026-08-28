import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatePresence, Text, XStack, YStack } from "tamagui";
import { AlertCircle, Check, Info } from "@/components/icons";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reducedMotion = useReducedMotion();

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const showSuccess = useCallback((message: string) => showToast(message, "success"), [showToast]);
  const showError = useCallback((message: string) => showToast(message, "error"), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, "info"), [showToast]);

  // Dark HUD surfaces, drawn icons: the pastel tints and ✅/❌ emoji read as another app —
  // and a screen reader spelled the emoji out loud before every message.
  const getToastBorder = (type: ToastType) => {
    switch (type) {
      case "success":
        return "$success" as const;
      case "error":
        return "$error" as const;
      default:
        return "$borderStrong" as const;
    }
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <Check size={16} color="$success" />;
      case "error":
        return <AlertCircle size={16} color="$error" />;
      default:
        return <Info size={16} color="$primaryText" />;
    }
  };

  // Stable context value — an object literal here re-rendered every useToast() consumer
  // each time a toast appeared or expired.
  const contextValue = useMemo(
    () => ({ showToast, showSuccess, showError, showInfo }),
    [showToast, showSuccess, showError, showInfo],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast container */}
      <YStack
        position="absolute"
        b={insets.bottom + 80}
        l="$4"
        r="$4"
        z={9999}
        pointerEvents="none"
        gap="$2"
        accessibilityLiveRegion="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <XStack
              key={toast.id}
              bg="$surface2"
              p="$3"
              rounded="$4"
              borderWidth={1}
              borderColor={getToastBorder(toast.type)}
              items="center"
              gap="$2"
              transition={reducedMotion ? undefined : "quick"}
              enterStyle={reducedMotion ? undefined : { opacity: 0, y: 20 }}
              exitStyle={reducedMotion ? undefined : { opacity: 0, y: 20 }}
              shadowColor="$shadowColor"
              shadowOpacity={0.3}
              shadowRadius={6}
              shadowOffset={{ width: 0, height: 3 }}
              accessibilityRole="alert"
            >
              {getToastIcon(toast.type)}
              <Text flex={1} fontWeight="700" color="$text" fontSize={14}>
                {toast.message}
              </Text>
            </XStack>
          ))}
        </AnimatePresence>
      </YStack>
    </ToastContext.Provider>
  );
}

// biome-ignore lint/style/useComponentExportOnlyModules: provider + its hook colocated, idiomatic React
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
