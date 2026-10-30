// Supabase Edge Function: delete-account (TeenWork v47). The logic and the list of actions are in core.ts.
// Deploy with Verify JWT off, like groq-chat and verify-permit: the app's publishable key is not a JWT,
// and core.ts checks the sign-in token: the person's own (action "self") or, since v51, the admin's, whose
// Supabase app_metadata.tw_role is "admin" (action "close"). There is no admin password any more.
// Secrets (optional; Supabase dashboard → Edge Functions → Secrets):
//   ALLOWED_ORIGIN                 default * (the app is often opened as a local file)
//   ADMIN_EMAIL                    default ayaquarrierdraper@gmail.com; its admin rows (plan_settings) are never deleted
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { makeHandler } from "./core.ts";

const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const handle = makeHandler({
  url: env("SUPABASE_URL"),
  serviceKey: env("SUPABASE_SERVICE_ROLE_KEY"),
  anonKey: env("SUPABASE_ANON_KEY"),
  origin: env("ALLOWED_ORIGIN") || "*",
  adminEmail: env("ADMIN_EMAIL") || "ayaquarrierdraper@gmail.com",
});

Deno.serve(handle);
