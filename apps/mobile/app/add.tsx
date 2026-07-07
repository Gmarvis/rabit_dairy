import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "../src/theme/tokens";

const OPTIONS = [
  { key: "manual", icon: "create", title: "Type it in", sub: "Amount, category, method", highlight: false },
  { key: "voice", icon: "mic", title: "Speak it", sub: "Record & say why you spent", highlight: true },
  { key: "scan", icon: "camera", title: "Scan a statement", sub: "Photo of bank / mobile money", highlight: false },
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

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + space(4) }]}>
      <View style={styles.grabber} />
      <Text style={styles.title}>Add a transaction</Text>
      <Text style={styles.sub}>How do you want to log it?</Text>

      <View style={{ gap: space(2.5), marginTop: space(3) }}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            style={[styles.option, o.highlight && styles.optionHi]}
            // Manual + voice are built; scan lands in Phase 5.
            onPress={() =>
              o.key === "manual"
                ? router.replace("/manual")
                : o.key === "voice"
                  ? router.replace("/voice")
                  : router.back()
            }
          >
            <View style={styles.icon}>
              <Ionicons name={o.icon} size={18} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optTitle}>{o.title}</Text>
              <Text style={styles.optSub}>{o.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.cancel} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: space(5), justifyContent: "flex-end" },
  grabber: { position: "absolute", top: 10, alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line },
  title: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  sub: { color: colors.ink2, fontSize: 12, marginTop: 4 },
  option: {
    flexDirection: "row", alignItems: "center", gap: space(3),
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.lg, padding: space(3.5),
  },
  optionHi: { borderColor: "rgba(233,180,76,0.4)" },
  icon: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: "rgba(233,180,76,0.16)",
    alignItems: "center", justifyContent: "center",
  },
  optTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  optSub: { color: colors.ink2, fontSize: 11, marginTop: 2 },
  cancel: { marginTop: space(3), alignItems: "center", padding: space(3) },
  cancelText: { color: colors.ink2, fontSize: 14, fontWeight: "600" },
});
