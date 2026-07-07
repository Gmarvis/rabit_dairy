/**
 * Rabbit Dairy design tokens. The identity is a warm pine-and-gold system with
 * two committed themes — a light "paper" ground and the dark pine ground — both
 * drawn from design/ui-flow.html. Layout tokens (radius, space, font) and the
 * categorical chart hues are theme-independent; colours come from a Palette.
 */

export interface Palette {
  /** Screen background. */
  bg: string;
  /** Card / surface fill. */
  card: string;
  /** Secondary surface — icon tiles, bar tracks, inset rows. */
  card2: string;
  /** Hairline dividers & borders. */
  line: string;

  /** Primary text. */
  ink: string;
  /** Secondary text. */
  ink2: string;
  /** Tertiary / captions. */
  muted: string;

  /** Gold accent. */
  gold: string;
  /** Text/ink that sits on a filled gold surface. */
  goldInk: string;
  /** Faint gold wash for icon tiles / soft pills. */
  goldSoft: string;
  /** Gold border tint for emphasised cards. */
  goldBorder: string;

  /** Positive / income. */
  positive: string;
  /** Negative / expense. */
  negative: string;
  /** Informational blue (savings, hints). */
  blue: string;

  /** Round avatar / decorative tile ground. */
  avatarBg: string;
  /** Hero card gradient stops. */
  heroFrom: string;
  heroTo: string;
  /** Bottom tab bar ground. */
  tabBar: string;
}

/** Categorical hues for category dots and charts — stable across both themes. */
export const chart = {
  green: "#26A876",
  amber: "#BC8623",
  blue: "#4E8FD9",
  red: "#D95A4E",
  violet: "#9085E9",
} as const;

export const darkPalette: Palette = {
  bg: "#14231C",
  card: "#1E3228",
  card2: "#26402F",
  line: "rgba(255,255,255,0.09)",

  ink: "#F3F0E6",
  ink2: "#A7B4AB",
  muted: "#76867C",

  gold: "#E9B44C",
  goldInk: "#20170A",
  goldSoft: "rgba(233,180,76,0.16)",
  goldBorder: "rgba(233,180,76,0.42)",

  positive: "#3ED996",
  negative: "#E97767",
  blue: "#6FA8E8",

  avatarBg: "#243B2E",
  heroFrom: "#233A2C",
  heroTo: "#182A20",
  tabBar: "#0F1A13",
};

export const lightPalette: Palette = {
  bg: "#F4F1E7",
  card: "#FFFFFF",
  card2: "#ECE7D8",
  line: "rgba(20,35,28,0.12)",

  ink: "#16241C",
  ink2: "#4C574E",
  muted: "#7A857B",

  gold: "#9A6C10",
  goldInk: "#FFFFFF",
  goldSoft: "rgba(154,108,16,0.12)",
  goldBorder: "rgba(154,108,16,0.40)",

  positive: "#1E7A50",
  negative: "#C24B3F",
  blue: "#3F7BC0",

  avatarBg: "#E8E4D4",
  heroFrom: "#FFFFFF",
  heroTo: "#F1ECDC",
  tabBar: "#FFFFFF",
};

/**
 * Legacy flat export — equals the dark palette. Screens not yet migrated to
 * `useTheme()` keep compiling (rendering dark). Remove once every screen reads
 * its palette from the theme context.
 */
export const colors = { ...darkPalette, chart } as const;

export const radius = { sm: 10, md: 13, lg: 16, xl: 22, pill: 999 } as const;

export const space = (n: number) => n * 4;

export const font = {
  size: { xs: 11, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, hero: 34 },
  weight: { regular: "400", medium: "600", semibold: "700", bold: "800" },
} as const;

/** Colour for a category type — used for dots, chips and chart fallbacks. */
export function colorForType(type: string): string {
  switch (type) {
    case "income": return chart.green;
    case "savings": return chart.blue;
    case "business_cost": return chart.violet;
    case "fixed_expense": return chart.red;
    case "variable_expense": return chart.amber;
    default: return "#76867C";
  }
}
