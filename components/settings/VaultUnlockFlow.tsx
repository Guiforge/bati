import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { Input, Text, XStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Eye, EyeOff } from "@/components/icons";
import { reportError } from "@/src/reportError";
import type { UnlockResult, UnlockSource } from "@/src/vaultUnlock";

export type UnlockSources = { server: boolean; folder: boolean };

type Props = {
  unlock: (source: UnlockSource, secret: string) => Promise<UnlockResult>;
  sources: () => Promise<UnlockSources>;
  /** The key is this phone's again. */
  onUnlocked: () => void;
  /** The hero chose a new password anyway, after being told what it costs. */
  onCreate: () => void;
};

type Phase = "home" | "source" | "secret" | "new";

const NOTICE: Partial<Record<UnlockResult, string>> = {
  wrong: "vault.unlock.wrong",
  nothingToTry: "vault.unlock.nothing",
  newerVersion: "backup.rejected.newerVersion",
};

/**
 * A phone that holds no key, though the hero turned encryption on: the way in is the password or
 * the twelve words they already have. A new password is the quiet second door, behind the warning.
 */
export function VaultUnlockFlow({ unlock, sources, onUnlocked, onCreate }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("home");
  const [available, setAvailable] = useState<UnlockSources>({ server: false, folder: false });
  const [source, setSource] = useState<UnlockSource>("file");
  const [notice, setNotice] = useState<UnlockResult | null>(null);

  const have = () => {
    sources()
      .then(setAvailable)
      .catch((error: unknown) => reportError("vault.unlock.sources", error))
      .finally(() => setPhase("source"));
  };

  const pick = (next: UnlockSource) => {
    setSource(next);
    setNotice(null);
    setPhase("secret");
  };

  if (phase === "home") {
    return (
      <>
        <Text color="$textSecondary">{t("vault.unlock.body")}</Text>
        <AppButton testID="vault-unlock-have" onPress={have}>
          {t("vault.unlock.haveCta")}
        </AppButton>
        <AppButton variant="outline" testID="vault-unlock-new" onPress={() => setPhase("new")}>
          {t("vault.unlock.newCta")}
        </AppButton>
      </>
    );
  }
  if (phase === "new") {
    return (
      <>
        <Text testID="vault-unlock-warning" color="$textSecondary">
          {t("vault.unlock.newWarning")}
        </Text>
        <AppButton variant="outline" testID="vault-unlock-new-continue" onPress={onCreate}>
          {t("vault.unlock.newContinue")}
        </AppButton>
        <AppButton variant="outline" testID="vault-unlock-back" onPress={have}>
          {t("vault.unlock.haveCta")}
        </AppButton>
      </>
    );
  }
  if (phase === "source") {
    return (
      <>
        <Text color="$textSecondary">{t("vault.unlock.sourceBody")}</Text>
        {available.server ? (
          <AppButton testID="vault-unlock-source-server" onPress={() => pick("server")}>
            {t("vault.unlock.sourceServer")}
          </AppButton>
        ) : null}
        {available.folder ? (
          <AppButton testID="vault-unlock-source-folder" onPress={() => pick("folder")}>
            {t("vault.unlock.sourceFolder")}
          </AppButton>
        ) : null}
        <AppButton testID="vault-unlock-source-file" onPress={() => pick("file")}>
          {t("vault.unlock.sourceFile")}
        </AppButton>
        <AppButton variant="outline" testID="vault-unlock-back" onPress={() => setPhase("home")}>
          {t("vault.unlock.back")}
        </AppButton>
      </>
    );
  }
  return (
    <SecretStep
      source={source}
      notice={notice}
      unlock={unlock}
      onResult={(result) => {
        if (result === "unlocked") onUnlocked();
        else if (result === "cancelled") setPhase("source");
        else setNotice(result);
      }}
      onChange={() => setNotice(null)}
      onBack={() => setPhase("source")}
    />
  );
}

function SecretStep({
  source,
  notice,
  unlock,
  onResult,
  onChange,
  onBack,
}: {
  source: UnlockSource;
  notice: UnlockResult | null;
  unlock: Props["unlock"];
  onResult: (result: UnlockResult) => void;
  onChange: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [secret, setSecret] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  // A ref too: Enter and a tap in the same frame both read `busy` as false.
  const trying = useRef(false);
  const ready = secret !== "" && !busy;
  const message = notice === null ? undefined : NOTICE[notice];

  const submit = () => {
    if (!ready || trying.current) return;
    trying.current = true;
    Keyboard.dismiss();
    setBusy(true);
    unlock(source, secret)
      .catch((error: unknown) => {
        reportError("vault.unlock", error);
        return "nothingToTry" as const;
      })
      .then((result) => {
        trying.current = false;
        setBusy(false);
        onResult(result);
      });
  };

  return (
    <>
      <XStack items="center" gap="$2">
        <Input
          testID="vault-unlock-secret"
          flex={1}
          minH={44}
          value={secret}
          onChangeText={(value) => {
            setSecret(value);
            onChange();
          }}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          placeholder={t("vault.unlock.secretLabel")}
          bg="$background"
          borderColor={notice === "wrong" ? "$error" : "$borderStrong"}
          color="$text"
        />
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={shown ? t("vault.pwHide") : t("vault.pwShow")}
          onPress={() => setShown((value) => !value)}
        >
          {shown ? (
            <EyeOff size={22} color="$textSecondary" />
          ) : (
            <Eye size={22} color="$textSecondary" />
          )}
        </Pressable>
      </XStack>
      <Text color="$textSecondary" fontSize="$3">
        {t("vault.unlock.secretHint")}
      </Text>
      {message === undefined ? null : (
        <Text testID="vault-unlock-error" color="$error">
          {t(message)}
        </Text>
      )}
      <AppButton testID="vault-unlock-submit" disabled={!ready} onPress={submit}>
        {busy ? t("vault.unlock.trying") : t("vault.unlock.submit")}
      </AppButton>
      <AppButton variant="outline" testID="vault-unlock-back" onPress={onBack}>
        {t("vault.unlock.otherSource")}
      </AppButton>
    </>
  );
}
