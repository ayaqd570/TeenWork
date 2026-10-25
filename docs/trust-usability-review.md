# TeenWork: local trust and usability update

Status: local branch `fix/trust-dashboard-usability`; **not pushed or deployed**. Based on production source commit `f3b8eb2`. Existing work in the original checkout was preserved in a separate worktree.

## Inspection

- Static `index.html` plus ordered JavaScript and CSS assets; no build step. Page IDs and tab panels implement routing for Teen, Parent, Employer, verification, and support.
- Existing brand uses Fraunces/DM Sans, green/amber/blue role colors, shared cards, buttons, and fixed mobile navigation. These are retained.
- `job-board-v45.js` stores job posts and applications in existing `user_data` key/value rows (`job_post:`, `job_app:`). It maps `pending-approval`, `applied`, `parent-denied`, hired→`accepted`, and passed→`rejected` into shared application arrays. `real-data-v43.js` handles linked teens and separates real-account data from demos.
- Parent consent is a linked-parent action; member names/ages are self-reported. The permit code has an existing upload/AI/manual-review flow. No identity-document or criminal-record screening provider was found. Old code generated AI scores/certificates and offered nonfunctional payment forms.
- AI endpoint already validates sign-in, enforces quota, and uses the shared message guard. No backend/schema changes were made. Existing AI/message checks can fail or miss content.
- Public reviews already have a consented Supabase feed and honest empty state. Legacy device-local review templates also existed; those are no longer used for public reviews or structured review metadata.
- README and Netlify configuration confirm that the repository is hosted on Netlify. The user-confirmed primary address is `https://teenwork.ayaqd.com/`.

## Changes

### Safety and trust

- Removed the generic badge filter, built-in verified-employer list, unsupported screening badges, simulated trust scoring/background-check certificates, and screening/payment forms. Calling the old screening actions now explains that screening is unavailable; no AI check or payment is started.
- Changed self-reported profile labels, parent-consent/permit labels, old tour copy, employer profile copy, and saved-employer labels to their actual meaning. Saved employers are a personal list, not a screening result.
- No invented default employer rating is returned for real users or unknown demo employers. Existing sample data remains in labeled demos.
- Kept the Supabase review feed unchanged. Removed seeded admin-review defaults and disabled the old public-review/schema path based on device-local data.
- Added calm safety limits and a full-disclosure path beside chat, application review, job browsing, reporting, and posting preview. Alerts are not monitored 24/7; delivery and response are not guaranteed; the control is not an emergency service.
- The existing dispute form only requests AI advice. It is now labeled **Get next-step guidance**, states that it does not send a report, handles AI failure, and links to the existing alert control. Alert feedback no longer claims confirmed delivery.

### Mobile homepage

- At phone widths, the existing picture is a compact banner, the rotating slogan is hidden, and the real H1, purpose, and signup buttons appear promptly. Larger screens retain the existing picture, slogan, typography, and long homepage.
- At 390 × 844 the purpose/H1 ends around y=285 and the main signup button ends around y=456 in the offline browser test. No horizontal overflow at 390 or 320 pixels.

### Dashboards

- `parentApprovalRecords()` defines the existing pending-status predicate. The overview and queue derive from the same active application records. Filtered queues show the pending total and how many are shown; clicking the total clears filters and opens those records. Tested transitions 2→1→0.
- Teen work guidance uses the member's explicit age and supported profile state, not the browsing filter. Missing information stays unknown. A short age-relevant summary expands to the existing supported rule notes; no legal rules were added or re-certified.
- Job cards retain Apply as the primary action, group messaging/AI actions under More options, keep reporting visible, and remove unsupported background-check requests.
- The posting form reuses its original inputs and post handler in four steps: job/pay, location/travel, age/hours/tasks, and review. The preview includes entered details, travel options, and permit/farm flags, and explicitly is not a compliance approval. Original validation/posting and cloud persistence handlers remain in place.
- Manual drafts use existing browser storage, isolated by the current account key and labeled **on this device**. Drafts retain base fields, travel selections and permit/farm selections. Nearby landmarks should be reselected after restore; there is no cross-device draft promise.
- Toasts are dismissible, have status semantics, have usable mobile width, and sit above safe-area navigation. Automatic tours no longer launch on phones; explicit App Tour remains. Tour cards/dialogs have viewport and navigation clearance.

### Metadata and deployment preparation

- Canonical, Open Graph/structured page URLs, sitemap, and robots sitemap URL now use the custom domain.
- Prepared a host-specific Netlify 301 from the legacy Netlify URL to the same path on the primary domain before the SPA fallback. This is a local configuration change only, inactive until a deliberate deployment. No DNS, hosting settings, or live routing was changed.

## Files changed

| Files | Purpose |
| --- | --- |
| `index.html`, `assets/js/app-04.js`, `assets/js/app-05.js` | Pending-record helper/count navigation, honest screening/reporting/rating behavior, dismissible toast, markup and metadata. |
| `assets/js/trust-usability.js`, `assets/css/trust-usability.css` | Scoped mobile layout, labor summary, action grouping, safety links/disclosure placement, posting steps/preview/device drafts, safe-area clearance. |
| `assets/js/real-data-v43.js`, `assets/js/parent-consent-v44.js` | Matching pending predicate, role-specific count updates, precise consent/permit badges. |
| `assets/js/app-09.js`, `assets/js/app-12.js`, `assets/js/app-18.js`, `assets/js/featpack-js.js` | Legacy onboarding/reporting/review copy and tour behavior. |
| `assets/js/clean-menu-v43.js`, `assets/js/navfix-js.js`, `assets/js/featpack-v24-js.js` | Consistent saved-employer navigation labels. |
| `netlify.toml`, `robots.txt`, `sitemap.xml` | Local redirect preparation and primary-domain search metadata. |
| `tests/ui-acceptance.cjs`, this document | Offline regression/acceptance checks and handoff. |

## Verification

`tests/ui-acceptance.cjs` launches local code with **all external requests blocked**. It uses only disposable demo data/fixtures; it does not send messages, post jobs, sign into real accounts, or mutate real data.

Run with Playwright installed in the development environment:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/ui-acceptance.cjs
node --test supabase/functions/groq-chat/core.test.mjs
```

Browser checks cover 390 × 844, 320 × 720, and 1440 × 1000:

- Purpose and signup placement; no horizontal overflow.
- All three role dashboards and profile/consent screens, full safety disclosure visible from each role, no page-script errors, and no unsupported badges.
- Matching parent count/queue, filtered view behavior, count navigation, and status transitions.
- Unknown age/state and explicit age-13 guidance.
- One primary job action, grouped secondary actions, reporting, and no background-check action.
- Posting steps, review preview, visible Post Job action, account-scoped device draft restore including permit choice.
- Toast dismissal and clearance above mobile navigation.
- Unsupported screening methods never call AI.

Also checked all 54 application scripts with `node --check`, HTML asset references, `git diff --check`, TOML parsing/host-scoped redirect order, and the existing eight backend tests.

## Limits and product decisions

- Live authentication, Supabase RLS, cross-device applications, provider availability, email delivery, production redirects and publishing were deliberately not exercised. The local test suite blocks all external APIs.
- The application has many legacy wrapper layers. UI behavior was exercised at the final loaded layer, but this is not a complete backend/security audit.
- Existing work-rule data was reused, not independently revalidated against current law. Rule freshness and exception coverage require a separate review; no listing is certified compliant.
- A durable report-submission workflow, monitored incident queue, delivery confirmation, escalation policy, and response staffing are product/backend decisions. The old advice-only form cannot supply these capabilities.
- Actual identity/criminal-record screening requires a real provider, authorization/consent, result storage, and precise badge rules. None was added or simulated.
- Device drafts are not shared between devices. An employer must reselect a nearby landmark after restoring a draft; no private street-address collection was added.
- Review the prepared redirect in a Netlify preview before any later production deployment. DNS and hosting were left alone.
