// Supabase Edge Function: employer-phone (TeenWork v64). An employer confirms a phone number with a texted code.
// The actions, limits and the list of secrets are in core.ts. Deploy with Verify JWT off, like billing and
// delete-account: core.ts checks the employer's own sign-in token itself.
import { envFrom, makeHandler } from "./core.ts";

Deno.serve(makeHandler(envFrom((k) => Deno.env.get(k))));
