/* ==========================================================================
   Amplify Tyee — SITE CONFIGURATION
   --------------------------------------------------------------------------
   This is the ONLY file you need to edit for normal upkeep:
   prices, colors, sizes, the PayPal account, and where orders get recorded.

   Nothing in this file is a secret. A PayPal Client ID is designed to be
   public and visible in the browser; it cannot be used to move money.
   NEVER put a PayPal *Secret* or any password in this file.
   ========================================================================== */

window.AMPLIFY_CONFIG = {

  /* ----------------------------------------------------------------------
     1) PAYPAL CLIENT ID       (leave "" until you have it — see README.md)

     PayPal Developer Dashboard -> Apps & Credentials -> LIVE -> Create App
     Paste the Client ID between the quotes below.

     While this is "", the order form still displays but checkout is
     replaced with a friendly "ordering opens soon" message.
     ---------------------------------------------------------------------- */
  PAYPAL_CLIENT_ID: "BAAHltazF3vq2h4QEZGwDIkLDOb-A5K-Lp_85FNCEJZemOhZD3VIREz5calvFV8lkoaANHZ0w9kPlIENPw",

  /* true  = the Client ID above is a SANDBOX (fake money) ID. The store shows
             a "Test mode" notice so real parents know not to use it.
     false = LIVE ID, real payments. Set this when you switch to Live. */
  PAYPAL_SANDBOX: false,

  /* ----------------------------------------------------------------------
     2) ORDER RECORDING        (leave "" to skip — see README.md)

     The Google Apps Script web-app URL that writes each paid order into
     your Google Sheet and emails the board. Ends in /exec
     ---------------------------------------------------------------------- */
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzldTCTa4120yKexV66tZ74W3y-3J7GOPy_aZjGyosHml-x2ADbletvVgJ58zOzvsnG/exec",

  /* Where order notifications are sent / who parents should contact. */
  CONTACT_EMAIL: "amplifytyee@gmail.com",

  CURRENCY: "USD",

  /* Largest quantity a family can order of any one color. */
  MAX_QTY: 5,

  /* ----------------------------------------------------------------------
     3) SIZES — shared by every color.
        "name"   is what parents pick in the size dropdown. It is also what goes
                 on the PayPal receipt and into the Sheet's Size column.
        "chest" and "height" are shown only in the "Size chart" popup.

        For inches and feet use curly quotes ” and ’ (as below). A straight
        double quote " ends the text early and breaks the whole store.
     ---------------------------------------------------------------------- */
  SIZES: [
    { name: "Youth L",  chest: "30–32”", height: "Under 58” (4’10”)" },
    { name: "Youth XL", chest: "32–35”", height: "~58–60” (4’10”–5’0”)" },
    { name: "Adult S",  chest: "35–37”", height: "5’0”–5’5”" },
    { name: "Adult M",  chest: "38–40”", height: "5’5”–5’8”" },
    { name: "Adult L",  chest: "41–43”", height: "5’8”–6’0”" }
  ],

  /* ----------------------------------------------------------------------
     4) PRODUCTS — to change a price, edit "price". To retire a color,
        delete its block. To add one, copy a block and add the image to
        assets/img/.
     ---------------------------------------------------------------------- */
  PRODUCTS: [
    { id: "red",   name: "Red Sweatshirt",   price: 30.00, image: "assets/img/red.png"   },
    { id: "white", name: "White Sweatshirt", price: 30.00, image: "assets/img/white.png" },
    { id: "black", name: "Black Sweatshirt", price: 30.00, image: "assets/img/black.png" }
  ],

  /* Shown after a successful payment. */
  THANK_YOU: "Thank you for your purchase and for supporting Tyee Music! Once the sweatshirts arrive, we will deliver them to your student in class."
};
