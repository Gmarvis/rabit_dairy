import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Polyline } from "react-native-svg";
import type { AccountId } from "@rabbit/domain";
import { Card, MoneyText, Pill, Row, SectionLabel } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { dayLabel, methodLabel } from "../../src/lib/format";
import { colors, radius, space } from "../../src/theme/tokens";

export default function AccountDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["account-ledger", id],
    queryFn: () => c.queries.accountLedger.execute(c.userId, id as AccountId),
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Row between>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Accounts</Text>
        </Pressable>
      </Row>

      {isLoading || !data ? (
        <Card><Text style={styles.dim}>Loading…</Text></Card>
      ) : (
        <>
          <Card hero>
            <Row between>
              <Row style={{ gap: space(2) }}>
                <View style={styles.icon}>
                  <Ionicons name="wallet" size={14} color={colors.ink} />
                </View>
                <Text style={styles.name}>
                  {data.name}
                  {data.mask ? ` · ••${data.mask}` : ""}
                </Text>
              </Row>
              {data.isSavings ? <Pill tone="gold">📷 snap</Pill> : null}
              {data.isPrimary ? <Pill tone="positive">Primary</Pill> : null}
            </Row>
            <MoneyText amount={data.balance} size={26} style={{ marginTop: 10 }} />
            <Sparkline points={data.balanceHistory} />
          </Card>

          {data.isSavings ? (
            <Row style={{ gap: space(2.5) }}>
              <Action label="↓ Deposit" primary onPress={() => router.push("/manual")} />
              <Action label="↑ Withdraw" onPress={() => router.push("/manual")} />
            </Row>
          ) : null}

          <SectionLabel>History</SectionLabel>
          <Card style={{ paddingVertical: space(1) }}>
            {data.transactions.length === 0 ? (
              <Text style={[styles.dim, { paddingVertical: space(2) }]}>No transactions yet.</Text>
            ) : (
              data.transactions.map((t, i) => (
                <View key={t.id} style={[styles.txn, i < data.transactions.length - 1 && styles.border]}>
                  <View style={[styles.dot, { backgroundColor: t.categoryColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnTitle}>{t.title}</Text>
                    <Text style={styles.meta}>
                      {dayLabel(t.occurredAt)}
                      {t.paymentMethod ? ` · ${methodLabel(t.paymentMethod)}` : ""}
                      {t.hasReceipt ? "  📷" : ""}
                      {t.hasVoiceNote ? "  🎙" : ""}
                    </Text>
                  </View>
                  <MoneyText amount={t.signedAmount} signed currency={false} size={13} />
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <View style={{ height: 46 }} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const W = 240, H = 46;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((p - min) / range) * (H - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = coords[coords.length - 1]!.split(",");
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginTop: 8 }}>
      <Polyline points={coords.join(" ")} fill="none" stroke={colors.positive} strokeWidth={2.5} />
      <Circle cx={Number(last[0])} cy={Number(last[1])} r={3.5} fill={colors.positive} />
    </Svg>
  );
}

function Action({ label, primary, onPress }: { label: string; primary?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.action, primary && styles.actionPrimary]} onPress={onPress}>
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  back: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  dim: { color: colors.ink2 },
  icon: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.card2, alignItems: "center", justifyContent: "center" },
  name: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  border: { borderBottomWidth: 1, borderBottomColor: colors.line },
  dot: { width: 10, height: 10, borderRadius: 3 },
  txnTitle: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 10, marginTop: 1 },
  action: { flex: 1, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center" },
  actionPrimary: { backgroundColor: colors.gold, borderColor: colors.gold },
  actionText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  actionTextPrimary: { color: colors.goldInk },
});
