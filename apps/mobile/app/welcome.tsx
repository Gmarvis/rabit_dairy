import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse } from "react-native-svg";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

/** Brand mark — a simple rabbit built from ears + head, in the gold accent. */
function RabbitMark({ color, size = 30 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Ellipse cx={11} cy={9} rx={2.6} ry={7} fill={color} />
      <Ellipse cx={21} cy={9} rx={2.6} ry={7} fill={color} />
      <Circle cx={16} cy={21} r={8} fill={color} />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const s = makeStyles(c);

  return (
    <View style={[s.screen, { paddingTop: insets.top + space(6), paddingBottom: insets.bottom + space(4) }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={s.logo}>
          <RabbitMark color={c.gold} />
        </View>

        <Text style={s.headline}>
          Know where{"\n"}your <Text style={s.headlineAccent}>money</Text>{"\n"}goes.
        </Text>

        <Text style={s.sub}>
          Track spending by typing, speaking, or scanning your statement. No subscription. Just your money, clearly.
        </Text>

        <View style={s.pills}>
          {["Type", "Speak", "Scan"].map((p) => (
            <View key={p} style={s.pill}>
              <Text style={s.pillText}>{p.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ gap: space(2.5) }}>
        <Pressable style={s.primary} onPress={() => router.push("/auth")} accessibilityRole="button">
          <Text style={s.primaryText}>Get started</Text>
        </Pressable>
        <Pressable style={s.ghost} onPress={() => router.push("/auth")} accessibilityRole="button">
          <Text style={s.ghostText}>I already have an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space(6) },
    logo: {
      width: 64, height: 64, borderRadius: 20, backgroundColor: c.card2,
      alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.line,
    },
    headline: { color: c.ink, fontSize: 44, fontWeight: "800", letterSpacing: -1, lineHeight: 46, marginTop: space(7) },
    headlineAccent: { color: c.gold },
    sub: { color: c.ink2, fontSize: 15, lineHeight: 22, marginTop: space(5), maxWidth: 340 },
    pills: { flexDirection: "row", gap: space(2.5), marginTop: space(6) },
    pill: { borderWidth: 1, borderColor: c.gold, borderRadius: radius.pill, paddingHorizontal: space(3.5), paddingVertical: space(2) },
    pillText: { color: c.gold, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
    primary: { backgroundColor: c.gold, borderRadius: radius.lg, paddingVertical: space(4), alignItems: "center" },
    primaryText: { color: c.goldInk, fontSize: 16, fontWeight: "800" },
    ghost: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingVertical: space(4), alignItems: "center" },
    ghostText: { color: c.ink, fontSize: 15, fontWeight: "700" },
  });
