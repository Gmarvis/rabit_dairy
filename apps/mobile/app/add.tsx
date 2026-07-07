import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

const OPTIONS = [
  { key: "manual", icon: "create-outline", title: "Type it in", sub: "Amount, category, method", highlight: false },
  { key: "voice", icon: "mic-outline", title: "Speak it", sub: "Record & say why you spent", highlight: true },
  { key: "scan", icon: "camera-outline", title: "Scan a statement", sub: "Photo of bank / mobile money", highlight: false },
] as const satisfies ReadonlyArray<{
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  highlight: boolean;
}>;

export default function AddHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const s = makeStyles(c);

  return (
    <View style={[s.screen, { paddingBottom: insets.bottom + space(4) }]}>
      <View style={s.grabber} />
      <Text style={s.title}>Add a transaction</Text>
      <Text style={s.sub}>How do you want to log it?</Text>

      <View style={{ gap: space(2.5), marginTop: space(3) }}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            style={[s.option, o.highlight && s.optionHi]}
            onPress={() =>
              o.key === "manual"
                ? router.replace("/manual")
                : o.key === "voice"
                  ? router.replace("/voice")
                  : router.replace("/scan")
            }
          >
            <View style={s.icon}>
              <Ionicons name={o.icon} size={20} color={c.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.optTitle}>{o.title}</Text>
              <Text style={s.optSub}>{o.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.muted} />
          </Pressable>
        ))}
      </View>

      <Pressable style={s.cancel} onPress={() => router.back()}>
        <Text style={s.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg, padding: space(5), justifyContent: "flex-end" },
    grabber: { position: "absolute", top: 10, alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.line },
    title: { color: c.ink, fontSize: 18, fontWeight: "800" },
    sub: { color: c.ink2, fontSize: 12, marginTop: 4 },
    option: {
      flexDirection: "row", alignItems: "center", gap: space(3),
      backgroundColor: c.card, borderColor: c.line, borderWidth: 1,
      borderRadius: radius.lg, padding: space(3.5),
    },
    optionHi: { borderColor: c.goldBorder },
    icon: {
      width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.goldSoft,
      alignItems: "center", justifyContent: "center",
    },
    optTitle: { color: c.ink, fontSize: 14, fontWeight: "700" },
    optSub: { color: c.ink2, fontSize: 11, marginTop: 2 },
    cancel: { marginTop: space(3), alignItems: "center", padding: space(3) },
    cancelText: { color: c.ink2, fontSize: 14, fontWeight: "600" },
  });
