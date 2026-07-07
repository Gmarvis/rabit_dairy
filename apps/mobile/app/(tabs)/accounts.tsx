import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountListItem } from "@rabbit/application";
import { Card, MoneyText, Pill, Row, SectionLabel, Tico } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { iconForAccount } from "../../src/theme/icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { space, type Palette } from "../../src/theme/tokens";

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { data } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => c.queries.accounts.execute(c.userId),
  });

  const banks = data?.accounts.filter((a) => a.type.startsWith("bank_")) ?? [];
  const wallets = data?.accounts.filter((a) => !a.type.startsWith("bank_")) ?? [];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Row between>
        <Text style={s.title}>Accounts</Text>
        <Pressable style={s.add} onPress={() => router.push("/account-new")} hitSlop={8}>
          <Ionicons name="add" size={20} color={t.goldInk} />
        </Pressable>
      </Row>

      <Card hero>
        <SectionLabel>Total balance</SectionLabel>
        {data ? <MoneyText amount={data.totalBalance} size={28} style={{ marginTop: 4 }} /> : null}
        <Text style={s.sub}>
          {data ? `${data.accountCount} accounts · ${data.dormantCount} dormant` : "…"}
        </Text>
      </Card>

      <SectionLabel>Bank</SectionLabel>
      <Card style={{ paddingVertical: space(1) }}>
        {banks.map((a, i) => (
          <AccountRow key={a.id} a={a} last={i === banks.length - 1} />
        ))}
      </Card>

      <SectionLabel>Mobile money & cash</SectionLabel>
      <Card style={{ paddingVertical: space(1) }}>
        {wallets.map((a, i) => (
          <AccountRow key={a.id} a={a} last={i === wallets.length - 1} />
        ))}
      </Card>
    </ScrollView>
  );
}

function AccountRow({ a, last }: { a: AccountListItem; last: boolean }) {
  const router = useRouter();
  const t = useTheme();
  const s = makeStyles(t);
  return (
    <Pressable
      style={[s.row, !last && s.rowBorder, a.isDormant && { opacity: 0.5 }]}
      onPress={() => router.push(`/account/${a.id}`)}
    >
      <Tico icon={iconForAccount(a.type)} size={30} />
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{a.name}</Text>
        {a.institution ? (
          <Text style={s.meta}>
            {a.institution}
            {a.mask ? ` · ••${a.mask}` : ""}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <MoneyText amount={a.balance} currency={false} size={13} />
        {a.isPrimary ? <Pill tone="positive">Primary</Pill> : null}
        {a.type === "bank_savings" ? (
          <Pill tone="gold">
            <Ionicons name="camera" size={9} color={t.gold} /> snap
          </Pill>
        ) : null}
        {a.isDormant ? <Pill tone="muted">Hidden</Pill> : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: c.bg },
    title: { color: c.ink, fontSize: 22, fontWeight: "800" },
    add: { width: 34, height: 34, borderRadius: 12, backgroundColor: c.gold, alignItems: "center", justifyContent: "center" },
    sub: { color: c.ink2, fontSize: 10, marginTop: 3 },
    row: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.line },
    name: { color: c.ink, fontSize: 13, fontWeight: "600" },
    meta: { color: c.muted, fontSize: 10, marginTop: 1 },
  });
