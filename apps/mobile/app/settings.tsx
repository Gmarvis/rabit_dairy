import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ExportRow } from "@rabbit/application";
import { Card, Row, ScreenHeader, SectionLabel } from "../src/components/ui";
import { signOut, useAuth, useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { useTheme, useThemeControls, type ThemeMode } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

function toCsv(rows: ExportRow[]): string {
  const header = ["Date", "Type", "Category", "Description", "Amount (XAF)", "Direction", "Method", "Account"];
  const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([r.date, r.type, r.category, r.description, r.amountMajor, r.direction, r.method, r.account].map(esc).join(","));
  }
  return lines.join("\n");
}

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, email } = useAuth();
  const c = useContainer();
  const t = useTheme();
  const { mode, setMode } = useThemeControls();
  const s = makeStyles(t);
  const { period } = usePeriod();
  const year = period.year;
  const [exporting, setExporting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function exportCsv() {
    setNote(null);
    setExporting(true);
    try {
      const rows = await c.queries.exportRows.execute(c.userId, year);
      if (rows.length === 0) {
        setNote("No transactions to export yet.");
        return;
      }
      await Share.share({
        title: `Rabbit Dairy ${year} export`,
        message: toCsv(rows),
      });
    } catch {
      setNote("Couldn't export right now.");
    } finally {
      setExporting(false);
    }
  }

  function confirmSignOut() {
    if (status !== "authed") return;
    Alert.alert("Sign out?", "You'll need to sign in again to see your data.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(6), gap: space(3) }}
    >
      <ScreenHeader title="Settings" onClose={() => router.back()} closeLabel="Done" topInset={insets.top} />

      <Card>
        <Row style={{ gap: space(3) }}>
          <View style={s.avatar}><Text style={s.avatarText}>{(email ?? "You")[0]!.toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{email ?? "Demo mode"}</Text>
            <Text style={s.meta}>{status === "authed" ? "Signed in" : "Preview data — sign in to save for real"}</Text>
          </View>
        </Row>
      </Card>

      <SectionLabel>Preferences</SectionLabel>
      <Card style={{ paddingVertical: space(1) }}>
        <Row between style={s.row}><Text style={s.rowText}>Currency</Text><Text style={s.rowVal}>XAF · FCFA</Text></Row>
        <Row between style={[s.row, s.border]}><Text style={s.rowText}>Active year</Text><Text style={s.rowVal}>{year}</Text></Row>
      </Card>

      <SectionLabel>Appearance</SectionLabel>
      <Card>
        <Text style={s.rowText}>Theme</Text>
        <Text style={s.meta}>System follows your phone’s light or dark setting.</Text>
        <View style={s.segment}>
          {THEME_OPTIONS.map((o) => (
            <Pressable
              key={o.key}
              style={[s.seg, mode === o.key && s.segOn]}
              onPress={() => setMode(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === o.key }}
            >
              <Text style={[s.segText, mode === o.key && s.segTextOn]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionLabel>Your data</SectionLabel>
      <Pressable onPress={exportCsv} disabled={exporting}>
        <Card>
          <Row between>
            <Row style={{ gap: space(3) }}>
              <View style={s.icon}><Ionicons name="download-outline" size={18} color={t.gold} /></View>
              <View>
                <Text style={s.rowText}>Export {year} to CSV</Text>
                <Text style={s.meta}>Open it in Excel or Sheets</Text>
              </View>
            </Row>
            <Ionicons name="chevron-forward" size={16} color={t.muted} />
          </Row>
        </Card>
      </Pressable>
      {note ? <Text style={s.note}>{note}</Text> : null}

      {status === "authed" ? (
        <Pressable onPress={confirmSignOut} style={{ marginTop: space(2) }}>
          <Text style={s.signOut}>Sign out</Text>
        </Pressable>
      ) : null}

      <Text style={s.version}>Rabbit Dairy · v0.1</Text>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { backgroundColor: c.bg },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.avatarBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.line },
  avatarText: { color: c.gold, fontWeight: "700", fontSize: 15 },
  name: { color: c.ink, fontSize: 14, fontWeight: "700" },
  meta: { color: c.muted, fontSize: 11, marginTop: 2 },
  row: { paddingVertical: space(2.5) },
  border: { borderTopWidth: 1, borderTopColor: c.line },
  rowText: { color: c.ink, fontSize: 13, fontWeight: "600" },
  rowVal: { color: c.gold, fontSize: 13, fontWeight: "700" },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center" },
  note: { color: c.ink2, fontSize: 12 },
  signOut: { color: c.negative, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: space(2) },
  version: { color: c.muted, fontSize: 11, textAlign: "center", marginTop: space(3) },
  segment: { flexDirection: "row", backgroundColor: c.card2, borderRadius: radius.md, padding: 3, marginTop: space(2.5) },
  seg: { flex: 1, paddingVertical: space(2), borderRadius: radius.sm, alignItems: "center" },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.ink2, fontSize: 12, fontWeight: "700" },
  segTextOn: { color: c.goldInk },
});
