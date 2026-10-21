// Authenticate bearer tokens in the handler; gateway JWT verification remains off.
import { makeHandler } from './core.mjs';
import { checkMessage } from '../_shared/message-guard.ts';
Deno.serve(makeHandler(Deno.env.toObject(), fetch, checkMessage));
