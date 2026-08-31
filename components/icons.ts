// Metro does not tree-shake. `import { Sparkles } from "@tamagui/lucide-icons"` runs the
// package index, which requires all 1761 icons: 1.87 MB of source in the bundle for the 74 this
// app draws (measured on the v1.13.0 sourcemap, 14% of it). Each icon also publishes its own
// subpath, so re-exporting from those puts only what is used in the bundle — the same trap, and
// the same fix, as the per-weight font imports in app/_layout.tsx.
//
// Every lucide icon in the app comes through here. Adding one is a line below; nothing else
// should import "@tamagui/lucide-icons" directly. tsconfig.json maps the subpaths to the .d.ts
// the package ships, because its exports map declares no "types" condition.

export { AlertCircle } from "@tamagui/lucide-icons/icons/AlertCircle";
export { AlertTriangle } from "@tamagui/lucide-icons/icons/AlertTriangle";
export { Archive } from "@tamagui/lucide-icons/icons/Archive";
export { ArchiveRestore } from "@tamagui/lucide-icons/icons/ArchiveRestore";
export { ArrowRight } from "@tamagui/lucide-icons/icons/ArrowRight";
export { Award } from "@tamagui/lucide-icons/icons/Award";
export { BarChart2 } from "@tamagui/lucide-icons/icons/BarChart2";
export { Bug } from "@tamagui/lucide-icons/icons/Bug";
export { Calendar } from "@tamagui/lucide-icons/icons/Calendar";
export { Castle } from "@tamagui/lucide-icons/icons/Castle";
export { Check } from "@tamagui/lucide-icons/icons/Check";
export { ChevronDown } from "@tamagui/lucide-icons/icons/ChevronDown";
export { ChevronLeft } from "@tamagui/lucide-icons/icons/ChevronLeft";
export { ChevronRight } from "@tamagui/lucide-icons/icons/ChevronRight";
export { ChevronUp } from "@tamagui/lucide-icons/icons/ChevronUp";
export { Clock } from "@tamagui/lucide-icons/icons/Clock";
export { Crosshair } from "@tamagui/lucide-icons/icons/Crosshair";
export { Drama } from "@tamagui/lucide-icons/icons/Drama";
export { Dumbbell } from "@tamagui/lucide-icons/icons/Dumbbell";
export { ExternalLink } from "@tamagui/lucide-icons/icons/ExternalLink";
export { Flame } from "@tamagui/lucide-icons/icons/Flame";
export { FolderDown } from "@tamagui/lucide-icons/icons/FolderDown";
export { FolderSync } from "@tamagui/lucide-icons/icons/FolderSync";
export { Footprints } from "@tamagui/lucide-icons/icons/Footprints";
export { Gem } from "@tamagui/lucide-icons/icons/Gem";
export { HeartPulse } from "@tamagui/lucide-icons/icons/HeartPulse";
export { Home } from "@tamagui/lucide-icons/icons/Home";
export { ImagePlus } from "@tamagui/lucide-icons/icons/ImagePlus";
export { Info } from "@tamagui/lucide-icons/icons/Info";
export { Languages } from "@tamagui/lucide-icons/icons/Languages";
export { Leaf } from "@tamagui/lucide-icons/icons/Leaf";
export { Link2 } from "@tamagui/lucide-icons/icons/Link2";
export { List } from "@tamagui/lucide-icons/icons/List";
export { Lock } from "@tamagui/lucide-icons/icons/Lock";
export { Map } from "@tamagui/lucide-icons/icons/Map";
export { Medal } from "@tamagui/lucide-icons/icons/Medal";
export { MessagesSquare } from "@tamagui/lucide-icons/icons/MessagesSquare";
export { Minus } from "@tamagui/lucide-icons/icons/Minus";
export { Moon } from "@tamagui/lucide-icons/icons/Moon";
export { Mountain } from "@tamagui/lucide-icons/icons/Mountain";
export { Pause } from "@tamagui/lucide-icons/icons/Pause";
export { Pencil } from "@tamagui/lucide-icons/icons/Pencil";
export { PenLine } from "@tamagui/lucide-icons/icons/PenLine";
export { Play } from "@tamagui/lucide-icons/icons/Play";
export { Plus } from "@tamagui/lucide-icons/icons/Plus";
export { Repeat } from "@tamagui/lucide-icons/icons/Repeat";
export { RotateCcw } from "@tamagui/lucide-icons/icons/RotateCcw";
export { Ruler } from "@tamagui/lucide-icons/icons/Ruler";
export { Scroll } from "@tamagui/lucide-icons/icons/Scroll";
export { ScrollText } from "@tamagui/lucide-icons/icons/ScrollText";
export { Search } from "@tamagui/lucide-icons/icons/Search";
export { Settings } from "@tamagui/lucide-icons/icons/Settings";
export { Share2 } from "@tamagui/lucide-icons/icons/Share2";
export { Shield } from "@tamagui/lucide-icons/icons/Shield";
export { ShieldCheck } from "@tamagui/lucide-icons/icons/ShieldCheck";
export { SkipBack } from "@tamagui/lucide-icons/icons/SkipBack";
export { SkipForward } from "@tamagui/lucide-icons/icons/SkipForward";
export { Skull } from "@tamagui/lucide-icons/icons/Skull";
export { SlidersHorizontal } from "@tamagui/lucide-icons/icons/SlidersHorizontal";
export { Sparkles } from "@tamagui/lucide-icons/icons/Sparkles";
export { Sprout } from "@tamagui/lucide-icons/icons/Sprout";
export { Star } from "@tamagui/lucide-icons/icons/Star";
export { Sunrise } from "@tamagui/lucide-icons/icons/Sunrise";
export { Swords } from "@tamagui/lucide-icons/icons/Swords";
export { Target } from "@tamagui/lucide-icons/icons/Target";
export { Timer } from "@tamagui/lucide-icons/icons/Timer";
export { Trash2 } from "@tamagui/lucide-icons/icons/Trash2";
export { TreePine } from "@tamagui/lucide-icons/icons/TreePine";
export { TrendingDown } from "@tamagui/lucide-icons/icons/TrendingDown";
export { TrendingUp } from "@tamagui/lucide-icons/icons/TrendingUp";
export { Trophy } from "@tamagui/lucide-icons/icons/Trophy";
export { Vibrate } from "@tamagui/lucide-icons/icons/Vibrate";
export { Volume2 } from "@tamagui/lucide-icons/icons/Volume2";
export { Wrench } from "@tamagui/lucide-icons/icons/Wrench";
export { X } from "@tamagui/lucide-icons/icons/X";
export { Zap } from "@tamagui/lucide-icons/icons/Zap";
