/**
 * Rabbit Dairy design tokens — pine-and-gold identity from the redesign, now
 * in both light and dark. Screens should consume a `Theme` via `useTheme()`
 * (see ThemeProvider). The `colors` export is the dark theme, kept so existing
 * screens keep compiling while they migrate to the hook.
 */

export interface Theme {
  mode: "light" | "dark";
  /** App background (the device canvas). */
  bg: string;
  /** Primary surface (cards, sheets). */
  card: string;
  /** Elevated / tinted surface. */
  card2: string;
  /** Hairline borders. */
  line: string;
  /** Field / input background. */
  field: string;

  /** Primary text. */
  ink: string;
  /** Secondary text. */
  ink2: string;
  /** Tertiary / labels. */
  muted: string;

  /** Gold accent. */
  gold: string;
  /** Ink that sits on the gold accent. */
  goldInk: string;
  /** Soft gold tint background (chips, highlights). */
  goldSoft: string;

  positive: string;
  negative: string;

  /** Categorical chart hues (shared across themes). */
  chart: {
    green: string;
    amber: string;
    blue: string;
    red: string;
    violet: string;
  };
}

const chart = {
  green: "#26A876",
  amber: "#BC8623",
  blue: "#4E8FD9",
  red: "#D95A4E",
  violet: "#9085E9",
} as const;

export const darkTheme: Theme = {
  mode: "dark",
  bg: "#14231C",
  card: "#1E3228",
  card2: "#26402F",
  line: "rgba(255,255,255,0.09)",
  field: "rgba(255,255,255,0.05)",

  ink: "#F3F0E6",
  ink2: "#A7B4AB",
  muted: "#76867C",

  gold: "#E9B44C",
  goldInk: "#20170A",
  goldSoft: "rgba(233,180,76,0.15)",

  positive: "#3ED996",
  negative: "#E97767",

  chart,
};

export const lightTheme: Theme = {
  mode: "light",
  bg: "#F4F1E7",
  card: "#FFFFFF",
  card2: "#FBFAF4",
  line: "rgba(20,35,28,0.12)",
  field: "#FFFFFF",

  ink: "#16241C",
  ink2: "#4C574E",
  muted: "#7A857B",

  gold: "#9A6C10",
  goldInk: "#FFF9EB",
  goldSoft: "rgba(154,108,16,0.14)",

  positive: "#1E7A50",
  negative: "#C24B3F",

  chart,
};

/**
 * Back-compat: the dark theme as a flat object. Existing screens import this
 * directly; new/redesigned screens should call `useTheme()` instead.
 */
export const colors = darkTheme;

export const radius = { sm: 10, md: 13, lg: 16, xl: 22, pill: 999 } as const;

export const space = (n: number) => n * 4;

export const font = {
  // System stack — native apps should use the platform font.
  size: { xs: 11, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, hero: 34 },
  weight: {
    regular: "400",
    medium: "600",
    semibold: "700",
    bold: "800",
  },
} as const;

/** Colour for a category type (used for chips and fallbacks). */
export function colorForType(type: string, theme: Theme = darkTheme): string {
  switch (type) {
    case "income": return theme.chart.green;
    case "savings": return theme.chart.blue;
    case "business_cost": return theme.chart.violet;
    case "fixed_expense": return theme.chart.red;
    case "variable_expense": return theme.chart.amber;
    default: return theme.muted;
  }
}
