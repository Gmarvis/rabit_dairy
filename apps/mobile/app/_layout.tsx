import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/lib/auth";
import { LockGate } from "../src/lib/lock";
import { PeriodProvider } from "../src/lib/period";
import {
  ThemeProvider,
  useTheme,
  useThemeControls,
} from "../src/theme/ThemeProvider";

// Hide scroll indicators everywhere — a native app never shows a scrollbar.
// ScrollView is a class component, so a defaultProps patch covers every screen
// (and anything added later) without touching each call site.
{
  const SV = ScrollView as unknown as { defaultProps?: Record<string, unknown> };
  SV.defaultProps = {
    ...SV.defaultProps,
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
  };
}

const queryClient = new QueryClient();

/** Sends signed-out users to Welcome (which leads to Sign in), and away once in. */
function useAuthGate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    const onEntry = segments[0] === "auth" || segments[0] === "welcome";
    if (status === "signed_out" && !onEntry) {
      router.replace("/welcome");
    } else if (status === "authed" && onEntry) {
      router.replace("/");
    }
  }, [status, segments, router]);
}

function RootNavigator() {
  useAuthGate();
  const theme = useTheme();
  const { status } = useAuth();

  // Hold on a branded splash until auth resolves, so a signed-out user never
  // sees a flash of (tabs) before being redirected to Welcome.
  if (status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.gold} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="auth" />
      <Stack.Screen
        name="add"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="manual"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="account/[id]" />
      <Stack.Screen name="transaction/[id]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="report" options={{ presentation: "modal" }} />
      <Stack.Screen name="reports" options={{ presentation: "modal" }} />
      <Stack.Screen name="yearly" options={{ presentation: "modal" }} />
      <Stack.Screen name="budget" options={{ presentation: "modal" }} />
      <Stack.Screen name="budgets" options={{ presentation: "modal" }} />
      <Stack.Screen name="transfer" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="voice" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="scan" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="account-new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" options={{ presentation: "modal" }} />
      <Stack.Screen name="categories" options={{ presentation: "modal" }} />
      <Stack.Screen name="habits" options={{ presentation: "modal" }} />
      <Stack.Screen name="calendar" options={{ presentation: "modal" }} />
      <Stack.Screen name="search" options={{ presentation: "modal", animation: "fade" }} />
      <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal", gestureEnabled: false, animation: "fade" }} />
      <Stack.Screen name="category/[id]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { resolved } = useThemeControls();
  return <StatusBar style={resolved === "light" ? "dark" : "light"} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PeriodProvider>
              <ThemedStatusBar />
              <LockGate>
                <RootNavigator />
              </LockGate>
            </PeriodProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
