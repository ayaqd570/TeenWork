# TeenWork

The TeenWork app uses `index.html` plus the scripts and styles in `assets/`.
It is published on Netlify at https://ayaqdteenwork.netlify.app and every push to `main` goes live automatically.

## What's here

- `index.html` – app markup (currently TeenWork v48).
- `assets/js/`, `assets/css/` – ordered application scripts and styles.
- `netlify.toml` – tells Netlify there is no build step and to publish this folder as is.
- `supabase/functions/groq-chat/index.ts` – the Supabase Edge Function that forwards AI requests to Groq. It runs on Supabase, not Netlify.
- `supabase/functions/delete-account/` – the Supabase Edge Function behind "Delete my account" and the admin Danger zone (deploy with Verify JWT off). It uses only the keys Supabase provides itself.
- `supabase/migrations/20261018_closed_accounts.sql` – the `closed_accounts` table the app reads to hide deleted accounts.
- `supabase/migrations/20261018_tw_public_counts.sql` – `tw_public_counts()`, the counts-only function the homepage calls for its live numbers (no names or emails).
- `robots.txt`, `sitemap.xml` – tell search engines they may read the site and where its one page is.
- `favicon.ico`, `icon-192.png`, `apple-touch-icon.png`, `logo.png`, `og-image.png` – site icon, logo and the picture shown when a link is shared.

## Keys

Only public keys belong in this repo (the Supabase publishable key and the EmailJS public key inside `index.html`).
The Groq keys live in Supabase as the secrets `GROQ_KEY_FREE` and `GROQ_KEY_PRO`. Never commit Groq keys, the Supabase service-role key, or the EmailJS private key.

## Deploying

Netlify deploys every push to `main`. The repo is public because Netlify's free plan only deploys commits from one contributor on private repos.
To ship a new app version, update the relevant markup, scripts and styles, commit and push.

## Search engines

Netlify serves a real file before it applies the `/*` → `/index.html` rule in `netlify.toml`, so `robots.txt`, `sitemap.xml` and the images above are served as themselves.
If the site moves to another address, update the address in `robots.txt`, `sitemap.xml` and the canonical, Open Graph and structured data tags in the `<head>` of `index.html`.

## Source layout and secure AI deployment

The page now loads its scripts from `assets/js/` and styles from `assets/css/`.
Each block stays in its original position and order, including the existing feature
patches. Edit these source files directly; replacing only `index.html` with an old
single-file export will discard the refactor. Deploy the page and assets together.
There is still no build step. Serve the repository root with a static web server
for local development (for example `python -m http.server 8000`).

Before publishing this frontend update:

1. Apply `supabase/migrations/20261021_ai_quota.sql` to the Supabase project.
2. Deploy `supabase/functions/groq-chat/` with `supabase functions deploy groq-chat --no-verify-jwt`.
   The handler validates bearer tokens itself through Supabase Auth. Keep
   `GROQ_KEY_FREE` and `GROQ_KEY_PRO` configured as Edge Function secrets.
3. Test AI with a real signed-in account, then publish the frontend and assets.

AI now requires a Supabase sign-in session; guest/demo and device-only accounts
must sign in online before using live AI. The frontend sends the access token,
never the publishable key as proof of identity. The backend ignores the submitted
plan and editable `user_metadata`; only admin-managed `app_metadata.tw_ai_plan`
set to `pro` selects the Pro key. Unset accounts use the Free key. Existing client
plan selections do not grant this entitlement. Grant it only through trusted
Supabase administrative tooling after checking the account's entitlement.

The service-only database function atomically enforces 10 requests per minute
and 100 per UTC day for Free / 500 per UTC day for Pro, shared across all devices
and account slots belonging to one Supabase user. These are abuse limits during
early access, in addition to existing frontend plan limits. Attempts sent to Groq
count even if the provider fails. Quota failures block calls rather than bypassing
limits. Rows are removed automatically when the Supabase user is deleted.
`ALLOWED_ORIGIN` defaults to `https://ayaqdteenwork.netlify.app`; set it explicitly
for a different hosting origin. CORS is not the authentication mechanism.

Run backend checks with:

```sh
node --test supabase/functions/groq-chat/core.test.mjs
```
