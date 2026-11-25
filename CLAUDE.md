# CLAUDE.md: agent handoff for amplifytyee.org

Read this before changing anything. `README.md` is the maintainer-facing guide (how the store,
Sheet, PayPal, and DNS work). This file covers what an agent needs on top of that: the rules,
how the maintainer works, how to verify, the traps already hit, and what's still open.

**Keep this file current.** When you finish a piece of work, update *Current status and open
items* at the bottom (with the date).

---

## What this is

- Static two-page site for **Amplify Tyee**, the Tyee Middle School music booster club.
- Live at **https://amplifytyee.org** via GitHub Pages from `main` (root) of the **public**
  repo `evpang/amplifytyee-website`.
- `index.html`: about, mission and goals, donations, social links. Original copy came from
  the PTSA page <https://tyeeptsa.org/Page/PROGRAM%20PAGES/Amplify%20Tyee>.
- `sweatshirts.html`: hoodie order form that replaced a Jotform
  (<https://form.jotform.com/262537613078158>): 4 colors at $35, qty 0–5, 7 sizes, student
  first/last name, Level(Grade), elective, parent email, PayPal checkout, orders recorded
  to a Google Sheet.
- Club contact / PayPal / Zelle / Google account: **amplifytyee@gmail.com**.

## Hard constraints

1. **Running cost must stay $0.** No paid hosting, services, or plans. The only cost is the
   domain renewal the club already pays.
2. **Plain static site.** No framework, bundler, npm dependencies, or build step. Volunteers
   edit HTML by hand. Don't introduce a toolchain.
3. **The repo is public.** Never commit secrets (e.g. a PayPal *Secret*, tokens, passwords)
   or order data (student names, parent emails). A PayPal **Client ID** and the Apps Script
   `/exec` URL are fine: both are necessarily visible in the browser.

## How the maintainer works (follow these)

- **"Locally" means don't push.** Make the change, verify it, report. Commit and push **only**
  when told ("push it").
- **On "push it":** review `git status` / `git diff`, commit with a descriptive message, push
  to `main`, then **confirm the change is live** on amplifytyee.org (see Verify below) before
  reporting.
- **The maintainer edits files by hand in VS Code between requests.** Always re-read a file
  before editing it. Treat on-disk changes as intentional; never revert them. Mention it only
  if something looks broken.
- When asked, open files with the editor tool (e.g. "open index.html in editor").
- **The header menu and footer are shared, not duplicated** (since 2026-11-24). They live in
  `assets/js/chrome.js` and every page pulls them in; edit `NAV_LINKS` / `FOOTER_PAGES` there and
  all four pages follow. They used to be copied into each page and had drifted - `thank-you.html`
  never got the Winter Concert link, which is what prompted the change.
- **The one thing still copied per page is the `<noscript>` fallback** that wraps each include: a
  plain header and footer for visitors with JavaScript off, using the same CSS classes so it looks
  like the real thing (minus the social icons). The four copies are byte-identical on purpose -
  **when you change a menu or footer link, change it in `chrome.js` AND in all four fallbacks**,
  then confirm they still match:
  `python -c "import io,hashlib;[print(f, hashlib.md5(io.open(f,encoding='utf-8').read()[io.open(f,encoding='utf-8').read().index('<noscript>'):].encode()).hexdigest()[:8]) for f in ['index.html','sweatshirts.html','WinterConcert.html','thank-you.html']]"`
  (the store pages also have their own second `<noscript>` saying ordering needs JavaScript).
- **Verify visual changes in the browser** at desktop width and at 375px (mobile) before
  reporting: no horizontal overflow, nothing wrapping badly. Measure with JS where possible,
  and take a screenshot.
- If a request is ambiguous in a way that changes the result (e.g. which "Support" to rename),
  choose the reading that produces correct, grammatical output, do it, and say what you chose
  and the alternative.
- Commits: git identity is `evpang <evpang888@gmail.com>` (already the global config). End
  commit messages with the `Co-Authored-By:` trailer your harness specifies.

## Architecture

| File | Responsibility |
|---|---|
| `assets/js/config.js` | All store settings: `PAYPAL_CLIENT_ID`, `PAYPAL_SANDBOX`, `APPS_SCRIPT_URL`, `CONTACT_EMAIL`, `MAX_QTY`, `SIZES` (`name`, `waist`, `height`), `PRODUCTS`, `THANK_YOU` |
| `assets/js/order.js` | IIFE. Renders products from config, recomputes totals in integer cents, validates (size required only when that color's qty > 0), loads the PayPal JS SDK on demand, `onClick` → `actions.reject()` until valid, captures, POSTs the order to Apps Script, shows the receipt |
| `apps-script/Code.gs` | `doPost` routes each order to **its own store's pair of tabs** (`STORE_SHEETS`, keyed by the store `LABEL`, which also carries the short `email` name used in subjects - "New Music Hoodie order", "New Winter Concert order", "Your ... order": hoodies -> *Hoodie Order* / *Hoodie Line Items*, winter concert -> *Winter Concert Orders* / *Winter Concert Line Items*; an unlisted store gets *<Store> Orders* / *<Store> Line Items*). A tab is created with its header row only when empty, so the two existing hoodie tabs must be rearranged once by hand: the **Grade column is gone** from the script, so delete it, insert a `Level` column right after `Elective` (both tabs: `E`) and put `Store` last on the ORDERS tab only (`P1`; line-items tabs have no Store column - one store per tab) - the recipe is in README's *The Google Sheet*. Orders are A-P, Line Items A-J, with Elective and Level side by side. Emails the board and the parent, both naming the store; the parent's fulfilment sentence is the store's `THANK_YOU`, sent as `order.thankYou`. `doGet` = health check. `testOrder` / `testWinterConcertOrder` = manual end-to-end tests (they write real rows and send real email) |
| `assets/css/site.css` | Shared styles and design tokens (`:root` vars; brand red `--red: #b3202e`) |
| `assets/css/store.css` | Order form styles (only loaded by `sweatshirts.html`) |
| `assets/js/chrome.js` | **The header menu and the footer, for every page.** Two `<script src="assets/js/chrome.js?v=N" data-chrome="header\|footer">` tags per page render their part in place while the page parses (no flash). Holds `NAV_LINKS`, `FOOTER_PAGES`, the contact email, the Facebook/YouTube URLs and their inline SVGs, the skip link and the footer year. Marks the current page with `aria-current="page"` by matching the file name in a link's `page` key - a new page needs its file name there. **Bump the `?v=` in all four pages when you edit it**, same as the CSS |
| `assets/js/nav.js` | Home page only: moves the menu highlight between Home / Donate / Connect. Loaded last, after the header exists |
| `flyerWithFBYoutube.html`, `donateFlyer.html` | Two self-contained one-page printable flyers (own inline <style>, US Letter). Same content, different QR band: Donate/Hoodie/Facebook/YouTube vs PayPal/Zelle/Hoodie. QR codes are pre-generated SVGs in `assets/img/qr-*.svg` |
| `thank-you.html` | Unlisted thank-you page for parents who ordered (`noindex, nofollow`, nothing links to it; share the URL). Thank-you hero, an "Every Note Matters" donate panel with the PayPal and Zelle buttons, and three YouTube slots. Shell comes from `site.css`; the page-only CSS sits in its own `<style>`. **The videos are the `VIDEOS` array at the bottom** - paste an ID or any YouTube link; an empty id shows a placeholder box. Embeds use `youtube-nocookie.com` and lazy-load. The PayPal donate page itself cannot be iframed (`X-Frame-Options: SAMEORIGIN`), so the buttons open PayPal in a new tab; a popup-on-page flow would need PayPal's Donate SDK and a `hosted_button_id` |
| `.claude/launch.json` | Preview server: `python -m http.server 4321` |

Store behavior worth knowing:
- **Both ordering pages ask the same student questions**: first name, last name, **Level(Grade)**
  (`Entry(6)` / `Intermediate(7)` / `Advanced(8)`), elective, parent email. The hoodie page used to
  ask "Student Grade" (`6th/7th/8th Grade`, field `name="grade"`); as of 2026-11-24 it asks the same
  Level(Grade) question as `WinterConcert.html`, so **no page writes the Sheet's Grade column any
  more** - new rows fill Level instead, and the historical grades stay where they are. The legend is
  `Level(Grade)` but `data-choice-label="Level"` keeps the error message ("Please select a level.")
  and the receipt line grammatical. The `?` helper beside it is `span.help` > `.help-mark` +
  `.help-bubble`, styled in **store.css** (shared, so don't re-add it to a page's own `<style>`);
  it opens on hover, on keyboard focus and on tap, and under 560px it anchors to the marker instead
  of centring (capped at `min(230px, 100vw - 72px)`) so it can clear neither edge. **Its `z-index` is
  150 on purpose**: the bubble pops upward, the site header is `position: sticky; z-index: 100`, and
  at 20 the header swallowed the whole tooltip whenever the question sat near the top of the window -
  which is exactly where it lands when you scroll the student panel into view. Keep it above 100 and
  below the skip link's 200.
- `PAYPAL_CLIENT_ID` empty → "Online ordering opens soon" notice instead of buttons.
- `PAYPAL_SANDBOX: true` → "Test mode — no real payments" notice above the buttons.
- SDK params: `currency=USD&intent=capture&disable-funding=credit`; order uses
  `shipping_preference: "NO_SHIPPING"` (hoodies delivered in class).
- Order POST uses `Content-Type: text/plain` (a CORS "simple request", so no preflight), with a
  `mode: "no-cors"` retry. Logging failure never blocks the parent; the receipt shows a
  forward-your-receipt note instead.
- Sizes: the dropdown shows only `SIZES[].name`. Each color's "Size" label has a
  "📏 Size chart" `button.size-chart-link` beside it (rendered by `renderProducts()` inside
  `.label-row`, sized so the Size and Quantity dropdowns stay level). All three open one native
  `<dialog id="size-chart">` whose table rows are built from `SIZES` (name/waist/height), via a
  click listener on `#products`. Closes via ×, Esc (handled explicitly: the embedded test
  browser didn't close on Esc natively), or a backdrop click; focus returns to whichever link
  opened it. The dialog sits outside `<form>` so its buttons can't submit it.
- Order payload keeps both `items[].size` and `items[].sizeShort` (both = size name) because the
  deployed `Code.gs` writes `size` to the Sheet and uses `sizeShort` in emails. Don't rename
  them without redeploying the Apps Script.
- `config.js` strings: a straight `"` inside a label (e.g. `58"`) breaks the file and the whole
  store (no products, no PayPal). The maintainer did this once by hand. After any edit, run
  the config-parses check below; use curly `”` `’`.
- **Clicking a product picture opens it larger.** `renderProducts()` wraps each thumbnail in a
  `button.zoom-open`, and `setupImageZoom()` in `order.js` builds one `<dialog id="image-zoom">`
  at startup and appends it to `<body>` (never inside `<form>`, or its buttons would submit it).
  Same pattern as the size chart: x, Esc handled explicitly, backdrop click, focus back on the
  thumbnail that opened it. It is in `order.js`, so **every** ordering page gets it, not just the
  winter concert; the enlarged picture is just the product image at its natural size, so keep
  those files reasonably big (the winter ones are 760px).
- **Each product has an on/off switch.** `available: false` on a `PRODUCTS` entry takes that item
  off sale: `order.js` filters it out of `PRODUCTS` at startup, so it never renders, can't be
  selected, priced or paid for, and no other code has to know. An entry with no `available` key is
  on sale, so older stores needed no edit. Switch **every** item off and `closedBecause()` returns
  `"empty"`, which hides the form and shows "Ordering is not open right now" under the hero - the
  same mechanism as a closed ordering window. The winter concert's three items carry the flag
  explicitly so a volunteer can see what to edit. The closed notice is now store-aware (it prints
  the store's `THANK_YOU` instead of the old hoodie-only wording).
- **The ordering window** lives in `config.js`: `SWEATSHIRT_ORDERING_OPEN` (false closes it whatever
  the date says) and `SWEATSHIRT_ORDER_CLOSE_DATE` (`YYYY-MM-DD`, closes at the end of that day by
  the shopper's clock; `""` = no deadline). Closed means `order.js` hides the whole `<form>` and
  puts one `.order-closed` notice at the top of `.store-wrap`, directly under the hero - no student
  fields, no hoodies, no PayPal. The date is parsed by hand because `new Date("2026-10-18")` is UTC
  midnight, a day early in Seattle. Anything carrying `data-order-deadline` gets the formatted date
  written into it, so the hero's "Pre-order by ..." line has one source of truth.
- After a paid order the receipt stays up for `AFTER_ORDER_DELAY` seconds (config.js) with a
  countdown and a "Go now" link, then `order.js` sends the parent to `AFTER_ORDER_URL`
  (`thank-you.html`). Set the URL to `""` to keep them on the receipt. **One exception:** when the
  order did not reach the Sheet, there is no auto-redirect, only a link - that receipt carries the
  "forward your PayPal receipt" instruction and must not be navigated away from. The receipt's old
  "Back to Amplify Tyee" button was removed, so the countdown line is the way onward.
- Known, accepted trade-off: the total is computed client-side. The Sheet stores PayPal Capture
  ID and PayPal Amount for reconciliation. Rows with no Capture ID are not real payments.

Page conventions:
- Card titles are `<h3>` with an icon first: emoji for most; inline SVG with
  `class="title-icon"` for the wallet (Material Symbols `account_balance_wallet`, Apache-2.0,
  fill `#2563EB`), Facebook (Simple Icons, `#0866FF`), and YouTube (Simple Icons, `#FF0000`).
  SVGs are inlined (no external files) with `aria-hidden="true" focusable="false"`.
- The Facebook and YouTube card titles **are** the links (`.card h3 a`): always underlined,
  with a CSS `↗` for `target="_blank"` (alt text `""` so screen readers skip it).
- Menu social links are icon-only `a.nav-icon` (40px square) with `aria-label` and `title`.
- The "Donate with PayPal" / "Donate with Zelle" buttons start with an inline Simple Icons SVG
  (`svg.btn-icon`, `fill="currentColor"`) so the logo is white like the button text. The brand
  colours (PayPal `#003087`, Zelle `#6D1ED4`) are too dark to read on the red `.btn-primary`.
- The home page's "Buy a Music Hoodie" button uses the same `svg.btn-icon` pattern with the
  Phosphor Icons **hoodie (fill)** icon (MIT, `viewBox="0 0 256 256"`). There is no hoodie
  emoji: 🧥 (`&#129509;`) is a coat, which is why it was replaced there. Material Symbols'
  "apparel" was rejected because it's a T-shirt. The hoodie page's "Spiritwear Fundraiser"
  badge used to carry the same icon as `svg.eyebrow-icon`; **both hero badges were removed on
  2026-11-24** (that one and the winter concert's "Every Note Matters!"), so `.eyebrow` now
  appears only on the home page's "Our Mission" and the thank-you page. The `.eyebrow` and
  `.eyebrow-icon` rules stay in `site.css` for those. If a badge ever comes back, copy the SVG
  from `index.html` rather than retyping it.
- **Menu highlight = where you are, and nothing else.** No menu item has permanent emphasis
  (a red "Buy a Hoodie" call-to-action button was reported as a bug because it looked like the
  current tab). The highlight is `.site-nav a[aria-current]`. `sweatshirts.html` sets it
  statically on "Buy a Hoodie". On `index.html`, `assets/js/nav.js` moves it between Home
  (`"page"`), Donate and Connect (`"location"`) on scroll, on load/hash (arriving from the
  hoodie page), and immediately on click (held until the scroll finishes). Home and the logo
  scroll back to the top instead of reloading. It works out which links are same-page sections
  from their `href`, so adding a menu link to a new `<section id>` needs no JS change.
- **Page titles share one scale**: `h1 { font-size: clamp(1.7rem, 4.2vw, 2.4rem) }` in `site.css`
  (38.4px desktop / 27.2px phone, lowered from 2.85rem on 2026-11-24). All four hero headings use
  it, so change that one line rather than per-page overrides.
- **Hero top padding is deliberately tight** (2026-11-24): `.hero` in `site.css` and `.store-hero`
  in `store.css` both leave ~30px between the header and the page title on desktop, ~20-24px on a
  phone. `.hero` also has a `min-width: 900px` override (`30px 0 40px`). `WinterConcert.html` used
  to carry its own padding override; it was deleted so the two ordering pages keep the same
  rhythm - put page-local padding back only if that page really must differ.
- **Stylesheet links carry a version query** (`assets/css/site.css?v=2026-11-24b`, same for
  `store.css`, on all four pages). **Bump it whenever you edit a CSS file**, in every page that
  links it; for a second edit on the same day add a letter (`...-24` -> `...-24b`), or the URL
  does not change and the cache is not busted. Without it a browser pairs the new HTML with a cached old stylesheet: the
  `.help-bubble` tooltip then renders as plain inline text reading
  "Level(Grade): *?Choose based on your child's level...", which is what the maintainer saw in an
  external browser. The preview server sends no `Cache-Control`/`ETag` (only `Last-Modified`), so
  browsers cache heuristically without revalidating; GitHub Pages serves assets with
  `max-age=600`, so returning visitors can hit the same mismatch for ten minutes after a push.
- **Link to the home page as `./` and `./#section`, never `index.html` / `index.html#section`**
  (both pages: logo, menu, footer, receipt "Back" button). Visitors arrive at
  `amplifytyee.org/`; a link to `index.html#donate` is a different URL, so the browser did a
  full page reload instead of scrolling. (The local preview server also serves `/`; opening the
  HTML file directly via `file://` isn't supported.)
- Flyer QR codes (`assets/img/qr-donate.svg`, `qr-hoodie.svg`, `qr-facebook.svg`, `qr-youtube.svg`,
  `qr-paypal.svg`, `qr-zelle.svg`)
  were generated with the npm `qrcode` package in the scratchpad (never added to the repo) at
  error-correction level Q, and each was verified by decoding it back with `jsqr`. Regenerate the
  same way if a URL changes. Keep the printed flyer under ~10in tall so it survives browser
  default print margins: measure by applying the print rules and reading the sheet height.
- `assets/img/banner.png` **was deleted on 2026-11-24** as an unused file (no page ever linked
  it). Restore it with `git checkout 3a70c66 -- assets/img/banner.png` if the club wants it for
  social media. It was a 2400x750 fundraising banner: circle-masked logo on the left,
  "AMPLIFY TYEE" in Impact (red `#A13A3D`) with a cream `#FCF0E2` outline, "Fundraising" in Segoe
  Script Bold (navy `#314388`) overlapping the caps, a music-note call to action, and the hoodie
  photo on the right. Styled after art the maintainer supplied; Impact and Segoe Script are the
  nearest fonts installed here (the original used Anton and a Lobster-style script). Built with a
  PowerShell `System.Drawing` script in the scratchpad (outlined text = `GraphicsPath.AddString`,
  `DrawPath` with a cream pen, then `FillPath`). Two source-art limits to know:
  `tyee-music-logo.jpg` sits on a black square, so it has to be masked into a circle, and
  `red.png` has an opaque white backdrop, so the area behind the hoodie must stay white.
- Header logo `assets/img/logo.png` is generated from `tyee-music-logo.jpg`: 192px, circular
  alpha mask. Pillow isn't installed here; it was made with PowerShell `System.Drawing`
  (`TextureBrush` + `FillEllipse`, anti-aliased). The browser-tab icons are made the same way:
  `favicon-32.png` and `favicon-48.png` (transparent corners; downscaled via a 512px
  intermediate for a cleaner result), and `apple-touch-icon.png` (180px, logo inset 10px on
  opaque white, because iOS fills transparency with black). Both pages' `<head>` link all four
  (32, 48, 192 = `logo.png`, apple-touch). Keep those `<link>` tags identical across pages.

## Key identifiers

| Thing | Value |
|---|---|
| Live site | `https://amplifytyee.org` (`www` redirects to apex; HTTPS enforced) |
| GitHub repo | `https://github.com/evpang/amplifytyee-website` (public; Pages from `main` `/`) |
| Apps Script web app | `APPS_SCRIPT_URL` in `config.js` |
| PayPal | **Live** Client ID in `config.js` (`PAYPAL_SANDBOX: false`). The sandbox Client ID for testing is in git history (commit `5602169`). |
| PayPal donate button | `https://www.paypal.com/donate?campaign_id=DJWLA42FHYME8` ("Every Note Matters–Amplify the Music Fund 2026-27", recipient Amplify Tyee) |
| Zelle donate button | `https://enroll.zellepay.com/qr-codes?data=…` (base64 decodes to `{"name":"AMPLIFY TYEE","action":"payment","token":"amplifytyee@gmail.com"}`) |
| **Not** a donate link | `https://www.paypal.com/ncp/payment/4BRA2293PWVWL` is the **Tyee Music Sweatshirt checkout**. It was once mislabeled "Donate with PayPal" here; don't repeat that. |
| Facebook | `https://www.facebook.com/profile.php?id=61572966548657` |
| YouTube | `https://www.youtube.com/@AMPLIFYTyee` |
| DNS | GoDaddy; records listed in README (4 GitHub A records on `@`, `www` CNAME → `evpang.github.io`) |

## Verify

**Local:** start the preview server from `.claude/launch.json` and load
`http://localhost:4321`. The browser caches aggressively: re-fetch with
`fetch(url, {cache: 'no-store'})` and swap the DOM in, or bust the stylesheet with
`?bust=<timestamp>`. Query strings on the page URL are sometimes dropped by the preview.

**Live, after pushing:** Pages takes ~30–60s. This machine's DNS resolver has served stale
records before, so pin the request to GitHub's IP and add a cache-buster:

```bash
curl -s --resolve amplifytyee.org:443:185.199.108.153 "https://amplifytyee.org/?nc=$RANDOM" | grep -c 'expected-string'
```

Poll every ~12s until the new content appears. Check public DNS with DNS-over-HTTPS
(`https://dns.google/resolve?name=amplifytyee.org&type=A`) rather than `nslookup`.

**JS syntax:** `node --check assets/js/order.js`. **Config parses:**
`node -e "global.window={}; require('./assets/js/config.js'); console.log(window.AMPLIFY_CONFIG.PAYPAL_SANDBOX)"`.

**Apps Script, without side effects** (never POST a valid order JSON; it writes Sheet rows
and sends real emails):
- `curl -sL "$APPS_SCRIPT_URL"` → `{"ok":true,"service":"Amplify Tyee order recorder",
  "version":"2026-11-24c","orderColumns":"Timestamp | First Name | ... | Store"}`.
  **`version` is `SCRIPT_VERSION` at the top of `Code.gs`** - bump it with every paste into the
  Apps Script editor. It is the only way to tell which code the live `/exec` is running, and it
  earned its keep: a deploy that looked fine kept serving the old column order, and this is what
  proved it. If the version printed is not the one in the file, the deployment is stale - in the
  editor, `Deploy -> Test deployments` (the `/dev` URL) runs the latest *saved* code, so compare
  the two: `/dev` right and `/exec` wrong means `Manage deployments -> Edit -> Version` was left
  on an old snapshot instead of **New version**.
- `curl -sL -H "Content-Type: text/plain;charset=utf-8" --data "not-json" "$APPS_SCRIPT_URL"`
  → `{"ok":false,"error":"SyntaxError…"}` (proves `doPost` runs; nothing written).
  Don't add `-X POST`: with `-L` it re-POSTs through Google's redirect and gets `411`.
- To test email content, run `Code.gs` under Node's `vm` with stubbed `SpreadsheetApp`,
  `MailApp`, `LockService`, `ContentService` and inspect what `MailApp.sendEmail` receives.

**PayPal Client ID check:** `https://www.paypal.com/sdk/js?client-id=<ID>` returns 200 (JS) for
a valid ID and 400 `client-id not recognized` otherwise. To tell Live from Sandbox, grep the
bundle for `env:"production"` vs `env:"sandbox"`. The response is gzipped, so use
`curl --compressed`; without it the grep silently finds nothing.

## Traps already hit

- **Apps Script: the repo copy isn't what runs.** Changes to `Code.gs` must be pasted into the
  Sheet's Apps Script project and published via *Manage deployments → Edit → New version*.
  *New deployment* changes the `/exec` URL and silently breaks recording. You can't do this
  step; the maintainer must.
- **GitHub CLI:** the Git Credential Manager token (user `evpang`) lacks `read:org`, so
  `gh auth login --with-token` rejects it; `git push` uses that token and works fine. As of
  2026-09-17 `gh` is logged in separately as `evpang` via the browser device flow (token in the
  Windows keyring; scopes `gist`, `read:org`, `repo`; admin on the repo), so `gh api` / `gh repo`
  work. `gh auth login` is interactive and can't be answered from agent tools: run
  `echo "" | gh auth login --hostname github.com --git-protocol https --web` in the background,
  read the one-time code from its output, and have the maintainer enter it at
  <https://github.com/login/device>. Git's credential helper was not changed.
- **GitHub Pages API:** `PUT /repos/{owner}/{repo}/pages` with `cname` *and* `https_enforced`
  together returned 404. Set `cname` alone, wait for `https_certificate.state == "approved"`,
  then set `https_enforced: true`. Removing/adding the custom domain makes GitHub commit
  `Delete CNAME` / `Create CNAME` to `main`, so pull afterwards.
- **GoDaddy:** the `@` A records were locked by *Domain Forwarding* ("records applied by a
  product or service"); deleting the forwarding rule unlocked them.
- **Windows shell:** a bash heredoc containing non-ASCII characters (♪, curly quotes) failed
  to parse. Use the Write/Edit tools for files with Unicode. Git's LF→CRLF warnings are
  harmless (`core.autocrlf=true`).
- **The browser preview pane is sometimes `document.hidden`.** Then `requestAnimationFrame`
  never fires and timers are throttled, so rAF-based code looks broken in tests while working
  for real visitors. Check `document.visibilityState` before trusting a failed interaction test,
  and prefer plain event handlers over rAF for cheap work.
- **`window.scrollTo({behavior:'instant'})` in the preview pane often fires no `scroll` event**,
  so scroll-driven code (nav.js's menu highlight) looks dead in a test while working for real.
  Verify with a real wheel scroll (`computer` scroll action) or by dispatching the event yourself;
  `document.visibilityState` can be "visible" and it still happens.
- **`eval(code)` inside a `javascript_tool` call runs in a local scope**, so an IIFE that declares
  nothing global appears to do nothing. Use `(0,eval)(code)` to run a site script globally.
- **User interrupts:** if told "stop", stop immediately and report exactly what was and wasn't
  changed. "Revert" was handled with `git revert` of the last pushed commit (non-destructive).

## Current status and open items (as of 2026-09-20)

Done and live: both pages, domain + HTTPS, Google Sheet recording, **PayPal checkout in Live
mode** (Live Client ID verified as `production`, buttons render, no test notice), donate
buttons (PayPal campaign + Zelle), Tyee Music logo in header, Facebook/YouTube in menu and
cards.

**Apps Script is current: `2026-11-24h` deployed and confirmed live.** Each store in
`STORE_SHEETS` carries its own tab pair, short `email` name and `terms` line (hoodies say "made to
order and all sales are final", the winter concert just "All sales are final"). Tabs *Hoodie Order* /
*Hoodie Line Items* and *Winter Concert Orders* / *Winter Concert Line Items*; orders A-P
(Elective, Level, ..., Fulfilled?, Store), line items A-J (no Store - one store per tab); no
Grade column; emails titled "New Tyee Music Hoodie order" / "New Tyee Winter Concert order".
The health check can report the previous version for a few seconds after a deploy - poll two or
three times before concluding it failed** (per-store tabs *Hoodie
Order* / *Hoodie Line Items* and *Winter Concert Orders* / *Winter Concert Line Items*, no Grade
column, Level beside Elective, Store last, emails named "Tyee Music Hoodie" / "Tyee Winter
Concert"). The health check can report the previous version for a few seconds after a deploy -
poll two or three times before concluding it failed** through the health check
(per-store tabs, no Grade column, Level beside Elective, Store last, store-aware emails with the
short "Tyee Music Hoodie" / "Tyee Winter Concert" names). Note the health check can report the
previous version for a few seconds right after a deploy - poll it two or three times before
concluding the deploy failed: per-store tabs, no Grade column, Level beside Elective, Store last, store-aware
emails. The note below is the earlier history. The maintainer redeployed on 2026-09-20, so the
deployed script matched `apps-script/Code.gs` as of that date (commit `86694ab` put the PayPal transaction ID in
the parent email; `20495c0` and `6274369` only touch `testOrder`). Each republish is a new version
of the *same* deployment, so the `/exec` URL in `config.js` is unchanged; the health check still
returns `{"ok":true,"service":"Amplify Tyee order recorder"}` (last checked 2026-09-21).

**Flyers.** Two printable one-page flyers (pushed 2026-09-20; served at /flyerWithFBYoutube.html
and /donateFlyer.html), plus the QR SVGs
`assets/img/qr-{donate,hoodie,facebook,youtube,paypal,zelle}.svg`. Layout, top to bottom: header,
lede, Mission | Goals (two columns), "Ways To Support Our Students", a "Tyee Music Hoodies" card,
an "Every Note Matters - Annual Donation Campaign" card (same `.hoodie` card layout, wallet SVG in
brand red via `.card-icon`), the QR tiles, footer. They differ in the QR band, and the donation
card's wording has drifted apart too (the donate flyer has the checks bullet and "to double your
impact"), so **content edits do not carry across - apply them to both files**:
- `flyerWithFBYoutube.html` - Donate / Buy a Hoodie / Facebook / YouTube, QR images 0.85in,
  printed height 9.98in.
- `donateFlyer.html` - Donate with PayPal / Donate with Zelle / Buy a Hoodie, QR images 1.15in
  (the Zelle URL is a long base64 payload, 57x57 modules, so a small code would not scan),
  printed height 10.47in.
Measured 2026-09-21 by applying the print rules and reading the sheet height; re-measure after any
content change. Tightening already applied to fit the donation card: body `line-height` 1.36,
logo 1.02in, smaller card padding. A longer hero lede pushed both past 10.5in once - if that comes
back, the levers that worked were line-height 1.30, lede 13.5px, goals 13px, bullets 11.5px.

Open:
1. **No order has been verified end to end.** The maintainer never confirmed the sandbox test
   before switching to Live. Watch the first real order: receipt shown → row in both Sheet
   tabs with a PayPal Capture ID → board email → parent email that includes the PayPal
   transaction ID (that last part is also the only outside proof the new script version is
   running). Never place a real order yourself.
2. **Turn off the Jotform** (`262537613078158`) once live PayPal works, so orders don't split.
   The PTSA page still links "Purchase Music Sweatshirt" to the `4BRA2293PWVWL` PayPal
   checkout, which bypasses the form (no student, grade, or size captured). The PTSA site
   isn't ours to edit; flag it to the maintainer.
3. Optional: the menu and both footers say **Donate** (footers changed 2026-09-17), but the
   home page's hero button and the `#donate` section heading still say "Support Our Students"
   (the maintainer hasn't decided).
