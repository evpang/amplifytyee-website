/* ==========================================================================
   Amplify Tyee — SITE CONFIGURATION
   --------------------------------------------------------------------------
   This is the ONLY file you need to edit for normal upkeep:
   prices, colors, sizes, the PayPal account, and where orders get recorded.

   The file has three parts:
     1. ACCOUNT    — PayPal, the Sheet recorder, contact email. Shared by every
                     store.
     2. DEFAULTS   — settings a store inherits unless it says otherwise.
     3. STORES     — one block per ordering page. The page picks its block with
                     <body data-store="..."> (see "ADDING A STORE" below).

   Nothing in this file is a secret. A PayPal Client ID is designed to be
   public and visible in the browser; it cannot be used to move money.
   NEVER put a PayPal *Secret* or any password in this file.

   ADDING A STORE (a second ordering page)
     1. Copy sweatshirts.html to your-page.html.
     2. In the copy, set <body data-store="your-key"> and edit the hero text.
     3. Add a "your-key" block to STORES below with its own LABEL, PRODUCTS,
        SIZES and ordering window.
     4. Put the product images in assets/img/.
   Nothing else needs changing: order.js reads whichever block the page names.
   ========================================================================== */

window.AMPLIFY_CONFIG = {

  /* ======================================================================
     1) ACCOUNT — shared by every ordering page
     ====================================================================== */

  /* ----------------------------------------------------------------------
     PAYPAL CLIENT ID          (leave "" until you have it — see README.md)

     PayPal Developer Dashboard -> Apps & Credentials -> LIVE -> Create App
     Paste the Client ID between the quotes below.

     While this is "", the order form still displays but checkout is
     replaced with a friendly "ordering opens soon" message.

     TEST MODE: the ID below is the Sandbox one, so checkout uses fake
     money and the store shows a "Test mode" notice. To take real payments
     again, paste the Live ID below and set PAYPAL_SANDBOX to false. Both
     IDs are safe to keep here: a Client ID is public by design and cannot
     move money on its own.

       Live:    BAAHltazF3vq2h4QEZGwDIkLDOb-A5K-Lp_85FNCEJZemOhZD3VIREz5calvFV8lkoaANHZ0w9kPlIENPw
       Sandbox: BAAjr9szStrjnm7Q989se5CZjvfqvMFZ-wdVTqXZu7FD2xVYhXlPJehgegC-acJmi2vcv-BD2_MLvwv5AQ
     ---------------------------------------------------------------------- */
  PAYPAL_CLIENT_ID: "BAAjr9szStrjnm7Q989se5CZjvfqvMFZ-wdVTqXZu7FD2xVYhXlPJehgegC-acJmi2vcv-BD2_MLvwv5AQ",

  /* true  = the Client ID above is a SANDBOX (fake money) ID. The store shows
             a "Test mode" notice so real parents know not to use it.
     false = LIVE ID, real payments. Set this when you switch to Live. */
  PAYPAL_SANDBOX: true,

  /* ----------------------------------------------------------------------
     ORDER RECORDING           (leave "" to skip — see README.md)

     The Google Apps Script web-app URL that writes each paid order into
     your Google Sheet and emails the board. Ends in /exec
     ---------------------------------------------------------------------- */
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzldTCTa4120yKexV66tZ74W3y-3J7GOPy_aZjGyosHml-x2ADbletvVgJ58zOzvsnG/exec",

  /* Where order notifications are sent / who parents should contact. */
  CONTACT_EMAIL: "amplifytyee@gmail.com",

  CURRENCY: "USD",

  /* ======================================================================
     2) DEFAULTS — every store starts from these and overrides what it needs
     ====================================================================== */
  DEFAULTS: {

    /* Largest quantity a family can order of any one item. */
    MAX_QTY: 5,

    /* ----------------------------------------------------------------------
       Where to send parents after a paid order, and how long the receipt
       stays on screen first. Set AFTER_ORDER_URL to "" to keep them on the
       receipt instead. If the order could not be logged to the Sheet, the
       receipt stays put (so the parent sees the "forward your receipt" note)
       and the thank-you page becomes a link they can choose.
       ---------------------------------------------------------------------- */
    AFTER_ORDER_URL: "thank-you.html",
    AFTER_ORDER_DELAY: 7
  },

  /* ======================================================================
     3) STORES — one block per ordering page

     ORDERING_OPEN
       false = ordering is off whatever the date says. Use it to close early,
       or flip it back on to take a late order.

     ORDER_CLOSE_DATE
       the last day orders are taken, as YYYY-MM-DD. Ordering stops at the end
       of that day, by the shopper's own clock. "" = no deadline, so the flag
       above is the only thing that closes it.

     Once ordering is closed the whole form disappears - student fields,
     products and payment - and a single notice sits under the hero pointing at
     CONTACT_EMAIL. The deadline prints itself into the page wherever an
     element carries data-order-deadline (the hero's "Pre-order by ..." line).

     LABEL rides along with the order, so the Sheet and the board email can
     tell one store's orders from another's.
     ====================================================================== */
  STORES: {

    /* ------------------------------------------------- sweatshirts.html */
    sweatshirts: {
      LABEL: "Tyee Music Hoodies",

      ORDERING_OPEN: true,
      ORDER_CLOSE_DATE: "2026-10-27",

      /* --------------------------------------------------------------------
         SIZES — shared by every color in this store.
           "name"   is what parents pick in the size dropdown. It is also what
                    goes on the PayPal receipt and into the Sheet's Size column.
           "waist" and "height" are shown only in the "Size chart" popup.
           Waist measurements come from the SanMar size chart (SizeChart-PA-V3).

           For inches and feet use curly quotes ” and ’ (as below). A straight
           double quote " ends the text early and breaks the whole store.
         -------------------------------------------------------------------- */
      SIZES: [
        { name: "Youth L",   waist: "25–26”", height: "Under 58” (4’10”)" },
        { name: "Youth XL",  waist: "27–28”", height: "~58–60” (4’10”–5’0”)" },
        { name: "Adult S",   waist: "29–31”", height: "5’0”–5’5”" },
        { name: "Adult M",   waist: "32–34”", height: "5’5”–5’8”" },
        { name: "Adult L",   waist: "35–37”", height: "5’8”–6’0”" },
        { name: "Adult XL",  waist: "38–40”", height: "" },
        { name: "Adult XXL", waist: "41–43”", height: "" }
      ],

      /* --------------------------------------------------------------------
         PRODUCTS — to change a price, edit "price". To take a color off sale
         without losing its settings, add  available: false  to its block (see
         the winter concert store below); to retire it for good, delete the
         block. To add one, copy a block and put the image in assets/img/.
         -------------------------------------------------------------------- */
      PRODUCTS: [
        { id: "red",   name: "Red Sweatshirt",   price: 35.00, image: "assets/img/red.png"   },
        { id: "white", name: "White Sweatshirt", price: 35.00, image: "assets/img/white.png" },
        { id: "black", name: "Black Sweatshirt", price: 35.00, image: "assets/img/black.png" },
        { id: "grey",  name: "Grey Sweatshirt",  price: 35.00, image: "assets/img/grey.png"  }
      ],

      /* Shown after a successful payment. */
      THANK_YOU: "Thank you for your purchase and for supporting Tyee Music! Once the sweatshirts arrive, we will deliver them to your student in class.",

      /* Shown in the notice once ordering has closed. Leave out for none. */
      CLOSED_NOTE: "Hoodies are delivered to students in class about a month after the order window closes."
    }
    ,

    /* ---------------------------------------------- WinterConcert.html
       Treats and gift cards sold around the winter concert. No sizes, so the
       product cards show quantity only and the size chart never appears. */
    "winter-concert": {
      LABEL: "Winter Concert Fundraiser",
      ITEM_NOUN: "item",

      ORDERING_OPEN: true,
      ORDER_CLOSE_DATE: "",          /* no deadline yet - set one when you have it */

      SIZES: [],                     /* none: these are not garments */

      /* available: true  = on sale.
         available: false = off sale. The item vanishes from the page, so
                            nobody can add it or pay for it. Flip it back to
                            true to put it out again - its price and picture
                            wait here in the meantime. Switch every item off
                            and the page says ordering is not open. */
      PRODUCTS: [
        { id: "combo",       name: "Concert Combo (Flower, Cookie & Card)", price: 11.00, available: true, image: "assets/img/WinterConcert/concert-combo.jpg" },
        { id: "happy-lemon", name: "Happy Lemon $25 Gift Card",  price: 25.00, available: true, image: "assets/img/WinterConcert/happy-lemon.jpg"   },
        { id: "kizuki",      name: "Kizuki Ramen $25 Gift Card", price: 25.00, available: true, image: "assets/img/WinterConcert/kizuki-ramen.jpg"  }
      ],

      THANK_YOU: "Thank you for supporting Tyee Music! Your order will be ready for pickup at the winter concert.",

      CLOSED_NOTE: "Orders are picked up at the winter concert."
    }

    /* ------------------------------------------------- the next store
       Copy the block above, give it a new key, and point your new page at it
       with <body data-store="that-key">. Settings left out are taken from
       DEFAULTS.

    spring-tees: {
      LABEL: "Spring Concert T-Shirts",
      ORDERING_OPEN: true,
      ORDER_CLOSE_DATE: "2027-03-15",
      SIZES: [ { name: "Youth M", chest: "" }, { name: "Adult M", chest: "" } ],
      PRODUCTS: [
        { id: "navy", name: "Navy T-Shirt", price: 18.00, image: "assets/img/navy-tee.png" }
      ],
      THANK_YOU: "Thank you! Shirts are handed out in class once they arrive."
    }
    ------------------------------------------------------------------- */
  }
};
