import { Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Paragraph, Text, YStack } from "tamagui";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and display a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onRetry?: () => void;
}

/**
 * Default error fallback UI
 */
function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <YStack
      flex={1}
      bg="$background"
      pt={insets.top + 24}
      pb={insets.bottom + 24}
      px="$5"
      items="center"
      justify="center"
      gap="$4"
    >
      <Text fontSize={64}>😵</Text>
      <YStack items="center" gap="$2">
        <H1 color="$text" fontWeight="700" fontSize={24} style={{ textAlign: "center" }}>
          {t("errors.something_went_wrong", "Something went wrong")}
        </H1>
        <Paragraph color="$text" opacity={0.6} style={{ textAlign: "center" }}>
          {t("errors.try_again_message", "Don't worry, you can try again.")}
        </Paragraph>
      </YStack>

      {__DEV__ && !!error && (
        <YStack
          bg="$pastelPink"
          p="$3"
          rounded="$6"
          borderWidth={1}
          borderColor="$borderStrong"
          maxW="100%"
        >
          <Text fontSize={12} color="$text" numberOfLines={5}>
            {error.message}
          </Text>
        </YStack>
      )}

      {!!onRetry && (
        <Button
          bg="$primary"
          borderWidth={1}
          borderColor="$borderStrong"
          rounded="$6"
          onPress={onRetry}
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
        >
          <Text fontWeight="700" color="white">
            {t("errors.try_again", "Try Again")}
          </Text>
        </Button>
      )}
    </YStack>
  );
}

/**
 * A simpler inline error display for smaller sections
 */
export function InlineError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();

  return (
    <YStack
      bg="$pastelPink"
      p="$4"
      rounded="$6"
      borderWidth={1}
      borderColor="$borderStrong"
      gap="$3"
      items="center"
    >
      <Text fontSize={32}>😵</Text>
      <Text fontWeight="700" color="$text" style={{ textAlign: "center" }}>
        {message || t("errors.generic")}
      </Text>
      {!!onRetry && (
        <Button
          size="$3"
          bg="$bgLight"
          borderWidth={1}
          borderColor="$borderStrong"
          rounded="$6"
          onPress={onRetry}
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
        >
          <Button.Text fontWeight="700" color="$text">
            {t("errors.try_again", "Try Again")}
          </Button.Text>
        </Button>
      )}
    </YStack>
  );
}
