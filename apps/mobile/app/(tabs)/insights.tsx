import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, MoneyText, Row, SectionLabel } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { usePeriod } from "../../src/lib/period";
import { monthLabel, percent } from "../../src/lib/format";
import { colors, radius, space } from "../../src/theme/tokens";

const LINKS: { href: Href; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
  { href: "/report", icon: "pie-chart", title: "Monthly report", sub: "Where the money went this month" },
  { href: "/budget", icon: "checkbox", title: "Budget vs actual", sub: "Planned against spent, per category" },
  { href: "/yearly", icon: "bar-chart", title: "Yearly overview", sub: "12-month income & expense trend" },
];

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const { period } = usePeriod();

  const { data } = useQuery({
    queryKey: ["dashboard", period.toString()],
    queryFn: () => c.queries.dashboard.execute(c.userId, period),
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Text style={styles.title}>Insights</Text>

      <Card hero>
        <SectionLabel>Kept · {monthLabel(period)}</SectionLabel>
        {data ? (
          <>
            <MoneyText amount={data.summary.netBalance} signed size={24} style={{ marginTop: 4 }} />
            <Text style={styles.sub}>
              {percent(data.summary.savingsRate)} saved · {percent(data.summary.expenseRate)} spent
            </Text>
          </>
        ) : null}
      </Card>

      {LINKS.map((l) => (
        <Pressable key={l.title} onPress={() => router.push(l.href)}>
          <Card>
            <Row style={{ gap: space(3) }}>
              <View style={styles.icon}>
                <Ionicons name={l.icon} size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>{l.title}</Text>
                <Text style={styles.linkSub}>{l.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Row>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  sub: { color: colors.ink2, fontSize: 11, marginTop: 4 },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: "rgba(233,180,76,0.16)", alignItems: "center", justifyContent: "center" },
  linkTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  linkSub: { color: colors.ink2, fontSize: 11, marginTop: 2 },
});
