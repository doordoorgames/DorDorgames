import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} environment variable is required for Supabase-backed host storage but is not set. ` +
        "Add it in the Secrets pane before using host signup/login.",
    );
  }
  return value;
}

/**
 * Lazily-created server-side Supabase client, backed by the service-role
 * secret key so it can read/write the `hosts` table regardless of RLS
 * policies. Only throws when a host-related route is actually hit, so the
 * rest of the API (games, rooms, admin) keeps working even before Supabase
 * secrets are configured.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = requiredEnv("SUPABASE_URL");
    const secretKey = requiredEnv("SUPABASE_SECRET_KEY");
    client = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
