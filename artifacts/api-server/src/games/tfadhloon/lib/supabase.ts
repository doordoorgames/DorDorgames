import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const rawUrl = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SECRET_KEY"];

  if (!rawUrl || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY must be configured for Tfadhloon."
    );
  }

  // Strip any path suffix the user may have accidentally included
  // (e.g. https://xxx.supabase.co/rest/v1/ → https://xxx.supabase.co)
  const url = rawUrl.replace(/\/(rest|auth|storage|realtime)(\/.*)?$/, "").replace(/\/$/, "");

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
