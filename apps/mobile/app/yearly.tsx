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
import { chart, space, type Palette } from "../src/theme/tokens";
import { useTheme } from "../src/theme/ThemeProvider";

export default function YearlyOverviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();
  const year = period.year;

  const { data } = useQuery({
    queryKey: ["yearly-overview", year],
    queryFn: () => c.queries.yearlyOverview.execute(c.userId, year),
  });

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}
    >
      <ScreenHeader title={`Yearly overview · ${year}`} onClose={() => router.back()} closeLabel="Done" topInset={insets.top} />

      {data ? (
        <>
          <Row style={{ gap: space(2.5) }}>
            <Card style={s.stat}>
              <SectionLabel>YTD income</SectionLabel>
              <MoneyText amount={data.ytdIncome} signed currency={false} size={14} style={{ marginTop: 4 }} />
            </Card>
            <Card style={s.stat}>
              <SectionLabel>YTD saved</SectionLabel>
              <MoneyText amount={data.ytdSavings} currency={false} size={14} style={{ marginTop: 4 }} />
            </Card>
          </Row>

          <Card>
            <Row between>
              <SectionLabel>Income vs expense · by month</SectionLabel>
              <Text style={s.unit}>FCFA</Text>
            </Row>
            <Bars data={data} trackColor={t.card2} axisColor={t.muted} />
            <Row style={{ gap: space(3), marginTop: space(2) }}>
              <Legend color={chart.green} label="Income" />
              <Legend color={chart.red} label="Expense" />
            </Row>
          </Card>

          <Card hero>
            <Row between>
              <SectionLabel>YTD savings rate</SectionLabel>
              <Text style={s.rate}>{percent(data.savingsRate, 1)}</Text>
            </Row>
            <Row between style={{ marginTop: 6 }}>
              <Text style={s.meta}>Net balance</Text>
              <MoneyText amount={data.ytdNet} signed currency={false} size={14} />
            </Row>
          </Card>
        </>
      ) : (
        <Card><Text style={s.dim}>Loading…</Text></Card>
      )}
    </ScrollView>
  );
}

function Bars({ data, trackColor, axisColor }: { data: YearlyOverviewView; trackColor: string; axisColor: string }) {
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
        const hasData = m.income.major > 0 || m.expenses.major > 0;
        return (
          <Fragment key={m.month}>
            <Rect x={cx - bw - 1} y={base - ih} width={bw} height={Math.max(ih, 0)} rx={2} fill={hasData ? chart.green : trackColor} />
            <Rect x={cx + 1} y={base - eh} width={bw} height={Math.max(eh, 0)} rx={2} fill={hasData ? chart.red : trackColor} />
            <SvgText x={cx} y={H - 4} fill={axisColor} fontSize={7} textAnchor="middle">
              {m.monthName.slice(0, 1)}
            </SvgText>
          </Fragment>
        );
      })}
    </Svg>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const t = useTheme();
  return (
    <Row style={{ gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: t.ink2, fontSize: 10 }}>{label}</Text>
    </Row>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: c.bg },
    dim: { color: c.ink2 },
    stat: { flex: 1 },
    unit: { color: c.muted, fontSize: 9 },
    rate: { color: c.positive, fontSize: 16, fontWeight: "800" },
    meta: { color: c.ink2, fontSize: 10 },
  });
