/* ==========================================================================
   Amplify Tyee — order recorder (Google Apps Script)
   --------------------------------------------------------------------------
   Receives a paid order from any ordering page on amplifytyee.org and:
     1. appends one row per order   -> that store's Orders sheet
     2. appends one row per item    -> that store's Line Items sheet
     3. emails the board, and optionally the parent

   Each store writes to its OWN pair of tabs, named in STORE_SHEETS below. A
   tab is created with its header row the first time that store sells
   something, so adding a store needs no setup in the spreadsheet.

   Free forever on a normal Gmail account. See README.md for setup.
   ========================================================================== */

/* ------------------------------ settings ------------------------------- */

/* Bump this whenever you paste a new copy into the Apps Script editor. The
   health check prints it, so you can prove WHICH code the website is actually
   calling:  curl -sL "<the /exec URL in config.js>"
   If the version it prints is not the one in this file, the deployment the
   site uses was not updated - most often because "Manage deployments ->
   Edit -> New version" was run on a different deployment than the one whose
   URL is in config.js. */
var SCRIPT_VERSION = "2026-11-24g";

var BOARD_EMAIL = "amplifytyee@gmail.com";   // who gets each order notification
var SEND_PARENT_CONFIRMATION = true;         // also email the parent a copy
/* Which pair of tabs each store writes to. The key is the store's LABEL in
   assets/js/config.js — change one and you must change the other. A store
   that is missing here gets tabs named after itself ("<Store> Orders" and
   "<Store> Line Items"), so nothing is ever dropped. */
var STORE_SHEETS = {
  "Tyee Music Hoodies":        { orders: "Hoodie Order",          items: "Hoodie Line Items",
                                 email: "Tyee Music Hoodie" },
  "Winter Concert Fundraiser": { orders: "Winter Concert Orders", items: "Winter Concert Line Items",
                                 email: "Tyee Winter Concert" }
};

/* Where an order with no store lands: the hoodie tabs, so rows from an older
   copy of the website still arrive somewhere sensible. */
var DEFAULT_SHEETS = { orders: "Order", items: "Line Items",
                       email: "Tyee Music" };

var ORDER_HEADERS = [
  "Timestamp", "First Name", "Last Name", "Elective", "Level", "Parent Email",
  "Order Summary", "Total", "PayPal Order ID", "PayPal Capture ID",
  "PayPal Status", "PayPal Amount", "Payer Name", "Payer Email", "Fulfilled?",
  "Store"
];

var ITEM_HEADERS = [
  /* No Store column here: each store has its own Line Items tab, so every row
     on a tab is from the same store. The Orders tab still carries it. */
  "Timestamp", "First Name", "Last Name", "Elective", "Level",
  "Product", "Size", "Quantity", "Line Total", "PayPal Capture ID"
];

/* ------------------------------ endpoints ------------------------------ */

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      service: "Amplify Tyee order recorder",
      version: SCRIPT_VERSION,
      orderColumns: ORDER_HEADERS.join(" | ")
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // A lock keeps two simultaneous checkouts from writing to the same row.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return json({ ok: false, error: "busy" });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: "empty request" });
    }

    var order = JSON.parse(e.postData.contents);
    var now = new Date();
    var items = order.items || [];
    var summary = items.map(function (i) {
      var size = i.sizeShort || i.size;      // gift cards and combos have none
      return i.quantity + " x " + i.product + (size ? " (" + size + ")" : "");
    }).join(", ");

    var tabs = sheetsFor(order.store);

    /* ---- Orders sheet (this store's) ---- */
    sheet(tabs.orders, ORDER_HEADERS).appendRow([
      now,
      order.firstName || "",
      order.lastName || "",
      order.elective || "",
      order.level || "",      // the level that page asked for, beside Elective
      order.parentEmail || "",
      summary,
      order.total || "",
      order.paypalOrderId || "",
      order.paypalCaptureId || "",
      order.paypalStatus || "",
      order.paypalAmount || "",
      order.payerName || "",
      order.payerEmail || "",
      "",                     // Fulfilled? — for the board to tick off by hand
      order.store || ""       // which ordering page this came from
    ]);

    /* ---- Line Items sheet (one row per item, for ordering stock) ---- */
    var itemSheet = sheet(tabs.items, ITEM_HEADERS);
    items.forEach(function (i) {
      itemSheet.appendRow([
        now,
        order.firstName || "",
        order.lastName || "",
        order.elective || "",
        order.level || "",
        i.product || "",
        i.size || "",
        i.quantity || 0,
        i.lineTotal || "",
        order.paypalCaptureId || ""
      ]);
    });

    notify(order, summary);
    return json({ ok: true });

  } catch (err) {
    // Log the raw body so nothing is lost if parsing ever fails.
    console.error("Order recording failed: " + err + " | body: " +
                  (e && e.postData ? e.postData.contents : "(none)"));
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------- helpers ------------------------------- */

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

// What the emails call this store: "New Tyee Music Hoodie order", "Your Tyee
// Winter Concert order". Falls back to the store's full label if none is set above.
function emailName(store) {
  var tabs = sheetsFor(store);
  return tabs.email || store || "Tyee Music Hoodie";
}

// The pair of tab names a store writes to.
function sheetsFor(store) {
  if (!store) return DEFAULT_SHEETS;
  if (STORE_SHEETS[store]) return STORE_SHEETS[store];
  return { orders: store + " Orders", items: store + " Line Items" };
}

// Returns the named sheet, creating it with a frozen header row if needed.
function sheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function notify(order, summary) {
  var student = (order.firstName || "") + " " + (order.lastName || "");
  var store = emailName(order.store);
  var subject = "New " + store + " order: " + student + " ($" + (order.total || "0.00") + ")";

  // Print only the answers this order actually carries.
  var who = [["Elective: ", order.elective], ["Level:    ", order.level]]
    .filter(function (p) { return p[1]; })
    .map(function (p) { return p[0] + " " + p[1]; });

  var lines = [
    "A new " + store + " order was paid online.",
    "",
    "Student:   " + student
  ].concat(who).concat([
    "Parent:    " + (order.parentEmail || ""),
    "",
    "Order:     " + summary,
    "Total:     $" + (order.total || "0.00"),
    "",
    "PayPal capture ID: " + (order.paypalCaptureId || "(none)"),
    "PayPal status:     " + (order.paypalStatus || ""),
    "Paid by:           " + (order.payerName || "") + " <" + (order.payerEmail || "") + ">",
    "",
    "Full details are in the Google Sheet, on the " + sheetsFor(order.store).orders + " tab."
  ]).join("\n");

  try {
    MailApp.sendEmail(BOARD_EMAIL, subject, lines);
  } catch (err) {
    console.error("Board email failed: " + err);
  }

  if (SEND_PARENT_CONFIRMATION && order.parentEmail) {
    var parentLines = [
      "Hi,",
      "",
      "Thank you for your order and for supporting Tyee Music!",
      "",
      "Student: " + student + " (" + [order.elective, order.level].filter(Boolean).join(", ") + ")",
      "Order:   " + summary,
      "Total:   $" + (order.total || "0.00")
    ];

    // The capture ID is the transaction ID PayPal shows in the buyer's own
    // receipt and account activity, so parents can match the two.
    if (order.paypalCaptureId) {
      parentLines.push(
        "",
        "PayPal confirmation",
        "Transaction ID: " + order.paypalCaptureId,
        "Amount paid:    $" + (order.paypalAmount || order.total || "0.00"),
        "This matches the receipt PayPal emailed to the account that paid."
      );
    }

    // Each store says how its goods reach the student (THANK_YOU in
    // config.js), so this line suits hoodies and concert treats alike.
    var fulfilment = order.thankYou ||
      "Once the sweatshirts arrive, we will deliver them to your student in class.";

    var parentBody = parentLines.concat([
      "",
      fulfilment,
      "",
      "All items are made to order and all sales are final. No refunds or",
      "exchanges are available.",
      "",
      "Questions? Just reply to this email or write to " + BOARD_EMAIL + ".",
      "",
      "— Amplify Tyee",
      "Advancing Music Programs, Learning, and Inspiration for Youth"
    ]).join("\n");

    try {
      MailApp.sendEmail({
        to: order.parentEmail,
        subject: "Your " + store + " order",
        body: parentBody,
        name: "Amplify Tyee",
        replyTo: BOARD_EMAIL
      });
    } catch (err) {
      console.error("Parent email failed: " + err);
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Run this once from the Apps Script editor to confirm everything works.  */
/* It writes a fake order to your sheet — delete that row afterwards.      */
/* ---------------------------------------------------------------------- */
function testOrder() {
  var fake = {
    store: "Tyee Music Hoodies",
    thankYou: "Once the sweatshirts arrive, we will deliver them to your student in class.",
    firstName: "Test", lastName: "Student", elective: "Band", level: "Intermediate(7)",
    parentEmail: BOARD_EMAIL, total: "70.00", currency: "USD",
    paypalOrderId: "TEST-ORDER", paypalCaptureId: "TEST-CAPTURE",
    paypalStatus: "COMPLETED", paypalAmount: "70.00",
    payerName: "Test Payer", payerEmail: BOARD_EMAIL,
    items: [
      { product: "Red Sweatshirt", size: "Adult M", sizeShort: "Adult M",
        quantity: 1, unitPrice: "35.00", lineTotal: "35.00" },
      { product: "Black Sweatshirt", size: "Adult L", sizeShort: "Adult L",
        quantity: 1, unitPrice: "35.00", lineTotal: "35.00" }
    ]
  };
  var res = doPost({ postData: { contents: JSON.stringify(fake) } });
  console.log(res.getContent());
}

/* The same, for the winter concert store: proves an order lands on the
   "Winter Concert Orders" / "Winter Concert Line Items" tabs (which this
   creates, with headers, the first time it runs) and not on the hoodie tabs. */
function testWinterConcertOrder() {
  var fake = {
    store: "Winter Concert Fundraiser",
    thankYou: "Your order will be ready for pickup at the winter concert.",
    firstName: "Test", lastName: "Student", elective: "Choir", level: "Entry(6)",
    parentEmail: BOARD_EMAIL, total: "36.00", currency: "USD",
    paypalOrderId: "TEST-ORDER", paypalCaptureId: "TEST-CAPTURE",
    paypalStatus: "COMPLETED", paypalAmount: "36.00",
    payerName: "Test Payer", payerEmail: BOARD_EMAIL,
    items: [
      { product: "Concert Combo", size: "", sizeShort: "",
        quantity: 1, unitPrice: "11.00", lineTotal: "11.00" },
      { product: "Kizuki Ramen Gift Card", size: "", sizeShort: "",
        quantity: 1, unitPrice: "25.00", lineTotal: "25.00" }
    ]
  };
  var res = doPost({ postData: { contents: JSON.stringify(fake) } });
  console.log(res.getContent());
}
