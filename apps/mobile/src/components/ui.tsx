import { Ionicons } from "@expo/vector-icons";
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
import { useTheme } from "../theme/theme";
import { radius, space, type Palette } from "../theme/tokens";

/**
 * Modal header: a close action on its own row, then the big title below, with
 * breathing room before the content.
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
  const { c } = useTheme();
  return (
    <View style={{ paddingTop: topInset + space(2), marginBottom: space(4) }}>
      <Pressable onPress={onClose} hitSlop={14} style={{ alignSelf: "flex-start", paddingVertical: space(1) }}>
        <Text style={{ color: c.gold, fontSize: 15, fontWeight: "600" }}>{closeLabel}</Text>
      </Pressable>
      <Text style={{ color: c.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: space(2) }}>
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
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      style={[
        { backgroundColor: c.gold, borderRadius: radius.md, paddingVertical: space(3.5), alignItems: "center" },
        (disabled || loading) && { opacity: 0.4 },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={c.goldInk} />
      ) : (
        <Text style={{ color: c.goldInk, fontWeight: "800", fontSize: 15 }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
  hero,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  hero?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: c.card, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: c.line },
        hero && { backgroundColor: c.heroFrom, borderColor: c.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return (
    <Text style={[{ color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }, style]}>
      {children}
    </Text>
  );
}

type Tone = "gold" | "positive" | "negative" | "muted";

export function Pill({ children, tone = "gold" }: { children: ReactNode; tone?: Tone }) {
  const { c } = useTheme();
  const map: Record<Tone, { bg: string; fg: string }> = {
    gold: { bg: c.goldSoft, fg: c.gold },
    positive: { bg: withAlpha(c.positive, 0.15), fg: c.positive },
    negative: { bg: withAlpha(c.negative, 0.16), fg: c.negative },
    muted: { bg: c.card2, fg: c.muted },
  };
  const { bg, fg } = map[tone];
  return (
    <View style={{ borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start", backgroundColor: bg }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: fg }}>{children}</Text>
    </View>
  );
}

/** A rounded icon tile — the leading mark on transaction / account rows. */
export function Tico({
  icon,
  size = 32,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  bg?: string;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size * 0.31, flex: 0,
        alignItems: "center", justifyContent: "center",
        backgroundColor: bg ?? c.card2,
      }}
    >
      <Ionicons name={icon} size={size * 0.5} color={color ?? c.ink} />
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
  const { c } = useTheme();
  const color = signed ? (amount.isNegative ? c.negative : c.positive) : c.ink;
  const prefix = signed && !amount.isNegative && !amount.isZero ? "+" : "";
  return (
    <Text style={[{ color, fontSize: size, fontWeight: "800", fontVariant: ["tabular-nums"] }, style]}>
      {prefix}
      {amount.format({ withCode: false })}
      {currency ? <Text style={{ fontSize: 12, fontWeight: "600", color: c.ink2 }}> FCFA</Text> : null}
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
    <View style={[styles.row, between && { justifyContent: "space-between" }, style]}>
      {children}
    </View>
  );
}

/** Small helper: apply an alpha channel to a #rrggbb colour. */
export function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space(2.5) },
});

export type { Palette };
