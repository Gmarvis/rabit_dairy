import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { Money } from "@rabbit/domain";
import { colors, radius, space } from "../theme/tokens";

/**
 * The consistent modal header used across every screen: a close action on its
 * own top row, then the big title on its own line below — never inline, with
 * breathing room before the content so tap targets don't crowd.
 */
export function ScreenHeader({
  title,
  onClose,
  closeLabel = "Cancel",
  topInset = 0,
}: {
  title: string;
  onClose: () => void;
  closeLabel?: string;
  topInset?: number;
}) {
  return (
    <View style={{ paddingTop: topInset + space(2), marginBottom: space(4) }}>
      <Pressable onPress={onClose} hitSlop={14} style={{ alignSelf: "flex-start", paddingVertical: space(1) }}>
        <Text style={{ color: colors.gold, fontSize: 15, fontWeight: "600" }}>{closeLabel}</Text>
      </Pressable>
      <Text style={{ color: colors.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: space(2) }}>
        {title}
      </Text>
    </View>
  );
}

/** Full-width primary action, anchored at the bottom of form screens. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[pbStyles.btn, (disabled || loading) && pbStyles.off]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={colors.goldInk} />
      ) : (
        <Text style={pbStyles.text}>{label}</Text>
      )}
    </Pressable>
  );
}

const pbStyles = StyleSheet.create({
  btn: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: space(3.5),
    alignItems: "center",
  },
  off: { opacity: 0.4 },
  text: { color: colors.goldInk, fontWeight: "800", fontSize: 15 },
});

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
    borderRadius: radius.lg,
    padding: space(4),
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
