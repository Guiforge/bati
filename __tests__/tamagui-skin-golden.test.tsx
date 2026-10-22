import fs from "node:fs";
import path from "node:path";
import { ChevronLeft, ExternalLink } from "@tamagui/lucide-icons";
import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import config from "@/tamagui.config";

/**
 * The flattened style of every host node a Button or an Input renders, frozen. Tamagui 3 has no
 * Button or Input that looks like Tamagui 2's, so the app owns both (components/common/Button.tsx,
 * Input.tsx) and this file is what says they still draw the same pixels: gap, icon size and input
 * padding came out of v2's token lookups and cannot be read off the source.
 *
 * If a figure moves on purpose: `UPDATE_GOLDEN=1 npx jest tamagui-skin-golden`, and say why.
 */
const GOLDEN_FILE = path.join(__dirname, "golden", "tamagui-skins.json");

// What reaches the screen. Handlers, testIDs and the children are not pixels.
const KEPT = [
  "placeholderTextColor",
  "numberOfLines",
  "ellipsizeMode",
  "pointerEvents",
  "multiline",
  "width",
  "height",
  "color",
  "stroke",
  "strokeWidth",
  "fill",
  "hitSlop",
] as const;

interface HostNode {
  type: string;
  props: Record<string, unknown>;
  children: (HostNode | string)[] | null;
}

// A View draws no text, so the text styles v2 left on a Button's frame are not pixels either.
const TEXT_ONLY = ["color", "fontFamily", "fontSize", "fontWeight", "letterSpacing", "textAlign"];

const IDENTITY_TRANSFORMS = ['[{"scale":1}]', '[{"translateY":0}]'];

function pixelStyle(node: HostNode): Record<string, unknown> {
  const style: Record<string, unknown> = { ...StyleSheet.flatten(node.props.style as never) };
  if (node.type === "View") for (const key of TEXT_ONLY) delete style[key];
  // Lucide draws with `stroke`; v2 also wrote the same colour as a `color` nobody reads.
  if (node.type.startsWith("RNSVG")) delete style.color;
  // v2 wrote a pressStyle's resting values (opacity 1, scale 1, translate 0) up front. They draw
  // nothing.
  if (style.opacity === 1) delete style.opacity;
  if (IDENTITY_TRANSFORMS.includes(JSON.stringify(style.transform))) delete style.transform;
  return style;
}

function describeTree(node: HostNode | string): unknown {
  if (typeof node === "string") return node;
  const out: Record<string, unknown> = { type: node.type };
  const { pointerEvents, ...style } = pixelStyle(node);
  // v2 set `pointerEvents` as a prop, v3 as a style: React Native honours both the same way.
  if (pointerEvents !== undefined) out.pointerEvents = pointerEvents;
  if (Object.keys(style).length > 0) out.style = style;
  for (const key of KEPT) {
    const skip = key === "color" && node.type.startsWith("RNSVG");
    if (node.props[key] !== undefined && !skip) out[key] = node.props[key];
  }
  // Pinned only while true: v3 always says `aria-disabled`, v2 only while disabled, and the
  // difference is not a pixel.
  if (node.props["aria-disabled"] === true) out["aria-disabled"] = true;
  if (node.children) out.children = node.children.map(describeTree);
  return out;
}

const CASES: Record<string, ReactNode> = {
  "button default": <Button>Go</Button>,
  "button size 2": <Button size="2">Go</Button>,
  "button size 3": <Button size="3">Go</Button>,
  "button size 4": <Button size="4">Go</Button>,
  "button size 5": <Button size="5">Go</Button>,
  "button circular 3 chromeless icon": (
    <Button size="3" circular chromeless icon={<ChevronLeft size={24} color="text" />} />
  ),
  "button circular 4 icon": <Button size="4" circular icon={ChevronLeft} />,
  "button circular 5 p0": (
    <Button size="5" p={0} circular>
      ?
    </Button>
  ),
  "button chromeless 3": (
    <Button size="3" chromeless>
      Go
    </Button>
  ),
  "button icon + label": (
    <Button size="3" icon={ChevronLeft}>
      Back
    </Button>
  ),
  "button iconAfter": (
    <Button size="3" iconAfter={<ExternalLink size={16} color="textSecondary" />}>
      Open
    </Button>
  ),
  "button text props": (
    <Button size="3" color="text" fontFamily="heading" fontWeight="700" fontSize={15}>
      Go
    </Button>
  ),
  "button Button.Text": (
    <Button size="4">
      <Button.Text fontWeight="700">Discard</Button.Text>
    </Button>
  ),
  "button disabled": (
    <Button size="3" disabled>
      Go
    </Button>
  ),
  "button themed bg/border": (
    <Button size="3" bg="surface" borderColor="borderStrong" borderWidth={1}>
      Go
    </Button>
  ),
  "app button primary": <AppButton>Go</AppButton>,
  "app button outline": <AppButton variant="outline">Go</AppButton>,
  "input default": <Input value="x" placeholder="Name" />,
  "input app": (
    <Input value="x" bg="background" borderColor="borderStrong" color="text" minH={44} />
  ),
  "input multiline": <Input value="x" multiline py={8} />,
  "input multiline lines": <Input value="x" multiline py={8} numberOfLines={4} height={110} />,
};

async function describeCase(element: ReactNode) {
  const { toJSON } = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      {element}
    </TamaguiProvider>,
  );
  const tree = toJSON() as HostNode | HostNode[] | null;
  if (tree === null) return null;
  return Array.isArray(tree) ? tree.map(describeTree) : describeTree(tree);
}

test("Button and Input draw what they drew on Tamagui 2", async () => {
  const actual: Record<string, unknown> = {};
  for (const [name, element] of Object.entries(CASES)) actual[name] = await describeCase(element);

  if (process.env.UPDATE_GOLDEN === "1") {
    fs.mkdirSync(path.dirname(GOLDEN_FILE), { recursive: true });
    fs.writeFileSync(GOLDEN_FILE, `${JSON.stringify(actual, null, 2)}\n`);
  }
  const golden = JSON.parse(fs.readFileSync(GOLDEN_FILE, "utf8"));
  expect(actual).toEqual(golden);
});
