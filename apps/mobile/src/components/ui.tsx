import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { Money } from "@rabbit/domain";
import { useReducedMotion } from "./anim";
import { easing, springPress, springSlide } from "../theme/motion";
import { useTheme } from "../theme/ThemeProvider";
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
  const c = useTheme();
  return (
    <View style={{ paddingTop: Math.min(topInset, space(2)) + space(2), marginBottom: space(4) }}>
      <Pressable onPress={onClose} hitSlop={14} style={{ alignSelf: "flex-start", paddingVertical: space(1) }}>
        <Text style={{ color: c.gold, fontSize: 15, fontWeight: "600" }}>{closeLabel}</Text>
      </Pressable>
      <Text style={{ color: c.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: space(2) }}>
        {title}
      </Text>
    </View>
  );
}

/**
 * Standing page header used across the doc's screens: a small eyebrow line, a
 * big title below it, and an optional action on the right (a round button or a
 * pill). Not a modal close — these screens dismiss with the sheet gesture.
 */
export function PageHeader({
  eyebrow,
  title,
  right,
  topInset = 0,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
  topInset?: number;
}) {
  const c = useTheme();
  return (
    <View style={{ paddingTop: Math.min(topInset, space(2)) + space(2), marginBottom: space(3), flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
      <View>
        {eyebrow ? <Text style={{ color: c.ink2, fontSize: 12 }}>{eyebrow}</Text> : null}
        <Text style={{ color: c.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/**
 * Compact modal top bar — Cancel on the left, a centred title, and an optional
 * right action (Save / Upload). Used by the capture & form sheets.
 */
export function ModalHeader({
  title,
  onCancel,
  right,
  topInset = 0,
}: {
  title: string;
  onCancel: () => void;
  right?: ReactNode;
  topInset?: number;
}) {
  const c = useTheme();
  return (
    <View style={{ paddingTop: Math.min(topInset, space(2)) + space(2), paddingBottom: space(3), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Pressable onPress={onCancel} hitSlop={10} style={{ minWidth: 64 }}>
        <Text style={{ color: c.gold, fontSize: 15, fontWeight: "600" }}>Cancel</Text>
      </Pressable>
      <Text style={{ color: c.ink, fontSize: 16, fontWeight: "800" }}>{title}</Text>
      <View style={{ minWidth: 64, alignItems: "flex-end" }}>{right}</View>
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
  const c = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v: number) => { if (!reduced) Animated.spring(scale, { toValue: v, ...springPress }).start(); };
  return (
    <Pressable
      accessibilityRole="button"
      onPressIn={() => spring(0.97)}
      onPressOut={() => spring(1)}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[
          { backgroundColor: c.gold, borderRadius: radius.lg, paddingVertical: space(4), alignItems: "center", transform: [{ scale }] },
          (disabled || loading) && { opacity: 0.4 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={c.goldInk} />
        ) : (
          <Text style={{ color: c.goldInk, fontWeight: "800", fontSize: 16 }}>{label}</Text>
        )}
      </Animated.View>
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
  const c = useTheme();
  return (
    <View
      style={[
        { backgroundColor: c.card, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: c.line },
        hero && { backgroundColor: c.heroFrom, borderColor: c.line, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 18 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useTheme();
  return (
    <Text style={[{ color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.3, textTransform: "uppercase" }, style]}>
      {children}
    </Text>
  );
}

/** Blinking caret bar shown beside a live amount entry. */
export function Caret({ height = 44 }: { height?: number }) {
  const c = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 450, delay: 420, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ width: 3, height, borderRadius: 2, marginLeft: 6, backgroundColor: c.gold, opacity }} />;
}

/** The big amount readout shared by the capture screens. */
export function AmountHero({ value, caret, size = 56 }: { value: number; caret?: boolean; size?: number }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: "center" }}>
      <SectionLabel style={{ letterSpacing: 1.5 }}>Amount</SectionLabel>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: space(2) }}>
        <Text style={{ color: value === 0 ? c.muted : c.ink, fontSize: size, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -1.5 }}>
          {value.toLocaleString("en-US")}
        </Text>
        {caret ? <Caret height={Math.round(size * 0.78)} /> : null}
      </View>
      <Text style={{ color: c.ink2, fontSize: 13, fontWeight: "700", letterSpacing: 1, marginTop: space(1.5) }}>FCFA</Text>
    </View>
  );
}

/** Label + a horizontal chip row with a fade edge hinting more content. */
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  const c = useTheme();
  return (
    <View>
      <SectionLabel style={{ marginBottom: space(2) }}>{label}</SectionLabel>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2), paddingRight: space(8) }}>
          {children}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(c.bg, 0), c.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 36 }}
        />
      </View>
    </View>
  );
}

/** A selectable pill (category / account) with an optional colour dot. */
export function SelectChip({ label, color, selected, onPress }: { label: string; color?: string; selected: boolean; onPress: () => void }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v: number) => { if (!reduced) Animated.spring(scale, { toValue: v, ...springPress }).start(); };
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => spring(0.96)}
      onPressOut={() => spring(1)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Animated.View
        style={{
          flexDirection: "row", alignItems: "center", gap: 7,
          backgroundColor: selected ? c.gold : c.card,
          borderColor: selected ? c.gold : c.line, borderWidth: 1,
          borderRadius: radius.pill, paddingHorizontal: space(3.5), paddingVertical: space(2.5),
          transform: [{ scale }],
        }}
      >
        {color ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} /> : null}
        <Text style={{ color: selected ? c.goldInk : c.ink2, fontSize: 13, fontWeight: selected ? "700" : "600" }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** The numeric keypad for entering an amount. Calls onKey with "0"–"9", "000", or "del". */
export function AmountKeypad({ onKey }: { onKey: (key: string) => void }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space(2.5) }}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "del"].map((k) => (
        <KeypadKey key={k} onPress={() => onKey(k)}>
          {k === "del" ? (
            <Ionicons name="backspace-outline" size={23} color={c.ink} />
          ) : (
            <Text style={{ color: k === "000" ? c.ink2 : c.ink, fontSize: k === "000" ? 19 : 24, fontWeight: k === "000" ? "700" : "600" }}>{k}</Text>
          )}
        </KeypadKey>
      ))}
    </View>
  );
}

/** A single keypad key with a spring press animation for tactile feedback. */
function KeypadKey({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v: number) => { if (!reduced) Animated.spring(scale, { toValue: v, ...springPress }).start(); };
  return (
    <Pressable style={{ width: "31.5%" }} onPressIn={() => spring(0.93)} onPressOut={() => spring(1)} onPress={onPress}>
      <Animated.View style={{ backgroundColor: c.card2, borderRadius: radius.md, paddingVertical: space(3.5), alignItems: "center", justifyContent: "center", transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * A segmented control — the gold pill glides to the selected option rather than
 * cutting between backgrounds, so switching reads as one continuous state
 * change. Falls back to an instant jump under reduced motion.
 */
const SEG_PAD = 3;
export function Segment<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  // Inner track excludes the 1px border and the 3px inset on each side.
  const segW = width > 0 ? (width - 2 - SEG_PAD * 2) / options.length : 0;
  const tx = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (segW <= 0) return;
    const to = idx * segW;
    if (reduced) { tx.setValue(to); return; }
    Animated.spring(tx, { toValue: to, ...springSlide }).start();
  }, [idx, segW, reduced, tx]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, padding: SEG_PAD }}
    >
      {/* Base row: inactive labels, always readable + handles the taps. */}
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          style={{ flex: 1, paddingVertical: space(2.5), alignItems: "center" }}
        >
          <Text style={{ color: c.ink2, fontSize: 13, fontWeight: "700" }}>{o.label}</Text>
        </Pressable>
      ))}
      {/* Moving pill with the active-coloured labels clipped to it — the label
          under the pill is always readable, no dark-on-dark flash mid-slide. */}
      {segW > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute", top: SEG_PAD, left: SEG_PAD, bottom: SEG_PAD, width: segW,
            shadowColor: c.gold, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
            transform: [{ translateX: tx }],
          }}
        >
          <View style={{ flex: 1, borderRadius: radius.sm, backgroundColor: c.gold, overflow: "hidden" }}>
            <Animated.View style={{ flexDirection: "row", width: segW * options.length, height: "100%", transform: [{ translateX: Animated.multiply(tx, -1) }] }}>
              {options.map((o) => (
                <View key={o.value} style={{ width: segW, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: c.goldInk, fontSize: 13, fontWeight: "700" }}>{o.label}</Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A rounded progress track — budgets, goals, savings. The fill grows in from
 *  the left (GPU scaleX) so a budget "filling up" reads as motion, not a static
 *  bar. Accessible as a progressbar; honours reduced motion. */
export function ProgressBar({ progress, tone = "gold", height = 8, track }: { progress: number; tone?: "gold" | "positive" | "negative"; height?: number; track?: string }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const fillColor = tone === "positive" ? c.positive : tone === "negative" ? c.negative : c.gold;
  const [w, setW] = useState(0);
  const sx = useRef(new Animated.Value(reduced ? pct : 0)).current;

  useEffect(() => {
    if (reduced) { sx.setValue(pct); return; }
    Animated.timing(sx, { toValue: pct, duration: 520, easing: easing.out, useNativeDriver: true }).start();
  }, [pct, reduced, sx]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height, borderRadius: height / 2, backgroundColor: track ?? c.card2, overflow: "hidden" }}
    >
      {w > 0 ? (
        <Animated.View
          style={{
            width: w, height: "100%", borderRadius: height / 2, backgroundColor: fillColor,
            // scaleX anchors at centre; translateX keeps the left edge pinned at 0.
            transform: [{ translateX: Animated.multiply(Animated.subtract(sx, 1), w / 2) }, { scaleX: sx }],
          }}
        />
      ) : null}
    </View>
  );
}

/** A chart legend — a colour swatch, a label, and an optional right-aligned value. */
export function Legend({ items }: { items: { color: string; label: string; value?: string }[] }) {
  const c = useTheme();
  return (
    <View style={{ gap: space(2) }}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: space(2) }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: it.color }} />
          <Text style={{ color: c.ink2, fontSize: 13, flex: 1 }} numberOfLines={1}>{it.label}</Text>
          {it.value ? <Text style={{ color: c.ink, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{it.value}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Standard loading placeholder — a centered spinner in a card. */
export function LoadingCard({ label }: { label?: string }) {
  const c = useTheme();
  return (
    <Card style={{ alignItems: "center", justifyContent: "center", paddingVertical: space(8), gap: space(3) }}>
      <ActivityIndicator color={c.gold} />
      {label ? <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text> : null}
    </Card>
  );
}

/** Standard error state with an optional retry — the fallback for a failed query. */
export function ErrorState({ message = "Something went wrong.", onRetry }: { message?: string; onRetry?: () => void }) {
  const c = useTheme();
  return (
    <Card style={{ alignItems: "center", gap: space(3), paddingVertical: space(6) }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: withAlpha(c.negative, 0.14), alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="cloud-offline-outline" size={24} color={c.negative} />
      </View>
      <Text style={{ color: c.ink2, fontSize: 14, textAlign: "center", lineHeight: 20 }}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button" style={{ borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, paddingHorizontal: space(4), paddingVertical: space(2) }}>
          <Text style={{ color: c.gold, fontSize: 14, fontWeight: "700" }}>Try again</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

/** Standard empty state — an icon medallion, a title, a hint, and an optional action. */
export function EmptyState({ icon, title, hint, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; hint?: string; action?: ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: "center", gap: space(2), paddingVertical: space(8), paddingHorizontal: space(6) }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center", marginBottom: space(1) }}>
        <Ionicons name={icon} size={26} color={c.gold} />
      </View>
      <Text style={{ color: c.ink, fontSize: 16, fontWeight: "700", textAlign: "center" }}>{title}</Text>
      {hint ? <Text style={{ color: c.muted, fontSize: 13, textAlign: "center", lineHeight: 19 }}>{hint}</Text> : null}
      {action ? <View style={{ marginTop: space(2) }}>{action}</View> : null}
    </View>
  );
}

/**
 * A single shimmering placeholder block. Pulses opacity (native driver); holds
 * a steady dim value under reduced motion. The building block for every
 * skeleton — compose these into the shape of the content that's loading.
 */
export function Skeleton({ width = "100%", height = 12, radius: r = radius.sm, style }: { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const o = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduced) { o.setValue(0.7); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 750, easing: easing.inOut, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.55, duration: 750, easing: easing.inOut, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o, reduced]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: c.card2, opacity: o }, style]} />;
}

/** A skeleton list row: leading tile, two text lines, trailing amount. */
export function SkeletonRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) }}>
      <Skeleton width={40} height={40} radius={13} />
      <View style={{ gap: 7, flex: 1 }}>
        <Skeleton width="55%" height={12} />
        <Skeleton width="34%" height={9} />
      </View>
      <Skeleton width={54} height={12} />
    </View>
  );
}

/** A card of skeleton rows — the placeholder for any transaction/account list. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <Card style={{ paddingVertical: space(1) }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </Card>
  );
}

/** A hero-card placeholder — eyebrow, big number, sub-line. */
export function SkeletonHero() {
  return (
    <Card hero>
      <Skeleton width={130} height={11} />
      <Skeleton width={180} height={32} radius={10} style={{ marginTop: space(3) }} />
      <Skeleton width={150} height={12} style={{ marginTop: space(3) }} />
    </Card>
  );
}

/** A block placeholder for a chart / donut / heat-map card. */
export function SkeletonBlock({ height = 180 }: { height?: number }) {
  return (
    <Card style={{ alignItems: "center", justifyContent: "center" }}>
      <Skeleton width="100%" height={height} radius={radius.md} />
    </Card>
  );
}

type Tone = "gold" | "positive" | "negative" | "muted";

export function Pill({ children, tone = "gold" }: { children: ReactNode; tone?: Tone }) {
  const c = useTheme();
  const map: Record<Tone, { bg: string; fg: string }> = {
    gold: { bg: c.goldSoft, fg: c.gold },
    positive: { bg: withAlpha(c.positive, 0.15), fg: c.positive },
    negative: { bg: withAlpha(c.negative, 0.16), fg: c.negative },
    muted: { bg: c.card2, fg: c.muted },
  };
  const { bg, fg } = map[tone];
  return (
    <View style={{ borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start", backgroundColor: bg }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: fg }}>{children}</Text>
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
  const c = useTheme();
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
  const c = useTheme();
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

/** iOS-style pill toggle matching the redesign (gold track when on). */
export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={{
        width: 46, height: 28, borderRadius: 999, padding: 3,
        backgroundColor: value ? c.gold : c.card2,
        alignItems: value ? "flex-end" : "flex-start", justifyContent: "center",
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: value ? c.goldInk : c.muted }} />
    </Pressable>
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
