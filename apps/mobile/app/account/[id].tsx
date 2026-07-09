import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Polyline } from "react-native-svg";
import type { AccountId } from "@rabbit/domain";
import { Card, MoneyText, Pill, Row, SectionLabel, SkeletonHero, SkeletonList, Tico } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { dayLabel, methodLabel } from "../../src/lib/format";
import { iconForAccount, iconForCategory } from "../../src/theme/icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../../src/theme/tokens";

export default function AccountDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["account-ledger", id],
    queryFn: () => c.queries.accountLedger.execute(c.userId, id as AccountId),
  });

  const archive = useMutation({
    mutationFn: async (dormant: boolean) => {
      const res = await c.commands.archiveAccount.execute({ userId: c.userId, id: id as AccountId, dormant });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const del = useMutation({
    mutationFn: async () => {
      const res = await c.commands.deleteAccount.execute({ userId: c.userId, id: id as AccountId });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => Alert.alert("Can't delete", e instanceof Error ? e.message : "Something went wrong."),
  });

  function confirmDelete() {
    Alert.alert("Delete account?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate() },
    ]);
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      style={s.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Row between>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
          <Ionicons name="chevron-back" size={18} color={t.gold} />
          <Text style={s.back}>Accounts</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/account-new?id=${id}`)} hitSlop={10} style={s.editBtn}>
          <Ionicons name="create-outline" size={16} color={t.ink} />
          <Text style={s.editText}>Edit</Text>
        </Pressable>
      </Row>

      {isLoading || !data ? (
        <>
          <SkeletonHero />
          <SkeletonList rows={5} />
        </>
      ) : (
        <>
          <Card hero>
            <Row between>
              <Row style={{ gap: space(2) }}>
                <Tico icon={iconForAccount(data.type)} size={26} />
                <Text style={s.name}>
                  {data.name}
                  {data.mask ? ` · ••${data.mask}` : ""}
                </Text>
              </Row>
              {data.isSavings ? (
                <Pill tone="gold"><Ionicons name="camera" size={9} color={t.gold} /> Snap</Pill>
              ) : null}
              {data.isPrimary ? <Pill tone="positive">Primary</Pill> : null}
            </Row>
            <MoneyText amount={data.balance} size={26} style={{ marginTop: 10 }} />
            <Sparkline points={data.balanceHistory} color={t.positive} />
          </Card>

          {data.isSavings ? (
            <Row style={{ gap: space(2.5) }}>
              <Action label="Deposit" icon="arrow-down" primary onPress={() => router.push("/savings")} />
              <Action label="Withdraw" icon="arrow-up" onPress={() => router.push("/savings")} />
            </Row>
          ) : null}

          <SectionLabel>History</SectionLabel>
          <Card style={{ paddingVertical: space(1) }}>
            {data.transactions.length === 0 ? (
              <Text style={[s.dim, { paddingVertical: space(2) }]}>No transactions yet.</Text>
            ) : (
              data.transactions.map((tx, i) => (
                <Pressable
                  key={tx.id}
                  style={[s.txn, i < data.transactions.length - 1 && s.border]}
                  onPress={() => router.push(`/transaction/${tx.id}`)}
                >
                  <Tico icon={iconForCategory(tx.categoryName, tx.categoryType)} color={tx.categoryColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.txnTitle}>{tx.title}</Text>
                    <Row style={{ gap: 5 }}>
                      <Text style={s.meta}>
                        {dayLabel(tx.occurredAt)}
                        {tx.paymentMethod ? ` · ${methodLabel(tx.paymentMethod)}` : ""}
                      </Text>
                      {tx.hasReceipt ? <Ionicons name="camera" size={11} color={t.gold} /> : null}
                      {tx.hasVoiceNote ? <Ionicons name="mic" size={11} color={t.gold} /> : null}
                    </Row>
                  </View>
                  <MoneyText amount={tx.signedAmount} signed currency={false} size={13} />
                </Pressable>
              ))
            )}
          </Card>

          <SectionLabel>Manage</SectionLabel>
          <Card style={{ paddingVertical: space(1) }}>
            <Pressable style={[s.mrow, s.border]} onPress={() => archive.mutate(!data.isDormant)} disabled={archive.isPending}>
              <Ionicons name={data.isDormant ? "eye-outline" : "archive-outline"} size={18} color={t.ink} />
              <Text style={s.mtext}>{data.isDormant ? "Reopen account" : "Archive (hide) account"}</Text>
            </Pressable>
            <Pressable style={s.mrow} onPress={confirmDelete} disabled={del.isPending}>
              <Ionicons name="trash-outline" size={18} color={t.negative} />
              <Text style={[s.mtext, { color: t.negative }]}>Delete account</Text>
            </Pressable>
          </Card>
          <Text style={s.manageHint}>
            Archiving keeps your history but hides the account and drops it from totals. Delete only works when the account has no transactions.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
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
      <Polyline points={coords.join(" ")} fill="none" stroke={color} strokeWidth={2.5} />
      <Circle cx={Number(last[0])} cy={Number(last[1])} r={3.5} fill={color} />
    </Svg>
  );
}

function Action({ label, icon, primary, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; primary?: boolean; onPress: () => void }) {
  const c = useTheme();
  const s = makeStyles(c);
  return (
    <Pressable style={[s.action, primary && s.actionPrimary]} onPress={onPress}>
      <Ionicons name={icon} size={15} color={primary ? c.goldInk : c.ink} />
      <Text style={[s.actionText, primary && s.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { backgroundColor: c.bg },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  back: { color: c.gold, fontSize: 15, fontWeight: "700" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(1.5) },
  editText: { color: c.ink, fontSize: 13, fontWeight: "700" },
  mrow: { flexDirection: "row", alignItems: "center", gap: space(3), paddingVertical: space(3) },
  mtext: { color: c.ink, fontSize: 14, fontWeight: "600" },
  manageHint: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: space(1) },
  dim: { color: c.ink2 },
  name: { color: c.ink, fontSize: 13, fontWeight: "700" },
  txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  border: { borderBottomWidth: 1, borderBottomColor: c.line },
  txnTitle: { color: c.ink, fontSize: 13, fontWeight: "600" },
  meta: { color: c.muted, fontSize: 10, marginTop: 1 },
  action: { flex: 1, flexDirection: "row", gap: 6, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center", justifyContent: "center" },
  actionPrimary: { backgroundColor: c.gold, borderColor: c.gold },
  actionText: { color: c.ink, fontWeight: "700", fontSize: 13 },
  actionTextPrimary: { color: c.goldInk },
});
