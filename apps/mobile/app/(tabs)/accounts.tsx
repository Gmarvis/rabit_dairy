import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountListItem } from "@rabbit/application";
import { Card, EmptyState, MoneyText, Pill, PrimaryButton, Row, SectionLabel, SkeletonList, Tico } from "../../src/components/ui";
import { PressableScale } from "../../src/components/anim";
import { useContainer } from "../../src/lib/auth";
import { usePeriod } from "../../src/lib/period";
import { monthLabel } from "../../src/lib/format";
import { iconForAccount } from "../../src/theme/icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { space, type Palette } from "../../src/theme/tokens";

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();
  const { data } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => c.queries.accounts.execute(c.userId),
  });
  const { data: dash } = useQuery({
    queryKey: ["dashboard", period.toString()],
    queryFn: () => c.queries.dashboard.execute(c.userId, period),
  });
  const { data: yearly } = useQuery({
    queryKey: ["yearly-overview", period.year],
    queryFn: () => c.queries.yearlyOverview.execute(c.userId, period.year),
  });

  const banks = data?.accounts.filter((a) => a.type.startsWith("bank_")) ?? [];
  const wallets = data?.accounts.filter((a) => !a.type.startsWith("bank_")) ?? [];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Row between>
        <View>
          <Text style={s.eyebrow}>Across all accounts</Text>
          <Text style={s.title}>Accounts</Text>
        </View>
        <Pressable style={s.add} onPress={() => router.push("/account-new")} hitSlop={8}>
          <Ionicons name="add" size={20} color={t.goldInk} />
        </Pressable>
      </Row>

      <Card hero>
        <SectionLabel>Total balance</SectionLabel>
        {data ? <MoneyText amount={data.totalBalance} size={28} style={{ marginTop: 4 }} /> : null}
        <Text style={s.sub}>
          {data
            ? `${data.accountCount} account${data.accountCount === 1 ? "" : "s"}${data.dormantCount > 0 ? ` · ${data.dormantCount} dormant` : ""}`
            : "…"}
        </Text>

        {data && (data.saved.minor > 0 || data.owed.minor > 0) ? (
          <Row style={{ gap: space(4), marginTop: space(2) }}>
            {data.saved.minor > 0 ? (
              <View>
                <SectionLabel>Saved</SectionLabel>
                <MoneyText amount={data.saved} currency={false} size={14} style={{ marginTop: 3, color: t.gold }} />
              </View>
            ) : null}
            {data.owed.minor > 0 ? (
              <View>
                <SectionLabel>Owed</SectionLabel>
                <MoneyText amount={data.owed} currency={false} size={14} style={{ marginTop: 3, color: t.negative }} />
              </View>
            ) : null}
          </Row>
        ) : null}

        <View style={s.divider} />
        <Row between>
          <View>
            <SectionLabel>Net · {monthLabel(period)}</SectionLabel>
            {dash ? <MoneyText amount={dash.summary.netBalance} signed currency={false} size={16} style={{ marginTop: 3 }} /> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <SectionLabel>Net · {period.year}</SectionLabel>
            {yearly ? <MoneyText amount={yearly.ytdNet} signed currency={false} size={16} style={{ marginTop: 3 }} /> : null}
          </View>
        </Row>
      </Card>

      {data === undefined ? (
        <>
          <SectionLabel>Bank</SectionLabel>
          <SkeletonList rows={2} />
          <SectionLabel>Mobile money & cash</SectionLabel>
          <SkeletonList rows={2} />
        </>
      ) : data.accounts.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="No accounts yet"
          hint="Add a bank, mobile-money or cash account to start tracking your balances."
          action={<PrimaryButton label="Add an account" onPress={() => router.push("/account-new")} />}
        />
      ) : (
        <>
          {banks.length > 0 ? (
            <>
              <SectionLabel>Bank</SectionLabel>
              <Card style={{ paddingVertical: space(1) }}>
                {banks.map((a, i) => (
                  <AccountRow key={a.id} a={a} last={i === banks.length - 1} />
                ))}
              </Card>
            </>
          ) : null}

          {wallets.length > 0 ? (
            <>
              <SectionLabel>Mobile money & cash</SectionLabel>
              <Card style={{ paddingVertical: space(1) }}>
                {wallets.map((a, i) => (
                  <AccountRow key={a.id} a={a} last={i === wallets.length - 1} />
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function AccountRow({ a, last }: { a: AccountListItem; last: boolean }) {
  const router = useRouter();
  const t = useTheme();
  const s = makeStyles(t);
  return (
    <PressableScale
      style={[s.row, !last && s.rowBorder, a.isDormant && { opacity: 0.5 }]}
      accessibilityLabel={a.name}
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
        {a.role === "savings" ? <Pill tone="gold">Savings</Pill> : null}
        {a.role === "credit" ? <Pill tone="negative">Credit</Pill> : null}
        {a.isPrimary ? <Pill tone="positive">Primary</Pill> : null}
        {a.isDormant ? <Pill tone="muted">Hidden</Pill> : null}
      </View>
    </PressableScale>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: c.bg },
    eyebrow: { color: c.ink2, fontSize: 12 },
    title: { color: c.ink, fontSize: 22, fontWeight: "800", marginTop: 1 },
    add: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.gold, alignItems: "center", justifyContent: "center" },
    sub: { color: c.ink2, fontSize: 10, marginTop: 3 },
    divider: { height: 1, backgroundColor: c.line, marginVertical: space(3) },
    row: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.line },
    name: { color: c.ink, fontSize: 15, fontWeight: "600" },
    meta: { color: c.muted, fontSize: 12, marginTop: 1 },
  });
