// Supabase Edge Function: delete-account (TeenWork v47). The logic and the list of actions are in core.ts.
// Deploy with Verify JWT off, like groq-chat and verify-permit: the app's publishable key is not a JWT,
// and core.ts checks the person's own sign-in token (action "self") or the admin password (action "close").
// Secrets (optional; Supabase dashboard → Edge Functions → Secrets):
//   ADMIN_PW_SALT / ADMIN_PW_HASH  only if the admin password changes again. The defaults below are the v46
//                                  password's salt and hash, the same ones that are public in the app file.
//   ALLOWED_ORIGIN                 default * (the app is often opened as a local file)
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { makeHandler } from "./core.ts";

const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const handle = makeHandler({
  url: env("SUPABASE_URL"),
  serviceKey: env("SUPABASE_SERVICE_ROLE_KEY"),
  anonKey: env("SUPABASE_ANON_KEY"),
  adminSalt: env("ADMIN_PW_SALT") || "e4c7593a75c04481cef2fe97",
  adminHash: env("ADMIN_PW_HASH") || "32c6b8e9685084ab94db751d9e5f34fff8947b93a9c6de7e93606642103c537c",
  origin: env("ALLOWED_ORIGIN") || "*",
});

Deno.serve(handle);
