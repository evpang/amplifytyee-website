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
| `assets/js/config.js` | All store settings: `PAYPAL_CLIENT_ID`, `PAYPAL_SANDBOX`, `APPS_SCRIPT_URL`, `CONTACT_EMAIL`, `MAX_QTY`, `SIZES` (`short` for PayPal, `label` for UI/Sheet), `PRODUCTS`, `THANK_YOU` |
| `assets/js/order.js` | IIFE. Renders products from config, recomputes totals in integer cents, validates (size required only when that color's qty > 0), loads the PayPal JS SDK on demand, `onClick` → `actions.reject()` until valid, captures, POSTs the order to Apps Script, shows the receipt |
| `apps-script/Code.gs` | `doPost` appends to **Orders** and **Line Items** tabs and emails the board and the parent (parent email includes the PayPal transaction ID). `doGet` = health check. `testOrder` = manual end-to-end test |
| `assets/css/site.css` | Shared styles and design tokens (`:root` vars; brand red `--red: #b3202e`) |
| `assets/css/store.css` | Order form styles (only loaded by `sweatshirts.html`) |
| `.claude/launch.json` | Preview server: `python -m http.server 4321` |

Store behavior worth knowing:
- `PAYPAL_CLIENT_ID` empty → "Online ordering opens soon" notice instead of buttons.
- `PAYPAL_SANDBOX: true` → "Test mode — no real payments" notice above the buttons.
- SDK params: `currency=USD&intent=capture&disable-funding=credit`; order uses
  `shipping_preference: "NO_SHIPPING"` (hoodies delivered in class).
- Order POST uses `Content-Type: text/plain` (a CORS "simple request", so no preflight), with a
  `mode: "no-cors"` retry. Logging failure never blocks the parent; the receipt shows a
  forward-your-receipt note instead.
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
- Header logo `assets/img/logo.png` is generated from `tyee-music-logo.jpg`: 192px, circular
  alpha mask. Pillow isn't installed here; it was made with PowerShell `System.Drawing`
  (`TextureBrush` + `FillEllipse`, anti-aliased).

## Key identifiers

| Thing | Value |
|---|---|
| Live site | `https://amplifytyee.org` (`www` redirects to apex; HTTPS enforced) |
| GitHub repo | `https://github.com/evpang/amplifytyee-website` (public; Pages from `main` `/`) |
| Apps Script web app | `APPS_SCRIPT_URL` in `config.js` |
| PayPal | Sandbox Client ID currently in `config.js` (`PAYPAL_SANDBOX: true`) |
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
a valid ID and 400 `client-id not recognized` otherwise. A sandbox ID's bundle contains
`env:"sandbox"` in its payload builder.

## Traps already hit

- **Apps Script: the repo copy isn't what runs.** Changes to `Code.gs` must be pasted into the
  Sheet's Apps Script project and published via *Manage deployments → Edit → New version*.
  *New deployment* changes the `/exec` URL and silently breaks recording. You can't do this
  step; the maintainer must.
- **GitHub CLI:** the stored GitHub credential (Git Credential Manager, user `evpang`) has
  `repo`/`workflow`/`gist` scopes but not `read:org`, so `gh auth login --with-token` rejects
  it. `git push` works fine. For GitHub API calls (e.g. Pages settings) use `curl` with that
  credential (`git credential fill`) and never print the token.
- **GitHub Pages API:** `PUT /repos/{owner}/{repo}/pages` with `cname` *and* `https_enforced`
  together returned 404. Set `cname` alone, wait for `https_certificate.state == "approved"`,
  then set `https_enforced: true`. Removing/adding the custom domain makes GitHub commit
  `Delete CNAME` / `Create CNAME` to `main`, so pull afterwards.
- **GoDaddy:** the `@` A records were locked by *Domain Forwarding* ("records applied by a
  product or service"); deleting the forwarding rule unlocked them.
- **Windows shell:** a bash heredoc containing non-ASCII characters (♪, curly quotes) failed
  to parse. Use the Write/Edit tools for files with Unicode. Git's LF→CRLF warnings are
  harmless (`core.autocrlf=true`).
- **User interrupts:** if told "stop", stop immediately and report exactly what was and wasn't
  changed. "Revert" was handled with `git revert` of the last pushed commit (non-destructive).

## Current status and open items (as of 2026-09-16)

Done and live: both pages, domain + HTTPS, Google Sheet recording (Apps Script deployed),
PayPal checkout in **sandbox** mode, donate buttons (PayPal campaign + Zelle), Tyee Music logo
in header, Facebook/YouTube in menu and cards.

Open:
1. **Sandbox end-to-end test not yet confirmed** by the maintainer (payment → receipt → both
   Sheet tabs with Capture ID → board + parent emails).
2. **Go live with PayPal:** waiting on the Live Client ID. Then set `PAYPAL_CLIENT_ID` and
   `PAYPAL_SANDBOX: false` in `config.js`, verify buttons render (SDK check above), push.
3. **Unconfirmed that the deployed Apps Script is current.** Commit `86694ab` added the PayPal
   transaction ID to the parent email; the maintainer was given redeploy steps but hasn't
   confirmed.
4. **Turn off the Jotform** (`262537613078158`) once live PayPal works, so orders don't split.
   The PTSA page still links "Purchase Music Sweatshirt" to the `4BRA2293PWVWL` PayPal
   checkout, which bypasses the form (no student, grade, or size captured). The PTSA site
   isn't ours to edit; flag it to the maintainer.
5. Optional: menu says **Donate**, but the hero button, section heading, and footer link still
   say "Support Our Students" (the maintainer hasn't decided).
6. Optional: favicon is still the old red ♪ data-URI square in both pages' `<head>`; could use
   the Tyee Music logo.
