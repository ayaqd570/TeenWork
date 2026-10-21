// Gateway JWT verification may remain off for publishable-key compatibility.
// core.mjs validates every bearer token against Supabase Auth before allowing AI.
import { makeHandler } from './core.mjs';
Deno.serve(makeHandler(Deno.env.toObject()));
