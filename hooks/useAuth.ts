"use client";

import { useEffect, useState } from "react";
import { createAuthClient, AuthUser } from "@/lib/supabaseAuth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createAuthClient();

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(sessionToUser(session?.user ?? null));
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(sessionToUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

function sessionToUser(user: { id: string; user_metadata: Record<string, string> } | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    xHandle: user.user_metadata?.user_name ?? null,
    displayName: user.user_metadata?.full_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  };
}
