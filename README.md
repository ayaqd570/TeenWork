# TeenWork

The TeenWork app uses `index.html` plus the scripts and styles in `assets/`.
The app lives only at https://teenwork.ayaqd.com (Aya's own domain), which serves this repo's `main` branch. Netlify is no longer used.

## What's here

- `index.html` – app markup (currently TeenWork v51: the Build Brief's home screen and quick fixes, and the admin's Supabase sign-in).
- `assets/img/hero-*.avif`, `hero-*.webp` – the home page picture in three sizes (it used to be inside `index.html`).
- `assets/js/`, `assets/css/` – ordered application scripts and styles.
- `supabase/functions/groq-chat/index.ts` – the Supabase Edge Function that forwards AI requests to Groq. It runs on Supabase.
- `supabase/functions/delete-account/` – the Supabase Edge Function behind "Delete my account" and the admin Danger zone (deploy with Verify JWT off). It uses only the keys Supabase provides itself.
- `supabase/migrations/20261018_closed_accounts.sql` – the `closed_accounts` table the app reads to hide deleted accounts.
- `supabase/migrations/20261018_tw_public_counts.sql` – `tw_public_counts()`, the counts-only function the homepage calls for its live numbers (no names or emails).
- `supabase/migrations/20261030_admin_role.sql` – makes Aya's own Supabase account the admin and lets only the admin change plan settings or send as "TeenWork Admin".
- `robots.txt`, `sitemap.xml` – tell search engines they may read the site and where its one page is.
- `favicon.ico`, `icon-192.png`, `apple-touch-icon.png`, `logo.png`, `og-image.png` – site icon, logo and the picture shown when a link is shared.

## Keys

Only public keys belong in this repo (the Supabase publishable key and the EmailJS public key inside `index.html`).
The Groq keys live in Supabase as the secrets `GROQ_KEY_FREE` and `GROQ_KEY_PRO`. Never commit Groq keys, the Supabase service-role key, or the EmailJS private key.

## Deploying

https://teenwork.ayaqd.com shows the `main` branch. There is no build step.
To ship a new app version, update the relevant markup, scripts and styles, commit and push.

## The admin sign-in (v51)

There is no admin password in the app. The admin is `ADMIN_EMAIL`'s own Supabase account, marked with
`app_metadata.tw_role = "admin"`, which only Supabase's service role can set. Sign in on the normal Sign In page with that
email (or `admin`) and the account's normal password; if the email also has its own TeenWork accounts, pick "Admin panel".
To change the password, use "Forgot password?". The database and the `delete-account` function check the same role.

Ship v51 in this order, because the v50 admin panel does not sign in to Supabase:

1. Merge the frontend.
2. Apply `supabase/migrations/20261030_admin_role.sql`.
3. Deploy `supabase/functions/delete-account/` (Verify JWT off). The `ADMIN_PW_SALT` / `ADMIN_PW_HASH` secrets, if set, are no longer used.
4. Sign in again as the admin, so the new sign-in carries the role.

Checks, all offline: `node tests/home-v51.cjs`, `node tests/ui-acceptance.cjs`, `node tests/phone-layout.cjs` and
`node --experimental-strip-types tests/delete-account-auth.mjs`.

## Search engines

The web server must serve `robots.txt`, `sitemap.xml` and the images above as files. The app needs no other routes: every screen is `index.html`.
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
The addresses `groq-chat` accepts are listed under "Demo AI and the AI function's addresses" below.
CORS is not the authentication mechanism.

Run backend checks with:

```sh
node --test supabase/functions/groq-chat/core.test.mjs
```

The deployed moderation guard is preserved in `supabase/functions/_shared/message-guard.ts`. The AI function continues using `openai/gpt-oss-20b`, low reasoning effort, and at least 600 completion tokens, matching the live configuration.

## Demo AI and the AI function's addresses

`groq-chat` accepts requests from `https://teenwork.ayaqd.com`, the app's only address. The code still also lists the old
Netlify addresses, matching the live function (version 9); drop them the next time the function is deployed.
`ALLOWED_ORIGIN` (comma-separated) can add more addresses; it never removes the built-in ones.
Demos are empty practice accounts with no sign-in. They send `x-teenwork-demo: 1`, use the Free key, and are counted per
visitor (a salted hash of the address) and for all demos together by `supabase/migrations/20261025_demo_ai_quota.sql`
(6 a minute and 25 a day per visitor, 1,500 a day for all demos). The demo itself shows 5 tries a day in the browser.
Apply the migration before deploying the function: `node --test supabase/functions/groq-chat/core.test.mjs`.
