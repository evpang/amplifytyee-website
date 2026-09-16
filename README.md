# Amplify Tyee — amplifytyee.org

The website for **Amplify Tyee**, the music booster club supporting the Tyee Middle School
music department (band, orchestra, choir, and theater).

| Page | File | What it is |
|---|---|---|
| Home | `index.html` | Who we are, mission, goals, how to donate, social links |
| Hoodie store | `sweatshirts.html` | Order form + PayPal checkout for music hoodies |

This is a **plain static website** — HTML, CSS, and a single JavaScript file. There is no
framework, no build step, and nothing to install. Edit a file, push it, and the site updates.
That is deliberate: a volunteer-run club shouldn't inherit a toolchain that rots.

---

## What it costs to run: **$0**

| Item | Cost |
|---|---|
| Hosting (GitHub Pages) | **Free** |
| HTTPS certificate | **Free**, auto-renews |
| Order recording (Google Sheets + Apps Script) | **Free** |
| Confirmation emails (Gmail) | **Free** |
| PayPal account | **$0/month** — per-transaction fee only |
| `amplifytyee.org` registration | ~$20/year at GoDaddy (already paid) |

The only true recurring cost is the domain you already own. There are no submission caps
like the ones on Jotform's free tier.

> **Tip:** PayPal offers nonprofits a reduced rate (1.99% + $0.49 vs. the standard
> 2.89% + $0.49). If Amplify Tyee has its 501(c)(3) determination letter, apply at
> <https://www.paypal.com/us/webapps/mpp/donations> — it is worth roughly $0.27 per hoodie.

---

## Everyday edits

Almost everything you'll want to change lives in **one file: `assets/js/config.js`**.

| To do this | Change this |
|---|---|
| Change a hoodie price | `PRODUCTS` → `price` |
| Add or retire a color | add/remove a block in `PRODUCTS` (drop the image in `assets/img/`) |
| Change the size list | `SIZES` |
| Raise the per-color order limit | `MAX_QTY` |
| Change the contact email | `CONTACT_EMAIL` |
| Change the post-purchase message | `THANK_YOU` |

Wording on the pages themselves is plain HTML in `index.html` and `sweatshirts.html`.

After any edit: commit and push to `main`. GitHub Pages redeploys in about a minute.

---

## One-time setup

### 1. Turn on GitHub Pages

1. In this repository: **Settings → Pages**
2. **Source:** Deploy from a branch → **Branch:** `main` → **Folder:** `/ (root)` → **Save**
3. Under **Custom domain**, enter `amplifytyee.org` and Save
4. Tick **Enforce HTTPS** (it may take ~15 minutes to become available)

The `CNAME` file in this repo already contains `amplifytyee.org`, and `.nojekyll` tells
GitHub not to run the site through Jekyll.

### 2. Point the domain at GitHub (at GoDaddy)

`amplifytyee.org` currently uses GoDaddy nameservers. Sign in to GoDaddy →
**My Products → Domains → amplifytyee.org → DNS**.

**Delete** the existing `A` records on `@` (they point at GoDaddy's parking page) and the
existing `www` CNAME (it points at an old Google Site that returns a 404). Then add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 1 hour |
| A | `@` | `185.199.109.153` | 1 hour |
| A | `@` | `185.199.110.153` | 1 hour |
| A | `@` | `185.199.111.153` | 1 hour |
| CNAME | `www` | `<your-github-username>.github.io` | 1 hour |

DNS usually propagates within an hour. Verify with:

```bash
nslookup amplifytyee.org
```

### 3. Connect PayPal

The store shows a friendly *"Online ordering opens soon"* message until this is done —
it never shows a broken checkout.

1. Sign in at <https://developer.paypal.com/dashboard/> with the **Amplify Tyee PayPal
   business account**
2. **Apps & Credentials** → switch the toggle to **Live** → **Create App**
   (name it e.g. `amplifytyee-website`, type: Merchant)
3. Copy the **Client ID**
4. Paste it into `assets/js/config.js`:

   ```js
   PAYPAL_CLIENT_ID: "PASTE_THE_CLIENT_ID_HERE",
   ```

5. Commit and push

> **A Client ID is public by design** — it is meant to be read by the browser and cannot
> be used to move money. It is safe in this repository.
> **Never** put the *Secret* from that same page into this repo.

### 4. Record orders into a Google Sheet

1. Sign in to Google as **amplifytyee@gmail.com**
2. Create a new Google Sheet, name it e.g. *Hoodie Orders*
3. In that sheet: **Extensions → Apps Script**
4. Delete the starter code, paste in the entire contents of
   [`apps-script/Code.gs`](apps-script/Code.gs), and **Save**
5. Run the `testOrder` function once and approve the permissions prompt.
   Google will warn that the app isn't verified — choose **Advanced → Go to (project name)**.
   This is expected for your own private script. Check that two tabs appeared
   (`Orders`, `Line Items`) and that you got an email, then delete the test rows.
6. **Deploy → New deployment → Web app**
   - Description: `order recorder`
   - **Execute as:** Me
   - **Who has access:** **Anyone**  ← required, or the website cannot post to it
7. Copy the **Web app URL** (it ends in `/exec`)
8. Paste it into `assets/js/config.js`:

   ```js
   APPS_SCRIPT_URL: "https://script.google.com/macros/s/..../exec",
   ```

9. Commit and push

The `Orders` tab gets one row per order. The `Line Items` tab gets one row per
color-and-size, which is what you want when placing the bulk order with the vendor —
select the Product and Size columns and use **Data → Pivot table** to get counts.

---

## Test before you take real money

Do a **sandbox** run first so you never test with a live card.

1. At <https://developer.paypal.com/dashboard/> switch to **Sandbox**, create an app,
   and copy that **sandbox** Client ID
2. Temporarily put the sandbox Client ID in `config.js`
3. Open the site, place an order, and pay with a sandbox buyer account
   (Dashboard → **Testing Tools → Sandbox Accounts**)
4. Confirm a row appears in the Google Sheet and the board email arrives
5. Swap the **live** Client ID back in and push

---

## Preview locally

From the project folder:

```bash
python -m http.server 4321
```

Then open <http://localhost:4321>. (Opening the `.html` files directly with `file://`
also mostly works, but a local server matches production more closely.)

---

## Troubleshooting

**The store says "Online ordering opens soon."**
`PAYPAL_CLIENT_ID` in `assets/js/config.js` is still empty. See step 3.

**Payment works but nothing appears in the Sheet.**
Open the browser console (F12). If you see a warning about `APPS_SCRIPT_URL`, finish step 4.
Otherwise, re-check that the deployment's **Who has access** is set to **Anyone** — and
note that editing the script requires **Deploy → Manage deployments → Edit → New version**
for the change to go live.
No money is ever lost by a logging failure: PayPal has the payment, and the parent is shown
their confirmation ID plus instructions to forward the receipt.

**The custom domain shows a certificate warning.**
Normal for the first ~15 minutes. In **Settings → Pages**, remove and re-add the custom
domain if it persists past an hour.

**A parent says they were charged twice.**
Check the `Orders` tab for duplicate `PayPal Capture ID` values, and refund from PayPal.

---

## A note on how checkout is secured

Because this site is fully static (which is what makes hosting free), the order total is
calculated in the visitor's browser. In principle someone could alter the amount before
paying. Two things keep this safe in practice:

- Every order row stores the **PayPal Capture ID** and the **PayPal Amount** actually
  received, right next to the total the form claimed — so a mismatch is visible at a glance.
- Hoodies are handed out in class against the order list, not shipped automatically.

For $30 spiritwear at a middle school this is the right trade-off. Eliminating it entirely
would require a paid server.

---

## File map

```
├── index.html              Home page
├── sweatshirts.html        Hoodie order form
├── CNAME                   Custom domain for GitHub Pages
├── .nojekyll               Tells GitHub Pages to serve files as-is
├── assets/
│   ├── css/site.css        Shared styles (header, footer, home page)
│   ├── css/store.css       Order form styles
│   ├── js/config.js        ← prices, sizes, PayPal ID, Sheet URL
│   ├── js/order.js         Totals, validation, PayPal checkout, order logging
│   └── img/                Product photos
├── apps-script/Code.gs     Google Apps Script that records orders
└── .claude/launch.json     Local preview config (ignored in production)
```

---

## Questions

<amplifytyee@gmail.com>
