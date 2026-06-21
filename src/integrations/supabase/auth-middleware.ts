// SPA-compatible auth helper. Returns { supabase, userId, claims } using the
// browser Supabase client. Used by all .functions.ts modules in SPA mode.
import { supabase } from "./client";

export async function requireSupabaseAuth() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Authentication required");
  }
  return { supabase, userId: user.id, claims: { sub: user.id } };
}
