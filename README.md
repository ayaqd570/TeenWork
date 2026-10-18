# TeenWork

The TeenWork app is one self-contained page: `index.html`.
It is published on Netlify at https://ayaqdteenwork.netlify.app and every push to `main` goes live automatically.

## What's here

- `index.html` – the app (currently TeenWork v44).
- `netlify.toml` – tells Netlify there is no build step and to publish this folder as is.
- `supabase/functions/groq-chat/index.ts` – the Supabase Edge Function that forwards AI requests to Groq. Before Groq is called, what the person wrote goes through OpenAI's free Moderation check. It runs on Supabase, not Netlify.
- `supabase/functions/check-message/index.ts` – the Edge Function the app calls before a chat message is sent: a phrase filter for taking work, pay, hours or contact off TeenWork, then OpenAI Moderation.
- `supabase/functions/_shared/message-guard.ts` – the safety check both functions share.

## Keys

Only public keys belong in this repo (the Supabase publishable key and the EmailJS public key inside `index.html`).
The Groq keys live in Supabase as the secrets `GROQ_KEY_FREE` and `GROQ_KEY_PRO`, and the OpenAI key as `OPENAI_API_KEY`. Never commit Groq or OpenAI keys, the Supabase service-role key, or the EmailJS private key.

## Deploying

Netlify deploys every push to `main`. The repo is public because Netlify's free plan only deploys commits from one contributor on private repos.
To ship a new app version, copy the new `teenwork_vNN.html` over `index.html`, commit and push.
