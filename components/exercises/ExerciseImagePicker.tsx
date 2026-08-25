import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { useToast } from "@/components/common/Toast";
import { EXERCISE_THUMB_ASSETS, getExerciseThumb } from "@/constants/assetMap";
import { encodePhoto } from "@/src/exercisePhoto";
import { reportError } from "@/src/reportError";

/** The art already in the APK, offered as a strip. Keys are what `imagePath` then holds. */
const ILLUSTRATIONS = Object.keys(EXERCISE_THUMB_ASSETS);

export function ExerciseImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (imagePath: string) => void;
}) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);

  const pickPhoto = async () => {
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        // A silently-declined permission used to make the avatar row do nothing, forever.
        showError(t("settings.photos_denied"));
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (picked.canceled) return;

      const asset = picked.assets[0];
      if (!asset) return;
      onChange(await encodePhoto(asset.uri));
    } catch (error) {
      reportError("exercises.image", error);
      showError(t("exercise_editor.image_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <YStack gap="$3">
      <Text fontSize={12} color="$textSecondary">
        {t("exercise_editor.image")}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap="$2">
          {ILLUSTRATIONS.map((key) => (
            <YStack
              key={key}
              testID={`exercise-illustration-${key}`}
              onPress={() => onChange(key)}
              borderWidth={2}
              borderColor={value === key ? "$primaryText" : "$borderStrong"}
              rounded="$4"
              overflow="hidden"
              accessibilityRole="button"
              accessibilityLabel={key}
            >
              <Image
                source={getExerciseThumb(key)}
                style={{ width: 64, height: 64 }}
                contentFit="cover"
              />
            </YStack>
          ))}
        </XStack>
      </ScrollView>

      <AppButton
        testID="exercise-photo"
        variant="outline"
        disabled={busy}
        onPress={pickPhoto}
        accessibilityRole="button"
        accessibilityLabel={t("exercise_editor.image_from_photos")}
      >
        {t("exercise_editor.image_from_photos")}
      </AppButton>
    </YStack>
  );
}
