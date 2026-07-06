/**
 * Rabbit Dairy design tokens — the committed dark pine-and-gold identity from
 * design/ui-flow.html. One theme for now; a light theme swaps these values.
 */
export const colors = {
  bg: "#14231C",
  card: "#1E3228",
  card2: "#26402F",
  line: "rgba(255,255,255,0.09)",

  ink: "#F3F0E6",
  ink2: "#A7B4AB",
  muted: "#76867C",

  gold: "#E9B44C",
  goldInk: "#20170A",

  // Semantic (kept separate from the gold accent)
  positive: "#3ED996",
  negative: "#E97767",

  // Validated categorical chart hues (dark surface)
  chart: {
    green: "#26A876",
    amber: "#BC8623",
    blue: "#4E8FD9",
    red: "#D95A4E",
    violet: "#9085E9",
  },
} as const;

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
export function colorForType(type: string): string {
  switch (type) {
    case "income": return colors.chart.green;
    case "savings": return colors.chart.blue;
    case "business_cost": return colors.chart.violet;
    case "fixed_expense": return colors.chart.red;
    case "variable_expense": return colors.chart.amber;
    default: return colors.muted;
  }
}
