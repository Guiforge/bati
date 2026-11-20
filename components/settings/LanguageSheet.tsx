import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Button } from "@/components/common/Button";
import { FormSheet } from "@/components/common/FormSheet";
import { Check } from "@/components/icons";
import { APP_LANGUAGES, type AppLanguage, LANGUAGE_NAMES } from "@/src/i18n/deviceLanguage";

/**
 * Every language at once, each in its own words. The row used to cycle a ring of six, so a hero
 * going from French back to English passed through German and Chinese (audit 2026-11-20, F5).
 */
export function LanguageSheet({
  open,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  current: AppLanguage;
  onPick: (language: AppLanguage) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  // Nothing while closed, not a closed sheet: mounted closed in Settings, it left onboarding deaf
  // on a fresh install (the first "Start" tap went nowhere), though Settings was not on screen.
  // Bisected on the emulator, 2026-11-20.
  if (!open) return null;
  return (
    <FormSheet open={open} title={t("settings.language")} onClose={onClose}>
      <YStack gap="2">
        {APP_LANGUAGES.map((language) => (
          <Button
            key={language}
            testID={`settings-language-${language}`}
            bg="surface"
            borderColor={language === current ? "primary" : "borderStrong"}
            borderWidth={1}
            rounded="4"
            p="3"
            height="auto"
            role="radio"
            aria-checked={language === current}
            onPress={() => onPick(language)}
          >
            <XStack flex={1} items="center" gap="3">
              <Text flex={1} fontSize="4" fontWeight="bold" color="text">
                {LANGUAGE_NAMES[language]}
              </Text>
              {language === current ? <Check size={20} color="primaryText" /> : null}
            </XStack>
          </Button>
        ))}
      </YStack>
    </FormSheet>
  );
}
