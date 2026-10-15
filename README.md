# TeenWork

The TeenWork app is one self-contained page: `index.html`.
It is published on Netlify at https://ayaqdteenwork.netlify.app and every push to `main` goes live automatically.

## What's here

- `index.html` – the app (currently TeenWork v41).
- `netlify.toml` – tells Netlify there is no build step and to publish this folder as is.
- `supabase/functions/groq-chat/index.ts` – the Supabase Edge Function that forwards AI requests to Groq. It runs on Supabase, not Netlify.

## Keys

Only public keys belong in this repo (the Supabase publishable key and the EmailJS public key inside `index.html`).
The Groq keys live in Supabase as the secrets `GROQ_KEY_FREE` and `GROQ_KEY_PRO`. Never commit Groq keys, the Supabase service-role key, or the EmailJS private key.
