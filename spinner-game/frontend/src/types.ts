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
  timerSeconds?: number;
  modalHeading?: string;
  sameHeadingAsLabel?: boolean;
}

export interface GameSettings {
  title: string;
  subtitle?: string;
  footer?: string;
  creator?: string;
  backgroundMode: "image" | "gradient";
  backgroundUrl?: string;
  bgGradient?: { from: string; to: string; angle: number };
  allowRepeats: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
  timerMinutes: number;
  slices: Slice[];
  brandedImageUrl?: string;
  brandColors?: string[];
}
