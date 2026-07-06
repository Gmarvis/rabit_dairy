import { type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { Money } from "@rabbit/domain";
import { colors, radius, space } from "../theme/tokens";

export function Card({
  children,
  style,
  hero,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  hero?: boolean;
}) {
  return (
    <View style={[styles.card, hero && styles.cardHero, style]}>{children}</View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Pill({
  children,
  tone = "gold",
}: {
  children: ReactNode;
  tone?: "gold" | "positive" | "negative" | "muted";
}) {
  const bg = {
    gold: "rgba(233,180,76,0.15)",
    positive: "rgba(62,217,150,0.14)",
    negative: "rgba(233,119,103,0.15)",
    muted: colors.card2,
  }[tone];
  const fg = {
    gold: colors.gold,
    positive: colors.positive,
    negative: colors.negative,
    muted: colors.muted,
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{children}</Text>
    </View>
  );
}

/** Renders a Money amount with an optional sign colour and currency suffix. */
export function MoneyText({
  amount,
  signed,
  size = 15,
  currency = true,
  style,
}: {
  amount: Money;
  signed?: boolean;
  size?: number;
  currency?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const color = signed
    ? amount.isNegative
      ? colors.negative
      : colors.positive
    : colors.ink;
  const prefix = signed && !amount.isNegative && !amount.isZero ? "+" : "";
  return (
    <Text style={[{ color, fontSize: size, fontWeight: "800" }, styles.tnum, style]}>
      {prefix}
      {amount.format({ withCode: false })}
      {currency ? <Text style={styles.cur}> FCFA</Text> : null}
    </Text>
  );
}

export function Row({
  children,
  style,
  between,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  between?: boolean;
}) {
  return (
    <View
      style={[styles.row, between && { justifyContent: "space-between" }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space(3.5),
  },
  cardHero: { backgroundColor: colors.card2 },
  sectionLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  pillText: { fontSize: 10, fontWeight: "700" },
  cur: { fontSize: 12, fontWeight: "600", color: colors.ink2 },
  row: { flexDirection: "row", alignItems: "center", gap: space(2.5) },
  tnum: { fontVariant: ["tabular-nums"] },
});
