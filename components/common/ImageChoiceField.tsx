import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { useToast } from "@/components/common/Toast";
import { ImagePlus } from "@/components/icons";
import { encodePhoto } from "@/src/exercisePhoto";
import { reportError } from "@/src/reportError";

const TILE = 64;

/** Explicit, not `width="100%" + aspectRatio`: that pair resolved to a tall rectangle here. */
const PREVIEW_WIDTH = 220;

/**
 * The picture, first, and the picture *is* the control.
 *
 * Tapping it opens the choices, the way the avatar row in Settings does: one thing on screen
 * until you want more, so the form underneath starts at the name rather than at a wall of
 * thumbnails. The preview stays visible while choosing, so a tap on a tile shows its result
 * immediately instead of after a collapse.
 *
 * The preview takes the art's own shape rather than the shape of whatever card will hold it:
 * exercise illustrations are 1:1 and quest covers 4:3, and a preview in the wrong ratio either
 * letterboxes against a ground that never quite matches or crops what the hero just chose. The
 * frame around it — hairline border, offset hard shadow — is the app's existing vocabulary for
 * "this is a piece of content's art".
 *
 * Until something is chosen, the caller's resolver falls through to `placeholder.webp` — a dark,
 * quiet plate that reads as "no picture yet" without pretending to be one.
 *
 * Two callers: the exercise editor and the quest editor. It lives in `common/` for that reason
 * and takes its art from props, because the only thing that differs between them is which
 * pictures exist and what shape they are.
 */
export type ImageChoiceFieldProps = {
  /** A bundled key, a bundled path, or a `data:` URI. */
  value: string;
  onChange: (imagePath: string) => void;
  /** Keys of the art already in the APK this field offers. */
  choices: readonly string[];
  /** Key or URI -> the source the preview renders. */
  resolve: (key: string) => ImageSourcePropType;
  /** The same, thumbnail-sized, for the strip. */
  resolveThumb: (key: string) => ImageSourcePropType;
  /**
   * The art's own shape — exercise illustrations are 1:1, quest covers 4:3 — so the preview
   * never letterboxes and the photo the hero crops comes back the shape it will be shown at.
   */
  aspect: readonly [number, number];
};

export function ImageChoiceField({
  value,
  onChange,
  choices,
  resolve,
  resolveThumb,
  aspect,
}: ImageChoiceFieldProps) {
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
        aspect: [aspect[0], aspect[1]],
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
        testID="image-choice-preview"
        onPress={() => setOpen((v) => !v)}
        width={PREVIEW_WIDTH}
        height={(PREVIEW_WIDTH * aspect[1]) / aspect[0]}
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
          source={resolve(value)}
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
              testID="image-choice-photo"
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

            {choices.map((key) => (
              <YStack
                key={key}
                testID={`image-choice-${key}`}
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
                  source={resolveThumb(key)}
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
