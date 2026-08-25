import { ImagePlus } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { useToast } from "@/components/common/Toast";
import { EXERCISE_THUMB_ASSETS, getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { encodePhoto } from "@/src/exercisePhoto";
import { reportError } from "@/src/reportError";

/** The art already in the APK, offered as a strip. Keys are what `imagePath` then holds. */
const ILLUSTRATIONS = Object.keys(EXERCISE_THUMB_ASSETS);

const TILE = 64;

/** Explicit, not `width="100%" + aspectRatio`: that pair resolved to a tall rectangle here. */
const PREVIEW = 220;

/**
 * The picture, first, and the picture *is* the control.
 *
 * Square, and deliberately not the 16:9 the detail page uses: the choice itself is square. Every
 * bundled illustration is 1:1 and the photo picker crops to `[1, 1]`, so a 16:9 preview would
 * letterbox the art against a ground that does not quite match it — and would misrepresent a
 * photo the hero had just cropped square. It carries the detail page's frame — hairline border,
 * offset hard shadow — because that is the app's vocabulary for "a movement's art".
 *
 * Tapping it opens the choices, the way the avatar row in Settings does: one thing on screen
 * until you want more, so the form underneath starts at the name rather than at a wall of
 * thumbnails. The preview stays visible while choosing, so a tap on a tile shows its result
 * immediately instead of after a collapse.
 *
 * Until something is chosen, `getExerciseAsset` falls through to `placeholder.webp` — a dark,
 * quiet plate that reads as "no picture yet" without pretending to be one.
 */
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
  const [open, setOpen] = useState(false);

  /** A photo lives in the row as a data URI, so "is this a photo?" is a prefix test. */
  const isPhoto = value.startsWith("data:");

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
      setOpen(false);
    } catch (error) {
      reportError("exercises.image", error);
      showError(t("exercise_editor.image_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <YStack gap="$3">
      <YStack
        testID="exercise-image-preview"
        onPress={() => setOpen((v) => !v)}
        width={PREVIEW}
        height={PREVIEW}
        self="center"
        bg="$bgDark"
        borderWidth={open ? 2 : 1}
        borderColor={open ? "$primaryText" : "$borderStrong"}
        rounded="$8"
        shadowColor="$text"
        shadowRadius={0}
        shadowOffset={{ width: 0, height: 5 }}
        overflow="hidden"
        pressStyle={{ opacity: 0.85 }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t("exercise_editor.image")}
      >
        <Image
          source={getExerciseAsset(value)}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />
      </YStack>

      {open ? null : (
        <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
          {t("settings.tap_change")}
        </Text>
      )}

      {/* The photo tile leads the strip instead of sitting under it as a second control — the
        shape the avatar picker already uses in Settings, and one row rather than a row plus a
        button. Once a photo is chosen the tile wears it, so the strip always says which of the
        two kinds of picture is in play. */}
      {open ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$2">
            <YStack
              testID="exercise-photo"
              onPress={pickPhoto}
              disabled={busy}
              width={TILE}
              height={TILE}
              items="center"
              justify="center"
              bg="$surface2"
              borderWidth={2}
              borderColor={isPhoto ? "$primaryText" : "$borderStrong"}
              rounded="$4"
              overflow="hidden"
              opacity={busy ? 0.6 : 1}
              pressStyle={{ opacity: 0.8 }}
              accessibilityRole="button"
              accessibilityState={{ selected: isPhoto }}
              accessibilityLabel={t("exercise_editor.image_from_photos")}
            >
              {isPhoto ? (
                <Image source={{ uri: value }} style={{ width: TILE, height: TILE }} />
              ) : (
                <ImagePlus size={22} color="$textSecondary" />
              )}
            </YStack>

            {ILLUSTRATIONS.map((key) => (
              <YStack
                key={key}
                testID={`exercise-illustration-${key}`}
                onPress={() => {
                  onChange(key);
                  setOpen(false);
                }}
                width={TILE}
                height={TILE}
                borderWidth={2}
                borderColor={value === key ? "$primaryText" : "$borderStrong"}
                rounded="$4"
                overflow="hidden"
                pressStyle={{ opacity: 0.8 }}
                accessibilityRole="button"
                accessibilityState={{ selected: value === key }}
                accessibilityLabel={key}
              >
                <Image
                  source={getExerciseThumb(key)}
                  style={{ width: TILE, height: TILE }}
                  contentFit="cover"
                />
              </YStack>
            ))}
          </XStack>
        </ScrollView>
      ) : null}
    </YStack>
  );
}
