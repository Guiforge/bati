import type { MuscleCode } from "@/src/db/schema";
import { GameIcon } from "@/src/hooks/useGameIcon";
import type { GameIconName } from "@/src/icons/gameIcons.registry";

const MUSCLE_ICON_MAP: Record<MuscleCode, GameIconName> = {
  arms: "lorc/master-of-arms",
  back: "lorc/back-pain",
  shoulder: "lorc/shoulder-scales",
  chest: "lorc/muscle-fat",
  abs: "lorc/muscle-up",
  calf: "lorc/winged-leg",
};

interface MuscleIconProps {
  muscle: MuscleCode;
  size?: number;
  tintColor?: string;
}

export function MuscleIcon({ muscle, size = 20, tintColor = "$text" }: MuscleIconProps) {
  const iconName = MUSCLE_ICON_MAP[muscle];
  return <GameIcon name={iconName} size={size} tintColor={tintColor} />;
}
