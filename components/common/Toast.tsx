import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatePresence, Text, XStack, YStack } from "tamagui";
import { AlertCircle, Check, Info } from "@/components/icons";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ToastType = "success" | "error" | "info";

/** One button on the toast, for the thing just done: "Put back" after a set-aside. */
export type ToastAction = { label: string; onPress: () => void };

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

type ToastOptions = { action?: ToastAction };

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

/** How long a toast stays: long enough to read, and to reach its button when it has one. */
const PLAIN_MS = 3000;
const WITH_ACTION_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reducedMotion = useReducedMotion();
  // What is on screen *now*, for the handlers: a toast on its way out still renders during its
  // exit animation, and an action tapped then must not run a second time.
  const live = useRef(new Set<number>());

  const dismiss = useCallback((id: number): boolean => {
    if (!live.current.delete(id)) return false;
    setToasts((prev) => prev.filter((t) => t.id !== id));
    return true;
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", options?: ToastOptions) => {
      const id = ++toastId;
      live.current.add(id);
      setToasts((prev) => [...prev, { id, message, type, action: options?.action }]);

      // With a button, as long as the hero's accessibility settings ask for: a toast whose action
      // disappears before a screen reader reaches it is an action nobody can take.
      // `?.` because a test environment's AccessibilityInfo may not carry it.
      const wait = options?.action
        ? (AccessibilityInfo.getRecommendedTimeoutMillis?.(WITH_ACTION_MS) ??
          Promise.resolve(WITH_ACTION_MS))
        : Promise.resolve(PLAIN_MS);
      // Anything but a positive number (a stubbed platform answers `undefined`) would fire at
      // once and take the toast, button and all, before anyone could read it.
      wait
        .catch(() => WITH_ACTION_MS)
        .then((ms) => {
          const delay = typeof ms === "number" && ms > 0 ? ms : WITH_ACTION_MS;
          setTimeout(() => dismiss(id), delay);
        })
        .catch(() => {
          // A timer that cannot be set leaves the toast up until it is tapped away.
        });
    },
    [dismiss],
  );

  const showSuccess = useCallback(
    (message: string, options?: ToastOptions) => showToast(message, "success", options),
    [showToast],
  );
  const showError = useCallback((message: string) => showToast(message, "error"), [showToast]);
  const showInfo = useCallback(
    (message: string, options?: ToastOptions) => showToast(message, "info", options),
    [showToast],
  );

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
      {/* At the top, under the headers' back and pause buttons. It sat over the bottom of the
          screen, which is where every session control lives, and let taps through it: a hero
          tapping it away pressed whatever was under it, which on the warm-up was the control that
          had just raised it. `box-none` keeps the rest of the screen tappable; a toast itself
          takes the tap and goes. */}
      <YStack
        position="absolute"
        t={insets.top + 72}
        l="$4"
        r="$4"
        z={9999}
        pointerEvents="box-none"
        gap="$2"
        accessibilityLiveRegion="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <XStack
              key={toast.id}
              bg="$surface2"
              rounded="$4"
              borderWidth={1}
              borderColor={getToastBorder(toast.type)}
              items="center"
              transition={reducedMotion ? undefined : "quick"}
              enterStyle={reducedMotion ? undefined : { opacity: 0, y: -20 }}
              exitStyle={reducedMotion ? undefined : { opacity: 0, y: -20 }}
              shadowColor="$shadowColor"
              shadowOpacity={0.3}
              shadowRadius={6}
              shadowOffset={{ width: 0, height: 3 }}
              accessibilityRole="alert"
            >
              <Pressable
                testID="toast"
                style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 12 }}
                onPress={() => dismiss(toast.id)}
              >
                {getToastIcon(toast.type)}
                <Text flex={1} fontWeight="700" color="$text" fontSize={14}>
                  {toast.message}
                </Text>
              </Pressable>
              {toast.action ? (
                <Pressable
                  testID="toast-action"
                  hitSlop={8}
                  accessibilityRole="button"
                  onPress={() => {
                    if (dismiss(toast.id)) toast.action?.onPress();
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 12 }}
                >
                  <Text fontWeight="700" color="$primaryText" fontSize={14}>
                    {toast.action.label}
                  </Text>
                </Pressable>
              ) : null}
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
