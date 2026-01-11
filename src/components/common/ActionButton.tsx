import { Check } from "@tamagui/lucide-icons";
import { useState } from "react";
import type { ButtonProps } from "tamagui";
import { Button, Spinner } from "tamagui";

type ActionButtonProps = Omit<ButtonProps, "onPress"> & {
  onPress: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
};

export function ActionButton({
  onPress,
  children,
  successMessage,
  errorMessage,
  disabled,
  ...props
}: ActionButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handlePress = async () => {
    setState("loading");
    try {
      await onPress();
      setState("success");
      setTimeout(() => setState("idle"), 2000);
    } catch (_error) {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const isDisabled = disabled || state === "loading";

  return (
    <Button
      {...props}
      onPress={handlePress}
      disabled={isDisabled}
      opacity={isDisabled ? 0.5 : 1}
      iconAfter={
        state === "loading" ? (
          <Spinner color="$text" />
        ) : state === "success" ? (
          <Check color="$text" size={20} />
        ) : undefined
      }
    >
      {state === "success" && successMessage
        ? successMessage
        : state === "error" && errorMessage
          ? errorMessage
          : children}
    </Button>
  );
}
