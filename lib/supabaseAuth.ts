// Supabase Auth client helpers.
// Server-side uses the SSR package to read cookies; client-side uses the
// anon key so Auth can redirect through OAuth flows.

import { createBrowserClient } from "@supabase/ssr";

export function createAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type AuthUser = {
  id: string;
  xHandle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};
