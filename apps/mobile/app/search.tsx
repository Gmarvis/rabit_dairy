import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YearMonth } from "@rabbit/domain";
import type { TransactionListItem } from "@rabbit/application";
import { MoneyText, Row, Tico } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { fullDate, methodLabel } from "../src/lib/format";
import { iconForCategory } from "../src/theme/icons";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

/** Does a transaction match the query across its human-readable fields? */
function matches(tx: TransactionListItem, q: string, digits: string): boolean {
  const hay = `${tx.title} ${tx.categoryName} ${tx.accountName} ${methodLabel(tx.paymentMethod)}`.toLowerCase();
  if (q && hay.includes(q)) return true;
  if (digits && String(tx.signedAmount.minor).includes(digits)) return true;
  return false;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const [query, setQuery] = useState("");

  const { data } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: () => c.queries.recentTransactions.execute(c.userId, YearMonth.fromDate(new Date())),
  });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/[^0-9]/g, "");
    return (data ?? []).filter((tx) => matches(tx, q, digits)).slice(0, 100);
  }, [data, query]);

  return (
    <View style={s.screen}>
      <Row style={[s.header, { paddingTop: Math.min(insets.top, space(2)) + space(2) }]}>
        <View style={s.field}>
          <Ionicons name="search" size={16} color={t.muted} />
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search transactions"
            placeholderTextColor={t.muted}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={s.cancel}>Cancel</Text>
        </Pressable>
      </Row>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(6) }}
      >
        {query.trim().length === 0 ? (
          <View style={s.hint}>
            <Ionicons name="search" size={30} color={t.muted} />
            <Text style={s.hintText}>Search by name, category, account, method or amount — across the last 12 months.</Text>
          </View>
        ) : results.length === 0 ? (
          <Text style={s.none}>No matches for “{query.trim()}”.</Text>
        ) : (
          <>
            <Text style={s.count}>{results.length} result{results.length === 1 ? "" : "s"}</Text>
            {results.map((tx, i) => (
              <Pressable
                key={tx.id}
                style={[s.txn, i < results.length - 1 && s.border]}
                onPress={() => router.push(`/transaction/${tx.id}`)}
              >
                <Tico icon={iconForCategory(tx.categoryName, tx.categoryType)} color={tx.categoryColor} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={s.title} numberOfLines={1}>{tx.title}</Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {tx.categoryName} · {tx.accountName} · {fullDate(tx.occurredAt)}
                  </Text>
                </View>
                <MoneyText amount={tx.signedAmount} signed currency={false} size={15} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: { paddingHorizontal: space(4), paddingBottom: space(3), gap: space(3), alignItems: "center" },
  field: { flex: 1, flexDirection: "row", alignItems: "center", gap: space(2), backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(2.5) },
  input: { flex: 1, color: c.ink, fontSize: 15, padding: 0 },
  cancel: { color: c.gold, fontSize: 15, fontWeight: "600" },
  hint: { alignItems: "center", gap: space(3), paddingHorizontal: space(8), marginTop: space(10) },
  hintText: { color: c.ink2, fontSize: 14, textAlign: "center", lineHeight: 20 },
  none: { color: c.ink2, fontSize: 14, marginTop: space(6), textAlign: "center" },
  count: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginVertical: space(2) },
  txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  border: { borderBottomWidth: 1, borderBottomColor: c.line },
  title: { color: c.ink, fontSize: 15, fontWeight: "600" },
  meta: { color: c.muted, fontSize: 12, marginTop: 2 },
});
