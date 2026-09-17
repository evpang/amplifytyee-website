# Amplify Tyee — amplifytyee.org

The website for **Amplify Tyee**, the booster club for the Tyee Middle School music
department (band, orchestra, choir, and theater).

**Live site:** <https://amplifytyee.org> · **Code:** <https://github.com/evpang/amplifytyee-website>

| Page | File | What it is |
|---|---|---|
| Home | `index.html` | About the club, mission and goals, how to donate (PayPal, Zelle, checks, matching gifts), social links |
| Hoodie store | `sweatshirts.html` | Order form with PayPal checkout; paid orders are recorded in a Google Sheet |

It is a **plain static website**: HTML, CSS, and two JavaScript files. No framework, no
build step, nothing to install. Edit a file, push it to GitHub, and the site updates in about
a minute. That is deliberate: a volunteer-run club shouldn't inherit a toolchain that rots.

> Working on this with an AI agent? Agent-specific notes, conventions, and the current
> list of open items are in [`CLAUDE.md`](CLAUDE.md).

---

## What it costs to run: $0

| Item | Cost |
|---|---|
| Hosting (GitHub Pages) | Free |
| HTTPS certificate (Let's Encrypt, auto-renews) | Free |
| Order recording (Google Sheets + Apps Script) and confirmation emails | Free |
| PayPal account | $0/month; per-transaction fee only |
| `amplifytyee.org` domain (GoDaddy) | Annual renewal, already paid by the club |

> **Tip:** PayPal offers registered nonprofits a reduced rate. If Amplify Tyee has its
> 501(c)(3) letter, apply through PayPal's nonprofit program.

---

## Current status

| Piece | Status |
|---|---|
| Home page and hoodie page | ✅ Live |
| Domain `amplifytyee.org` + HTTPS | ✅ Live |
| Orders recorded to Google Sheet | ✅ Connected. The deployed Apps Script matches `apps-script/Code.gs` (confirmed 2026-09-16). |
| PayPal checkout | ✅ **Live: real payments** into the Amplify Tyee PayPal account. See [PayPal: live and test mode](#paypal-live-and-test-mode). |
| Old Jotform hoodie form | ⚠️ Turn it off once the new store has taken a real order, so orders don't split between two systems. |

---

## Everyday edits

### Hoodie store: `assets/js/config.js`

Almost everything about the store lives in this one file.

| To do this | Change this |
|---|---|
| Change a hoodie price | `PRODUCTS` → `price` |
| Add or retire a color | Add/remove a block in `PRODUCTS` (put the photo in `assets/img/`) |
| Change the size list | `SIZES` (`short` goes on the PayPal receipt; `label` is shown to parents and saved to the Sheet) |
| Change the per-color order limit | `MAX_QTY` |
| Change the contact email | `CONTACT_EMAIL` |
| Change the message after payment | `THANK_YOU` |
| Switch PayPal between test and live | `PAYPAL_CLIENT_ID` and `PAYPAL_SANDBOX` (see below) |

### Home page: `index.html`

Wording is plain HTML. A few things appear in more than one place, so change all of them:

| Item | Where it appears |
|---|---|
| **Top menu** (Home · Donate · Buy a Hoodie · Connect · Facebook · YouTube) | In **both** `index.html` and `sweatshirts.html`. Keep them identical. |
| **Footer** | In **both** pages. |
| **Facebook link** `facebook.com/profile.php?id=61572966548657` | Top menu (both pages) and the "Follow us on Facebook" card title |
| **YouTube link** `youtube.com/@AMPLIFYTyee` | Top menu (both pages) and the "Subscribe to our YouTube Channel" card title |
| **Donate with PayPal** button | `index.html`, "PayPal or Zelle" card. Currently the PayPal donation campaign *Every Note Matters–Amplify the Music Fund 2026-27* (`paypal.com/donate?campaign_id=DJWLA42FHYME8`). |
| **Donate with Zelle** button | `index.html`, same card. A Zelle QR payment link for AMPLIFY TYEE (amplifytyee@gmail.com). |

> ⚠️ Don't use `paypal.com/ncp/payment/4BRA2293PWVWL` as a donation link. Despite being
> linked from the PTSA site, it is the PayPal checkout for **buying a Tyee Music Sweatshirt**.

### Images

| File | Use |
|---|---|
| `assets/img/tyee-music-logo.jpg` | Original Tyee Music logo artwork (1459×1459). Keep as the source. |
| `assets/img/logo.png` | Header logo: 192×192, cut to a circle with transparent corners (the JPG has black corners). |
| `assets/img/red.png`, `white.png`, `black.png` | Hoodie photos on the order form |

### Publish a change

Commit and push to the `main` branch. GitHub Pages redeploys in about a minute. If you
still see the old version, reload with **Ctrl+Shift+R** (the site is cached for ~10 minutes).

---

## How the hoodie store works

```
Parent fills in form ──► live total ──► PayPal checkout (in the page)
                                              │  payment captured
                                              ▼
                        order + PayPal transaction ID sent to Google Apps Script
                                              │
                        ┌─────────────────────┼──────────────────────┐
                        ▼                     ▼                      ▼
              "Orders" tab (1 row      "Line Items" tab       Emails: board notification
               per order)              (1 row per color+size)  + parent confirmation
                                                                (includes PayPal transaction ID)
```

- The form won't open PayPal until every required field is filled in and each chosen color
  has a size.
- Hoodies are delivered in class, so PayPal is told not to collect a shipping address.
- If recording to the Sheet ever fails, the payment has still gone through: the parent sees
  their confirmation ID and is asked to forward the PayPal receipt to amplifytyee@gmail.com.

### The Google Sheet

Orders go to a Google Sheet (e.g. *Hoodie Orders*) whose Apps Script project runs
[`apps-script/Code.gs`](apps-script/Code.gs). The Sheet itself is **not** in GitHub: it holds
student names and parent emails, and this repository is public.

**Orders tab columns:** Timestamp · First Name · Last Name · Grade · Elective · Parent Email ·
Order Summary · Total · PayPal Order ID · PayPal Capture ID · PayPal Status · PayPal Amount ·
Payer Name · Payer Email · Fulfilled?

**Line Items tab columns:** Timestamp · First Name · Last Name · Grade · Elective · Product ·
Size · Quantity · Line Total · PayPal Capture ID

- **Tally the vendor order:** on *Line Items*, Insert → Pivot table; Rows = Product and Size,
  Values = SUM of Quantity.
- **Tick off deliveries** in the *Fulfilled?* column.
- **Ignore any row with a blank PayPal Capture ID.** Only real payments get one. The script's
  address is necessarily visible in the site code, so someone could send a fake order.
- **Check PayPal Amount against Total.** The total is calculated in the browser (that's what
  keeps hosting free), so in principle it could be tampered with; the PayPal Amount is what
  was actually paid.

---

## PayPal: live and test mode

Checkout is **live**: `config.js` has the Live Client ID and `PAYPAL_SANDBOX: false`. Both
Client IDs come from <https://developer.paypal.com/dashboard/> → **Apps & Credentials**,
signed in with the Amplify Tyee PayPal account; the toggle at the top switches between
**Live** and **Sandbox**. Only ever copy the **Client ID**. Never copy the *Secret*: the site
doesn't use it, and this repository is public.

**To test a change without real money,** temporarily set in `assets/js/config.js`:

```js
PAYPAL_CLIENT_ID: "the-sandbox-client-id",
PAYPAL_SANDBOX: true,     // shows a "Test mode — no real payments" notice on the store
```

Push, then place an order using a fake buyer login from the developer dashboard
(**Testing Tools → Sandbox Accounts** → the *Personal* account → **View/Edit account**).
Confirm the green *Payment complete* box, a row in both Sheet tabs with a PayPal Capture ID,
and both emails. Then delete the test rows and switch **both** settings back to the Live
Client ID and `false`. If `PAYPAL_SANDBOX` is left `true`, the test-mode notice stays up.

(The sandbox Client ID used for testing is in the git history, commit `5602169`.)

---

## Changing the Google Apps Script

The copy in GitHub (`apps-script/Code.gs`) is the source of truth, but **the code that
actually runs lives in the Google Sheet's Apps Script project**. After changing it:

1. Open the Sheet → **Extensions → Apps Script**, replace all the code with the new
   `Code.gs`, and **Save**.
2. **Deploy → Manage deployments** → click the ✏️ pencil on the existing deployment →
   **Version: New version** → **Deploy**.

⚠️ Do **not** choose *New deployment*. That creates a new web address, and the site would keep
sending orders to the old version. (If it ever does change, update `APPS_SCRIPT_URL` in
`config.js`.)

The deployment must stay **Execute as: Me** and **Who has access: Anyone** (not "Anyone with
a Google account"), or orders from parents who aren't signed in to Google won't be recorded.

Settings at the top of `Code.gs`: `BOARD_EMAIL` (who gets order notifications) and
`SEND_PARENT_CONFIRMATION`. The `testOrder` function writes a fake order and sends the emails,
which is useful after first setup; delete the test rows afterwards.

---

## Hosting and domain (already set up)

Recorded here in case it ever needs to be redone.

**GitHub Pages:** repository Settings → Pages → Deploy from branch `main`, folder `/ (root)`,
custom domain `amplifytyee.org`, **Enforce HTTPS** on. The `CNAME` file holds the domain and
`.nojekyll` tells GitHub to serve files as-is.

**DNS at GoDaddy** (`amplifytyee.org` → DNS):

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `evpang.github.io` |

GoDaddy's **domain forwarding had to be deleted** first; while it exists, GoDaddy locks the
`@` A records. Leave the other records alone: NS, SOA, `_domainconnect`, `pay`, both
`google-site-verification` TXT records, and the `_dmarc` TXT record.

---

## Preview locally

From the project folder:

```bash
python -m http.server 4321
```

Then open <http://localhost:4321>.

---

## Troubleshooting

**The store says "Online ordering opens soon."** `PAYPAL_CLIENT_ID` in `config.js` is empty.

**The store says "Test mode — no real payments."** `PAYPAL_SANDBOX` is `true`. See
[PayPal: live and test mode](#paypal-live-and-test-mode).

**Payment works but nothing appears in the Sheet.** Open the browser console (F12). A warning
about `APPS_SCRIPT_URL` means it's empty. Otherwise check the deployment's *Who has access* is
**Anyone**, and that code changes were published as a **New version**.

**I pushed a change but the site looks the same.** Wait a minute, then reload with
Ctrl+Shift+R.

**A parent was charged twice.** Look for duplicate PayPal Capture IDs in the *Orders* tab and
refund in PayPal.

---

## File map

```
├── index.html              Home page
├── sweatshirts.html        Hoodie order form
├── CNAME                   Custom domain for GitHub Pages
├── .nojekyll               Tells GitHub Pages to serve files as-is
├── README.md               This file (for maintainers)
├── CLAUDE.md               Notes and open items for AI agents working on the site
├── AGENTS.md               Points other AI tools to CLAUDE.md
├── assets/
│   ├── css/site.css        Shared styles (header, menu, cards, footer, home page)
│   ├── css/store.css       Order form styles
│   ├── js/config.js        ← prices, sizes, PayPal settings, Sheet address
│   ├── js/order.js         Totals, validation, PayPal checkout, order recording
│   └── img/                Logo and hoodie photos
├── apps-script/Code.gs     Google Apps Script that records orders (copy of the deployed code)
└── .claude/launch.json     Local preview server config
```

---

## Questions

<amplifytyee@gmail.com>
