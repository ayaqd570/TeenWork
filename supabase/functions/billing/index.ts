// Supabase Edge Function: billing (TeenWork Pro payments with Stripe). The actions, the webhook and the
// list of secrets are in core.ts. Deploy with Verify JWT off: Stripe's webhook calls carry no Supabase
// token, and core.ts checks the person's sign-in token itself for checkout, portal and status.
// Stripe webhook endpoint: https://<project>.supabase.co/functions/v1/billing/webhook
import { envFrom, makeHandler } from "./core.ts";

Deno.serve(makeHandler(envFrom((k) => Deno.env.get(k))));
