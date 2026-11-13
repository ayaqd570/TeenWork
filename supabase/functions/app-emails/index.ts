// Supabase Edge Function: app-emails. TeenWork's occasional "get the app" reminder emails, sent through Resend.
// Who gets one, how often, the unsubscribe link and the secrets are explained in core.ts.
// Deploy with Verify JWT off: pg_cron calls it once a day without a sign-in (migration 20261113_app_emails.sql),
// and the database refuses a second run within 20 hours, so an extra call sends nothing.
import { envFrom, makeHandler } from "./core.ts";

Deno.serve(makeHandler(envFrom((k) => Deno.env.get(k))));
