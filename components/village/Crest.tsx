import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { YStack } from "tamagui";
import { ANIMAL_TOKEN } from "@/constants/animalColors";
import { rawColors } from "@/constants/rawColors";
import type { Crest as CrestData } from "@/db/crest";
import { ANIMAL_OF, type Animal, type Practice } from "@/db/crestRules";
import { type GameIconName, useGameIcon } from "@/hooks/useGameIcon";
import {
  ANIMAL_BOX,
  BAND,
  type CrestSize,
  crossPath,
  DIAMOND,
  filetInset,
  filetWidth,
  flamesPath,
  insetShield,
  QUARTERS_B,
  ringsLayout,
  SHIELD,
  VIEW_H,
  VIEW_W,
} from "./crestGeometry";

/** What `getCrest` renders, less the evidence and stages the drawing does not read. */
export type CrestShape = Pick<
  CrestData,
  "animal" | "manual" | "second" | "quarters" | "longestFlame" | "rings"
>;

export type CrestProps = {
  /** Null before the first animal: nothing is drawn, the caller draws the glow. */
  crest: CrestShape | null;
  size: CrestSize;
  /** On a painting the crest sits on its own `bgDark` plate. */
  onPainting?: boolean;
};

const ICON: Record<Animal, GameIconName> = {
  bear: "crestBear",
  ermine: "crestErmine",
  salmon: "crestSalmon",
  stag: "crestStag",
  horse: "crestHorse",
  boar: "crestBoar",
};

/** A token like `$animalBear` as the colour Svg takes: Svg cannot read a Tamagui token. */
const fillOf = (token: (typeof ANIMAL_TOKEN)[keyof typeof ANIMAL_TOKEN]): string =>
  rawColors[token.slice(1) as keyof typeof rawColors];
const practiceFill = (p: Practice): string => {
  const a = ANIMAL_OF[p];
  return fillOf(ANIMAL_TOKEN[a]);
};

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One word per practice: the three styles already have theirs, running and cycling do not. */
const PRACTICE_KEY: Record<Practice, string> = {
  strength: "village.style_strength",
  calisthenics: "village.style_calisthenics",
  yoga: "village.style_yoga",
  run: "village.crest_practice_run",
  ride: "village.crest_practice_ride",
};

/** The crest, read aloud: whole sentences, so no language has to agree a part with a whole. */
function useCrestLabel(crest: CrestShape | null): string {
  const { t } = useTranslation();
  if (crest === null) return "";
  const name = (a: Animal) => sentence(t(`village.crest_${a}`));
  let what: string;
  if (crest.animal === "boar" && crest.quarters) {
    what = t("village.crest_boar_of", {
      first: t(PRACTICE_KEY[crest.quarters[0]]),
      second: t(PRACTICE_KEY[crest.quarters[1]]),
    });
  } else if (crest.second) {
    what = sentence(
      t("village.crest_pair", {
        first: t(`village.crest_${crest.animal}`),
        second: t(`village.crest_${crest.second.animal}`),
      }),
    );
  } else {
    what = t("village.crest_one", { animal: name(crest.animal) });
  }
  return crest.manual ? t("village.crest_manual", { what }) : what;
}

const INK = rawColors.bgDark;
const GOLD = rawColors.resourceGold;

/** The field: one animal's colour, that colour inside a border, or the boar's four quarters. */
function Field({ crest, size }: { crest: CrestShape; size: CrestSize }) {
  if (crest.animal === "boar") {
    const q = crest.quarters;
    return (
      <>
        <Path d={SHIELD} fill={q ? practiceFill(q[0]) : rawColors.animalBear} />
        {q !== null ? <Path d={QUARTERS_B} fill={practiceFill(q[1])} /> : null}
        <Path d={crossPath(size)} fill={INK} />
      </>
    );
  }
  const fill = fillOf(ANIMAL_TOKEN[crest.animal]);
  const second = crest.second?.animal;
  if (second === undefined || second === "boar") return <Path d={SHIELD} fill={fill} />;
  // The filet is stroked along the inset shield, its outer edge on the border's inner edge.
  return (
    <>
      <Path d={SHIELD} fill={fillOf(ANIMAL_TOKEN[second])} />
      <Path
        d={insetShield(filetInset(size))}
        fill={fill}
        stroke={INK}
        strokeWidth={filetWidth(size)}
      />
    </>
  );
}

/** The marks that come with size: the flame band from 48, the rings at 96, the diamond from 48. */
function Marks({ crest, size }: { crest: CrestShape; size: CrestSize }) {
  const rings = size === 96 && crest.rings > 0 ? ringsLayout(crest.rings) : null;
  return (
    <>
      {size > 24 && crest.longestFlame > 0 ? (
        <>
          <Path d={BAND} fill={INK} />
          <Path d={flamesPath(crest.longestFlame)} fill={GOLD} />
        </>
      ) : null}
      {rings !== null ? (
        <>
          <Path d={rings.pastille} fill={INK} />
          <Path d={rings.rings} fill={GOLD} />
        </>
      ) : null}
      {crest.manual && size > 24 ? <Path d={DIAMOND} fill={INK} /> : null}
    </>
  );
}

export function Crest({ crest, size, onPainting = false }: CrestProps) {
  const icon = useGameIcon(ICON[crest?.animal ?? "bear"]);
  const label = useCrestLabel(crest);
  if (crest === null) return null;

  const scale = size / VIEW_W;
  const height = VIEW_H * scale;
  const drawn = (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height }}
    >
      <Svg width={size} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Field crest={crest} size={size} />
        <Marks crest={crest} size={size} />
      </Svg>
      <Image
        source={icon}
        tintColor={INK}
        contentFit="contain"
        style={{
          position: "absolute",
          left: ANIMAL_BOX.x * scale,
          top: ANIMAL_BOX.y * scale,
          width: ANIMAL_BOX.size * scale,
          height: ANIMAL_BOX.size * scale,
        }}
      />
    </View>
  );
  if (!onPainting) return drawn;
  return (
    <YStack bg="$bgDark" borderColor="$glassBorder" borderWidth={1} p="$1.5" rounded="$2">
      {drawn}
    </YStack>
  );
}
