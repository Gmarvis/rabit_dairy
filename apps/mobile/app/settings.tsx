import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ExportRow } from "@rabbit/application";
import { Card, Row, ScreenHeader, SectionLabel, Toggle } from "../src/components/ui";
import { signOut, useAuth, useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { monthLabel } from "../src/lib/format";
import { useTheme, useThemeControls } from "../src/theme/ThemeProvider";
import { space, type Palette } from "../src/theme/tokens";

function toCsv(rows: ExportRow[]): string {
  const header = ["Date", "Type", "Category", "Description", "Amount (XAF)", "Direction", "Method", "Account"];
  const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([r.date, r.type, r.category, r.description, r.amountMajor, r.direction, r.method, r.account].map(esc).join(","));
  }
  return lines.join("\n");
}

/** Display name from the signed-in email, e.g. "sam@nyota.ltd" → "Sam". */
function displayName(email: string | null): string {
  if (!email) return "Demo user";
  const local = email.split("@")[0]!.replace(/[._-]+/g, " ").trim();
  return local.replace(/\b\w/g, (m) => m.toUpperCase());
}

const BIOMETRIC_KEY = "rabbit.biometricLock";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, email } = useAuth();
  const c = useContainer();
  const t = useTheme();
  const { resolved, setMode } = useThemeControls();
  const s = makeStyles(t);
  const { period } = usePeriod();
  const year = period.year;
  const [exporting, setExporting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [biometric, setBiometric] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(BIOMETRIC_KEY).then((v) => setBiometric(v === "1")).catch(() => {});
  }, []);

  function toggleBiometric(v: boolean) {
    setBiometric(v);
    AsyncStorage.setItem(BIOMETRIC_KEY, v ? "1" : "0").catch(() => {});
  }

  async function exportCsv() {
    setNote(null);
    setExporting(true);
    try {
      const rows = await c.queries.exportRows.execute(c.userId, year);
      if (rows.length === 0) {
        setNote("No transactions to export yet.");
        return;
      }
      await Share.share({ title: `Rabbit Dairy ${year} export`, message: toCsv(rows) });
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

  const initials = displayName(email).split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(6), gap: space(3) }}
    >
      <ScreenHeader title="Settings" onClose={() => router.back()} closeLabel="Done" topInset={insets.top} />

      {/* Profile */}
      <Card>
        <Row style={{ gap: space(3) }}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials || "You"}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{displayName(email)}</Text>
            <Text style={s.meta}>{email ?? "Preview data — sign in to save for real"}</Text>
          </View>
        </Row>
      </Card>

      {/* Preferences */}
      <SectionLabel>Preferences</SectionLabel>
      <Card style={{ paddingVertical: space(1) }}>
        <Row between style={s.row}><Text style={s.rowText}>Currency</Text><Text style={s.rowVal}>XAF · FCFA</Text></Row>
        <Row between style={[s.row, s.border]}><Text style={s.rowText}>Active month</Text><Text style={s.rowMuted}>{monthLabel(period)}</Text></Row>
        <Row between style={[s.row, s.border]}><Text style={s.rowText}>Emergency fund goal</Text><Text style={s.rowMuted}>0</Text></Row>
      </Card>

      {/* App */}
      <SectionLabel>App</SectionLabel>
      <Card style={{ paddingVertical: space(1) }}>
        <Row between style={s.row}>
          <Text style={s.rowText}>Dark theme</Text>
          <Toggle value={resolved === "dark"} onValueChange={(v) => setMode(v ? "dark" : "light")} />
        </Row>
        <Row between style={[s.row, s.border]}>
          <Text style={s.rowText}>Biometric lock</Text>
          <Toggle value={biometric} onValueChange={toggleBiometric} />
        </Row>
        <Pressable onPress={exportCsv} disabled={exporting}>
          <Row between style={[s.row, s.border]}>
            <Text style={s.rowText}>Export data (CSV / Excel)</Text>
            <Ionicons name="chevron-forward" size={16} color={t.gold} />
          </Row>
        </Pressable>
      </Card>
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
  rowMuted: { color: c.ink2, fontSize: 13, fontWeight: "600" },
  note: { color: c.ink2, fontSize: 12 },
  signOut: { color: c.negative, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: space(2) },
  version: { color: c.muted, fontSize: 11, textAlign: "center", marginTop: space(3) },
});
