import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TextInput, View } from "react-native";
import { YStack } from "tamagui";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { useDiscardGuard } from "@/components/common/useDiscardGuard";
import { NBlock, NButton, NKickerQuiet, NMuted, NText } from "@/components/journal/nocturne";
import { rawColors } from "@/constants/rawColors";
import { MAX_NOTE_CHARS, updateSessionNotes } from "@/db/completed";
import {
  listSessionPhotos,
  MAX_SESSION_PHOTOS,
  readNotebook,
  removeSessionPhoto,
} from "@/db/sessionPhotos";
import { chooseSessionPhotos } from "@/src/journalPhoto";
import { reportError } from "@/src/reportError";

type Photo = { uuid: string; image: string };

/**
 * Mounted only while the note holds text that was not saved: back would drop it without a word.
 * A component of its own because the guard is a hook, and the screens that never edit (no
 * navigator under them in a test) must not need one.
 */
function UnsavedNoteGuard() {
  const { dialog } = useDiscardGuard(true);
  return dialog;
}

/**
 * The note and the photos of one saved session or outing. Every door to them is this component
 * (the Journal detail, the outing recap, the victory screen), so the rules are written once: 500
 * characters, three photos, a removal asked before it is done. It takes the row id alone and reads
 * the uuid and the note itself.
 *
 * `note` mode is the victory screen's: the note only, already open. `onChanged` tells the screen
 * to refresh whatever it derives from the row (the Journal list refreshes on its own).
 */
export function SessionNotebook({
  sessionId,
  mode = "full",
  startEditing = false,
  onChanged,
  onCancel,
  onDraft,
}: {
  sessionId: number;
  mode?: "full" | "note";
  startEditing?: boolean;
  onChanged?: () => void;
  /** The editor of `startEditing` was closed without saving. */
  onCancel?: () => void;
  /** Every keystroke of the open editor, for a screen that must save what was typed on its way out. */
  onDraft?: (draft: string) => void;
}) {
  const { t } = useTranslation();
  const { ask, dialog } = useConfirmDialog();
  const [uuid, setUuid] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  const withPhotos = mode === "full";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const book = await readNotebook(sessionId);
      const pics = withPhotos && book?.uuid ? await listSessionPhotos(book.uuid) : [];
      if (cancelled) return;
      setUuid(book?.uuid ?? null);
      setNotes(book?.notes ?? "");
      setDraft(book?.notes ?? "");
      setPhotos(pics);
      setLoaded(true);
    })().catch((error: unknown) => reportError("journal.notebook.load", error));
    return () => {
      cancelled = true;
    };
  }, [sessionId, withPhotos]);

  if (!loaded) return null;

  const reloadPhotos = async () => {
    if (uuid) setPhotos(await listSessionPhotos(uuid));
    onChanged?.();
  };

  const saveNote = () => {
    updateSessionNotes(sessionId, draft)
      .then(() => {
        setNotes(draft.trim());
        setEditing(false);
        setMessage(null);
        onChanged?.();
      })
      .catch((error: unknown) => {
        reportError("journal.notebook.note", error);
        setMessage(t("journal.note_too_long"));
      });
  };

  const addPhotos = () => {
    if (!uuid) return;
    setMessage(null);
    chooseSessionPhotos(uuid, photos.length)
      .then(async (outcome) => {
        if (outcome === "denied") setMessage(t("settings.photos_denied"));
        else if (outcome === "full") setMessage(t("journal.photos_full"));
        await reloadPhotos();
      })
      .catch((error: unknown) => {
        reportError("journal.notebook.photo", error);
        setMessage(t("journal.photo_failed"));
      });
  };

  const removePhoto = (photo: Photo) =>
    ask({
      title: t("journal.photo_remove"),
      body: t("journal.photo_remove_confirm"),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("journal.photo_remove"),
      destructive: true,
      onConfirm: () => {
        removeSessionPhoto(photo.uuid)
          .then(reloadPhotos)
          .catch((error: unknown) => reportError("journal.notebook.remove", error));
      },
    });

  return (
    <YStack testID="session-notebook" gap={8}>
      {withPhotos && photos.length > 0 && (
        <View testID="notebook-photos" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {photos.map((photo, index) => (
                <YStack key={photo.uuid} width={width} gap={4}>
                  <Image
                    source={{ uri: photo.image }}
                    contentFit="contain"
                    style={{ width, height: 280, backgroundColor: rawColors.black }}
                    accessibilityLabel={t("journal.photo_label", {
                      index: index + 1,
                      total: photos.length,
                    })}
                  />
                  <NButton
                    testID={`notebook-photo-remove-${index}`}
                    onPress={() => removePhoto(photo)}
                  >
                    {t("journal.photo_remove")}
                  </NButton>
                </YStack>
              ))}
            </ScrollView>
          )}
        </View>
      )}
      {withPhotos && uuid !== null && photos.length < MAX_SESSION_PHOTOS && (
        <NButton testID="notebook-photo-add" onPress={addPhotos}>
          {t("journal.photo_add")}
        </NButton>
      )}

      {editing ? (
        <NBlock>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <NButton testID="notebook-note-save" variant="primary" onPress={saveNote}>
              {t("journal.note_save")}
            </NButton>
            <NButton
              testID="notebook-note-cancel"
              onPress={() => {
                setDraft(notes);
                setEditing(false);
                onCancel?.();
              }}
            >
              {t("common.cancel")}
            </NButton>
          </View>
          <TextInput
            testID="notebook-note-input"
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              onDraft?.(text);
            }}
            maxLength={MAX_NOTE_CHARS}
            multiline
            autoFocus={startEditing}
            placeholder={t("journal.note_placeholder")}
            placeholderTextColor={rawColors.textSecondary}
            accessibilityLabel={t("journal.note_placeholder")}
            style={{ color: rawColors.text, fontSize: 14, minHeight: 88, textAlignVertical: "top" }}
          />
          <NMuted mt={4}>{`${draft.length}/${MAX_NOTE_CHARS}`}</NMuted>
        </NBlock>
      ) : (
        <>
          {!!notes && (
            <NBlock>
              <NKickerQuiet>{t("journal.notes")}</NKickerQuiet>
              <NText testID="notebook-note" mt={6} fontSize={13.5} lineHeight={20}>
                {notes}
              </NText>
            </NBlock>
          )}
          {!startEditing && (
            <NButton testID="notebook-note-edit" onPress={() => setEditing(true)}>
              {t(notes ? "journal.note_edit" : "journal.note_add")}
            </NButton>
          )}
        </>
      )}
      {message !== null && <NMuted testID="notebook-message">{message}</NMuted>}
      {/* The victory screen's composer (`note`) is closed by its own buttons, and Continue must
          not be stopped by it. */}
      {mode === "full" && editing && draft.trim() !== notes.trim() ? <UnsavedNoteGuard /> : null}
      {dialog}
    </YStack>
  );
}
