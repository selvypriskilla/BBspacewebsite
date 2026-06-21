import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Client-side middleware: attaches Supabase access token as Authorization header
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      sendContext: {},
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);

// Server-side middleware: validates user, injects { supabase, userId, claims }
export const requireSupabaseAuthMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const ctx = await requireSupabaseAuth();
    return next({ context: ctx });
  },
);

export const authedMiddleware = [attachSupabaseAuth, requireSupabaseAuthMiddleware] as const;
