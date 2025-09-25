// spinner-game/frontend/src/utils/defaults.ts
import type { GameSettings, Slice } from "../types";

// Augment Slice to include modal fields used by the UI
declare module "../types" {
  interface Slice {
    modalHeading?: string;
    sameHeadingAsLabel?: boolean;
  }
}

const uid = () => Math.random().toString(36).slice(2, 9);

const PALETTE = [
  "#ad1a1a",
  "#b44700",
  "#b48a00",
  "#2a7e4f",
  "#2663ad",
  "#7a2aad",
  "#ad2564",
  "#5a5a5a",
];

function makeSlice(n: number): Slice {
  return {
    id: uid(),
    label: `Item ${n}`,
    color: PALETTE[(n - 1) % PALETTE.length],
    iconUrl: "",
    outcomeText: "",
    outcomeImageUrl: "",
    disabled: false,
    modalHeading: "",
    sameHeadingAsLabel: true,
  };
}

export function defaultSettings(customTitle?: string): GameSettings {
  const sliceCount = 6;
  const slices = Array.from({ length: sliceCount }, (_, i) => makeSlice(i + 1));

  return {
    title: customTitle?.trim() || "New Spin Game",
    subtitle: "Add a subtitle",
    footer: "CONFIDENTIAL. INTERNAL TRAINING USE ONLY.",
    // Background defaults (works with your viewer/editor)
    backgroundMode: "image",
    backgroundUrl: "",
    bgGradient: { from: "#020617", to: "#1e293b", angle: 45 },

    allowRepeats: true,
    timerEnabled: false,
    timerSeconds: 15,
    timerMinutes: 0,
    slices,
  };
}
