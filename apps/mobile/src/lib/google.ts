import * as Linking from "expo-linking";
import { supabase } from "./supabase";

// expo-web-browser is native — guard it so a stale build doesn't crash the app.
const WebBrowser = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-web-browser") as typeof import("expo-web-browser");
  } catch {
    return null;
  }
})();
WebBrowser?.maybeCompleteAuthSession();

/** True only when Supabase is configured AND the browser module is in the build. */
export const googleAvailable = !!WebBrowser && !!supabase;

/**
 * Google sign-in via Supabase OAuth. Opens the system browser for Google's
 * consent screen, then returns to the app through the `rabbitdiary://` deep
 * link and exchanges the code for a session. The auth listener flips the gate.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error("Supabase isn't configured.");
  if (!WebBrowser) throw new Error("Google sign-in needs the dev build — rebuild with expo run:ios.");

  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Couldn't start Google sign-in.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return; // user dismissed the browser

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code;
  if (typeof code === "string") {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }
}
