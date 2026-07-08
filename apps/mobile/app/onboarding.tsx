import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FadeInUp, PressableScale } from "../src/components/anim";
import { useTheme } from "../src/theme/ThemeProvider";
import { chart, radius, space, type Palette } from "../src/theme/tokens";

export const ONBOARDED_KEY = "rabbit.onboarded";
const { width: W } = Dimensions.get("window");

const SLIDES: { icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; body: string }[] = [
  { icon: "wallet", tint: chart.green, title: "All your money, one place", body: "See your total balance across every account — cash, mobile money, and bank — and where it's heading." },
  { icon: "sparkles", tint: chart.amber, title: "Log it in seconds", body: "Snap a receipt, say it out loud, or tap it in. Rabbit reads the amount and category for you." },
  { icon: "pie-chart", tint: chart.blue, title: "Know where it goes", body: "Reports, a spending calendar, and budgets that keep every franc accounted for." },
  { icon: "flame", tint: "#E9B44C", title: "Make it a habit", body: "Daily streaks and a gentle end-of-day nudge make tracking something you'll actually keep up." },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const s = makeStyles(t);
  const scrollX = useRef(new Animated.Value(0)).current;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);
  const [active, setActive] = useState(0);
  const isLast = active === SLIDES.length - 1;

  async function finish(then?: "account") {
    await AsyncStorage.setItem(ONBOARDED_KEY, "1").catch(() => {});
    if (then === "account") router.replace("/account-new");
    else router.back();
  }

  function nextSlide() {
    if (isLast) return finish();
    listRef.current?.scrollTo({ x: (active + 1) * W, animated: true });
  }

  return (
    <View style={s.screen}>
      <View style={[s.top, { paddingTop: insets.top + space(2) }]}>
        <Pressable onPress={() => finish()} hitSlop={10}>
          <Text style={s.skip}>Skip</Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={(r) => { listRef.current = r; }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.x / W))}
        scrollEventThrottle={16}
      >
        {SLIDES.map((sl, i) => (
          <View key={i} style={[s.slide, { width: W }]}>
            <FadeInUp delay={i === 0 ? 120 : 0}>
              <View style={[s.badge, { backgroundColor: `${sl.tint}22` }]}>
                <Ionicons name={sl.icon} size={52} color={sl.tint} />
              </View>
            </FadeInUp>
            <FadeInUp delay={i === 0 ? 220 : 0}>
              <Text style={s.title}>{sl.title}</Text>
              <Text style={s.body}>{sl.body}</Text>
            </FadeInUp>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Progress dots */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => {
          const w = scrollX.interpolate({
            inputRange: [(i - 1) * W, i * W, (i + 1) * W],
            outputRange: [7, 22, 7],
            extrapolate: "clamp",
          });
          const op = scrollX.interpolate({
            inputRange: [(i - 1) * W, i * W, (i + 1) * W],
            outputRange: [0.35, 1, 0.35],
            extrapolate: "clamp",
          });
          return <Animated.View key={i} style={[s.dot, { width: w, opacity: op }]} />;
        })}
      </View>

      <View style={[s.footer, { paddingBottom: insets.bottom + space(3) }]}>
        <PressableScale style={s.primary} onPress={nextSlide} accessibilityLabel={isLast ? "Get started" : "Next"}>
          <Text style={s.primaryText}>{isLast ? "Get started" : "Next"}</Text>
        </PressableScale>
        {isLast ? (
          <Pressable onPress={() => finish("account")} hitSlop={8} style={{ alignItems: "center", paddingVertical: space(2) }}>
            <Text style={s.secondary}>Add my first account</Text>
          </Pressable>
        ) : (
          <View style={{ height: space(2) + 18 }} />
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  top: { paddingHorizontal: space(4), alignItems: "flex-end" },
  skip: { color: c.ink2, fontSize: 15, fontWeight: "600" },
  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space(7), gap: space(5) },
  badge: { width: 116, height: 116, borderRadius: 58, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  title: { color: c.ink, fontSize: 26, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  body: { color: c.ink2, fontSize: 15, textAlign: "center", lineHeight: 23, marginTop: space(3) },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, paddingVertical: space(4) },
  dot: { height: 7, borderRadius: 4, backgroundColor: c.gold },
  footer: { paddingHorizontal: space(4), paddingTop: space(1) },
  primary: { backgroundColor: c.gold, borderRadius: radius.lg, paddingVertical: space(4), alignItems: "center" },
  primaryText: { color: c.goldInk, fontWeight: "800", fontSize: 16 },
  secondary: { color: c.ink2, fontSize: 14, fontWeight: "600" },
});
