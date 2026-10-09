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
  CREST_PLATE_PAD,
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
import { PRACTICE_KEY, sentence } from "./crestText";

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
/** How far the boar's halo goes past its glyph, in u. */
const HALO = 4;
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
  // A second animal is never the boar (crestRules: `border` is null for it, tested); the type
  // cannot say so without threading a narrower animal through the rules.
  const second = crest.second?.animal as keyof typeof ANIMAL_TOKEN | undefined;
  if (second === undefined) return <Path d={SHIELD} fill={fill} />;
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
          <Path d={rings.rings} fill="none" stroke={GOLD} strokeWidth={rings.strokeWidth} />
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
      {crest.animal === "boar" ? (
        // The boar's ink glyph sits on the ink cross and merges with it: the same glyph, larger
        // and bone, behind it, cuts the head out of the cross.
        <Image
          source={icon}
          tintColor={rawColors.text}
          contentFit="contain"
          style={{
            position: "absolute",
            left: (ANIMAL_BOX.x - HALO) * scale,
            top: (ANIMAL_BOX.y - HALO) * scale,
            width: (ANIMAL_BOX.size + 2 * HALO) * scale,
            height: (ANIMAL_BOX.size + 2 * HALO) * scale,
          }}
        />
      ) : null}
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
    <YStack
      bg="$bgDark"
      borderColor="$glassBorder"
      borderWidth={1}
      p={CREST_PLATE_PAD}
      rounded="$2"
    >
      {drawn}
    </YStack>
  );
}
