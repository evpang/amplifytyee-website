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
  (<https://form.jotform.com/262537613078158>): 3 colors at $30, qty 0–5, 5 sizes, student
  name/grade/elective, parent email, PayPal checkout, orders recorded to a Google Sheet.
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
- **The header menu and footer are duplicated** in `index.html` and `sweatshirts.html`. A menu
  or footer change goes in **both** unless told otherwise; say that you did.
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
| `assets/js/config.js` | All store settings: `PAYPAL_CLIENT_ID`, `PAYPAL_SANDBOX`, `APPS_SCRIPT_URL`, `CONTACT_EMAIL`, `MAX_QTY`, `SIZES` (`name`, `chest`, `height`), `PRODUCTS`, `THANK_YOU` |
| `assets/js/order.js` | IIFE. Renders products from config, recomputes totals in integer cents, validates (size required only when that color's qty > 0), loads the PayPal JS SDK on demand, `onClick` → `actions.reject()` until valid, captures, POSTs the order to Apps Script, shows the receipt |
| `apps-script/Code.gs` | `doPost` appends to **Orders** and **Line Items** tabs and emails the board and the parent (parent email includes the PayPal transaction ID). `doGet` = health check. `testOrder` = manual end-to-end test |
| `assets/css/site.css` | Shared styles and design tokens (`:root` vars; brand red `--red: #b3202e`) |
| `assets/css/store.css` | Order form styles (only loaded by `sweatshirts.html`) |
| `assets/js/nav.js` | Home page only: moves the menu highlight between Home / Donate / Connect |
| `.claude/launch.json` | Preview server: `python -m http.server 4321` |

Store behavior worth knowing:
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
  `<dialog id="size-chart">` whose table rows are built from `SIZES` (name/chest/height), via a
  click listener on `#products`. Closes via ×, Esc (handled explicitly: the embedded test
  browser didn't close on Esc natively), or a backdrop click; focus returns to whichever link
  opened it. The dialog sits outside `<form>` so its buttons can't submit it.
- Order payload keeps both `items[].size` and `items[].sizeShort` (both = size name) because the
  deployed `Code.gs` writes `size` to the Sheet and uses `sizeShort` in emails. Don't rename
  them without redeploying the Apps Script.
- `config.js` strings: a straight `"` inside a label (e.g. `58"`) breaks the file and the whole
  store (no products, no PayPal). The maintainer did this once by hand. After any edit, run
  the config-parses check below; use curly `”` `’`.
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
  badge still uses 🧥.
- **Menu highlight = where you are, and nothing else.** No menu item has permanent emphasis
  (a red "Buy a Hoodie" call-to-action button was reported as a bug because it looked like the
  current tab). The highlight is `.site-nav a[aria-current]`. `sweatshirts.html` sets it
  statically on "Buy a Hoodie". On `index.html`, `assets/js/nav.js` moves it between Home
  (`"page"`), Donate and Connect (`"location"`) on scroll, on load/hash (arriving from the
  hoodie page), and immediately on click (held until the scroll finishes). Home and the logo
  scroll back to the top instead of reloading. It works out which links are same-page sections
  from their `href`, so adding a menu link to a new `<section id>` needs no JS change.
- **Link to the home page as `./` and `./#section`, never `index.html` / `index.html#section`**
  (both pages: logo, menu, footer, receipt "Back" button). Visitors arrive at
  `amplifytyee.org/`; a link to `index.html#donate` is a different URL, so the browser did a
  full page reload instead of scrolling. (The local preview server also serves `/`; opening the
  HTML file directly via `file://` isn't supported.)
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
- `curl -sL "$APPS_SCRIPT_URL"` → `{"ok":true,"service":"Amplify Tyee order recorder"}`
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
- **User interrupts:** if told "stop", stop immediately and report exactly what was and wasn't
  changed. "Revert" was handled with `git revert` of the last pushed commit (non-destructive).

## Current status and open items (as of 2026-09-16)

Done and live: both pages, domain + HTTPS, Google Sheet recording, **PayPal checkout in Live
mode** (Live Client ID verified as `production`, buttons render, no test notice), donate
buttons (PayPal campaign + Zelle), Tyee Music logo in header, Facebook/YouTube in menu and
cards.

**Apps Script is current.** The maintainer confirmed on 2026-09-16 that the deployed script
matches `apps-script/Code.gs` (latest change: commit `86694ab`, PayPal transaction ID in the
parent email), republished as a new version of the same deployment. The `/exec` URL in
`config.js` is unchanged and still responds.

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
3. Optional: menu says **Donate**, but the hero button, section heading, and footer link still
   say "Support Our Students" (the maintainer hasn't decided).