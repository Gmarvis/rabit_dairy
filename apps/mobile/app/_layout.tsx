import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/lib/auth";
import { LockGate } from "../src/lib/lock";
import { PeriodProvider } from "../src/lib/period";
import {
  ThemeProvider,
  useTheme,
  useThemeControls,
} from "../src/theme/ThemeProvider";

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
    } else if ((status === "authed" || status === "demo") && onEntry) {
      router.replace("/");
    }
  }, [status, segments, router]);
}

function RootNavigator() {
  useAuthGate();
  const theme = useTheme();
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
      <Stack.Screen name="savings" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="voice" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="scan" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="account-new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" options={{ presentation: "modal" }} />
      <Stack.Screen name="categories" options={{ presentation: "modal" }} />
      <Stack.Screen name="habits" options={{ presentation: "modal" }} />
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
