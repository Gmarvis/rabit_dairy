import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/lib/auth";
import { colors } from "../src/theme/tokens";

const queryClient = new QueryClient();

/** Redirects to /auth when signed out, and away from it once signed in. */
function useAuthGate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    const onAuthScreen = segments[0] === "auth";
    if (status === "signed_out" && !onAuthScreen) {
      router.replace("/auth");
    } else if ((status === "authed" || status === "demo") && onAuthScreen) {
      router.replace("/");
    }
  }, [status, segments, router]);
}

function RootNavigator() {
  useAuthGate();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
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
      <Stack.Screen name="report" options={{ presentation: "modal" }} />
      <Stack.Screen name="yearly" options={{ presentation: "modal" }} />
      <Stack.Screen name="budget" options={{ presentation: "modal" }} />
      <Stack.Screen name="budgets" options={{ presentation: "modal" }} />
      <Stack.Screen name="savings" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="voice" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="scan" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="account-new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
