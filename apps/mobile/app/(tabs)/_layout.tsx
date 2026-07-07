import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";

/** The centre ＋ button that opens the Add hub modal. */
function AddButton() {
  const router = useRouter();
  const c = useTheme();
  return (
    <Pressable
      accessibilityLabel="Add a transaction"
      accessibilityRole="button"
      style={[styles.fab, { backgroundColor: c.gold, shadowColor: c.gold, borderColor: c.bg }]}
      onPress={() => router.push("/add")}
    >
      <Ionicons name="add" size={28} color={c.goldInk} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const c = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.gold,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.line, borderTopWidth: 1, height: 88, paddingTop: 10, paddingBottom: 10 },
        tabBarItemStyle: { paddingTop: 4 },
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-placeholder"
        options={{
          title: "",
          tabBarButton: () => (
            <View style={styles.fabSlot}>
              <AddButton />
            </View>
          ),
        }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 10, fontWeight: "600" },
  fabSlot: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  fab: {
    width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
    marginTop: -22, borderWidth: 4,
    shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});
