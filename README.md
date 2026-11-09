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

Checks, all offline: `node tests/home-v51.cjs`, `node tests/ui-acceptance.cjs`, `node tests/phone-layout.cjs`,
`node tests/practice-v52.cjs`, `node tests/onboarding-v53.cjs`, `node tests/profile-photo-v55.cjs`, `node --experimental-strip-types tests/delete-account-auth.mjs`
and `node --experimental-strip-types tests/delete-account-photos.mjs`.

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

`assets/js/onboarding-v53.js` (+ `assets/css/onboarding-v53.css`) holds `window.twTeenSteps`, the one place that says what a teen still needs before applying: a linked parent, that parent's consent from their own account, and a work permit only when the teen's state (from `PERMITS` in `job-tiers-v45.js`) or the employer needs one. The First Job Checklist (`assets/js/app-05.js`) shows those as "Required before you can apply", worked out from the account and not tickable; everything else is optional tips that link to their screens. The empty Find Jobs list shows "While you wait for jobs" next steps (profile, Workplace Safety Basics, link a parent, job-match alert settings). Profile completion counts name, birthday, town, a bio and 2+ skills, never a photo (a photo is optional; see the next section).
Messages is a labeled dialog with a Close button and a "Something feels wrong" button inside it; focus moves in and back out, Tab stays inside, and Escape closes the top window even while typing. The Verification permit step says exactly where the teen stands (`window.twPermitStepStatus`, called from `parent-consent-v44.js`). Check with `node tests/onboarding-v53.cjs`.

## Teen profile photos (v55)

A teen can add a photo under Profile → Profile Photo (`assets/js/profile-photo-v55.js` + `.css`). The browser turns it into a 400×400 JPEG (which drops hidden details like GPS location) and uploads it to the private Supabase Storage bucket `profile-photos`, in a folder named after the teen's sign-in id. There are no public links: viewers get a one-hour signed link only when the rules allow it.
The teen picks who sees it: only me, me and my parent (the default), or my parent and employers. An employer is included only after a parent approved the teen's application to that employer's job. The choice and the parent and employer emails it covers are in `public.tw_profile_photos`, a table only the teen's own sign-in can write; the teen's app refreshes the lists from the parent link and the teen's applications, and the box lists exactly who can see the photo. Parents see it on the teen card and in My Teens, employers on the Applicant Pipeline. Everyone else sees initials. Practice accounts never upload.
Deleting or closing an account deletes its photo and takes its email off other teens' lists (`delete-account` function).
The migration `supabase/migrations/20261107_profile_photos.sql` (bucket, table, rules) and the `delete-account` function with photo removal (version 4) went live in Supabase on 2026-11-09, so photos work as soon as the frontend is merged. Without the migration the box says "Photo upload is still being set up".
Who counts as a teen's parent or employer still comes from `user_data`, which anyone with the app's key can write; the photo rules only trust the teen's own row, and the teen sees the list of people.
Checks: `node tests/profile-photo-v55.cjs` (screens, fake Supabase), `node --experimental-strip-types tests/delete-account-photos.mjs`, and the database rules on a throwaway local Postgres: `TW_PG="host=… port=… user=postgres" node tests/profile-photos-sql.mjs`.

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
