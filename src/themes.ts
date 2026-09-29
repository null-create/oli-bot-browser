export const THEME_STORAGE_KEY = "oli-theme";

export type ThemeId =
  | "terminal"
  | "gemini"
  | "kid"
  | "amber"
  | "synthwave"
  | "paper";

export type ThemeInfo = {
  id: ThemeId;
  label: string;
  description: string;
  /** Browser chrome colour, mirroring the theme's page background. */
  chrome: string;
};

export const DEFAULT_THEME: ThemeId = "terminal";

export const THEMES: ThemeInfo[] = [
  {
    id: "terminal",
    label: "terminal",
    description: "green phosphor on black",
    chrome: "#020403",
  },
  {
    id: "gemini",
    label: "gemini",
    description: "clean and quiet",
    chrome: "#ffffff",
  },
  {
    id: "kid",
    label: "storybook",
    description: "warm, round and playful",
    chrome: "#fffaf0",
  },
  {
    id: "amber",
    label: "amber",
    description: "vintage CRT, P1 phosphor",
    chrome: "#0d0803",
  },
  {
    id: "synthwave",
    label: "synthwave",
    description: "neon magenta and cyan",
    chrome: "#1a0b2e",
  },
  {
    id: "paper",
    label: "paper",
    description: "soft sepia, easy on the eyes",
    chrome: "#f6f1e7",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((t) => t.id === value);
}

export function themeInfo(id: ThemeId): ThemeInfo {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
