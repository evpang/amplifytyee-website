/* ==========================================================================
   Amplify Tyee — order recorder (Google Apps Script)
   --------------------------------------------------------------------------
   Receives a paid hoodie order from amplifytyee.org and:
     1. appends one row per order   -> "Orders" sheet
     2. appends one row per size    -> "Line Items" sheet (for vendor counts)
     3. emails the board, and optionally the parent

   Free forever on a normal Gmail account. See README.md for setup.
   ========================================================================== */

/* ------------------------------ settings ------------------------------- */

var BOARD_EMAIL = "amplifytyee@gmail.com";   // who gets each order notification
var SEND_PARENT_CONFIRMATION = true;         // also email the parent a copy
var ORDERS_SHEET = "Orders";
var ITEMS_SHEET  = "Line Items";

var ORDER_HEADERS = [
  "Timestamp", "First Name", "Last Name", "Grade", "Elective", "Parent Email",
  "Order Summary", "Total", "PayPal Order ID", "PayPal Capture ID",
  "PayPal Status", "PayPal Amount", "Payer Name", "Payer Email", "Fulfilled?"
];

var ITEM_HEADERS = [
  "Timestamp", "First Name", "Last Name", "Grade", "Elective",
  "Product", "Size", "Quantity", "Line Total", "PayPal Capture ID"
];

/* ------------------------------ endpoints ------------------------------ */

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "Amplify Tyee order recorder" }))
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
      return i.quantity + " x " + i.product + " (" + (i.sizeShort || i.size) + ")";
    }).join(", ");

    /* ---- Orders sheet ---- */
    sheet(ORDERS_SHEET, ORDER_HEADERS).appendRow([
      now,
      order.firstName || "",
      order.lastName || "",
      order.grade || "",
      order.elective || "",
      order.parentEmail || "",
      summary,
      order.total || "",
      order.paypalOrderId || "",
      order.paypalCaptureId || "",
      order.paypalStatus || "",
      order.paypalAmount || "",
      order.payerName || "",
      order.payerEmail || "",
      ""                      // Fulfilled? — for the board to tick off by hand
    ]);

    /* ---- Line Items sheet (one row per color+size, for ordering stock) ---- */
    var itemSheet = sheet(ITEMS_SHEET, ITEM_HEADERS);
    items.forEach(function (i) {
      itemSheet.appendRow([
        now,
        order.firstName || "",
        order.lastName || "",
        order.grade || "",
        order.elective || "",
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
  var subject = "New hoodie order: " + student + " ($" + (order.total || "0.00") + ")";

  var lines = [
    "A new Tyee music hoodie order was paid online.",
    "",
    "Student:   " + student,
    "Grade:     " + (order.grade || ""),
    "Elective:  " + (order.elective || ""),
    "Parent:    " + (order.parentEmail || ""),
    "",
    "Order:     " + summary,
    "Total:     $" + (order.total || "0.00"),
    "",
    "PayPal capture ID: " + (order.paypalCaptureId || "(none)"),
    "PayPal status:     " + (order.paypalStatus || ""),
    "Paid by:           " + (order.payerName || "") + " <" + (order.payerEmail || "") + ">",
    "",
    "Full details are in the Google Sheet."
  ].join("\n");

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
      "Student: " + student + " (" + (order.grade || "") + ", " + (order.elective || "") + ")",
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

    var parentBody = parentLines.concat([
      "",
      "Once the sweatshirts arrive, we will deliver them to your student in class.",
      "",
      "Questions? Just reply to this email or write to " + BOARD_EMAIL + ".",
      "",
      "— Amplify Tyee",
      "Advancing Music Programs, Learning, and Inspiration for Youth"
    ]).join("\n");

    try {
      MailApp.sendEmail({
        to: order.parentEmail,
        subject: "Your Tyee music hoodie order",
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
    firstName: "Test", lastName: "Student", grade: "7th Grade", elective: "Band",
    parentEmail: BOARD_EMAIL, total: "60.00", currency: "USD",
    paypalOrderId: "TEST-ORDER", paypalCaptureId: "TEST-CAPTURE",
    paypalStatus: "COMPLETED", paypalAmount: "60.00",
    payerName: "Test Payer", payerEmail: BOARD_EMAIL,
    items: [
      { product: "Red Sweatshirt", size: "Adult M", sizeShort: "Adult M",
        quantity: 1, unitPrice: "30.00", lineTotal: "30.00" },
      { product: "Black Sweatshirt", size: "Adult L", sizeShort: "Adult L",
        quantity: 1, unitPrice: "30.00", lineTotal: "30.00" }
    ]
  };
  var res = doPost({ postData: { contents: JSON.stringify(fake) } });
  console.log(res.getContent());
}
