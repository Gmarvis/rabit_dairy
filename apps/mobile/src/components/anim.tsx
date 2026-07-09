import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { chart } from "../theme/tokens";
import { duration, easing, springPress } from "../theme/motion";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Tracks the OS "reduce motion" setting. Reduced motion means gentler, fewer
 * animations — we keep opacity/colour fades (they aid comprehension) and drop
 * movement, scaling, and celebratory bursts.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setReduced(v); });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduced;
}

/**
 * A Pressable that springs down slightly while held — the tactile
 * micro-interaction used on cards and primary actions. Built on the RN Animated
 * driver so it needs no extra native modules.
 */
export function PressableScale({
  children,
  style,
  onPress,
  disabled,
  accessibilityLabel,
  hitSlop,
  to = 0.96,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  hitSlop?: number;
  to?: number;
}) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v: number) => {
    if (reduced) return; // keep the press instant, no scaling motion
    Animated.spring(scale, { toValue: v, ...springPress }).start();
  };
  return (
    <Pressable
      onPressIn={() => spring(to)}
      onPressOut={() => spring(1)}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * A money figure that counts up to its value when it changes — used on the
 * net-worth hero so the headline number feels alive. XAF has no minor units,
 * so the integer we animate is the amount shown.
 */
export function CountUpMoney({
  value,
  size = 40,
  duration = 900,
  style,
}: {
  value: number;
  size?: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
}) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(value)).current;
  const from = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduced) { setDisplay(value); from.current = value; return; }
    anim.setValue(from.current);
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: easing.out,
      useNativeDriver: false,
    }).start(() => { from.current = value; });
    return () => anim.removeListener(id);
  }, [value, duration, anim, reduced]);

  return (
    <Text style={[{ color: c.ink, fontSize: size, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -0.5 }, style]}>
      {display.toLocaleString("en-US")}
      <Text style={{ fontSize: Math.max(12, size * 0.32), fontWeight: "600", color: c.ink2 }}> FCFA</Text>
    </Text>
  );
}

/** Fades and lifts its children in on mount — a gentle entrance for cards. */
export function FadeInUp({
  children,
  delay = 0,
  distance = 10,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) { p.setValue(1); return; } // fade only handled below; skip the lift
    Animated.timing(p, {
      toValue: 1,
      duration: duration.enter,
      delay,
      easing: easing.out,
      useNativeDriver: true,
    }).start();
  }, [p, delay, reduced]);
  return (
    <Animated.View
      style={[
        {
          opacity: p,
          transform: [{ translateY: reduced ? 0 : p.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const CONFETTI_COLORS = [chart.green, chart.amber, chart.blue, chart.red, chart.violet, "#E9B44C"];
const SCREEN_H = Dimensions.get("window").height;

/**
 * A brief confetti burst — celebratory feedback for hitting a milestone. Pure
 * Animated (one driver, many interpolations), so no native module. Renders
 * nothing until `play` flips true, then clears itself when the burst ends.
 */
export function Confetti({ play, count = 20 }: { play: boolean; count?: number }) {
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const spread = (i / (count - 1)) * 2 - 1; // −1 … 1
        return {
          dx: spread * (110 + (i % 5) * 26),
          fall: SCREEN_H * (0.42 + ((i * 7) % 20) / 100),
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
          size: 6 + (i % 3) * 3,
          spin: i % 2 ? 1 : -1,
          delayIn: (i % 4) * 0.04,
        };
      }),
    [count],
  );

  useEffect(() => {
    if (!play || reduced) return; // no celebratory motion when reduced
    setVisible(true);
    p.setValue(0);
    Animated.timing(p, {
      toValue: 1,
      duration: duration.celebrate,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [play, p, reduced]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => {
        const translateY = p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, -60, b.fall] });
        const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [0, b.dx] });
        const rotate = p.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${b.spin * 540}deg`] });
        const opacity = p.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              top: "34%",
              left: "50%",
              width: b.size,
              height: b.size * 1.4,
              borderRadius: 2,
              backgroundColor: b.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </Animated.View>
  );
}

export const animStyles = StyleSheet.create({ fill: { flex: 1 } });
