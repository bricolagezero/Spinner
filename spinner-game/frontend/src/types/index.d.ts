// spinner-game/frontend/src/types/index.d.ts

export interface GameSettings {
  title: string;
  subtitle?: string;
  footer?: string;
  backgroundMode: "image" | "gradient";
  backgroundUrl?: string;
  bgGradient?: { from: string; to: string; angle: number };
  allowRepeats: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
  timerMinutes: number;
  slices: Slice[];
  creator?: string;
  brandedImageUrl?: string;
  brandColors?: string[];
}

export interface Slice {
  id: string;
  label: string;
  color: string;
  iconUrl?: string;
  outcomeText?: string;
  outcomeImageUrl?: string;
  outcomeFontSize?: number;
  outcomeImageScale?: number;
  disabled?: boolean;
  timerSeconds?: number; // per-slice timer
  modalHeading?: string; // custom heading for the popup modal (H2)
  sameHeadingAsLabel?: boolean; // if false, use modalHeading instead of label
}

export type { GameSettings, Slice } from "../types";