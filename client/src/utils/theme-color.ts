const DEFAULT_THEME_COLOR = "#fc466b";
const DEFAULT_THEME_PRESET = "paper";

export type ThemePresetDefinition = {
  description: string;
  label: string;
  value: string;
  light: {
    glow: string;
    ink: string;
    muted: string;
    paper: string;
    surface: string;
  };
  dark: {
    glow: string;
    ink: string;
    muted: string;
    paper: string;
    surface: string;
  };
};

export const THEME_PRESET_DEFINITIONS: ThemePresetDefinition[] = [
  {
    value: "paper",
    label: "Paper",
    description: "Warm editorial paper with soft contrast and gallery-like warmth.",
    light: {
      paper: "#fffaf5",
      surface: "#f7f0e8",
      ink: "#211814",
      muted: "#78645a",
      glow: "#d6b478",
    },
    dark: {
      paper: "#141213",
      surface: "#1b1819",
      ink: "#ede9e5",
      muted: "#b4a8a0",
      glow: "#7b6047",
    },
  },
  {
    value: "mist",
    label: "Mist",
    description: "Cool editorial white with stone blues and quieter chrome.",
    light: {
      paper: "#f5f8fb",
      surface: "#e9eff5",
      ink: "#17212b",
      muted: "#5d7286",
      glow: "#9cb6d0",
    },
    dark: {
      paper: "#10161d",
      surface: "#17202a",
      ink: "#e7edf3",
      muted: "#9caec1",
      glow: "#4d667e",
    },
  },
  {
    value: "nocturne",
    label: "Nocturne",
    description: "Dramatic bronze-black atmosphere with denser contrast and shadow.",
    light: {
      paper: "#f9f3ed",
      surface: "#efe5db",
      ink: "#241813",
      muted: "#86685d",
      glow: "#c7966f",
    },
    dark: {
      paper: "#120f11",
      surface: "#1a1518",
      ink: "#f1e6dd",
      muted: "#bea496",
      glow: "#7d5e4f",
    },
  },
];

function normalizeHex(value: string | undefined | null) {
  if (!value) return DEFAULT_THEME_COLOR;
  const trimmed = value.trim();

  const short = /^#([0-9a-f]{3})$/i.exec(trimmed);
  if (short) {
    const expanded = short[1]
      .split("")
      .map((char) => char + char)
      .join("");
    return `#${expanded}`.toLowerCase();
  }

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return DEFAULT_THEME_COLOR;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function themeColorToRgb(value: string | undefined | null) {
  return hexToRgb(normalizeHex(value));
}

function mix(value: number, target: number, ratio: number) {
  return Math.round(value + (target - value) * ratio);
}

function shade(hex: string, ratio: number) {
  const { r, g, b } = hexToRgb(hex);
  const target = ratio < 0 ? 0 : 255;
  const amount = Math.abs(ratio);

  return {
    r: mix(r, target, amount),
    g: mix(g, target, amount),
    b: mix(b, target, amount),
  };
}

function toCssRgb({ r, g, b }: { r: number; g: number; b: number }) {
  return `${r} ${g} ${b}`;
}

function setRgbVariable(root: HTMLElement, name: string, hex: string) {
  root.style.setProperty(name, toCssRgb(hexToRgb(hex)));
}

export function normalizeThemeColor(value: string | undefined | null) {
  return normalizeHex(value);
}

export function normalizeThemePreset(value: string | undefined | null) {
  if (!value) return DEFAULT_THEME_PRESET;
  const normalized = value.trim().toLowerCase();
  return THEME_PRESET_DEFINITIONS.some((preset) => preset.value === normalized)
    ? normalized
    : DEFAULT_THEME_PRESET;
}

export function getThemePresetDefinition(value: string | undefined | null) {
  const normalized = normalizeThemePreset(value);
  return THEME_PRESET_DEFINITIONS.find((preset) => preset.value === normalized) || THEME_PRESET_DEFINITIONS[0];
}

export function applyThemePreset(value: string | undefined | null) {
  const preset = getThemePresetDefinition(value);
  const root = document.documentElement;

  setRgbVariable(root, "--site-paper-rgb", preset.light.paper);
  setRgbVariable(root, "--site-surface-rgb", preset.light.surface);
  setRgbVariable(root, "--site-ink-rgb", preset.light.ink);
  setRgbVariable(root, "--site-muted-rgb", preset.light.muted);
  setRgbVariable(root, "--site-glow-rgb", preset.light.glow);

  setRgbVariable(root, "--site-paper-dark-rgb", preset.dark.paper);
  setRgbVariable(root, "--site-surface-dark-rgb", preset.dark.surface);
  setRgbVariable(root, "--site-ink-dark-rgb", preset.dark.ink);
  setRgbVariable(root, "--site-muted-dark-rgb", preset.dark.muted);
  setRgbVariable(root, "--site-glow-dark-rgb", preset.dark.glow);
}

export function applyThemeColor(value: string | undefined | null) {
  const color = normalizeHex(value);
  const root = document.documentElement;

  root.style.setProperty("--theme-rgb", toCssRgb(hexToRgb(color)));
  root.style.setProperty("--theme-hover-rgb", toCssRgb(shade(color, -0.3)));
  root.style.setProperty("--theme-active-rgb", toCssRgb(shade(color, -0.4)));
}

export function applySiteTheme({
  color,
  preset,
}: {
  color?: string | null;
  preset?: string | null;
}) {
  applyThemePreset(preset);
  applyThemeColor(color);
}
