import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { LineChart } from "react-native-gifted-charts";
import { Money } from "@rabbit/domain";
import type { YearlyOverviewView } from "@rabbit/application";
import { Card, MoneyText, PageHeader, Row, SectionLabel } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { percent } from "../src/lib/format";
import { chart, space, type Palette } from "../src/theme/tokens";
import { useTheme } from "../src/theme/ThemeProvider";

const YW = Dimensions.get("window").width - space(4) * 2 - 44;

function abbrev(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

export default function YearlyOverviewScreen() {
  const insets = useSafeAreaInsets();
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
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), paddingTop: 0, gap: space(3) }}
    >
      <PageHeader eyebrow="Yearly overview" title={`${year}`} topInset={insets.top} />

      {data ? (
        <>
          <Accumulated data={data} year={year} t={t} s={s} />

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

/** The money you've kept building up this year — a climbing cumulative curve. */
function Accumulated({ data, year, t, s }: { data: YearlyOverviewView; year: number; t: Palette; s: ReturnType<typeof makeStyles> }) {
  const nowMonth = new Date().getUTCMonth() + 1; // 1–12
  const isCurrentYear = year === new Date().getUTCFullYear();
  const limit = isCurrentYear ? nowMonth : 12;

  let run = Money.zero("XAF");
  const pts: { value: number; label: string }[] = [];
  for (const m of data.months.slice(0, limit)) {
    run = run.plus(m.income).minus(m.expenses);
    pts.push({ value: run.minor, label: m.monthName.slice(0, 1) });
  }
  const accumulated = run;
  const color = accumulated.isNegative ? t.negative : t.positive;

  return (
    <Card hero>
      <SectionLabel>Accumulated · {year}</SectionLabel>
      <MoneyText amount={accumulated} signed size={30} style={{ marginTop: 6 }} />
      <Text style={s.heroSub}>What you've kept — income minus spending, year to date</Text>
      {pts.length > 1 ? (
        <View style={{ marginTop: space(2), marginLeft: -8 }}>
          <LineChart
            data={pts}
            width={YW - 16}
            height={110}
            curved
            areaChart
            color={color}
            thickness={2.5}
            startFillColor={color}
            endFillColor={color}
            startOpacity={0.22}
            endOpacity={0.02}
            hideDataPoints
            hideRules
            hideYAxisText
            yAxisThickness={0}
            xAxisThickness={0}
            adjustToWidth
            initialSpacing={8}
            endSpacing={8}
            xAxisLabelTextStyle={{ color: t.muted, fontSize: 9 }}
            isAnimated
            animationDuration={800}
            pointerConfig={{
              pointerColor: color,
              pointerStripColor: t.line,
              pointerStripHeight: 110,
              radius: 4,
              pointerLabelWidth: 120,
              pointerLabelHeight: 30,
              autoAdjustPointerLabelPosition: true,
              pointerLabelComponent: (items: { value: number }[]) => (
                <View style={{ backgroundColor: t.ink, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: t.bg, fontSize: 11, fontWeight: "800" }}>{abbrev(items[0]?.value ?? 0)} FCFA</Text>
                </View>
              ),
            }}
          />
        </View>
      ) : null}
    </Card>
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
    heroSub: { color: c.ink2, fontSize: 12, marginTop: 4 },
  });
