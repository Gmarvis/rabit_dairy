import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ExportRow } from "@rabbit/application";
import { Card, Row, ScreenHeader, SectionLabel } from "../src/components/ui";
import { signOut, useAuth, useContainer } from "../src/lib/auth";
import { colors, radius, space } from "../src/theme/tokens";

const YEAR = 2026;

function toCsv(rows: ExportRow[]): string {
  const header = ["Date", "Type", "Category", "Description", "Amount (XAF)", "Direction", "Method", "Account"];
  const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([r.date, r.type, r.category, r.description, r.amountMajor, r.direction, r.method, r.account].map(esc).join(","));
  }
  return lines.join("\n");
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, email } = useAuth();
  const c = useContainer();
  const [exporting, setExporting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function exportCsv() {
    setNote(null);
    setExporting(true);
    try {
      const rows = await c.queries.exportRows.execute(c.userId, YEAR);
      if (rows.length === 0) {
        setNote("No transactions to export yet.");
        return;
      }
      await Share.share({
        title: `Rabbit Dairy ${YEAR} export`,
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
      style={styles.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(6), gap: space(3) }}
    >
      <ScreenHeader title="Settings" onClose={() => router.back()} closeLabel="Done" topInset={insets.top} />

      <Card>
        <Row style={{ gap: space(3) }}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(email ?? "You")[0]!.toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{email ?? "Demo mode"}</Text>
            <Text style={styles.meta}>{status === "authed" ? "Signed in" : "Preview data — set Supabase keys to save for real"}</Text>
          </View>
        </Row>
      </Card>

      <SectionLabel>Preferences</SectionLabel>
      <Card style={{ paddingVertical: space(1) }}>
        <Row between style={styles.row}><Text style={styles.rowText}>Currency</Text><Text style={styles.rowVal}>XAF · FCFA</Text></Row>
        <Row between style={[styles.row, styles.border]}><Text style={styles.rowText}>Active year</Text><Text style={styles.rowVal}>{YEAR}</Text></Row>
      </Card>

      <SectionLabel>Your data</SectionLabel>
      <Pressable onPress={exportCsv} disabled={exporting}>
        <Card>
          <Row between>
            <Row style={{ gap: space(3) }}>
              <View style={styles.icon}><Ionicons name="download-outline" size={18} color={colors.gold} /></View>
              <View>
                <Text style={styles.rowText}>Export {YEAR} to CSV</Text>
                <Text style={styles.meta}>Open it in Excel or Sheets</Text>
              </View>
            </Row>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Row>
        </Card>
      </Pressable>
      {note ? <Text style={styles.note}>{note}</Text> : null}

      {status === "authed" ? (
        <Pressable onPress={confirmSignOut} style={{ marginTop: space(2) }}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      ) : null}

      <Text style={styles.version}>Rabbit Dairy · v0.1</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#243B2E", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line },
  avatarText: { color: colors.gold, fontWeight: "700", fontSize: 15 },
  name: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  row: { paddingVertical: space(2.5) },
  border: { borderTopWidth: 1, borderTopColor: colors.line },
  rowText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  rowVal: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: "rgba(233,180,76,0.16)", alignItems: "center", justifyContent: "center" },
  note: { color: colors.ink2, fontSize: 12 },
  signOut: { color: colors.negative, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: space(2) },
  version: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: space(3) },
});
