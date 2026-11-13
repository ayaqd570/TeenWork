# TeenWork

The TeenWork app uses `index.html` plus the scripts and styles in `assets/`.
The app lives only at https://teenwork.ayaqd.com (Aya's own domain), which serves this repo's `main` branch. Netlify is no longer used.

## What's here

- `index.html` – app markup (currently TeenWork v54: Share TeenWork, Stripe payments for Pro, Resend for sending email and EmailJS for the team inbox).
- `assets/img/hero-*.avif`, `hero-*.webp` – the home page picture in three sizes (it used to be inside `index.html`).
- `assets/js/`, `assets/css/` – ordered application scripts and styles.
- `supabase/functions/groq-chat/index.ts` – the Supabase Edge Function that forwards AI requests to Groq. It runs on Supabase.
- `supabase/functions/delete-account/` – the Supabase Edge Function behind "Delete my account" and the admin Danger zone (deploy with Verify JWT off). It uses only the keys Supabase provides itself.
- `supabase/migrations/20261018_closed_accounts.sql` – the `closed_accounts` table the app reads to hide deleted accounts.
- `supabase/migrations/20261018_tw_public_counts.sql` – `tw_public_counts()`, the counts-only function the homepage calls for its live numbers (no names or emails).
- `supabase/migrations/20261030_admin_role.sql` – makes Aya's own Supabase account the admin and lets only the admin change plan settings or send as "TeenWork Admin".
- `supabase/functions/billing/` – the Supabase Edge Function behind Pro payments: Stripe Checkout, the Stripe billing page, plan status and Stripe's webhook (deploy with Verify JWT off).
- `supabase/functions/send-email/` – the Supabase Edge Function that sends app emails through Resend (deploy with Verify JWT off).
- `supabase/migrations/20261015_email_send_log.sql` – the email limits table `send-email` uses (already applied on 2026-10-15; kept here as a record).
- `supabase/migrations/20261106_billing_and_sharing.sql` – the `tw_billing` and `tw_stripe_events` tables, the rule that only payments can switch someone to Pro once Paid Launch is on, and `tw_referral_count()` for the share window.
- `manifest.json`, `sw.js`, `icon-512.png`, `icon-maskable-512.png` – lets phones add TeenWork to the home screen. `sw.js` always asks the network first and only falls back to its copy when offline.
- `robots.txt`, `sitemap.xml` – tell search engines they may read the site and where its one page is.
- `favicon.ico`, `icon-192.png`, `apple-touch-icon.png`, `logo.png`, `og-image.png` – site icon, logo and the picture shown when a link is shared.

## Keys

Only public keys belong in this repo (the Supabase publishable key and the EmailJS public key inside `index.html`).
The Groq keys live in Supabase as the secrets `GROQ_KEY_FREE` and `GROQ_KEY_PRO`. The Stripe and Resend keys live there too (see "Payments and email (v54)").
Never commit Groq, Stripe or Resend keys, the Supabase service-role key, or the EmailJS private key.

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

Checks, all offline: `node tests/home-v51.cjs`, `node tests/ui-acceptance.cjs`, `node tests/phone-layout.cjs`,
`node tests/practice-v52.cjs`, `node tests/onboarding-v53.cjs`, `node tests/share-billing-v54.cjs` (sharing, email invites, polish, billing),
`node --experimental-strip-types tests/delete-account-auth.mjs` and `node --experimental-strip-types tests/billing-and-email-functions.mjs`.

## Search engines

The web server must serve `robots.txt`, `sitemap.xml` and the images above as files. The app needs no other routes: every screen is `index.html`.
If the site moves to another address, update the address in `robots.txt`, `sitemap.xml` and the canonical, Open Graph and structured data tags in the `<head>` of `index.html`.
The search text leads with "teen job app", "teen job finder app" and "TeenWork"; Vermont is only a second mention. The FAQ in the structured data must match the "Questions before you join" FAQ in `assets/js/homepage-v49.js`. Run `node tests/search-text.cjs` after changing either.

## Work rules (hours and permits)

Every teen screen that talks about work hours or permits reads `assets/js/work-rules-v52.js` (`window.twWorkRules`): the Find Jobs guidance, Work Log, the calendar bar, the apply and chat hour notices and the Verification page check. Permit data stays in the `PERMITS` table in `assets/js/job-tiers-v45.js`.
Every state and DC has its own hours, days and time-of-day rules for under 16 and for 16 and 17 (the `RAW` table in that file), taken on 2026-11-02 from the US DOL table "Selected State Child Labor Standards Affecting Minors Under 18 in Non-farm Employment as of July 15, 2025". For ages 14 and 15 the app shows the stricter of the federal and state numbers. Federal rules come from 29 CFR 570.35 and US DOL Fact Sheet #43. Vermont was also checked against 21 V.S.A. §§ 431, 434, 436, 437 and Vermont DOL guide WH-30. California's 16–17 hours come from the California Labor Commissioner's child labor guide, because the DOL table's figure for them doesn't match it. The rules file also rewrites `STATE_DATA`'s hour fields and notes, so other scripts and the AI read the same numbers. Change a number only after checking the source again, and update the date in the file. Laws passed after July 15, 2025 are not in the DOL table.
The teen's weekly hours goal (the old `max-weekly-hours` setting, 15 h by default) is a personal target and is always labelled "not a law".
A linked parent's ⏰ Weekly Hour Limit (`assets/js/parent-hours-v52.js`) is saved in `user_data` as `<parent>/hour_limit:<teen key>` and counts for the teen only when that parent is linked and approved on the teen's own `parent_link`. The teen's weekly bar, apply check and chat check use the lowest of the legal limit, the parent's limit and the teen's goal.

## Teen onboarding, Messages and Verification (v53)

`assets/js/onboarding-v53.js` (+ `assets/css/onboarding-v53.css`) holds `window.twTeenSteps`, the one place that says what a teen still needs before applying: a linked parent, that parent's consent from their own account, and a work permit only when the teen's state (from `PERMITS` in `job-tiers-v45.js`) or the employer needs one. The First Job Checklist (`assets/js/app-05.js`) shows those as "Required before you can apply", worked out from the account and not tickable; everything else is optional tips that link to their screens. The empty Find Jobs list shows "While you wait for jobs" next steps (profile, Workplace Safety Basics, link a parent, job-match alert settings). Profile completion counts name, birthday, town, a bio and 2+ skills, never a photo (photo upload isn't built; the Profile Photo box says so).
Messages is a labeled dialog with a Close button and a "Something feels wrong" button inside it; focus moves in and back out, Tab stays inside, and Escape closes the top window even while typing. The Verification permit step says exactly where the teen stands (`window.twPermitStepStatus`, called from `parent-consent-v44.js`). Check with `node tests/onboarding-v53.cjs`.

## Sharing (v54)

`assets/js/share-v54.js` (+ `assets/css/share-v54.css`) holds `window.twShare()`, the "📣 Share TeenWork" window: the link with a Copy button, Text, Email, WhatsApp, Facebook and "More…" (the phone's own share sheet). Visitors on a phone get the phone's share sheet straight away; members always get the window, because it also has their joined count and the email invite. It is reached from the menu, the home page band and footer, the old referral window, the rate window and a one-time note on the 3rd dashboard visit.
A real member's link carries their 8-letter code (`?ref=CODE`, saved as `ref_code` in `user_data`). Whoever signs up within 60 days of opening that link gets `referred_by` saved, and the window shows how many people joined with the code (`tw_referral_count()`, counts only). Practice accounts, the admin and visitors share the plain address. There are no rewards for sharing, so the app promises none.
Welcome, parent-link, consent and recommendation emails end with a small "Know someone who'd use TeenWork?" box (`window.twEmailShareBlock`, used by `branded-email-v41.js`). Emails to the team inbox never get it. **Invite by email:** a member can type a friend's address in the window and TeenWork emails them a short invite with the member's first name and link (`sendInvite` in `share-v54.js`). Invites only go through Resend, with the member's sign-in, at most 5 a day per account and once a month per address, never to the member's own address or the team inbox. If Resend isn't set up or refuses, the window offers "Send it from your email app instead". Invites never use EmailJS, so they can't use up the EmailJS allowance that sign-up codes and parent emails need.

## Polish pass (v54)

`assets/js/polish-v54.js` + `assets/css/polish-v54.css`: the empty bottom bar that showed as a green line on the home page is hidden there, the last Sign Up / Sign In buttons are centered on phones, the floating Help / Rate buttons stay off the plans page, and the sign-up plan choices stack on phones. The sign-up form has no required "track my activity" box any more (the Terms already say how account data is used) and no pop-up when notifications are turned off. "Add to home screen" is one sheet (`twOfferInstall` in `featpack-js.js`): only for real members on their dashboard, about 8 seconds after it opens, and "Not now" waits 30 days; app-04's green banner and the iPhone banner on every visit are gone. AI badges say "AI" (they said "Gemini AI" or "Grok AI", but the app uses Groq). The plans page and the school page only list what the app does.

## Payments and email (v54)

**Who sends what.** Emails to people (welcome, parent links, alerts, the admin's support replies) go through Resend from the `send-email` function. Emails to the TeenWork team (contact form, support, admin alerts) go through EmailJS straight to the team inbox. If Resend isn't set up or fails, people's emails fall back to EmailJS.
EmailJS has no mail server of its own: it sends from the mailbox connected to the `TeenWork` service in the EmailJS dashboard (an Outlook account, Aya said on 2026-11-06), so EmailJS emails arrive from that Outlook address. Until `RESEND_API_KEY` is set (the live `send-email` answered `configured: false` on 2026-11-06), every app email goes that way.
A few buttons open the person's own email app (Outlook, Gmail, Mail) on purpose instead of sending: Share → Email, the admin's "Use my email app" on a support reply, and the backup draft the "Something feels wrong" alert opens next to its automatic emails. Before v54, the admin's "Send Reply" also only opened the email app; it now sends from TeenWork.
`send-email` only keeps links to the TeenWork site (and `mailto:`) and only when a signed-in member sends; everything else is turned into plain text, so the function can't be used to send phishing links. Limits: 20 an hour per member, 15 an hour per visitor address, 8 an hour per recipient (60 for team inboxes) and 95 a day in all.

**Pro payments.** Until the admin turns on Paid Launch (Admin → Launch Controls), Pro stays free and works as before. Once it's on, "Upgrade" opens Stripe Checkout through the `billing` function ($3.99 a month for Teen Pro and for Employer Pro). Parent accounts are always free and have no Pro: no plan choice at sign-up, no Upgrade buttons, and a stored Pro counts as Free. A teen is first asked to get a parent or guardian. Stripe tells the `billing` function when a payment starts, renews or stops; the function then sets `app_metadata.tw_plan` and `tw_ai_plan` (so the AI's Pro key follows the payment) and the account's `plan` row. "Manage billing" on the plans page opens Stripe's own page to change the card or cancel. Once Paid Launch is on, the database refuses a `plan` of "pro" written by anyone but the admin or the `billing` function.

What is already set up (2026-11-10):

- Stripe (live mode, account "TeenWork"): products "TeenWork Teen Pro" (`price_1UZx4YJzVYltmWpU7mSmK93f`) and "TeenWork Employer Pro" (`price_1UZx4ZJzVYltmWpUyAcY7DRc`), both $3.99 a month (the first $4.99 and $49 prices are archived), the customer portal (card, invoices, cancel at the end of the month) and the webhook `https://qocmpwimsfcnqijtfmki.supabase.co/functions/v1/billing/webhook` with `checkout.session.completed` and `customer.subscription.created/updated/deleted`. `billing` uses these two live prices by itself when `STRIPE_SECRET_KEY` is a live key, so the `STRIPE_PRICE_*` secrets are only needed for a test-mode key or new prices.
- Supabase: `billing` and the new `send-email` are deployed with Verify JWT off. `supabase/migrations/20261106_billing_and_sharing.sql` is applied (the billing tables, the Paid Launch rule and the share-link count). The secrets `STRIPE_SECRET_KEY` (a "Full access—except sensitive operations" key, which can't move money out) and `STRIPE_WEBHOOK_SECRET` are set: `billing`'s ping answers configured, live mode, both prices, webhook secret.

Still to do:

1. A real payment has not been tried yet. Admin → System Health shows "Payments (Stripe)". Stripe is in live mode, so a test payment is a real $3.99 charge: refund it in Stripe afterwards. For a free practice run, use a Stripe sandbox with its own test key and test prices in the `STRIPE_PRICE_*` secrets, and the card 4242 4242 4242 4242.
2. Resend: verify a domain (for example `ayaqd.com`), then set `RESEND_API_KEY` and `RESEND_FROM` (for example `TeenWork <hello@ayaqd.com>`). Until then Resend only delivers to the Resend account's own email and everything else goes through EmailJS. The EmailJS template's message field must be `{{{message}}}` (three braces) so emails keep their layout.

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

## Get the app (v57)

TeenWork has no app-store app: it is a web app with a manifest and a service worker, so people install it from the browser and it opens from the home screen like any other app. `assets/js/get-app-v57.js` (+ `assets/css/get-app-v57.css`) is the one place that offers it, with `window.twGetApp({ source })`:

- **The window** shows what works on that device: the browser's own install prompt as a "Download the app" button (Chrome, Edge and Samsung Internet on Android and computers); the Share → Add to Home Screen steps on iPhone and iPad (Safari, Chrome and others); the menu steps on other Android browsers; "open it in your browser first" inside Instagram, TikTok, Snapchat or Facebook; and on computers a QR code (`assets/img/get-app-qr.svg`, opens `https://teenwork.ayaqd.com/?app=1`) plus "Email me the link" for members.
- **Buttons:** "📲 Download the app" in the dashboard menu footer (clean-menu-v43's `[data-twm="app"]` item; until the menu has one, this file adds its own button there), "📲 Get the app" in the home page top bar on computers, a band above "Share TeenWork", and the home page footer. They hide once TeenWork is installed.
- **The pop-up** replaces the v54 install sheet (`#featpack-install` is hidden; `polish-v54` still calls `window.twOfferInstall` 8 seconds after a dashboard opens). Only real members on their dashboard, never on the home page, sign-up, demos or the admin. It waits until the tour and any other window are closed, shows at most 3 times per account on a device, 14 days apart, and "Don't ask again" stops it. Never once TeenWork is installed or opened from the home screen.
- **Opened from the home screen**, TeenWork skips the marketing home page and opens Sign In, and tells Supabase that the signed-in member has the app (`rpc tw_app_installed`, once a week per device) so the reminder emails stop.
- `manifest.json` has two screenshots (`assets/img/app-shot-*.jpg`), which Chrome shows in its install sheet.

**Reminder emails.** `supabase/functions/app-emails/` sends an occasional "Put TeenWork on your phone" email through Resend (the same `RESEND_API_KEY` / `RESEND_FROM` as `send-email`). A pg_cron job calls it once a day at 22:00 UTC. Who gets one: teen, parent and employer accounts at least 2 days old that haven't opened the installed app, haven't unsubscribed and aren't closed; never the admin, demo or `.test` addresses or the tester inboxes. At most 2 reminders per person ever, 21 or more days apart, at most 20 a run, and none once the last 24 hours hold 60 emails of any kind, so at least 35 of the 95 a day stay free for sign-up, parent and job emails. Each email has a one-click unsubscribe (mail apps' own Unsubscribe button, and a link to `https://teenwork.ayaqd.com/?unsub=<token>`, which has an Undo). No tracking pictures, only the person's first name. The database decides who is due (`supabase/migrations/20261113_app_emails.sql`: `tw_email_prefs`, `tw_app_email_claim`, `tw_email_unsubscribe` …) and refuses a second run within 20 hours, so calling the function again sends nothing new.

To turn it on:

1. Apply `supabase/migrations/20261113_app_emails.sql` (it also turns on pg_cron and schedules the daily job).
2. Deploy `supabase/functions/app-emails/` with Verify JWT off.
3. Optional secrets: `MAIL_POSTAL_ADDRESS` (a mailing address for the email footer; US law asks for one in promotional email, and a P.O. box is fine), `APP_EMAILS_OFF=1` to pause it, `APP_EMAILS_PER_RUN`, `APP_EMAILS_DAY_CAP`. To stop it for good: `select cron.unschedule('tw-app-emails');`.

Nothing is sent until Resend is set up, and never from Resend's test sender. Checks: `node tests/get-app-v57.cjs`, `node --experimental-strip-types tests/app-emails-function.mjs`, and `TW_PG="-h <socket dir> -p <port> -U postgres" node tests/app-emails-sql.mjs` (a throw-away local Postgres). `node docs/get-app/shots.cjs` remakes the pictures in `docs/get-app/` and the manifest screenshots.
