export type Slice = {
  id: string;
  label: string;
  color: string;
  outcomeText?: string;
  outcomeImageUrl?: string;
  iconUrl?: string;
  disabled?: boolean;
  outcomeFontSize?: number;   // px
  outcomeImageScale?: number; // 0.2–1.0
};

export type GameSettings = {
  title: string;
  subtitle?: string;
  footer?: string;
  creator?: string;

  backgroundMode?: "image" | "gradient";
  backgroundUrl?: string;
  bgGradient?: { from: string; to: string; angle: number };
  
  brandedImageUrl?: string;
  brandColors?: string[];

  allowRepeats: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
  timerMinutes: number;
  slices: Slice[];
};
