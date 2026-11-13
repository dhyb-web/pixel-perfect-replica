import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  first_name: string;
  last_name: string;
}

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState>({
  ready: false,
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      supabase.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]).then(([p, r]) => {
      if (cancelled) return;
      setProfile(p.data ?? null);
      setIsAdmin(r.data === true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <AuthContext.Provider
      value={{ ready, session, user: session?.user ?? null, profile, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function displayName(profile: Profile | null, user: User | null): string {
  const full = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return full || user?.email?.split("@")[0] || "Mon compte";
}
