// Supabase Edge Function: send-email. Sends TeenWork's emails to people through Resend.
// The rules (who may send, which links are kept, the limits) and the list of secrets are in core.ts.
// Deploy with Verify JWT off, like groq-chat: the app sends the publishable key when nobody is
// signed in, and core.ts checks a real sign-in token itself.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { envFrom, makeHandler } from "./core.ts";

Deno.serve(makeHandler(envFrom((k) => Deno.env.get(k))));
