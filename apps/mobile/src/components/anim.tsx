import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

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
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
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
  const anim = useRef(new Animated.Value(value)).current;
  const from = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    anim.setValue(from.current);
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => { from.current = value; });
    return () => anim.removeListener(id);
  }, [value, duration, anim]);

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
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [p, delay]);
  return (
    <Animated.View
      style={[
        { opacity: p, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export const animStyles = StyleSheet.create({ fill: { flex: 1 } });
