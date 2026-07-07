import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import type { YearlyOverviewView } from "@rabbit/application";
import { Card, MoneyText, Row, ScreenHeader, SectionLabel } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { percent } from "../src/lib/format";
import { colors, space } from "../src/theme/tokens";

export default function YearlyOverviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const { period } = usePeriod();
  const year = period.year;

  const { data } = useQuery({
    queryKey: ["yearly-overview", year],
    queryFn: () => c.queries.yearlyOverview.execute(c.userId, year),
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}
    >
      <ScreenHeader title={`Yearly overview · ${year}`} onClose={() => router.back()} closeLabel="Done" topInset={insets.top} />

      {data ? (
        <>
          <Row style={{ gap: space(2.5) }}>
            <Card style={styles.stat}>
              <SectionLabel>YTD income</SectionLabel>
              <MoneyText amount={data.ytdIncome} signed currency={false} size={14} style={{ marginTop: 4 }} />
            </Card>
            <Card style={styles.stat}>
              <SectionLabel>YTD saved</SectionLabel>
              <MoneyText amount={data.ytdSavings} currency={false} size={14} style={{ marginTop: 4 }} />
            </Card>
          </Row>

          <Card>
            <Row between>
              <SectionLabel>Income vs expense · by month</SectionLabel>
              <Text style={styles.unit}>FCFA</Text>
            </Row>
            <Bars data={data} />
            <Row style={{ gap: space(3), marginTop: space(2) }}>
              <Legend color={colors.chart.green} label="Income" />
              <Legend color={colors.chart.red} label="Expense" />
            </Row>
          </Card>

          <Card hero>
            <Row between>
              <SectionLabel>YTD savings rate</SectionLabel>
              <Text style={styles.rate}>{percent(data.savingsRate, 1)}</Text>
            </Row>
            <Row between style={{ marginTop: 6 }}>
              <Text style={styles.meta}>Net balance</Text>
              <MoneyText amount={data.ytdNet} signed currency={false} size={14} />
            </Row>
          </Card>
        </>
      ) : (
        <Card><Text style={styles.dim}>Loading…</Text></Card>
      )}
    </ScrollView>
  );
}

function Bars({ data }: { data: YearlyOverviewView }) {
  const W = 320, H = 110, base = 92, maxH = 78;
  const peak = data.peak.major || 1;
  const slot = W / 12;
  const bw = 5;
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 8 }}>
      {data.months.map((m, i) => {
        const cx = i * slot + slot / 2;
        const ih = (m.income.major / peak) * maxH;
        const eh = (m.expenses.major / peak) * maxH;
        return (
          <Fragment key={m.month}>
            <Rect x={cx - bw - 1} y={base - ih} width={bw} height={Math.max(ih, 0)} rx={2} fill={colors.chart.green} />
            <Rect x={cx + 1} y={base - eh} width={bw} height={Math.max(eh, 0)} rx={2} fill={colors.chart.red} />
            <SvgText x={cx} y={H - 4} fill={colors.muted} fontSize={7} textAnchor="middle">
              {m.monthName.slice(0, 1)}
            </SvgText>
          </Fragment>
        );
      })}
    </Svg>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row style={{ gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }} />
      <Text style={styles.meta}>{label}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  greet: { color: colors.ink2, fontSize: 12 },
  title: { color: colors.ink, fontSize: 20, fontWeight: "800", marginTop: 2 },
  close: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  dim: { color: colors.ink2 },
  stat: { flex: 1 },
  unit: { color: colors.muted, fontSize: 9 },
  rate: { color: colors.positive, fontSize: 16, fontWeight: "800" },
  meta: { color: colors.ink2, fontSize: 10 },
});
