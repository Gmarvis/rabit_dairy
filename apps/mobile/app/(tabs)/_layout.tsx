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
      style={[styles.fab, { backgroundColor: c.gold, shadowColor: c.gold }]}
      onPress={() => router.push("/add")}
    >
      <Ionicons name="add" size={26} color={c.goldInk} />
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
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.line, height: 84, paddingTop: 8 },
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
  fabSlot: { flex: 1, alignItems: "center", justifyContent: "center" },
  fab: {
    width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center",
    marginTop: -6, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
