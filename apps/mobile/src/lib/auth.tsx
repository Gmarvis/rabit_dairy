import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getContainer, type Container } from "./container";
import { isSupabaseConfigured, supabase } from "./supabase";

type Status = "loading" | "demo" | "authed" | "signed_out";

interface AuthValue {
  status: Status;
  userId: string | null;
  email: string | null;
}

const AuthContext = createContext<AuthValue>({
  status: "loading",
  userId: null,
  email: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // No backend configured → run on demo data, no sign-in required.
  const [value, setValue] = useState<AuthValue>(
    isSupabaseConfigured
      ? { status: "loading", userId: null, email: null }
      : { status: "demo", userId: null, email: null },
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setValue(
        u
          ? { status: "authed", userId: u.id, email: u.email ?? null }
          : { status: "signed_out", userId: null, email: null },
      );
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setValue(
        u
          ? { status: "authed", userId: u.id, email: u.email ?? null }
          : { status: "signed_out", userId: null, email: null },
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** The composition root bound to the current user (demo or authenticated). */
export function useContainer(): Container {
  const { userId } = useAuth();
  return useMemo(() => getContainer(userId ?? undefined), [userId]);
}

// ---- auth actions (thin wrappers over supabase.auth) ----

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
