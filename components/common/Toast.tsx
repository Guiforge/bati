import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatePresence, Text, XStack, YStack } from "tamagui";

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

  const getToastColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "$pastelGreen";
      case "error":
        return "$pastelPink";
      default:
        return "$pastelBlue";
    }
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo }}>
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
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <XStack
              key={toast.id}
              bg={getToastColor(toast.type)}
              p="$3"
              rounded="$4"
              borderWidth={1}
              borderColor="$borderStrong"
              items="center"
              gap="$2"
              animation="quick"
              enterStyle={{ opacity: 0, y: 20 }}
              exitStyle={{ opacity: 0, y: 20 }}
              shadowColor="$color"
              shadowOpacity={0.1}
              shadowRadius={4}
              shadowOffset={{ width: 0, height: 2 }}
            >
              <Text fontSize={16}>{getToastIcon(toast.type)}</Text>
              <Text flex={1} fontWeight="700" color="$color" fontSize={14}>
                {toast.message}
              </Text>
            </XStack>
          ))}
        </AnimatePresence>
      </YStack>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
